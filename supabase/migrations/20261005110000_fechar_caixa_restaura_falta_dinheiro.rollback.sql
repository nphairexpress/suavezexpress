-- Reversão de 20261005110000_fechar_caixa_restaura_falta_dinheiro.sql:
-- volta rpc_fechar_caixa para a definição viva de 05/10/2026 (etapa 6, SEM o bloco da falta).
-- O trigger de proteção e o check de closure_issues não são tocados por nenhum dos dois arquivos.

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

  update caixas
     set closed_at = now(), closing_balance = p_closing_balance,
         notes = coalesce(p_notes, notes), updated_at = now()
   where id = p_caixa;

  return jsonb_build_object('ok', true, 'caixa_id', p_caixa, 'closing_balance', p_closing_balance);
end
$function$;

alter function public.rpc_fechar_caixa(uuid, numeric, text) owner to postgres;
revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;
