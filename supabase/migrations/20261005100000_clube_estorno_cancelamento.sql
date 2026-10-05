-- 05/10/2026 — Clube da Escova: estorno de cobrança e cancelamento de assinatura pelo sistema, com senha.
--
-- Pedido do dono: "o sistema deve ter a opção de estorno, pois se a cliente quiser cancelar o plano deve
-- haver"; estorno e cancelamento exigem uma senha digitada no diálogo de confirmação.
-- Caso que motivou: Francine (final 8495) com duas assinaturas ativas, em dois customers do Asaas e duas
-- linhas em clube_assinantes. O desenho age por COBRANÇA (pay_…) e por ASSINATURA (sub_…), nunca pela
-- pessoa inteira: estornar uma cobrança e cancelar uma assinatura não derruba a outra.
--
-- O que muda:
--   a. Chave de permissão clube.estornar_cancelar (padrão admin, financial), na tela de Permissões.
--   b. salon_secrets.senha_estorno_hash (+ _atualizada_em): HASH PBKDF2-SHA256 da senha de autorização.
--      salon_secrets já é backend-only (revoke all de anon/authenticated); o valor entra pelo script
--      scripts/carregar-senha-estorno.ts (nunca por migration).
--   c. clube_creditos.estornado_em e clube_assinantes.cancelada_em (colunas novas, nulas).
--   d. Tabela clube_estornos: registro de cada operação e de cada tentativa (inclusive senha errada, base do
--      limite de tentativas). Leitura só para quem tem a permissão; escrita só service_role.
--      Cada conferência de senha reserva antes uma linha 'tentativa_senha' (vira senha_ok/senha_incorreta).
--      Índice único parcial = trava contra clique duplo/reenvio (um estorno "em andamento" ou "sucesso" por
--      cobrança; idem cancelamento por assinatura).
--   e. RPCs clube_aplicar_estorno / clube_aplicar_cancelamento (SECURITY DEFINER, só service_role,
--      idempotentes) = efeito no motor. Quem chama: edge clube-estorno (botão) e asaas-webhook
--      (PAYMENT_REFUNDED, SUBSCRIPTION_DELETED/INACTIVATED).
--
-- Regras de negócio:
--   - ESTORNO de pay_x: bloqueia o ciclo desse pagamento (bloqueado, motivo, estornado_em) e lança no
--     financeiro uma DESPESA "Estorno Clube da Escova … [estorno pay_x]" no valor da receita original, na
--     data de hoje (São Paulo). A receita original fica (trilha). Escovas já usadas no ciclo NÃO são
--     desfeitas: a RPC devolve quantas foram usadas para o diálogo avisar.
--   - CANCELAMENTO de sub_y: se ainda houver outra assinatura ativa da mesma cliente no Asaas, nada muda no
--     status. Senão: com ciclo pago ativo, a cliente continua usando até o fim do ciclo (status segue
--     'ativo', cancelada_em preenchido; o motor só atende status 'ativo'); sem ciclo ativo, status vira
--     'cancelado' na hora. Se o ciclo restante for estornado depois, o estorno fecha o cancelamento.
--
-- Aplicar pela Management API em transação única. Reversão: 20261005100000_clube_estorno_cancelamento.rollback.sql

-- ── a. permissão ─────────────────────────────────────────────────────────────
insert into public.salon_permissions (salon_id, permission_key, roles)
select s.id, 'clube.estornar_cancelar', '{admin,financial}'::app_role[]
  from public.salons s
on conflict (salon_id, permission_key) do nothing;

-- ── b. hash da senha de autorização (backend-only) ───────────────────────────
alter table public.salon_secrets
  add column if not exists senha_estorno_hash text,
  add column if not exists senha_estorno_atualizada_em timestamptz;
comment on column public.salon_secrets.senha_estorno_hash is
  '05/10/2026: senha de autorização de estorno/cancelamento do Clube. Formato pbkdf2$<iter>$<salt b64>$<hash b64>. Nunca a senha em claro.';
-- garantia: o front continua sem acesso (mesma regra de 20260710100000_salon_secrets_lockdown)
revoke all on public.salon_secrets from public, anon, authenticated;

-- ── c. colunas do motor ──────────────────────────────────────────────────────
alter table public.clube_creditos add column if not exists estornado_em timestamptz;
comment on column public.clube_creditos.estornado_em is
  '05/10/2026: preenchido por clube_aplicar_estorno. Ciclo estornado fica bloqueado; marca de idempotência.';
alter table public.clube_assinantes add column if not exists cancelada_em timestamptz;
comment on column public.clube_assinantes.cancelada_em is
  '05/10/2026: assinatura cancelada. Com ciclo pago ativo, status segue ativo até o fim do ciclo.';

-- ── d. registro ──────────────────────────────────────────────────────────────
create table if not exists public.clube_estornos (
  id             uuid primary key default gen_random_uuid(),
  salon_id       uuid not null references public.salons(id) on delete cascade,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  user_id        uuid,                       -- null = veio do webhook do Asaas
  origem         text not null check (origem in ('botao', 'webhook')),
  tipo           text not null check (tipo in ('estorno', 'cancelamento', 'troca_senha')),
  resultado      text not null check (resultado in (
                   'em_andamento', 'sucesso', 'ja_aplicado', 'aplicado_webhook',
                   'tentativa_senha', 'senha_ok', 'senha_incorreta', 'bloqueado_tentativas', 'sem_senha_cadastrada', 'sem_permissao',
                   'recusado', 'erro_asaas', 'erro_motor', 'interrompido')),
  assinante_id   uuid references public.clube_assinantes(id) on delete set null,
  alvo           text,                       -- pay_… (estorno) ou sub_… (cancelamento)
  valor          numeric(10,2),
  motivo         text,
  detalhe        jsonb not null default '{}'::jsonb  -- resumo (situação no Asaas, escovas usadas, mensagem); nunca o corpo inteiro
);
comment on table public.clube_estornos is
  '05/10/2026: cada estorno/cancelamento do Clube e cada tentativa (senha errada inclusive). Escrita só service_role (edge clube-estorno e RPCs).';

-- limite de tentativas: a edge grava 'tentativa_senha' ANTES de conferir o hash e conta erradas + em aberto
-- (reserva largada por queda conta como errada enquanto estiver na janela de 15 min)
create index if not exists clube_estornos_senha_errada_idx
  on public.clube_estornos (user_id, criado_em desc) where resultado in ('senha_incorreta', 'tentativa_senha');
create index if not exists clube_estornos_salon_idx on public.clube_estornos (salon_id, criado_em desc);
-- trava de clique duplo/reenvio: no máximo um em andamento ou concluído por cobrança/assinatura
create unique index if not exists clube_estornos_alvo_uidx
  on public.clube_estornos (tipo, alvo) where resultado in ('em_andamento', 'sucesso');

alter table public.clube_estornos enable row level security;
revoke all on public.clube_estornos from public, anon, authenticated;
grant select on public.clube_estornos to authenticated;
grant all on public.clube_estornos to service_role;

drop policy if exists clube_estornos_select_permissao on public.clube_estornos;
create policy clube_estornos_select_permissao on public.clube_estornos
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'clube.estornar_cancelar'));

-- ── e. RPCs do motor ─────────────────────────────────────────────────────────
create or replace function public.clube_aplicar_estorno(
  p_asaas_payment_id text,
  p_motivo text,
  p_origem text,
  p_user_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_c clube_creditos%rowtype;
  v_a clube_assinantes%rowtype;
  v_inc_id uuid; v_inc_salon uuid; v_inc_valor numeric;
  v_salon uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_lancou boolean := false;
  v_fechou_cancelamento boolean := false;
begin
  if p_origem is null or p_origem not in ('botao', 'webhook') then
    raise exception 'clube_aplicar_estorno: origem inválida';
  end if;
  if coalesce(p_asaas_payment_id, '') = '' then
    return jsonb_build_object('ok', false, 'erro', 'sem_pagamento');
  end if;

  select * into v_c from clube_creditos where asaas_payment_id = p_asaas_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'ciclo_nao_encontrado');
  end if;
  select * into v_a from clube_assinantes where id = v_c.assinante_id for update;

  if v_c.estornado_em is not null then
    return jsonb_build_object('ok', true, 'ja_aplicado', true, 'ciclo_id', v_c.id, 'assinante_id', v_c.assinante_id,
      'usadas', v_c.creditos_usados, 'total', v_c.creditos_total, 'estornado_em', v_c.estornado_em);
  end if;

  update clube_creditos
     set bloqueado = true,
         bloqueado_em = now(),
         estornado_em = now(),
         motivo_bloqueio = left(
           case p_origem when 'webhook' then 'Estorno feito no Asaas' else 'Estorno pelo sistema' end
           || coalesce(': ' || nullif(trim(p_motivo), ''), ''), 300)
   where id = v_c.id;

  -- financeiro: despesa de estorno no valor da receita lançada pelo webhook (descrição "… (pay_x)")
  select id, salon_id, amount into v_inc_id, v_inc_salon, v_inc_valor
    from financial_transactions
   where transaction_type = 'income' and strpos(description, '(' || p_asaas_payment_id || ')') > 0
   order by created_at limit 1;
  if v_inc_id is not null
     and not exists (select 1 from financial_transactions
                      where strpos(description, '[estorno ' || p_asaas_payment_id || ']') > 0) then
    insert into financial_transactions (salon_id, transaction_type, amount, description, category, transaction_date)
    values (v_inc_salon, 'expense', v_inc_valor,
            'Estorno Clube da Escova: ' || coalesce(v_a.nome, 'assinante') || ' [estorno ' || p_asaas_payment_id || ']',
            'Clube da Escova', v_hoje);
    v_lancou := true;
  end if;

  -- cancelamento que esperava o fim do ciclo: sem ciclo ativo restante, fecha agora
  if v_a.cancelada_em is not null and v_a.status <> 'cancelado'
     and not exists (select 1 from clube_creditos k
                      where k.assinante_id = v_a.id and not k.bloqueado and k.inicio <= now() and now() < k.fim) then
    update clube_assinantes set status = 'cancelado', updated_at = now() where id = v_a.id;
    v_fechou_cancelamento := true;
  end if;

  if p_origem = 'webhook' then
    v_salon := coalesce(v_inc_salon, (select id from salons order by created_at limit 1));
    insert into clube_estornos (salon_id, user_id, origem, tipo, resultado, assinante_id, alvo, valor, motivo, detalhe)
    values (v_salon, null, 'webhook', 'estorno', 'aplicado_webhook', v_a.id, p_asaas_payment_id, v_inc_valor,
            'Estorno feito no Asaas', jsonb_build_object('usadas', v_c.creditos_usados, 'total', v_c.creditos_total));
  end if;

  return jsonb_build_object('ok', true, 'ja_aplicado', false, 'ciclo_id', v_c.id, 'assinante_id', v_a.id,
    'usadas', v_c.creditos_usados, 'total', v_c.creditos_total, 'valor_estornado', coalesce(v_inc_valor, 0),
    'lancou_financeiro', v_lancou, 'fechou_cancelamento', v_fechou_cancelamento);
end
$fn$;
comment on function public.clube_aplicar_estorno(text, text, text, uuid) is
  '05/10/2026: estorno de uma cobrança do Clube no motor (bloqueia o ciclo + despesa de estorno). Idempotente por estornado_em.';
revoke execute on function public.clube_aplicar_estorno(text, text, text, uuid) from public, anon, authenticated;
grant execute on function public.clube_aplicar_estorno(text, text, text, uuid) to service_role;

create or replace function public.clube_aplicar_cancelamento(
  p_asaas_subscription_id text,
  p_asaas_customer_id text,
  p_restam_ativas integer,   -- outras assinaturas ACTIVE do customer no Asaas; null = desconhecido (webhook)
  p_origem text,
  p_user_id uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $fn$
declare
  v_a clube_assinantes%rowtype;
  v_vale_ate timestamptz;
  v_salon uuid;
  v_efeito text;
begin
  if p_origem is null or p_origem not in ('botao', 'webhook') then
    raise exception 'clube_aplicar_cancelamento: origem inválida';
  end if;

  if coalesce(p_asaas_customer_id, '') <> '' then
    select * into v_a from clube_assinantes where asaas_customer_id = p_asaas_customer_id for update;
  else
    select * into v_a from clube_assinantes where asaas_subscription_id = p_asaas_subscription_id for update;
  end if;
  if not found then
    return jsonb_build_object('ok', false, 'erro', 'assinante_nao_encontrada');
  end if;

  if v_a.status = 'cancelado' or v_a.cancelada_em is not null then
    return jsonb_build_object('ok', true, 'ja_aplicado', true, 'efeito', 'ja_cancelada', 'assinante_id', v_a.id,
      'status', v_a.status, 'cancelada_em', v_a.cancelada_em);
  end if;

  -- outra assinatura dela continua ativa: o cadastro segue ativo
  if coalesce(p_restam_ativas, 0) > 0 then
    return jsonb_build_object('ok', true, 'ja_aplicado', false, 'efeito', 'restam_assinaturas', 'assinante_id', v_a.id,
      'restam', p_restam_ativas);
  end if;
  -- webhook não sabe quantas restam: só age se for a assinatura registrada neste cadastro
  if p_restam_ativas is null and v_a.asaas_subscription_id is distinct from p_asaas_subscription_id then
    return jsonb_build_object('ok', true, 'ja_aplicado', false, 'efeito', 'outra_assinatura', 'assinante_id', v_a.id);
  end if;

  select max(k.fim) into v_vale_ate
    from clube_creditos k
   where k.assinante_id = v_a.id and not k.bloqueado and k.inicio <= now() and now() < k.fim;

  if v_vale_ate is not null then
    update clube_assinantes set cancelada_em = now(), updated_at = now() where id = v_a.id;
    v_efeito := 'cancelada_vale_ate_fim_do_ciclo';
  else
    update clube_assinantes set cancelada_em = now(), status = 'cancelado', updated_at = now() where id = v_a.id;
    v_efeito := 'cancelada';
  end if;

  if p_origem = 'webhook' then
    v_salon := (select id from salons order by created_at limit 1);
    insert into clube_estornos (salon_id, user_id, origem, tipo, resultado, assinante_id, alvo, motivo, detalhe)
    values (v_salon, null, 'webhook', 'cancelamento', 'aplicado_webhook', v_a.id, p_asaas_subscription_id,
            'Assinatura encerrada no Asaas', jsonb_build_object('efeito', v_efeito, 'vale_ate', v_vale_ate));
  end if;

  return jsonb_build_object('ok', true, 'ja_aplicado', false, 'efeito', v_efeito, 'assinante_id', v_a.id,
    'vale_ate', v_vale_ate);
end
$fn$;
comment on function public.clube_aplicar_cancelamento(text, text, integer, text, uuid) is
  '05/10/2026: cancelamento de uma assinatura do Clube no motor. Idempotente por cancelada_em/status.';
revoke execute on function public.clube_aplicar_cancelamento(text, text, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.clube_aplicar_cancelamento(text, text, integer, text, uuid) to service_role;

-- ── garantias ────────────────────────────────────────────────────────────────
do $$
begin
  if has_column_privilege('authenticated', 'public.salon_secrets', 'senha_estorno_hash', 'select')
     or has_column_privilege('anon', 'public.salon_secrets', 'senha_estorno_hash', 'select') then
    raise exception 'senha_estorno_hash legível pelo front';
  end if;
  if has_table_privilege('authenticated', 'public.clube_estornos', 'insert')
     or has_table_privilege('authenticated', 'public.clube_estornos', 'update')
     or has_table_privilege('authenticated', 'public.clube_estornos', 'delete')
     or has_table_privilege('anon', 'public.clube_estornos', 'select') then
    raise exception 'clube_estornos com escrita para o front';
  end if;
  if has_function_privilege('authenticated', 'public.clube_aplicar_estorno(text, text, text, uuid)', 'execute')
     or has_function_privilege('anon', 'public.clube_aplicar_estorno(text, text, text, uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.clube_aplicar_cancelamento(text, text, integer, text, uuid)', 'execute')
     or has_function_privilege('anon', 'public.clube_aplicar_cancelamento(text, text, integer, text, uuid)', 'execute') then
    raise exception 'RPC do motor executável pelo front';
  end if;
end $$;
