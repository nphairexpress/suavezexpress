-- 22/08/2026 — ESCOVA DO CLUBE deixa de zerar o item (matava a comissão da
-- profissional). Agora: item no preço CHEIO da escova avulsa conforme o plano
-- (curto/médio ou longo, preço vivo do catálogo) + o mesmo valor somado em
-- comandas.discount -> cliente paga 0, comissão 30% do cheio (decisão 12/07),
-- mesmo desenho do fluxo da fila. Abate de crédito e trava de teto inalterados.
-- Aplicada direto no banco via Management API em 22/08/2026 (este arquivo versiona).
create or replace function consome_credito_clube() returns trigger language plpgsql as $fn$
declare
  v_srv text; v_cli uuid; v_fone text; v_ass uuid; v_teto int; v_plano text;
  v_comp text; v_usados int; v_total int; v_cheio numeric;
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv is null or v_srv <> 'ESCOVA DO CLUBE' then return new; end if;
  select client_id into v_cli from comandas where id = new.comanda_id;
  if v_cli is null then return new; end if;
  select regexp_replace(coalesce(phone,''),'[^0-9]','','g') into v_fone from clients where id = v_cli;
  if v_fone = '' then return new; end if;
  select id, coalesce(teto_mensal,4), plano into v_ass, v_teto, v_plano
    from clube_assinantes
   where status = 'ativo'
     and right(regexp_replace(coalesce(celular,''),'[^0-9]','','g'),8) = right(v_fone,8)
   limit 1;
  if v_ass is null then return new; end if;
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
