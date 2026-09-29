-- Reversão de 20260929240000_falta_dinheiro_pendencia.sql
-- rpc_fechar_caixa volta à definição VIVA exportada em 29/09/2026 ~22h BRT (etapa 5 em produção,
-- md5(pg_get_functiondef) = aa716efc5711db0214f63f56b52ab53c).
-- ATENÇÃO: a constraint antiga não aceita 'falta_dinheiro'; as pendências desse tipo precisam sair
-- antes (o trigger de proteção exige app.force_delete_issue = '1' para apagá-las).

drop trigger if exists trg_protege_issue_falta_dinheiro on public.closure_issues;
drop function if exists public.fn_protege_issue_falta_dinheiro();

select set_config('app.force_delete_issue', '1', true);
delete from public.closure_issues where issue_type = 'falta_dinheiro';

alter table public.closure_issues drop constraint if exists closure_issues_issue_type_check;
alter table public.closure_issues add constraint closure_issues_issue_type_check
  check (issue_type = any (array[
    'payment_method_mismatch','value_mismatch','comanda_open_24h','professional_missing',
    'duplicate_service_same_client','paid_without_payment','payment_without_paid_flag',
    'pagbank_orphan_transaction','cashback_overdraft','asaas_payment_pending'
  ]));

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

  update caixas
     set closed_at = now(), closing_balance = p_closing_balance,
         notes = coalesce(p_notes, notes), updated_at = now()
   where id = p_caixa;

  return jsonb_build_object('ok', true, 'caixa_id', p_caixa, 'closing_balance', p_closing_balance);
end
$function$;

revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;
