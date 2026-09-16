-- 16/09/2026 — Clube por CICLO de 30 dias a partir do pagamento confirmado (não por mês-calendário).
-- Cada pagamento confirmado (webhook) cria 1 ciclo: inicio = confirmação, fim = inicio + 30 dias,
-- total = teto do plano. Consumo só no ciclo ativo (inicio <= agora < fim); sem ciclo → bloqueia;
-- teto → bloqueia e orienta avulsa. Nenhuma função de fila/trigger/tela cria ciclo.
-- Aplicada direto no banco via Management API em 16/09/2026 (este arquivo versiona).

-- 1) ciclo em clube_creditos
alter table clube_creditos
  add column if not exists inicio timestamptz,
  add column if not exists fim timestamptz;
alter table clube_creditos drop constraint if exists clube_creditos_assinante_id_competencia_key;
alter table clube_creditos alter column competencia drop not null;
comment on column clube_creditos.competencia is 'rótulo histórico (YYYY-MM do início). A regra é inicio/fim.';

-- 2) consumos: cada escova aponta para o ciclo que a pagou (nunca soma ciclos diferentes)
create table if not exists clube_consumos (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references clube_creditos(id) on delete cascade,
  assinante_id uuid not null references clube_assinantes(id) on delete cascade,
  comanda_item_id uuid references comanda_items(id) on delete set null deferrable initially deferred,
  queue_entry_id uuid references queue_entries(id) on delete set null,
  origem text not null check (origem in ('comanda','fila','migracao')),
  consumido_em timestamptz not null default now()
);
create index if not exists clube_consumos_ciclo_idx on clube_consumos(ciclo_id);
alter table clube_consumos enable row level security;
drop policy if exists clube_consumos_staff_read on clube_consumos;
create policy clube_consumos_staff_read on clube_consumos for select to authenticated
  using (exists (select 1 from user_roles ur where ur.user_id = auth.uid()));

-- 3) migração de dados (início = hora do pagamento confirmado em financial_transactions)
-- Gisele (manual, pago no caixa 22/08 19:12 BRT): UM ciclo 22/08 → 21/09, teto 4, 2 usadas (22/08 e 16/09)
update clube_creditos set inicio = '2026-08-22 22:12:24.577498+00', fim = '2026-08-22 22:12:24.577498+00'::timestamptz + interval '30 days',
       creditos_total = 4, creditos_usados = 2, origem = 'legado_manual', bloqueado = false, bloqueado_em = null,
       motivo_bloqueio = 'ciclo manual: pagamento confirmado no caixa em 22/08/2026 (financial_transactions b4f079c7); válido até 21/09/2026; migrado em 16/09/2026'
 where assinante_id = '523714f3-3b7c-4db7-befc-284217a51971' and competencia = '2026-08';
-- o ciclo de setembro dela nasceu só da virada do mês: não existe
delete from clube_creditos where assinante_id = '523714f3-3b7c-4db7-befc-284217a51971' and competencia = '2026-09' and origem = 'legado_manual_bloqueado';
insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem, consumido_em)
select k.id, k.assinante_id, i.id, 'migracao', i.created_at
  from clube_creditos k join comanda_items i on i.id in ('a950fe51-00da-4996-a48a-29406f5db9fd','2b41f3fe-1313-457e-9f1e-7c3b57716b9a')
 where k.assinante_id = '523714f3-3b7c-4db7-befc-284217a51971';
-- Sandra (Asaas 05/09 17:12 BRT) e Janaina (Asaas 16/09 12:37 BRT): ciclo = pagamento confirmado + 30 dias
update clube_creditos set inicio = '2026-09-05 20:12:07.701383+00', fim = '2026-09-05 20:12:07.701383+00'::timestamptz + interval '30 days',
       asaas_payment_id = (select substring(description from 'pay_[a-z0-9]+') from financial_transactions where id = 'a62bb73c-c9d6-40b1-a1b1-489774b00195')
 where assinante_id = 'f371aad3-9dff-438e-bbaf-167de2762f54' and competencia = '2026-09';
update clube_creditos set inicio = '2026-09-16 15:37:08.738346+00', fim = '2026-09-16 15:37:08.738346+00'::timestamptz + interval '30 days',
       asaas_payment_id = (select substring(description from 'pay_[a-z0-9]+') from financial_transactions where id = 'c719e271-ba88-412e-90d9-0d346cd88c50')
 where assinante_id = '69a3caa9-9312-4332-9532-c99a79bcc55c' and competencia = '2026-09';
insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem, consumido_em)
select k.id, k.assinante_id, i.id, 'migracao', i.created_at
  from clube_creditos k join comanda_items i on i.id in ('662baede-01bc-4314-99cf-8ea30218b5ee','294ba1b0-519d-4c82-93e9-b110045fdfd8')
 where k.assinante_id = 'f371aad3-9dff-438e-bbaf-167de2762f54';
insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem, consumido_em)
select k.id, k.assinante_id, i.id, 'migracao', i.created_at
  from clube_creditos k join comanda_items i on i.id = '4644cbc8-a909-43c7-b8cb-066106355330'
 where k.assinante_id = '69a3caa9-9312-4332-9532-c99a79bcc55c';
-- a partir daqui todo ciclo tem inicio/fim
alter table clube_creditos alter column inicio set not null, alter column fim set not null;
alter table clube_creditos drop constraint if exists clube_creditos_ciclo_chk;
alter table clube_creditos add constraint clube_creditos_ciclo_chk check (fim > inicio);
create unique index if not exists clube_creditos_assinante_inicio_uidx on clube_creditos (assinante_id, inicio);
-- índice COMPLETO (não parcial): o upsert do PostgREST usa ON CONFLICT (asaas_payment_id) sem WHERE; NULLs não colidem
create unique index if not exists clube_creditos_asaas_payment_uidx on clube_creditos (asaas_payment_id);

-- 4) trigger da comanda: consome do ciclo ativo, nunca cria
create or replace function consome_credito_clube() returns trigger language plpgsql
security definer set search_path = public as $fn$
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
$fn$;
-- 5) RPCs da fila: consomem do ciclo ativo, nunca criam
CREATE OR REPLACE FUNCTION public.clube_entrar_fila(p_celular text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_digits text := regexp_replace(coalesce(p_celular, ''), '\D', '', 'g');
  v_ass clube_assinantes%rowtype;
  v_salon uuid;
  v_comp text;
  v_cred clube_creditos%rowtype;
  v_existing_id uuid;
  v_existing_pos int;
  v_client uuid;
  v_service uuid;
  v_pos int;
  v_entry_id uuid;
begin
  if length(v_digits) < 8 then
    return jsonb_build_object('ok', false, 'erro', 'celular_invalido');
  end if;

  select * into v_ass
    from clube_assinantes
   where status = 'ativo'
     and right(regexp_replace(coalesce(celular, ''), '\D', '', 'g'), 9) = right(v_digits, 9)
   order by updated_at desc
   limit 1;
  if not found then
    select * into v_ass
      from clube_assinantes
     where status = 'ativo'
       and right(regexp_replace(coalesce(celular, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
     order by updated_at desc
     limit 1;
  end if;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  end if;

  select id into v_salon from salons limit 1;

  select id, position into v_existing_id, v_existing_pos
    from queue_entries
   where salon_id = v_salon
     and status in ('waiting', 'checked_in', 'in_service')
     and right(regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
   limit 1;
  if v_existing_id is not null then
    return jsonb_build_object('ok', false, 'erro', 'ja_na_fila',
      'entry_id', v_existing_id, 'position', v_existing_pos);
  end if;

  -- 16/09/2026 (ciclo): crédito só nasce no webhook; aqui só procura o CICLO ATIVO (inicio <= agora < fim) e trava.
  select * into v_cred
    from clube_creditos
   where assinante_id = v_ass.id and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
     and inicio <= now() and now() < fim and creditos_usados < creditos_total
   order by fim asc
   limit 1
   for update;
  if not found then
    select * into v_cred from clube_creditos
     where assinante_id = v_ass.id and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
       and inicio <= now() and now() < fim
     order by fim asc limit 1;
    if found then
      return jsonb_build_object('ok', false, 'erro', 'teto_atingido',
        'usadas', v_cred.creditos_usados, 'total', v_cred.creditos_total, 'valido_ate', v_cred.fim);
    end if;
    return jsonb_build_object('ok', false, 'erro', 'sem_mensalidade', 'mensagem', 'Não há mensalidade confirmada do Clube válida para hoje. Faça a renovação no cartão antes de liberar a escova.');
  end if;

  select id into v_client
    from clients
   where salon_id = v_salon
     and right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
   limit 1;
  if v_client is null then
    insert into clients (salon_id, name, phone, email)
    values (v_salon, coalesce(v_ass.nome, 'Assinante Clube'), v_digits, v_ass.email)
    returning id into v_client;
  end if;

  -- escova do Clube pelo PLANO: 4x_longo/8x_longo → ESCOVA LISA - LONGO;
  -- demais planos → variante curto/médio (menor preço). Fallback: qualquer
  -- ESCOVA LISA ativa (catálogo antigo), mais barata primeiro.
  select id into v_service
    from services
   where salon_id = v_salon and is_active = true
     and name ilike 'ESCOVA LISA%'
     and (case when coalesce(v_ass.plano, '') ilike '%longo%'
               then name ilike '%LONGO'
               else name not ilike '%LONGO' end)
   order by price asc
   limit 1;
  if v_service is null then
    select id into v_service
      from services
     where salon_id = v_salon and is_active = true and name ilike 'ESCOVA LISA%'
     order by price asc
     limit 1;
  end if;

  select coalesce(max(position), 0) + 1 into v_pos
    from queue_entries
   where salon_id = v_salon and status in ('waiting', 'checked_in', 'in_service');

  insert into queue_entries (
    salon_id, customer_id, customer_name, customer_phone, customer_email,
    service_id, source, position, notify_minutes_before,
    payment_status, payment_method, status
  ) values (
    v_salon, v_client, coalesce(v_ass.nome, 'Assinante Clube'), v_digits, v_ass.email,
    v_service, 'online', v_pos, 40,
    'credit', 'clube', 'waiting'
  ) returning id into v_entry_id;

  update clube_creditos set creditos_usados = creditos_usados + 1 where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, queue_entry_id, origem) values (v_cred.id, v_ass.id, v_entry_id, 'fila');

  return jsonb_build_object('ok', true,
    'entry_id', v_entry_id, 'position', v_pos,
    'nome', v_ass.nome,
    'usadas', v_cred.creditos_usados + 1, 'total', v_cred.creditos_total, 'valido_ate', v_cred.fim);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.clube_entrar_fila(p_celular text, p_otp text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_digits text := regexp_replace(COALESCE(p_celular, ''), '\D', '', 'g');
  v_otp clube_otp%ROWTYPE;
  v_ass clube_assinantes%ROWTYPE;
  v_salon uuid;
  v_comp text;
  v_cred clube_creditos%ROWTYPE;
  v_existing_id uuid;
  v_existing_pos int;
  v_client uuid;
  v_service uuid;
  v_pos int;
  v_entry_id uuid;
  v_token uuid;
BEGIN
  IF length(v_digits) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'celular_invalido');
  END IF;
  IF p_otp IS NULL OR length(trim(p_otp)) <> 6 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'otp_invalido');
  END IF;

  -- ── Prova de posse: OTP válido, não usado, não expirado, < 5 tentativas ──
  SELECT * INTO v_otp
    FROM clube_otp
   WHERE right(celular_digits, 8) = right(v_digits, 8)
     AND used = false
     AND expires_at > now()
   ORDER BY created_at DESC
   LIMIT 1
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'otp_expirado');
  END IF;
  IF v_otp.attempts >= 5 THEN
    UPDATE clube_otp SET used = true WHERE id = v_otp.id;
    RETURN jsonb_build_object('ok', false, 'erro', 'otp_bloqueado');
  END IF;
  IF v_otp.code_hash <> encode(digest(trim(p_otp) || v_otp.id::text, 'sha256'), 'hex') THEN
    UPDATE clube_otp SET attempts = attempts + 1 WHERE id = v_otp.id;
    RETURN jsonb_build_object('ok', false, 'erro', 'otp_incorreto');
  END IF;
  UPDATE clube_otp SET used = true WHERE id = v_otp.id;

  -- ── Daqui pra baixo: mesma lógica de negócio da versão anterior ──────────
  SELECT * INTO v_ass
    FROM clube_assinantes
   WHERE status = 'ativo'
     AND right(regexp_replace(COALESCE(celular, ''), '\D', '', 'g'), 9) = right(v_digits, 9)
   ORDER BY updated_at DESC
   LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_ass
      FROM clube_assinantes
     WHERE status = 'ativo'
       AND right(regexp_replace(COALESCE(celular, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
     ORDER BY updated_at DESC
     LIMIT 1;
  END IF;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'nao_encontrado');
  END IF;

  SELECT id INTO v_salon FROM salons ORDER BY created_at LIMIT 1;

  SELECT id, position INTO v_existing_id, v_existing_pos
    FROM queue_entries
   WHERE salon_id = v_salon
     AND status IN ('waiting', 'checked_in', 'in_service')
     AND right(regexp_replace(COALESCE(customer_phone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
   LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'ja_na_fila', 'position', v_existing_pos);
  END IF;

  -- 16/09/2026 (ciclo): crédito só nasce no webhook; aqui só procura o CICLO ATIVO (inicio <= agora < fim) e trava.
  select * into v_cred
    from clube_creditos
   where assinante_id = v_ass.id and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
     and inicio <= now() and now() < fim and creditos_usados < creditos_total
   order by fim asc
   limit 1
   for update;
  if not found then
    select * into v_cred from clube_creditos
     where assinante_id = v_ass.id and not bloqueado and origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual')
       and inicio <= now() and now() < fim
     order by fim asc limit 1;
    if found then
      return jsonb_build_object('ok', false, 'erro', 'teto_atingido',
        'usadas', v_cred.creditos_usados, 'total', v_cred.creditos_total, 'valido_ate', v_cred.fim);
    end if;
    return jsonb_build_object('ok', false, 'erro', 'sem_mensalidade', 'mensagem', 'Não há mensalidade confirmada do Clube válida para hoje. Faça a renovação no cartão antes de liberar a escova.');
  end if;

  SELECT id INTO v_client
    FROM clients
   WHERE salon_id = v_salon
     AND right(regexp_replace(COALESCE(phone, ''), '\D', '', 'g'), 8) = right(v_digits, 8)
   LIMIT 1;
  IF v_client IS NULL THEN
    INSERT INTO clients (salon_id, name, phone, email)
    VALUES (v_salon, COALESCE(v_ass.nome, 'Assinante Clube'), v_digits, v_ass.email)
    RETURNING id INTO v_client;
  END IF;

  SELECT id INTO v_service
    FROM services
   WHERE salon_id = v_salon AND is_active = true AND name ILIKE 'ESCOVA LISA%'
   ORDER BY price ASC
   LIMIT 1;

  SELECT COALESCE(MAX(position), 0) + 1 INTO v_pos
    FROM queue_entries
   WHERE salon_id = v_salon AND status IN ('waiting', 'checked_in', 'in_service');

  INSERT INTO queue_entries (
    salon_id, customer_id, customer_name, customer_phone, customer_email,
    service_id, source, position, notify_minutes_before,
    payment_status, payment_method, status
  ) VALUES (
    v_salon, v_client, COALESCE(v_ass.nome, 'Assinante Clube'), v_digits, v_ass.email,
    v_service, 'online', v_pos, 40,
    'credit', 'clube', 'waiting'
  ) RETURNING id, tracking_token INTO v_entry_id, v_token;

  update clube_creditos set creditos_usados = creditos_usados + 1 where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, queue_entry_id, origem) values (v_cred.id, v_ass.id, v_entry_id, 'fila');

  -- Devolve o TOKEN opaco (acompanhamento), não o id interno.
  RETURN jsonb_build_object('ok', true,
    'tracking_token', v_token, 'position', v_pos,
    'nome', v_ass.nome,
    'usadas', v_cred.creditos_usados + 1, 'total', v_cred.creditos_total, 'valido_ate', v_cred.fim);
END;
$function$
;
