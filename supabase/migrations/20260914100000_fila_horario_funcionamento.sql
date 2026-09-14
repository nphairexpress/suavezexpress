-- Fila online vendia com o salão fechado (casos Vanessa 01/09 e Letícia 08/09,
-- as duas pagaram em dia de porta fechada e viraram crédito).
-- A fila não tinha nenhum conceito de horário: a compra validava só CPF e telefone.
--
-- Aqui entra o horário de funcionamento da FILA, e quem decide se está aberta é o
-- SERVIDOR (fuso America/Sao_Paulo) — nunca o relógio do celular da cliente.

ALTER TABLE queue_settings
  ADD COLUMN IF NOT EXISTS open_weekdays  int[] NOT NULL DEFAULT '{2,3,4,5,6}',  -- 0=dom .. 6=sab
  ADD COLUMN IF NOT EXISTS open_time      time  NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS close_time     time  NOT NULL DEFAULT '18:00',
  ADD COLUMN IF NOT EXISTS closed_dates   date[] NOT NULL DEFAULT '{}',          -- feriado, emenda, fechamento pontual
  ADD COLUMN IF NOT EXISTS queue_paused   boolean NOT NULL DEFAULT false;        -- "fechar a fila hoje", manual

COMMENT ON COLUMN queue_settings.open_weekdays IS 'Dias em que a fila online aceita compra. 0=domingo .. 6=sabado.';
COMMENT ON COLUMN queue_settings.closed_dates  IS 'Datas especificas fechadas (feriado/emenda), mesmo caindo em dia util.';
COMMENT ON COLUMN queue_settings.queue_paused  IS 'Trava manual da recepcao: fecha a fila agora, independente do horario.';

-- ── estado da fila, calculado no servidor ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.fila_estado_abertura(p_salon uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s          queue_settings%ROWTYPE;
  v_agora    timestamp;
  v_hoje     date;
  v_dow      int;
  v_aberta   boolean;
  v_motivo   text;
  v_prox     date;
  v_i        int;
BEGIN
  SELECT * INTO s FROM queue_settings WHERE salon_id = p_salon;
  IF NOT FOUND THEN
    -- sem configuração não se inventa regra: mantém o comportamento antigo
    RETURN jsonb_build_object('aberta', true, 'motivo', NULL, 'proxima_abertura', NULL);
  END IF;

  v_agora := (now() AT TIME ZONE 'America/Sao_Paulo');
  v_hoje  := v_agora::date;
  v_dow   := EXTRACT(dow FROM v_agora)::int;

  IF s.queue_paused THEN
    v_aberta := false; v_motivo := 'pausada';
  ELSIF v_hoje = ANY(s.closed_dates) THEN
    v_aberta := false; v_motivo := 'fechado_hoje';
  ELSIF NOT (v_dow = ANY(s.open_weekdays)) THEN
    v_aberta := false; v_motivo := 'fechado_hoje';
  ELSIF v_agora::time < s.open_time THEN
    v_aberta := false; v_motivo := 'ainda_nao_abriu';
  ELSIF v_agora::time >= s.close_time THEN
    v_aberta := false; v_motivo := 'ja_fechou';
  ELSE
    v_aberta := true; v_motivo := NULL;
  END IF;

  -- próxima data em que a fila abre (olha os 14 dias seguintes)
  v_prox := NULL;
  IF NOT v_aberta THEN
    FOR v_i IN (CASE WHEN v_motivo = 'ainda_nao_abriu' THEN 0 ELSE 1 END)..14 LOOP
      IF EXTRACT(dow FROM (v_hoje + v_i))::int = ANY(s.open_weekdays)
         AND NOT ((v_hoje + v_i) = ANY(s.closed_dates)) THEN
        v_prox := v_hoje + v_i;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'aberta', v_aberta,
    'motivo', v_motivo,
    'abre', to_char(s.open_time, 'HH24:MI'),
    'fecha', to_char(s.close_time, 'HH24:MI'),
    'proxima_abertura', v_prox
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fila_estado_abertura(uuid) TO anon, authenticated;

-- ── bootstrap público passa a carregar o estado da fila ─────────────────────
CREATE OR REPLACE FUNCTION public.fila_public_bootstrap()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_salon uuid;
  v_profs int;
  v_total_min numeric;
  v_count int;
BEGIN
  SELECT id INTO v_salon FROM salons ORDER BY created_at LIMIT 1;
  IF v_salon IS NULL THEN
    RETURN jsonb_build_object('salon_id', NULL);
  END IF;

  SELECT count(*)::int INTO v_profs
    FROM professionals WHERE salon_id = v_salon AND is_active = true;
  IF v_profs = 0 THEN v_profs := 1; END IF;

  SELECT count(*)::int,
         COALESCE(SUM(entry_min.total), 0)
    INTO v_count, v_total_min
    FROM queue_entries qe
    CROSS JOIN LATERAL (
      SELECT COALESCE(
               (SELECT SUM(COALESCE(s.duration_minutes, 45))
                  FROM jsonb_array_elements_text(COALESCE(qe.service_ids, to_jsonb(ARRAY[qe.service_id::text]))) AS sid
                  JOIN services s ON s.id = sid::uuid),
               45) AS total
    ) entry_min
   WHERE qe.salon_id = v_salon
     AND qe.status IN ('waiting', 'checked_in');

  RETURN jsonb_build_object(
    'salon_id', v_salon,
    'settings', (SELECT jsonb_build_object(
                   'inflation_factor', inflation_factor,
                   'credit_validity_days', credit_validity_days,
                   'notify_options', notify_options)
                   FROM queue_settings WHERE salon_id = v_salon),
    'fila', public.fila_estado_abertura(v_salon),
    'services', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                   'id', id, 'name', name, 'price', price,
                   'duration_minutes', duration_minutes,
                   'category', category, 'description', description)
                   ORDER BY sort_order, price, name)
                   FROM services
                  WHERE salon_id = v_salon AND is_active = true AND queue_enabled = true), '[]'::jsonb),
    'stats', jsonb_build_object(
      'total_in_queue', v_count,
      'estimated_minutes', CEIL(v_total_min / v_profs),
      'active_professionals', v_profs)
  );
END;
$$;
