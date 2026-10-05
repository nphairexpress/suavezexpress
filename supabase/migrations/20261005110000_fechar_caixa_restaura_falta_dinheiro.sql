-- 05/10/2026 — Restaura a pendência automática de FALTA de dinheiro no fechamento do caixa.
--
-- Regressão: 20260929240000_falta_dinheiro_pendencia.sql pôs em rpc_fechar_caixa o cálculo do dinheiro
-- esperado e a gravação de closure_issues 'falta_dinheiro' (decisão do dono: falta vira pendência, sobra
-- não gera nada). A migration seguinte, 20260929250000_etapa6_permissoes_configuraveis.sql, recriou a
-- função a partir da definição de ANTES da 240000 só para trocar o gate por fn_pode, e o bloco sumiu.
-- Em produção (05/10) pg_get_functiondef(rpc_fechar_caixa) não contém 'falta_dinheiro'.
-- O trigger trg_protege_issue_falta_dinheiro e o tipo novo no check de closure_issues continuam vivos.
--
-- O que muda: rpc_fechar_caixa = definição VIVA de 05/10 (gate fn_pode(v_uid, 'caixa.fechar') da etapa 6,
-- travas da etapa 5) + o bloco da 240000 (esperado_dinheiro = saldo inicial + Σ payments em dinheiro
-- não anulados das comandas deste caixa + suprimentos − sangrias; falta > R$ 0,01 grava uma
-- closure_issues 'falta_dinheiro' high/open; retorno volta a trazer esperado_dinheiro/contado/falta).
-- Chaves do jsonb iguais às que src/components/pendencias/IssueCard.tsx rotula.
-- Mesmo owner (postgres), SECURITY DEFINER, search_path=public e grants da função viva.
--
-- Aplicar pela Management API em transação única. Reversão:
--   20261005110000_fechar_caixa_restaura_falta_dinheiro.rollback.sql

CREATE OR REPLACE FUNCTION public.rpc_fechar_caixa(p_caixa uuid, p_closing_balance numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if v_uid is null or not fn_pode(v_uid, 'caixa.fechar') then
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
$function$;

alter function public.rpc_fechar_caixa(uuid, numeric, text) owner to postgres;
revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;
