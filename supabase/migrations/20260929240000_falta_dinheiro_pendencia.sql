-- 29/09/2026 — Pendência automática de FALTA de dinheiro no fechamento do caixa.
-- Decisão do dono: falta gera pendência; SOBRA não gera nada (nem alerta, nem bloqueio).
--
-- O que muda:
--   a. closure_issues.issue_type aceita o tipo novo 'falta_dinheiro'.
--   b. rpc_fechar_caixa (reescrita a partir da definição VIVA da etapa 5) calcula
--        esperado_dinheiro = opening_balance
--                          + Σ payments válidos (voided = false) em dinheiro das comandas deste caixa
--                          + suprimentos em dinheiro − sangrias em dinheiro
--      e, se p_closing_balance < esperado − 0.01, grava UMA closure_issues 'falta_dinheiro'
--      (severidade high, status open, detected_date = dia operacional do caixa, caixa_id nos jsonb)
--      no mesmo formato que a tela /pendencias lê (description humana + expected_value/actual_value).
--      Nunca bloqueia o fechamento. Retorno: {ok, caixa_id, closing_balance, esperado_dinheiro, contado, falta}.
--   c. Trigger fn_protege_issue_falta_dinheiro: a Edge Function daily-report apaga TODAS as issues
--      'open' do dia antes de reinserir as dela (idempotência, index.ts §9). Sem esta proteção a
--      pendência de falta sumiria na manhã seguinte. O trigger ignora o DELETE de linhas
--      'falta_dinheiro' salvo com set_config('app.force_delete_issue','1',true).
--
-- Premissas:
--   - estorno_reabertura NÃO entra na conta: o pagamento reaberto/excluído já sai da soma por
--     voided=true (ou por ter sido apagado); subtrair o estorno de novo contaria duas vezes.
--   - A conta parte dos pagamentos, não de caixas.total_cash (que é GREATEST(0, …) e pode mentir).
--   - Assinatura, permissão (fn_role_operacao_caixa) e travas da etapa 5 mantidas.
--
-- Aplicar pela Management API em transação única. Reversão:
--   20260929240000_falta_dinheiro_pendencia.rollback.sql

-- ── a. tipo novo ─────────────────────────────────────────────────────────────
alter table public.closure_issues drop constraint if exists closure_issues_issue_type_check;
alter table public.closure_issues add constraint closure_issues_issue_type_check
  check (issue_type = any (array[
    'payment_method_mismatch','value_mismatch','comanda_open_24h','professional_missing',
    'duplicate_service_same_client','paid_without_payment','payment_without_paid_flag',
    'pagbank_orphan_transaction','cashback_overdraft','asaas_payment_pending',
    'falta_dinheiro'
  ]));

-- ── b. rpc_fechar_caixa (reescrita a partir da viva) ─────────────────────────
create or replace function public.rpc_fechar_caixa(p_caixa uuid, p_closing_balance numeric default null, p_notes text default null)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_caixa caixas%rowtype;
  v_dia date;
  v_qtd int;
  v_numeros text;
  v_din_comandas numeric := 0;
  v_suprimentos numeric := 0;
  v_sangrias numeric := 0;
  v_esperado numeric := 0;
  v_falta numeric := 0;
begin
  if v_uid is null or not fn_role_operacao_caixa(v_uid) then
    raise exception 'Sem permissão para fechar caixa';
  end if;
  v_salon := get_user_salon_id(v_uid);

  if p_closing_balance is null then
    raise exception 'Informe o valor conferido em dinheiro para fechar o caixa';
  end if;
  if p_closing_balance < 0 then raise exception 'Valor conferido inválido'; end if;

  select * into v_caixa from caixas where id = p_caixa and salon_id = v_salon for update;
  if not found then raise exception 'Caixa não encontrado'; end if;
  if v_caixa.closed_at is not null then raise exception 'Caixa já está fechado'; end if;
  v_dia := (v_caixa.opened_at at time zone 'America/Sao_Paulo')::date;

  -- Travam: comandas abertas vinculadas a este caixa OU sem caixa criadas até o dia do caixa.
  select count(*),
         string_agg('#' || coalesce(comanda_number::text, left(id::text, 8)), ', ' order by comanda_number)
    into v_qtd, v_numeros
    from comandas
   where salon_id = v_salon and closed_at is null
     and (caixa_id = p_caixa
          or (caixa_id is null and (created_at at time zone 'America/Sao_Paulo')::date <= v_dia));
  if v_qtd > 0 then
    raise exception 'Existem % comanda(s) aberta(s) que travam este caixa: %. Feche ou exclua antes de fechar o caixa.',
      v_qtd, v_numeros
      using detail = v_numeros;
  end if;

  -- Dinheiro esperado na gaveta: saldo inicial + dinheiro das comandas deste caixa + suprimentos − sangrias.
  select coalesce(sum(p.amount), 0) into v_din_comandas
    from payments p
    join comandas c on c.id = p.comanda_id
   where c.caixa_id = p_caixa
     and p.voided = false
     and p.payment_method = 'cash';

  select coalesce(sum(amount) filter (where type = 'suprimento'), 0),
         coalesce(sum(amount) filter (where type = 'sangria'), 0)
    into v_suprimentos, v_sangrias
    from caixa_movements
   where caixa_id = p_caixa and payment_method = 'cash';

  v_esperado := round(coalesce(v_caixa.opening_balance, 0) + v_din_comandas + v_suprimentos - v_sangrias, 2);

  update caixas
     set closed_at = now(), closing_balance = p_closing_balance,
         notes = coalesce(p_notes, notes), updated_at = now()
   where id = p_caixa;

  -- Falta gera pendência; sobra não gera nada.
  if p_closing_balance < v_esperado - 0.01 then
    v_falta := round(v_esperado - p_closing_balance, 2);
    insert into closure_issues
      (salon_id, comanda_id, professional_id, detected_date, issue_type, severity, description,
       expected_value, actual_value, status)
    values
      (v_salon, null, null, v_dia, 'falta_dinheiro', 'high',
       format('Faltam R$ %s em dinheiro no caixa de %s: contado R$ %s, esperado R$ %s',
              replace(to_char(v_falta, 'FM999999990.00'), '.', ','),
              to_char(v_dia, 'DD/MM'),
              replace(to_char(p_closing_balance, 'FM999999990.00'), '.', ','),
              replace(to_char(v_esperado, 'FM999999990.00'), '.', ',')),
       jsonb_build_object(
         'esperado_dinheiro', v_esperado,
         'saldo_inicial', coalesce(v_caixa.opening_balance, 0),
         'dinheiro_comandas', v_din_comandas,
         'suprimentos', v_suprimentos,
         'sangrias', v_sangrias,
         'caixa_id', p_caixa),
       jsonb_build_object(
         'contado', p_closing_balance,
         'falta', v_falta,
         'caixa_id', p_caixa),
       'open');
  end if;

  return jsonb_build_object(
    'ok', true,
    'caixa_id', p_caixa,
    'closing_balance', p_closing_balance,
    'esperado_dinheiro', v_esperado,
    'contado', p_closing_balance,
    'falta', v_falta);
end
$fn$;

revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;

-- ── c. proteção contra o DELETE idempotente do daily-report ──────────────────
create or replace function public.fn_protege_issue_falta_dinheiro()
returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if old.issue_type = 'falta_dinheiro'
     and coalesce(current_setting('app.force_delete_issue', true), '') <> '1' then
    return null;  -- ignora o delete (a pendência de falta só sai por status, não por reprocessamento do dia)
  end if;
  return old;
end
$fn$;

drop trigger if exists trg_protege_issue_falta_dinheiro on public.closure_issues;
create trigger trg_protege_issue_falta_dinheiro
  before delete on public.closure_issues
  for each row execute function public.fn_protege_issue_falta_dinheiro();

revoke execute on function public.fn_protege_issue_falta_dinheiro() from public, anon;
