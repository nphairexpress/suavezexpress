-- 05/10/2026 — Etapa 4 (auditoria 29/09: F-01, F-04, F-05, F-07, F-20 e revisão 3.2/3.3/3.5).
-- Fechamento de comanda vira UMA transação no banco: rpc_fechar_comanda_v2 grava pagamentos (taxa por
-- bandeira/PIX), incrementa o caixa, fecha a comanda com closed_at = now() do banco, baixa a fila,
-- marca agendamentos como pagos, gera troco/crédito/dívida/cashback e cria client_packages a partir dos
-- itens de pacote. A v1 (rpc_fechar_comanda) fica intacta até o front migrar.
--
-- Também nesta migration:
--   (a) comandas.paid_by ('clube' | 'pacote'), preenchido pelos triggers de consumo (F-04);
--   (b) consome_credito_clube / consome_pacote_unha marcam paid_by (só isso muda neles);
--   (c) fn_guard_comanda_update ganha a porta app.via_rpc = '1' (pré-requisito de S-06, etapa 6).
--
-- Premissas adotadas onde a spec era ambígua (replicam o front ComandaModal.handleFinalizeComanda):
--   P1. "Dívida anterior" = saldo líquido de client_balance (credit − debt), como useClientNetBalance;
--       client_debts NÃO entra nessa conta (o front também não usa). Condição de quitação: pago bruto
--       >= subtotal + dívida − 0,01 (mesma fórmula do front, com subtotal e não total).
--   P2. Quando a dívida anterior é coberta, esse valor é absorvido ANTES de calcular troco/crédito
--       (o front hoje gera client_credits E client_balance sobre o mesmo dinheiro).
--   P3. Troco: p_overpayment_mode='troco' abate o excedente do(s) pagamento(s) em dinheiro (na ordem
--       enviada) e o caixa recebe só o devido; o que não couber no dinheiro vira client_credits (90 dias,
--       min_purchase 0). 'credito' grava os pagamentos cheios e o excedente inteiro vira client_credits.
--       Sem cliente na comanda, excedente que precisaria virar crédito é recusado.
--   P4. Falta: p_underpaid_as_debt grava client_debts (exige cliente); senão exige p_allow_underpaid
--       (comportamento da v1). Total 0 fecha sem pagamento (v1 já fechava; paid_by é informativo).
--   P5. Cashback: só item_type='service' com total_price > 0, descrição sem '📦' e unit_price >=
--       services.price. Item consumido por Clube/pacote (linha em clube_consumos) também fica de fora —
--       é o equivalente persistido do "item com desconto" que o front exclui pelo estado da tela.
--   P6. Pacote vendido: comanda_items não guarda package_id; o pacote é resolvido pelo nome na descrição
--       '📦 Pacote: <nome>' (é assim que handleAddPackage grava). Nome não encontrado = erro (não perde
--       venda em silêncio). Enquanto o front ainda cria client_packages ao adicionar o item, a RPC não
--       duplica (procura notes = 'Vendido via comanda #NNNN'). total_paid = total_price do item.
--   P7. Desconto final = greatest(coalesce(p_discount,0), comandas.discount): o que trigger/crédito da
--       fila gravou nunca é reduzido pela tela.
--   P8. Pagamento com valor <= 0 é recusado; pagamento em dinheiro que zera pelo troco não é gravado.
--
-- Aplicada via Management API. Reversão: 20261005090000_etapa4_rpc_fechar_comanda_v2.rollback.sql

-- ── (a) comandas.paid_by ─────────────────────────────────────────────────────
alter table public.comandas
  add column if not exists paid_by text check (paid_by in ('clube', 'pacote'));
comment on column public.comandas.paid_by is
  'Preenchido pelos triggers de consumo: clube (ESCOVA DO CLUBE) ou pacote (unha/esmaltação). Comanda com total 0 e paid_by fecha sem pagamento.';

-- ── (b) triggers de consumo marcam paid_by (reescritos da definição viva de 29/09; só o UPDATE muda) ──
create or replace function public.consome_credito_clube() returns trigger
language plpgsql security definer set search_path = public as $fn$
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
  -- etapa 4 (F-04): marca a origem do pagamento
  update comandas set discount = coalesce(discount,0) + new.total_price, paid_by = 'clube' where id = new.comanda_id;
  return new;
end
$fn$;

create or replace function public.consome_pacote_unha() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_e int := 0; v_fone text; v_ass uuid;
  v_cred clube_creditos%rowtype;
begin
  select upper(name) into v_srv from services where id = new.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  elsif v_srv in ('ESMALTAÇÃO - MÃOS', 'ESMALTAÇÃO - PÉS') then v_e := 1;
  else return new;
  end if;
  v_m := v_m * coalesce(new.quantity, 1);
  v_p := v_p * coalesce(new.quantity, 1);
  v_e := v_e * coalesce(new.quantity, 1);

  select regexp_replace(coalesce(cl.phone, ''), '[^0-9]', '', 'g') into v_fone
    from comandas c join clients cl on cl.id = c.client_id where c.id = new.comanda_id;
  if coalesce(v_fone, '') = '' then return new; end if;

  if v_e > 0 then
    select k.* into v_cred from clube_creditos k join clube_assinantes a on a.id = k.assinante_id
     where a.status = 'ativo'
       and right(regexp_replace(coalesce(a.celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
       and k.origem = 'pacote_esmaltacao' and not k.bloqueado
       and k.inicio <= now() and now() < k.fim
       and k.creditos_usados + v_e <= k.creditos_total
     order by k.fim asc limit 1 for update of k;
    if not found then return new; end if;
    update clube_creditos set creditos_usados = creditos_usados + v_e where id = v_cred.id;
    insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
    values (v_cred.id, v_cred.assinante_id, new.id, 'comanda');
    new.description := coalesce(new.description, v_srv) || ' (PACOTE ESMALTAÇÃO)';
    -- etapa 4 (F-04): marca a origem do pagamento
    update comandas set discount = coalesce(discount, 0) + new.total_price, paid_by = 'pacote' where id = new.comanda_id;
    return new;
  end if;

  select id into v_ass from clube_assinantes
   where status = 'ativo' and plano = 'unha_4m2p'
     and right(regexp_replace(coalesce(celular, ''), '[^0-9]', '', 'g'), 8) = right(v_fone, 8)
   limit 1;
  if v_ass is null then return new; end if;

  select * into v_cred from clube_creditos
   where assinante_id = v_ass and origem = 'pacote_unha' and not bloqueado
     and inicio <= now() and now() < fim
     and maos_usadas + v_m <= 4 and pes_usados + v_p <= 2
   order by fim asc limit 1 for update;
  if not found then return new; end if;  -- sem ciclo pago ou sem saldo: cobra normal

  update clube_creditos
     set maos_usadas = maos_usadas + v_m, pes_usados = pes_usados + v_p,
         creditos_usados = creditos_usados + v_m + v_p
   where id = v_cred.id;
  insert into clube_consumos (ciclo_id, assinante_id, comanda_item_id, origem)
  values (v_cred.id, v_ass, new.id, 'comanda');
  new.description := coalesce(new.description, v_srv) || ' (PACOTE UNHA)';
  -- etapa 4 (F-04): marca a origem do pagamento
  update comandas set discount = coalesce(discount, 0) + new.total_price, paid_by = 'pacote' where id = new.comanda_id;
  return new;
end
$fn$;

-- ── (c) guard de comandas: porta app.via_rpc (reescrito da definição viva; só a condição de liberação muda) ──
create or replace function public.fn_guard_comanda_update() returns trigger
language plpgsql security definer set search_path = public as $fn$
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
$fn$;

-- ── (d) rpc_fechar_comanda_v2 ────────────────────────────────────────────────
create or replace function public.rpc_fechar_comanda_v2(
  p_comanda uuid,
  p_caixa uuid,
  p_payments jsonb default '[]'::jsonb,
  p_discount numeric default null,
  p_allow_underpaid boolean default false,
  p_overpayment_mode text default 'troco',
  p_underpaid_as_debt boolean default false,
  p_cashback jsonb default null,
  p_appointment_ids uuid[] default null)
returns jsonb
language plpgsql security definer set search_path = public as $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_comanda comandas%ROWTYPE;
  v_caixa caixas%ROWTYPE;
  v_ref text;
  v_subtotal numeric;
  v_discount numeric;
  v_total numeric;
  v_existing_paid numeric;
  v_new_paid numeric := 0;       -- soma enviada pela tela
  v_gross_paid numeric;          -- existente + enviado (o que a cliente entregou)
  v_recorded numeric := 0;       -- o que foi de fato gravado em payments nesta chamada
  v_cash_new numeric := 0;
  v_over numeric := 0;
  v_troco numeric := 0;
  v_troco_rem numeric := 0;
  v_abate numeric;
  v_credit_over numeric := 0;
  v_falta numeric := 0;
  v_net_balance numeric := 0;
  v_debt_prev numeric := 0;
  v_debt_cover numeric := 0;
  v_pay jsonb;
  v_method text;
  v_amount numeric;
  v_installments int;
  v_brand card_brands%ROWTYPE;
  v_fee numeric;
  v_pix_fee_pct numeric;
  v_inc_cash numeric := 0; v_inc_pix numeric := 0; v_inc_cc numeric := 0;
  v_inc_dc numeric := 0; v_inc_other numeric := 0;
  v_credito_id uuid;
  v_debt_id uuid;
  v_cashback_id uuid;
  v_cb_pct numeric; v_cb_min numeric; v_cb_days int; v_cb_base numeric; v_cb_amount numeric;
  v_item record;
  v_pkg_id uuid;
  v_pkg_name text;
  v_appts uuid[];
BEGIN
  -- Porta do guard de comandas (fn_guard_comanda_update): esta escrita vem de RPC transacional.
  PERFORM set_config('app.via_rpc', '1', true);

  IF v_uid IS NULL OR NOT fn_role_operacao_caixa(v_uid) THEN
    RAISE EXCEPTION 'Sem permissão para fechar comanda';
  END IF;
  v_salon := get_user_salon_id(v_uid);

  IF p_overpayment_mode IS NULL OR p_overpayment_mode NOT IN ('troco', 'credito') THEN
    RAISE EXCEPTION 'Modo de troco inválido: %', p_overpayment_mode;
  END IF;
  IF p_discount IS NOT NULL AND p_discount < 0 THEN
    RAISE EXCEPTION 'Desconto inválido';
  END IF;

  -- Travas: comanda e caixa (duplo clique / duas telas esperam aqui e a 2ª vê closed_at preenchido)
  SELECT * INTO v_comanda FROM comandas WHERE id = p_comanda AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF v_comanda.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Comanda já está fechada'; END IF;
  v_ref := COALESCE(lpad(v_comanda.comanda_number::text, 4, '0'), left(p_comanda::text, 8));

  SELECT * INTO v_caixa FROM caixas WHERE id = p_caixa AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrado'; END IF;
  IF v_caixa.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Caixa está fechado'; END IF;

  -- Totais (P7): desconto da tela nunca reduz o que trigger/crédito da fila já gravou
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM comanda_items WHERE comanda_id = p_comanda;
  v_discount := GREATEST(COALESCE(p_discount, 0), COALESCE(v_comanda.discount, 0));
  v_total := GREATEST(0, v_subtotal - v_discount);

  -- Pagamentos já vinculados (ex.: Asaas online) abatem do que falta pagar.
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_paid
    FROM payments WHERE comanda_id = p_comanda AND voided = false;

  SELECT pix_fee_percent INTO v_pix_fee_pct
    FROM commission_settings WHERE salon_id = v_salon LIMIT 1;
  v_pix_fee_pct := COALESCE(v_pix_fee_pct, 0);

  -- Passo 1: valida e soma os pagamentos enviados (ainda sem gravar)
  FOR v_pay IN SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb))
  LOOP
    v_method := v_pay ->> 'method';
    v_amount := (v_pay ->> 'amount')::numeric;
    IF v_method IS NULL OR v_method NOT IN ('cash', 'pix', 'credit_card', 'debit_card', 'other') THEN
      RAISE EXCEPTION 'Método de pagamento inválido: %', v_method;
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Valor de pagamento inválido';
    END IF;
    IF v_method IN ('credit_card', 'debit_card') AND (v_pay ->> 'card_brand_id') IS NULL THEN
      RAISE EXCEPTION 'Bandeira do cartão obrigatória';
    END IF;
    v_new_paid := v_new_paid + v_amount;
    IF v_method = 'cash' THEN v_cash_new := v_cash_new + v_amount; END IF;
  END LOOP;
  v_gross_paid := v_existing_paid + v_new_paid;

  -- Dívida anterior (P1/P2): saldo líquido de client_balance; se o pago cobre subtotal + dívida,
  -- a parte da dívida é absorvida antes de calcular troco/crédito.
  IF v_comanda.client_id IS NOT NULL THEN
    SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_net_balance
      FROM client_balance
     WHERE salon_id = v_salon AND client_id = v_comanda.client_id;
    IF v_net_balance < 0 THEN
      v_debt_prev := abs(v_net_balance);
      IF v_gross_paid >= v_subtotal + v_debt_prev - 0.01 THEN
        v_debt_cover := round(v_debt_prev, 2);
      END IF;
    END IF;
  END IF;

  -- Troco / falta (P3/P4)
  IF v_gross_paid - v_debt_cover > v_total + 0.01 THEN
    v_over := round(v_gross_paid - v_debt_cover - v_total, 2);
    IF p_overpayment_mode = 'troco' THEN
      v_troco := LEAST(v_over, v_cash_new);
      v_credit_over := round(v_over - v_troco, 2);
    ELSE
      v_credit_over := v_over;
    END IF;
    IF v_credit_over > 0.005 AND v_comanda.client_id IS NULL THEN
      RAISE EXCEPTION 'Pagamento excede o total em R$ % e a comanda não tem cliente para receber o crédito', v_credit_over;
    END IF;
    v_troco_rem := v_troco;
  ELSIF v_gross_paid < v_total - 0.01 THEN
    v_falta := round(v_total - v_gross_paid, 2);
    IF p_underpaid_as_debt THEN
      IF v_comanda.client_id IS NULL THEN
        RAISE EXCEPTION 'Comanda sem cliente não pode gerar dívida (faltam R$ %)', v_falta;
      END IF;
    ELSIF NOT p_allow_underpaid THEN
      RAISE EXCEPTION 'Pagamento incompleto: pago % de %', v_gross_paid, v_total;
    END IF;
  END IF;

  -- Passo 2: grava pagamentos (taxa por bandeira/PIX como a v1; troco em dinheiro abate do dinheiro)
  FOR v_pay IN SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb))
  LOOP
    v_method := v_pay ->> 'method';
    v_amount := (v_pay ->> 'amount')::numeric;
    v_installments := COALESCE((v_pay ->> 'installments')::int, 1);

    IF v_method = 'cash' AND v_troco_rem > 0 THEN
      v_abate := LEAST(v_amount, v_troco_rem);
      v_amount := round(v_amount - v_abate, 2);
      v_troco_rem := round(v_troco_rem - v_abate, 2);
    END IF;
    IF v_amount <= 0 THEN CONTINUE; END IF;  -- P8: dinheiro que zerou pelo troco não vira linha

    v_fee := 0;
    IF v_method IN ('credit_card', 'debit_card') THEN
      SELECT * INTO v_brand FROM card_brands
       WHERE id = (v_pay ->> 'card_brand_id')::uuid AND salon_id = v_salon;
      IF NOT FOUND THEN RAISE EXCEPTION 'Bandeira não encontrada'; END IF;
      v_fee := round(v_amount * fn_card_fee_percent(v_brand, v_method, v_installments) / 100, 2);
    ELSIF v_method = 'pix' AND v_pix_fee_pct > 0 THEN
      v_fee := round(v_amount * v_pix_fee_pct / 100, 2);
    END IF;

    INSERT INTO payments (comanda_id, salon_id, payment_method, payment_provider,
                          amount, notes, bank_account_id, card_brand_id,
                          installments, fee_amount, net_amount)
    VALUES (p_comanda, v_salon, v_method::payment_method,
            CASE WHEN v_method IN ('credit_card', 'debit_card') THEN 'pagbank' ELSE 'manual' END,
            v_amount, v_pay ->> 'notes',
            CASE WHEN v_method = 'pix' THEN (v_pay ->> 'bank_account_id')::uuid ELSE NULL END,
            CASE WHEN v_method IN ('credit_card', 'debit_card') THEN (v_pay ->> 'card_brand_id')::uuid ELSE NULL END,
            CASE WHEN v_method = 'credit_card' THEN v_installments ELSE 1 END,
            v_fee, v_amount - v_fee);

    v_recorded := v_recorded + v_amount;
    IF    v_method = 'cash'        THEN v_inc_cash  := v_inc_cash + v_amount;
    ELSIF v_method = 'pix'         THEN v_inc_pix   := v_inc_pix + v_amount;
    ELSIF v_method = 'credit_card' THEN v_inc_cc    := v_inc_cc + v_amount;
    ELSIF v_method = 'debit_card'  THEN v_inc_dc    := v_inc_dc + v_amount;
    ELSE                                v_inc_other := v_inc_other + v_amount;
    END IF;
  END LOOP;

  -- Incremento atômico do caixa (já travado por FOR UPDATE)
  UPDATE caixas SET
    total_cash        = COALESCE(total_cash, 0) + v_inc_cash,
    total_pix         = COALESCE(total_pix, 0) + v_inc_pix,
    total_credit_card = COALESCE(total_credit_card, 0) + v_inc_cc,
    total_debit_card  = COALESCE(total_debit_card, 0) + v_inc_dc,
    total_other       = COALESCE(total_other, 0) + v_inc_other,
    updated_at        = now()
  WHERE id = p_caixa;

  -- Fecha a comanda (F-20: closed_at do banco). validate_comanda_close recusa aqui se algo não bater
  -- e a transação inteira volta (nenhum pagamento fica gravado).
  UPDATE comandas SET
    closed_at = now(), is_paid = true,
    subtotal = v_subtotal, discount = v_discount, total = v_total,
    caixa_id = p_caixa, updated_at = now()
  WHERE id = p_comanda;

  -- Excedente que vira crédito (troco sem dinheiro suficiente, ou modo 'credito'): 90 dias, sem mínimo
  IF v_credit_over > 0.005 THEN
    INSERT INTO client_credits (salon_id, client_id, comanda_id, credit_amount, min_purchase_amount, expires_at)
    VALUES (v_salon, v_comanda.client_id, p_comanda, round(v_credit_over, 2), 0, now() + interval '90 days')
    RETURNING id INTO v_credito_id;
  END IF;

  -- Falta que vira dívida
  IF v_falta > 0.005 AND p_underpaid_as_debt THEN
    INSERT INTO client_debts (salon_id, client_id, comanda_id, debt_amount, notes)
    VALUES (v_salon, v_comanda.client_id, p_comanda, v_falta, 'Dívida da comanda ' || v_ref)
    RETURNING id INTO v_debt_id;
  END IF;

  -- Dívida anterior quitada nesta comanda → lançamento de crédito em client_balance que zera o saldo
  IF v_debt_cover > 0.005 THEN
    INSERT INTO client_balance (salon_id, client_id, type, amount, description, comanda_id, created_by)
    VALUES (v_salon, v_comanda.client_id, 'credit', v_debt_cover,
            'Pagamento de divida anterior via comanda ' || v_ref, p_comanda, v_uid);
  END IF;

  -- Cashback (P5): só serviço de preço cheio, sem 📦, sem consumo de Clube/pacote
  IF p_cashback IS NOT NULL AND v_comanda.client_id IS NOT NULL THEN
    v_cb_pct  := (p_cashback ->> 'percent')::numeric;
    v_cb_min  := COALESCE((p_cashback ->> 'min_purchase')::numeric, 0);
    v_cb_days := COALESCE((p_cashback ->> 'validity_days')::int, 30);
    IF COALESCE(v_cb_pct, 0) > 0 THEN
      SELECT COALESCE(SUM(ci.total_price), 0) INTO v_cb_base
        FROM comanda_items ci
        LEFT JOIN services s ON s.id = ci.service_id
       WHERE ci.comanda_id = p_comanda
         AND ci.item_type = 'service'
         AND COALESCE(ci.total_price, 0) > 0
         AND COALESCE(ci.description, '') NOT LIKE '%📦%'
         AND (s.id IS NULL OR ci.unit_price >= COALESCE(s.price, 0))
         AND NOT EXISTS (SELECT 1 FROM clube_consumos cc WHERE cc.comanda_item_id = ci.id);
      v_cb_amount := round(v_cb_base * v_cb_pct / 100, 2);
      IF v_cb_base > 0 AND v_cb_amount > 0 THEN
        INSERT INTO client_credits (salon_id, client_id, comanda_id, credit_amount, min_purchase_amount, expires_at)
        VALUES (v_salon, v_comanda.client_id, p_comanda, v_cb_amount, v_cb_min,
                now() + make_interval(days => v_cb_days))
        RETURNING id INTO v_cashback_id;
      END IF;
    END IF;
  END IF;

  -- Pacotes vendidos nesta comanda (F-07 / P6)
  IF v_comanda.client_id IS NOT NULL THEN
    FOR v_item IN
      SELECT id, description, total_price
        FROM comanda_items
       WHERE comanda_id = p_comanda AND item_type = 'package'
    LOOP
      v_pkg_name := trim(regexp_replace(COALESCE(v_item.description, ''), '^\s*📦\s*Pacote:\s*', ''));
      SELECT id INTO v_pkg_id FROM packages
       WHERE salon_id = v_salon AND trim(name) = v_pkg_name
       ORDER BY is_active DESC NULLS LAST, created_at DESC LIMIT 1;
      IF v_pkg_id IS NULL THEN
        RAISE EXCEPTION 'Pacote "%" não encontrado no cadastro. Remova e adicione o item de novo antes de fechar.', v_pkg_name;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM client_packages
         WHERE salon_id = v_salon AND client_id = v_comanda.client_id AND package_id = v_pkg_id
           AND notes = 'Vendido via comanda #' || v_ref
      ) THEN
        INSERT INTO client_packages (salon_id, client_id, package_id, total_paid, status, notes)
        VALUES (v_salon, v_comanda.client_id, v_pkg_id, COALESCE(v_item.total_price, 0), 'active',
                'Vendido via comanda #' || v_ref);
      END IF;
    END LOOP;
  END IF;

  -- Baixa na fila: a cliente terminou
  IF v_comanda.client_id IS NOT NULL THEN
    UPDATE queue_entries
       SET status = 'completed', updated_at = now()
     WHERE salon_id = v_salon AND customer_id = v_comanda.client_id
       AND status IN ('waiting', 'checked_in', 'in_service');
  END IF;

  -- Agendamentos → pagos (os enviados + o da comanda + os de origem dos itens)
  v_appts := ARRAY(
    SELECT DISTINCT x FROM unnest(
      COALESCE(p_appointment_ids, '{}'::uuid[])
      || ARRAY[v_comanda.appointment_id]
      || ARRAY(SELECT source_appointment_id FROM comanda_items WHERE comanda_id = p_comanda)
    ) AS x WHERE x IS NOT NULL);
  IF cardinality(v_appts) > 0 THEN
    UPDATE appointments SET status = 'paid', updated_at = now()
     WHERE id = ANY(v_appts) AND salon_id = v_salon;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'comanda_id', p_comanda,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'total', v_total,
    'paid', v_existing_paid + v_recorded,
    'troco', v_troco,
    'debt_covered', v_debt_cover,
    'credito_id', v_credito_id,
    'debt_id', v_debt_id,
    'cashback_id', v_cashback_id,
    'paid_by', v_comanda.paid_by);
END;
$fn$;

-- ── (e) permissões ───────────────────────────────────────────────────────────
revoke all on function public.rpc_fechar_comanda_v2(uuid, uuid, jsonb, numeric, boolean, text, boolean, jsonb, uuid[]) from public, anon;
grant execute on function public.rpc_fechar_comanda_v2(uuid, uuid, jsonb, numeric, boolean, text, boolean, jsonb, uuid[]) to authenticated;

comment on function public.rpc_fechar_comanda_v2(uuid, uuid, jsonb, numeric, boolean, text, boolean, jsonb, uuid[]) is
  'Etapa 4 (05/10/2026): fechamento transacional da comanda — pagamentos, caixa, troco/crédito/dívida, cashback, pacotes, fila, agendamentos. Substitui o handleFinalizeComanda do front. v1 (rpc_fechar_comanda) continua até o front migrar.';
