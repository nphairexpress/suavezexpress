-- 16/09/2026 — ESCOVA DO CLUBE nunca mais entra como cobrança de R$49.
-- Caso Janaina (comanda 1151): o item foi lançado ANTES da assinatura confirmar;
-- o trigger não achou assinatura ativa e devolvia o item no preço-base (R$49).
-- Agora: sem assinatura ativa casando pelo telefone -> o INSERT é interrompido.
-- Assinante ativa: comportamento inalterado (preço cheio do plano + desconto igual
-- + 1 crédito). Teto atingido: bloqueio inalterado (cobrar como escova avulsa).
-- security definer: clube_creditos só tem policy de leitura para a equipe, então o
-- trigger disparado pela recepção falhava com RLS ao abater o crédito (falha latente
-- desde 22/08). auth.uid() segue sendo o usuário logado (fn_guard_comanda_update vê o mesmo).
-- Aplicada direto no banco via Management API em 16/09/2026 (este arquivo versiona).
create or replace function consome_credito_clube() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_cli uuid; v_fone text; v_ass uuid; v_teto int; v_plano text;
  v_comp text; v_usados int; v_total int; v_cheio numeric;
  c_sem_assinatura constant text := 'Assinatura do Clube ainda não está ativa. Aguarde a confirmação do pagamento antes de lançar a escova do Clube.';
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv is null or v_srv <> 'ESCOVA DO CLUBE' then return new; end if;
  select client_id into v_cli from comandas where id = new.comanda_id;
  if v_cli is null then raise exception '%', c_sem_assinatura; end if;
  select regexp_replace(coalesce(phone,''),'[^0-9]','','g') into v_fone from clients where id = v_cli;
  if v_fone = '' then raise exception '%', c_sem_assinatura; end if;
  select id, coalesce(teto_mensal,4), plano into v_ass, v_teto, v_plano
    from clube_assinantes
   where status = 'ativo'
     and right(regexp_replace(coalesce(celular,''),'[^0-9]','','g'),8) = right(v_fone,8)
   limit 1;
  if v_ass is null then raise exception '%', c_sem_assinatura; end if;
  v_comp := to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM');
  insert into clube_creditos (assinante_id,competencia,creditos_total,creditos_usados)
  values (v_ass,v_comp,v_teto,0) on conflict do nothing;
  select creditos_usados, creditos_total into v_usados, v_total
    from clube_creditos where assinante_id = v_ass and competencia = v_comp limit 1;
  if v_usados >= v_total then
    raise exception 'TETO DO CLUBE ATINGIDO: assinante ja usou % de % escovas em %. Cobrar como escova avulsa.', v_usados, v_total, v_comp;
  end if;
  update clube_creditos set creditos_usados = creditos_usados + 1
   where assinante_id = v_ass and competencia = v_comp;
  if v_plano like '%longo%' then
    select price into v_cheio from services where upper(name) = 'ESCOVA LISA - LONGO' and is_active limit 1;
    v_cheio := coalesce(v_cheio, 97);
  else
    select price into v_cheio from services where upper(name) like 'ESCOVA LISA - CURTO%' and is_active limit 1;
    v_cheio := coalesce(v_cheio, 77);
  end if;
  new.unit_price := v_cheio;
  new.total_price := v_cheio * coalesce(new.quantity, 1);
  new.description := 'ESCOVA DO CLUBE (ja paga na assinatura)';
  update comandas set discount = coalesce(discount,0) + new.total_price where id = new.comanda_id;
  return new;
end
$fn$;
