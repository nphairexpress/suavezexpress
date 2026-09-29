-- 05/10/2026 — Etapa 5 (auditoria F-03, F-06, O-02, F-11): caixa por salão e dia, atendimento
-- transacional, exclusão de comanda auditada com estorno, data de comanda fechada travada.
--
-- O que muda:
--   a. rpc_abrir_caixa           — um caixa aberto por salão (qualquer usuário), dia operacional
--                                  America/Sao_Paulo; caixa de dia anterior aberto bloqueia o de hoje.
--   b. rpc_fechar_caixa          — só travam as comandas abertas DESTE caixa ou sem caixa criadas até o
--                                  dia do caixa (lista os números na mensagem); closing_balance obrigatório.
--   c. rpc_iniciar_atendimento   — substitui o FAB e o "Atender" da Fila: comanda SEM caixa_id + itens
--                                  com preço da tabela + fila in_service, tudo em uma transação.
--   d. rpc_excluir_comanda       — só admin/financeiro; snapshot jsonb em comanda_deletions, pagamentos
--                                  anulados, estorno no caixa por método, créditos do Clube/pacote
--                                  devolvidos pelos triggers, e a linha é apagada (cascade).
--   e. fn_guard_comanda_update   — comanda fechada não muda de created_at fora de RPC (app.via_rpc).
--
-- Premissas (registradas em PROVAS_ETAPA5.md):
--   - A trava por salão vale para quem passa pela RPC; o INSERT direto em caixas continua permitido
--     pela policy atual até a etapa 6 (o front troca openCaixaAsync/getCurrentUserOpenCaixa pela RPC).
--   - rpc_iniciar_atendimento REAPROVEITA a comanda aberta da cliente (mesma regra da Fila hoje:
--     check-in → atender não duplica) e, para entrada online paga, registra o pagamento Asaas uma
--     única vez (índice uq_payments_provider_payment) — é o que o "Atender" faz hoje e O-02 pede.
--   - rpc_excluir_comanda APAGA a linha (comportamento atual) depois do snapshot; o estorno no caixa
--     só existe para comanda fechada (só ela entrou no caixa). Métodos fora dos 5 do caixa não geram
--     movimento (nunca entraram nos totais).
--   - service_role/cron (auth.uid() nulo) segue sem restrição no guard, como hoje.
--
-- Aplicar pela Management API em transação única. Reversão:
--   20261005100000_etapa5_caixa_por_salao_e_exclusao.rollback.sql

-- ── colunas ──────────────────────────────────────────────────────────────────
alter table public.comanda_deletions add column if not exists snapshot jsonb;

-- ── a. rpc_abrir_caixa ────────────────────────────────────────────────────────
create or replace function public.rpc_abrir_caixa(p_opening_balance numeric default 0, p_notes text default null)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_aberto record;
  v_id uuid;
begin
  if v_uid is null or not fn_role_operacao_caixa(v_uid) then
    raise exception 'Sem permissão para abrir caixa';
  end if;
  v_salon := get_user_salon_id(v_uid);
  if v_salon is null then raise exception 'Usuário sem salão'; end if;
  if p_opening_balance is null or p_opening_balance < 0 then
    raise exception 'Saldo inicial inválido';
  end if;

  -- Duas pessoas clicando "abrir" ao mesmo tempo: uma espera a outra.
  perform pg_advisory_xact_lock(hashtext('caixa_abrir:' || v_salon::text));

  select c.id, c.opened_at,
         (c.opened_at at time zone 'America/Sao_Paulo')::date as dia,
         coalesce(nullif(trim(p.full_name), ''), 'usuário') as nome
    into v_aberto
    from caixas c
    left join profiles p on p.user_id = c.user_id
   where c.salon_id = v_salon and c.closed_at is null
   order by c.opened_at
   limit 1;

  if found then
    if v_aberto.dia < v_hoje then
      raise exception 'Feche o caixa de % antes de abrir o de hoje',
        to_char(v_aberto.opened_at at time zone 'America/Sao_Paulo', 'DD/MM');
    end if;
    raise exception 'Já existe um caixa aberto (aberto por % em %)',
      v_aberto.nome, to_char(v_aberto.opened_at at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI');
  end if;

  insert into caixas (salon_id, user_id, opening_balance, notes)
  values (v_salon, v_uid, p_opening_balance, nullif(trim(p_notes), ''))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'caixa_id', v_id);
end
$fn$;

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
$fn$;

-- ── c. rpc_iniciar_atendimento ───────────────────────────────────────────────
create or replace function public.rpc_iniciar_atendimento(
  p_client_id uuid,
  p_professional_id uuid,
  p_service_id uuid,
  p_queue_entry_id uuid default null,
  p_source text default 'balcao')
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_prof professionals%rowtype;
  v_entry queue_entries%rowtype;
  v_services uuid[];
  v_sid uuid;
  v_svc services%rowtype;
  v_comanda comandas%rowtype;
  v_reused boolean := false;
  v_subtotal numeric;
  v_discount numeric;
  v_paid numeric;
  v_method text;
begin
  if v_uid is null or not fn_role_operacao_caixa(v_uid) then
    raise exception 'Sem permissão para iniciar atendimento';
  end if;
  v_salon := get_user_salon_id(v_uid);
  perform set_config('app.via_rpc', '1', true);

  if p_source is null or p_source not in ('balcao', 'fila_online', 'fila_presencial', 'agendamento') then
    raise exception 'Origem inválida: %', p_source;
  end if;
  if not exists (select 1 from clients where id = p_client_id and salon_id = v_salon) then
    raise exception 'Cliente não encontrado';
  end if;
  select * into v_prof from professionals where id = p_professional_id and salon_id = v_salon;
  if not found then raise exception 'Profissional não encontrada'; end if;
  if coalesce(v_prof.is_active, false) = false then
    raise exception 'Profissional % está inativa', trim(v_prof.name);
  end if;

  -- Serviços: os da entrada da fila (multi-serviço) ou o informado.
  if p_queue_entry_id is not null then
    select * into v_entry from queue_entries where id = p_queue_entry_id and salon_id = v_salon for update;
    if not found then raise exception 'Entrada da fila não encontrada'; end if;
    if v_entry.status not in ('waiting', 'checked_in', 'in_service') then
      raise exception 'Entrada da fila já está %', v_entry.status;
    end if;
    if v_entry.service_ids is not null and jsonb_typeof(v_entry.service_ids) = 'array'
       and jsonb_array_length(v_entry.service_ids) > 0 then
      select array_agg(e::uuid) into v_services from jsonb_array_elements_text(v_entry.service_ids) e;
    else
      v_services := array[coalesce(p_service_id, v_entry.service_id)];
    end if;
  else
    if p_service_id is null then raise exception 'Serviço obrigatório'; end if;
    v_services := array[p_service_id];
  end if;

  -- Reaproveita a comanda aberta da cliente (check-in → atender não duplica; regra da Fila hoje).
  select * into v_comanda
    from comandas
   where salon_id = v_salon and client_id = p_client_id and closed_at is null
   order by created_at desc limit 1
     for update;
  if found then
    v_reused := true;
    update comandas set professional_id = p_professional_id, updated_at = now() where id = v_comanda.id;
    update comanda_items set professional_id = p_professional_id
     where comanda_id = v_comanda.id and professional_id is null;
  else
    insert into comandas (salon_id, client_id, professional_id, source, subtotal, discount, total)
    values (v_salon, p_client_id, p_professional_id, p_source, 0, 0, 0)
    returning * into v_comanda;

    foreach v_sid in array v_services loop
      select * into v_svc from services where id = v_sid and salon_id = v_salon;
      if not found then raise exception 'Serviço não encontrado'; end if;
      if coalesce(v_svc.is_active, false) = false then
        raise exception 'Serviço % está inativo', v_svc.name;
      end if;
      -- Preço da tabela; os triggers de Clube/pacote ajustam preço/descrição/desconto.
      insert into comanda_items (comanda_id, service_id, professional_id, description, item_type, quantity, unit_price, total_price)
      values (v_comanda.id, v_svc.id, p_professional_id, v_svc.name, 'service', 1, v_svc.price, v_svc.price);
    end loop;

    select coalesce(sum(total_price), 0) into v_subtotal from comanda_items where comanda_id = v_comanda.id;
    select coalesce(discount, 0) into v_discount from comandas where id = v_comanda.id;
    update comandas
       set subtotal = v_subtotal, total = greatest(0, v_subtotal - v_discount), updated_at = now()
     where id = v_comanda.id;
  end if;

  if p_queue_entry_id is not null then
    update queue_entries
       set status = 'in_service',
           assigned_professional_id = p_professional_id,
           customer_id = coalesce(customer_id, p_client_id),
           checked_in_at = coalesce(checked_in_at, now()),
           updated_at = now()
     where id = p_queue_entry_id;

    -- Pagamento online já confirmado: entra UMA vez na comanda (não toca no caixa; o caixa
    -- recebe no fechamento da comanda). Valor = o que foi pago, não o preço atual da tabela.
    if v_entry.source = 'online' and v_entry.payment_status = 'confirmed' and v_entry.payment_id is not null then
      v_paid := v_entry.paid_amount;
      if v_paid is null then
        select coalesce(sum(price), 0) into v_paid from services where id = any(v_services);
      end if;
      v_method := case when v_entry.payment_method = 'credit_card' then 'credit_card' else 'pix' end;
      if v_paid > 0 and not exists (
           select 1 from payments
            where salon_id = v_salon and provider_payment_id = v_entry.payment_id and voided = false) then
        insert into payments (comanda_id, salon_id, payment_method, payment_provider, provider_payment_id,
                              amount, fee_amount, net_amount, notes)
        values (v_comanda.id, v_salon, v_method::payment_method, 'asaas', v_entry.payment_id,
                v_paid, 0, v_paid, 'Pagamento online via Asaas - fila ' || v_entry.id);
      end if;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'comanda_id', v_comanda.id,
                            'comanda_number', v_comanda.comanda_number, 'reused', v_reused);
end
$fn$;

-- ── d. rpc_excluir_comanda ───────────────────────────────────────────────────
create or replace function public.rpc_excluir_comanda(p_comanda uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_comanda comandas%rowtype;
  v_caixa caixas%rowtype;
  v_snapshot jsonb;
  v_del_id uuid;
  v_voided int := 0;
  v_movs int := 0;
  v_reason text := nullif(trim(p_reason), '');
  v_num text;
  r record;
begin
  if v_uid is null or not fn_role_financeiro(v_uid) then
    raise exception 'Sem permissão para excluir comanda';
  end if;
  if v_reason is null then raise exception 'Informe o motivo da exclusão'; end if;
  v_salon := get_user_salon_id(v_uid);
  perform set_config('app.via_rpc', '1', true);

  select * into v_comanda from comandas where id = p_comanda and salon_id = v_salon for update;
  if not found then raise exception 'Comanda não encontrada'; end if;
  v_num := '#' || coalesce(v_comanda.comanda_number::text, left(v_comanda.id::text, 8));

  if v_comanda.closed_at is not null then
    if v_comanda.caixa_id is null then
      raise exception 'Comanda % está fechada sem caixa vinculado: reabra-a antes de excluir', v_num;
    end if;
    select * into v_caixa from caixas where id = v_comanda.caixa_id for update;
    if not found or v_caixa.closed_at is not null then
      raise exception 'Comanda % pertence a um caixa já fechado e não pode ser excluída', v_num;
    end if;
  end if;

  -- Snapshot completo antes de mexer em qualquer coisa.
  v_snapshot := jsonb_build_object(
    'comanda',  to_jsonb(v_comanda),
    'items',    coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at) from comanda_items i where i.comanda_id = p_comanda), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from payments p where p.comanda_id = p_comanda), '[]'::jsonb),
    'client_credits',       coalesce((select jsonb_agg(to_jsonb(x)) from client_credits x where x.comanda_id = p_comanda), '[]'::jsonb),
    'client_debts',         coalesce((select jsonb_agg(to_jsonb(x)) from client_debts x where x.comanda_id = p_comanda), '[]'::jsonb),
    'client_balance',       coalesce((select jsonb_agg(to_jsonb(x)) from client_balance x where x.comanda_id = p_comanda), '[]'::jsonb),
    'client_package_usage', coalesce((select jsonb_agg(to_jsonb(x)) from client_package_usage x where x.comanda_id = p_comanda), '[]'::jsonb)
  );

  insert into comanda_deletions (comanda_id, client_id, client_name, professional_id, professional_name,
                                 comanda_total, reason, deleted_by, original_created_at, original_closed_at, snapshot)
  values (v_comanda.id, v_comanda.client_id,
          (select name from clients where id = v_comanda.client_id),
          v_comanda.professional_id,
          (select name from professionals where id = v_comanda.professional_id),
          coalesce(v_comanda.total, 0), v_reason, v_uid, v_comanda.created_at, v_comanda.closed_at, v_snapshot)
  returning id into v_del_id;

  -- Estorno no caixa por método: só comanda fechada entrou no caixa. O trigger apply_caixa_movement abate.
  if v_comanda.closed_at is not null then
    for r in
      select payment_method::text as method, sum(amount) as total
        from payments
       where comanda_id = p_comanda and voided = false
         and payment_method::text in ('cash', 'pix', 'credit_card', 'debit_card', 'other')
       group by payment_method
    loop
      insert into caixa_movements (caixa_id, salon_id, user_id, type, amount, reason, payment_method)
      values (v_comanda.caixa_id, v_salon, v_uid, 'estorno_reabertura', r.total,
              'Exclusão da comanda ' || v_num || ': ' || v_reason, r.method);
      v_movs := v_movs + 1;
    end loop;
  end if;

  update payments
     set voided = true, voided_at = now(), voided_reason = 'Exclusão da comanda: ' || v_reason
   where comanda_id = p_comanda and voided = false;
  get diagnostics v_voided = row_count;

  -- Itens primeiro: o trigger devolve_pacote_unha devolve créditos do Clube/pacote.
  delete from comanda_items where comanda_id = p_comanda;
  -- Satélites que o front apagava (FKs de client_debts/client_balance não são cascade).
  delete from client_package_usage where comanda_id = p_comanda;
  delete from client_credits where comanda_id = p_comanda;
  delete from client_balance where comanda_id = p_comanda;
  delete from client_debts where comanda_id = p_comanda;
  -- A linha sai (cascade em payments); o snapshot preserva tudo.
  delete from comandas where id = p_comanda;

  return jsonb_build_object('ok', true, 'deletion_id', v_del_id,
                            'voided_payments', v_voided, 'caixa_movements', v_movs);
end
$fn$;

-- ── e. fn_guard_comanda_update (F-11) ────────────────────────────────────────
-- Parte da definição viva da etapa 4 (porta app.via_rpc) e acrescenta a trava do created_at.
create or replace function public.fn_guard_comanda_update()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
begin
  -- service_role / cron: auth.uid() é NULL → sem restrição
  -- etapa 4: escrita vinda de RPC transacional (set_config('app.via_rpc','1',true)) também passa
  if v_uid is null or coalesce(current_setting('app.via_rpc', true), '') = '1' then
    return new;
  end if;
  -- F-11 (etapa 5): comanda fechada não muda de data fora de RPC.
  if old.closed_at is not null and new.created_at is distinct from old.created_at then
    raise exception 'Comanda #% está fechada: a data da comanda não pode ser alterada',
      coalesce(old.comanda_number::text, left(old.id::text, 8));
  end if;
  if fn_role_operacao_caixa(v_uid) then
    return new;
  end if;
  if new.closed_at is distinct from old.closed_at
     or new.is_paid is distinct from old.is_paid
     or new.caixa_id is distinct from old.caixa_id
     or new.discount is distinct from old.discount then
    raise exception 'Apenas admin/financeiro pode alterar fechamento, caixa ou desconto da comanda';
  end if;
  if old.closed_at is not null then
    raise exception 'Comanda fechada: apenas admin/financeiro pode alterá-la';
  end if;
  return new;
end
$fn$;

-- ── grants ───────────────────────────────────────────────────────────────────
revoke execute on function public.rpc_abrir_caixa(numeric, text) from public, anon;
revoke execute on function public.rpc_fechar_caixa(uuid, numeric, text) from public, anon;
revoke execute on function public.rpc_iniciar_atendimento(uuid, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.rpc_excluir_comanda(uuid, text) from public, anon;
revoke execute on function public.fn_guard_comanda_update() from public, anon;
grant execute on function public.rpc_abrir_caixa(numeric, text) to authenticated, service_role;
grant execute on function public.rpc_fechar_caixa(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.rpc_iniciar_atendimento(uuid, uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.rpc_excluir_comanda(uuid, text) to authenticated, service_role;
