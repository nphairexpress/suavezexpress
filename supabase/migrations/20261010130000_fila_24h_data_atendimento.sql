-- 10/10/2026 — Fila online vende 24 horas (regra nova do dono).
-- queue_settings (open_weekdays, open_time, close_time, closed_dates) deixa de ser bloqueio de venda
-- e passa a ser o HORÁRIO DE ATENDIMENTO: quem compra fora do horário é atendida na próxima abertura.
--
-- 1. fila_data_atendimento(salon, ts): em que dia (fuso America/Sao_Paulo) a entrada criada em ts é atendida.
--    queue_paused NÃO entra na conta (pausa é operacional, não muda a data).
-- 2. fila_minha_situacao(token): + atendimento_em, hoje, salao_aberto, abre.
-- 3. fila_creditos_fim_do_dia(): "criada hoje" vira "atendimento é hoje" — compra das 21h fica pra amanhã
--    e não vira crédito. Parte da definição viva (= 20260829120000), só o filtro de data mudou.
-- fila_public_bootstrap() e fila_estado_abertura() não mudam.

-- ── 1. data de atendimento ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fila_data_atendimento(p_salon uuid, p_ts timestamptz)
RETURNS date
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s        queue_settings%ROWTYPE;
  v_local  timestamp;
  v_dia    date;
  v_i      int;
BEGIN
  IF p_ts IS NULL THEN
    RETURN NULL;
  END IF;

  v_local := (p_ts AT TIME ZONE 'America/Sao_Paulo');
  v_dia   := v_local::date;

  SELECT * INTO s FROM queue_settings WHERE salon_id = p_salon;
  IF NOT FOUND THEN
    RETURN v_dia;   -- sem configuração: atende no próprio dia
  END IF;

  -- dia aberto e ainda antes do fechamento (inclusive antes de abrir) → atende hoje
  IF EXTRACT(dow FROM v_dia)::int = ANY(s.open_weekdays)
     AND NOT (v_dia = ANY(s.closed_dates))
     AND v_local::time < s.close_time THEN
    RETURN v_dia;
  END IF;

  -- senão, próxima data aberta (14 dias à frente)
  FOR v_i IN 1..14 LOOP
    IF EXTRACT(dow FROM (v_dia + v_i))::int = ANY(s.open_weekdays)
       AND NOT ((v_dia + v_i) = ANY(s.closed_dates)) THEN
      RETURN v_dia + v_i;
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.fila_data_atendimento(uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fila_data_atendimento(uuid, timestamptz) TO anon, authenticated, service_role;

-- ── 2. situação da cliente + data de atendimento ────────────────────────────
CREATE OR REPLACE FUNCTION public.fila_minha_situacao(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entry queue_entries%ROWTYPE;
  v_ahead int;
  v_profs int;
  v_ahead_min numeric;
  v_names text;
  v_abre text;
BEGIN
  SELECT * INTO v_entry FROM queue_entries WHERE tracking_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT count(*)::int INTO v_profs
    FROM professionals WHERE salon_id = v_entry.salon_id AND is_active = true;
  IF v_profs = 0 THEN v_profs := 1; END IF;

  SELECT count(*)::int,
         COALESCE(SUM(m.total), 0)
    INTO v_ahead, v_ahead_min
    FROM queue_entries qe
    CROSS JOIN LATERAL (
      SELECT COALESCE(
               (SELECT SUM(COALESCE(s.duration_minutes, 45))
                  FROM jsonb_array_elements_text(COALESCE(qe.service_ids, to_jsonb(ARRAY[qe.service_id::text]))) AS sid
                  JOIN services s ON s.id = sid::uuid),
               45) AS total
    ) m
   WHERE qe.salon_id = v_entry.salon_id
     AND qe.status IN ('waiting', 'checked_in')
     AND qe.position < v_entry.position;

  SELECT string_agg(s.name, ' + ' ORDER BY s.name) INTO v_names
    FROM jsonb_array_elements_text(COALESCE(v_entry.service_ids, to_jsonb(ARRAY[v_entry.service_id::text]))) AS sid
    JOIN services s ON s.id = sid::uuid;

  SELECT to_char(open_time, 'HH24:MI') INTO v_abre
    FROM queue_settings WHERE salon_id = v_entry.salon_id;

  RETURN jsonb_build_object(
    'found', true,
    'status', v_entry.status,
    'payment_status', v_entry.payment_status,
    'people_ahead', v_ahead,
    'estimated_minutes', CEIL(v_ahead_min / v_profs),
    'service_names', COALESCE(v_names, ''),
    'customer_first_name', split_part(v_entry.customer_name, ' ', 1),
    'atendimento_em', public.fila_data_atendimento(v_entry.salon_id, v_entry.created_at),
    'hoje', (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    'salao_aberto', COALESCE((public.fila_estado_abertura(v_entry.salon_id)->>'aberta')::boolean, true),
    'abre', v_abre
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fila_minha_situacao(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fila_minha_situacao(uuid) TO anon, authenticated;

-- ── 3. crédito de fim do dia: só quem tinha atendimento HOJE ────────────────
CREATE OR REPLACE FUNCTION public.fila_creditos_fim_do_dia()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_qtd int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT qe.id, qe.salon_id, qe.customer_id, qe.customer_phone,
           COALESCE(
             qe.paid_amount,
             (SELECT SUM(COALESCE(s.price, 0))
                FROM jsonb_array_elements_text(COALESCE(qe.service_ids, to_jsonb(ARRAY[qe.service_id::text]))) AS sid
                JOIN services s ON s.id = sid::uuid),
             0) AS valor,
           COALESCE(qs.credit_validity_days, 30) AS validade
      FROM queue_entries qe
      LEFT JOIN queue_settings qs ON qs.salon_id = qe.salon_id
     WHERE public.fila_data_atendimento(qe.salon_id, qe.created_at) = v_hoje   -- 10/10: era "criada hoje"
       AND qe.payment_status = 'confirmed'
       AND (
             qe.status IN ('waiting', 'checked_in')   -- regra única: no_show/cancelled NÃO
             OR (
               -- 29/08: 'in_service' sem o pagamento online lançado em comanda = não foi atendida
               qe.status = 'in_service'
               AND qe.source = 'online'
               AND qe.payment_id IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM payments p
                                WHERE p.provider_payment_id = qe.payment_id AND NOT p.voided)
             )
           )
       AND NOT EXISTS (SELECT 1 FROM customer_credits cc WHERE cc.origin_queue_entry_id = qe.id)
  LOOP
    INSERT INTO customer_credits (salon_id, customer_id, customer_phone, amount,
                                  origin_queue_entry_id, expires_at, used)
    VALUES (r.salon_id, r.customer_id, r.customer_phone, r.valor,
            r.id, now() + make_interval(days => r.validade), false)
    ON CONFLICT DO NOTHING;

    UPDATE queue_entries
       SET status = 'no_show', payment_status = 'credit', updated_at = now()
     WHERE id = r.id;

    v_qtd := v_qtd + 1;
  END LOOP;

  RETURN jsonb_build_object('dia', v_hoje, 'creditos_gerados', v_qtd);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.fila_creditos_fim_do_dia() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fila_creditos_fim_do_dia() FROM anon;
REVOKE EXECUTE ON FUNCTION public.fila_creditos_fim_do_dia() FROM authenticated;
