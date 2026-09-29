-- Reversão de 20261005100000_etapa5_caixa_por_salao_e_exclusao.sql
-- rpc_fechar_caixa e fn_guard_comanda_update voltam às definições VIVAS exportadas em 29/09/2026 ~21h
-- (pg_get_functiondef em produção DEPOIS da etapa 4: rpc_fechar_caixa igual ao backup
-- 20260929-162321-etapa0-inicial; fn_guard_comanda_update já com a porta app.via_rpc da etapa 4).

drop function if exists public.rpc_abrir_caixa(numeric, text);
drop function if exists public.rpc_iniciar_atendimento(uuid, uuid, uuid, uuid, text);
drop function if exists public.rpc_excluir_comanda(uuid, text);

alter table public.comanda_deletions drop column if exists snapshot;

CREATE OR REPLACE FUNCTION public.rpc_fechar_caixa(p_caixa uuid, p_closing_balance numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_caixa caixas%ROWTYPE;
  v_abertas int;
BEGIN
  IF v_uid IS NULL OR NOT fn_role_operacao_caixa(v_uid) THEN
    RAISE EXCEPTION 'Sem permissão para fechar caixa';
  END IF;
  v_salon := get_user_salon_id(v_uid);

  SELECT * INTO v_caixa FROM caixas WHERE id = p_caixa AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrado'; END IF;
  IF v_caixa.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Caixa já está fechado'; END IF;

  SELECT count(*) INTO v_abertas
    FROM comandas WHERE salon_id = v_salon AND closed_at IS NULL;
  IF v_abertas > 0 THEN
    RAISE EXCEPTION 'Existem % comanda(s) aberta(s). Feche todas antes de fechar o caixa.', v_abertas;
  END IF;

  UPDATE caixas
     SET closed_at = now(), closing_balance = p_closing_balance,
         notes = COALESCE(p_notes, notes), updated_at = now()
   WHERE id = p_caixa;

  RETURN jsonb_build_object('ok', true, 'caixa_id', p_caixa);
END;
$function$;

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
  -- etapa 4: escrita vinda de RPC transacional (set_config('app.via_rpc','1',true)) também passa
  IF v_uid IS NULL OR fn_role_operacao_caixa(v_uid)
     OR current_setting('app.via_rpc', true) = '1' THEN
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
$function$;

-- grants como estavam (etapa 1 já tinha tirado public/anon)
revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
revoke execute on function public.fn_guard_comanda_update() from public, anon;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;
