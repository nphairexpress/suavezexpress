-- Reversão de 20261005090000_etapa4_rpc_fechar_comanda_v2.sql
-- Remove a v2 e a coluna paid_by; restaura consome_credito_clube, consome_pacote_unha e
-- fn_guard_comanda_update EXATAMENTE como estavam no export de 29/09/2026 16:23
-- (backups/20260929-162321-etapa0-inicial/schema/funcoes.sql).
-- A v1 (rpc_fechar_comanda) nunca foi tocada por esta etapa.

drop function if exists public.rpc_fechar_comanda_v2(uuid, uuid, jsonb, numeric, boolean, text, boolean, jsonb, uuid[]);

alter table public.comandas drop column if exists paid_by;

-- ── consome_credito_clube (viva em 29/09) ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consome_credito_clube()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_srv text; v_cli uuid; v_fone text; v_ass uuid; v_plano text; v_cheio numeric;
  v_cred clube_creditos%rowtype;
  c_sem_ciclo constant text := 'Não há mensalidade confirmada do Clube válida para hoje. Faça a renovação no cartão antes de liberar a escova.';
  c_sem_assinatura constant text := 'Assinatura do Clube ainda não está ativa. Aguarde a confirmação do pagamento antes de lançar a escova do Clube.';
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv is null or v_srv <> 'ESCOVA DO CLUBE' then return new; end if;
  select client_id into v_cli from comandas where id = new.comanda_id;
  if v_cli is null then raise exception '%', c_sem_assinatura; end if;
  select regexp_replace(coalesce(phone,''),'[^0-9]','','g') into v_fone from clients where id = v_cli;
  if v_fone = '' then raise exception '%', c_sem_assinatura; end if;
  select id, plano into v_ass, v_plano
    from clube_assinantes
   where status = 'ativo'
     and right(regexp_replace(coalesce(celular,''),'[^0-9]','','g'),8) = right(v_fone,8)
   limit 1;
  if v_ass is null then raise exception '%', c_sem_assinatura; end if;
  -- 16/09/2026 (ciclo): crédito só nasce no webhook; aqui só procura o CICLO ATIVO (inicio <= agora < fim) e trava.
  select * into v_cred from clube_creditos
   where assinante_id = v_ass and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
     and inicio <= now() and now() < fim and creditos_usados < creditos_total
   order by fim asc limit 1 for update;
  if not found then
    select * into v_cred from clube_creditos
     where assinante_id = v_ass and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
       and inicio <= now() and now() < fim
     order by fim asc limit 1;
    if found then
      raise exception 'TETO DO CLUBE ATINGIDO: assinante ja usou % de % escovas no ciclo valido ate %. Cobrar como escova avulsa.',
        v_cred.creditos_usados, v_cred.creditos_total, to_char(v_cred.fim at time zone 'America/Sao_Paulo','DD/MM');
    end if;
    raise exception '%', c_sem_ciclo;
  end if;
  update clube_creditos set creditos_usados = creditos_usados + 1 where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem) values (v_cred.id, v_ass, new.id, 'comanda');
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
$function$
;

-- ── consome_pacote_unha (viva em 29/09) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.consome_pacote_unha()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_e int := 0; v_fone text; v_ass uuid;
  v_cred clube_creditos%rowtype;
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  elsif v_srv in ('ESMALTAÇÃO - MÃOS', 'ESMALTAÇÃO - PÉS') then v_e := 1;
  else return new;
  end if;
  v_m := v_m * coalesce(new.quantity, 1);
  v_p := v_p * coalesce(new.quantity, 1);
  v_e := v_e * coalesce(new.quantity, 1);

  select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') into v_fone
    from comandas c join clients cl on cl.id = c.client_id where c.id = new.comanda_id;
  if coalesce(v_fone, '') = '' then return new; end if;

  if v_e > 0 then
    select k.* into v_cred from clube_creditos k join clube_assinantes a on a.id = k.assinante_id
     where a.status = 'ativo'
       and right(regexp_replace(coalesce(a.celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
       and k.origem = 'pacote_esmaltacao' and not k.bloqueado
       and k.inicio <= now() and now() < k.fim
       and k.creditos_usados + v_e <= k.creditos_total
     order by k.fim asc limit 1 for update of k;
    if not found then return new; end if;
    update clube_creditos set creditos_usados = creditos_usados + v_e where id = v_cred.id;
    insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
    values (v_cred.id, v_cred.assinante_id, new.id, 'comanda');
    new.description := coalesce(new.description, v_srv) || ' (PACOTE ESMALTAÇÃO)';
    update comandas set discount = coalesce(discount, 0) + new.total_price where id = new.comanda_id;
    return new;
  end if;

  select id into v_ass from clube_assinantes
   where status = 'ativo' and plano = 'unha_4m2p'
     and right(regexp_replace(coalesce(celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
   limit 1;
  if v_ass is null then return new; end if;

  select * into v_cred from clube_creditos
   where assinante_id = v_ass and origem = 'pacote_unha' and not bloqueado
     and inicio <= now() and now() < fim
     and maos_usadas + v_m <= 4 and pes_usados + v_p <= 2
   order by fim asc limit 1 for update;
  if not found then return new; end if;  -- sem ciclo pago ou sem saldo: cobra normal

  update clube_creditos
     set maos_usadas = maos_usadas + v_m, pes_usados = pes_usados + v_p,
         creditos_usados = creditos_usados + v_m + v_p
   where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
  values (v_cred.id, v_ass, new.id, 'comanda');
  new.description := coalesce(new.description, v_srv) || ' (PACOTE UNHA)';
  update comandas set discount = coalesce(discount, 0) + new.total_price where id = new.comanda_id;
  return new;
end
$function$
;

-- ── fn_guard_comanda_update (viva em 29/09) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_guard_comanda_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- service_role / cron: auth.uid() é NULL → sem restrição
  IF v_uid IS NULL OR fn_role_operacao_caixa(v_uid) THEN
    RETURN NEW;
  END IF;
  IF NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.is_paid IS DISTINCT FROM OLD.is_paid
     OR NEW.caixa_id IS DISTINCT FROM OLD.caixa_id
     OR NEW.discount IS DISTINCT FROM OLD.discount THEN
    RAISE EXCEPTION 'Apenas admin/financeiro pode alterar fechamento, caixa ou desconto da comanda';
  END IF;
  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Comanda fechada: apenas admin/financeiro pode alterá-la';
  END IF;
  RETURN NEW;
END;
$function$
;
