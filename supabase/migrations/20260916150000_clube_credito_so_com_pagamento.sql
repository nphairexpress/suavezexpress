-- 16/09/2026 — Crédito do Clube SÓ existe com cobrança confirmada no Asaas.
-- Caso Gisele: assinatura ativada manualmente em 22/08 (asaas_subscription_id nulo); na virada
-- do mês o trigger/RPC criavam 4 créditos novos só porque ela seguia 'ativo'.
-- Regra: quem cria/renova clube_creditos é APENAS o webhook asaas-webhook (PAYMENT_CONFIRMED/RECEIVED
-- de assinatura). consome_credito_clube() e clube_entrar_fila() só procuram e travam (for update).
-- Aplicada direto no banco via Management API em 16/09/2026 (este arquivo versiona).

-- 1) origem auditável do crédito
alter table clube_creditos
  add column if not exists origem text not null default 'legado',
  add column if not exists asaas_payment_id text,
  add column if not exists bloqueado boolean not null default false,
  add column if not exists bloqueado_em timestamptz,
  add column if not exists motivo_bloqueio text;
alter table clube_creditos drop constraint if exists clube_creditos_origem_chk;
alter table clube_creditos add constraint clube_creditos_origem_chk
  check (origem in ('asaas_pagamento','asaas_assinatura_backfill','legado_manual','legado_manual_bloqueado','legado'));
comment on column clube_creditos.origem is 'asaas_pagamento = criado pelo webhook com pagamento confirmado; asaas_assinatura_backfill = anterior a 16/09 de assinante com subscription no Asaas; legado_manual = competência passada de cadastro manual (histórico); legado_manual_bloqueado = cadastro manual sem cobrança recorrente, créditos restantes bloqueados';

-- 2) backfill: assinantes com assinatura no Asaas → confirmados
update clube_creditos k set origem = 'asaas_assinatura_backfill'
  from clube_assinantes a
 where a.id = k.assinante_id and a.asaas_subscription_id is not null and k.origem = 'legado';

-- 3) cadastros manuais (sem subscription): competência atual/futura → bloquear o que resta, sem apagar uso
update clube_creditos k
   set origem = 'legado_manual_bloqueado', bloqueado = true, bloqueado_em = now(),
       motivo_bloqueio = 'assinatura manual sem cobrança recorrente no Asaas (asaas_subscription_id nulo); créditos restantes bloqueados em 16/09/2026; uso já feito preservado; total original ' || k.creditos_total,
       creditos_total = k.creditos_usados
  from clube_assinantes a
 where a.id = k.assinante_id and a.asaas_subscription_id is null and k.origem = 'legado'
   and k.competencia >= to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM');
-- competências passadas de cadastro manual: só histórico
update clube_creditos k set origem = 'legado_manual'
  from clube_assinantes a
 where a.id = k.assinante_id and a.asaas_subscription_id is null and k.origem = 'legado';

-- 4) trigger da comanda: nunca cria crédito
create or replace function consome_credito_clube() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_cli uuid; v_fone text; v_ass uuid; v_teto int; v_plano text;
  v_comp text; v_usados int; v_total int; v_cheio numeric; v_bloq boolean; v_origem text;
  c_sem_mensalidade constant text := 'Não há mensalidade confirmada do Clube para este período. Faça a assinatura no cartão antes de liberar a escova.';
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
  -- 16/09/2026: crédito só nasce no webhook de pagamento confirmado do Asaas; aqui só procura e trava.
  select creditos_usados, creditos_total, bloqueado, origem into v_usados, v_total, v_bloq, v_origem
    from clube_creditos where assinante_id = v_ass and competencia = v_comp for update;
  if not found or v_bloq or v_origem not in ('asaas_pagamento','asaas_assinatura_backfill') then
    raise exception '%', c_sem_mensalidade;
  end if;
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

-- 5) RPCs da fila: nunca criam crédito
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

  v_comp := to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM');
  -- 16/09/2026: crédito só nasce no webhook de pagamento confirmado do Asaas; aqui só procura e trava.

  select * into v_cred
    from clube_creditos
   where assinante_id = v_ass.id and competencia = v_comp
   for update;
  if not found or v_cred.bloqueado or v_cred.origem not in ('asaas_pagamento','asaas_assinatura_backfill') then
    return jsonb_build_object('ok', false, 'erro', 'sem_mensalidade', 'mensagem', 'Não há mensalidade confirmada do Clube para este período. Faça a assinatura no cartão antes de liberar a escova.');
  end if;
  if v_cred.creditos_usados >= v_cred.creditos_total then
    return jsonb_build_object('ok', false, 'erro', 'teto_atingido',
      'usadas', v_cred.creditos_usados, 'total', v_cred.creditos_total);
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

  update clube_creditos
     set creditos_usados = creditos_usados + 1
   where assinante_id = v_ass.id and competencia = v_comp;

  return jsonb_build_object('ok', true,
    'entry_id', v_entry_id, 'position', v_pos,
    'nome', v_ass.nome,
    'usadas', v_cred.creditos_usados + 1, 'total', v_cred.creditos_total);
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

  v_comp := to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM');
  -- 16/09/2026: crédito só nasce no webhook de pagamento confirmado do Asaas; aqui só procura e trava.

  SELECT * INTO v_cred
    FROM clube_creditos
   WHERE assinante_id = v_ass.id AND competencia = v_comp
   FOR UPDATE;
  if not found or v_cred.bloqueado or v_cred.origem not in ('asaas_pagamento','asaas_assinatura_backfill') then
    return jsonb_build_object('ok', false, 'erro', 'sem_mensalidade', 'mensagem', 'Não há mensalidade confirmada do Clube para este período. Faça a assinatura no cartão antes de liberar a escova.');
  end if;
  IF v_cred.creditos_usados >= v_cred.creditos_total THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'teto_atingido',
      'usadas', v_cred.creditos_usados, 'total', v_cred.creditos_total);
  END IF;

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

  UPDATE clube_creditos
     SET creditos_usados = creditos_usados + 1
   WHERE assinante_id = v_ass.id AND competencia = v_comp;

  -- Devolve o TOKEN opaco (acompanhamento), não o id interno.
  RETURN jsonb_build_object('ok', true,
    'tracking_token', v_token, 'position', v_pos,
    'nome', v_ass.nome,
    'usadas', v_cred.creditos_usados + 1, 'total', v_cred.creditos_total);
END;
$function$
;
