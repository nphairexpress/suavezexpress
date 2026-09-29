-- 12/10/2026 — Etapa 6 (auditoria S-06, R-07; decisões do dono D2, D3, D7): permissões por papel
-- configuráveis pelo dono em Configurações.
--
-- O que muda:
--   a. Tabela salon_permissions (salon_id, permission_key, roles app_role[]) — uma linha por chave, o dono
--      edita os papéis na tela. fn_pode(uid, chave) responde se o papel do usuário (user_roles.role) está
--      na lista; admin sempre pode.
--   b. Policies e RPCs de dinheiro deixam de perguntar "é staff?" (fn_role_operacao_caixa = todo mundo,
--      drift de 30/07) e passam a perguntar fn_pode(auth.uid(), '<chave>').
--   c. fn_guard_comanda_update: comanda fechada só muda fora de RPC com comanda.reabrir; comanda aberta só
--      muda por quem pode fechar qualquer comanda OU pela dona (professionals.user_id = auth.uid());
--      desconto direto exige comanda.desconto_manual; fechar fora da RPC exige comanda.fechar_qualquer.
--      Escrita vinda de RPC (app.via_rpc) e de trigger aninhado (pg_trigger_depth() > 1: Clube/pacote
--      ajustam discount ao inserir item) continua passando.
--   d. rpc_fechar_comanda(_v2): fecha se comanda.fechar_qualquer OU (comanda.fechar_propria e a comanda é
--      da própria profissional); desconto acima do já gravado exige comanda.desconto_manual.
--   e. professionals: a própria ficha só muda nas colunas de contato/endereço (trigger de coluna); o resto
--      exige ficha.editar_qualquer. professional_bank_details: própria (dados_bancarios.editar_propria) ou
--      dados_bancarios.editar_qualquer.
--   f. clients: DELETE exige cliente.excluir; view clients_staff (security_invoker) devolve cpf/rg/
--      birth_date só para quem tem cliente.ver_cpf (R-07 — o front precisa ler pela view).
--   g. apply_caixa_movement vira SECURITY DEFINER: o trigger atualiza caixas em nome de quem lança a
--      sangria, e a policy nova de UPDATE em caixas (caixa.reabrir_editar) não deve valer para ele.
--
-- Chaves e padrão decidido (todas podem ser trocadas na tela):
--   caixa.abrir / caixa.fechar                  admin, financial, receptionist, manager
--   caixa.reabrir_editar                        admin, financial
--   caixa.sangria_suprimento                    admin, financial, receptionist
--   comanda.fechar_qualquer                     admin, financial, receptionist, manager
--   comanda.fechar_propria                      + professional
--   comanda.reabrir / comanda.excluir           admin, financial
--   comanda.desconto_manual                     admin, financial, receptionist
--   pagamento.anular                            admin, financial
--   financeiro.ver                              admin, financial, manager, receptionist (recepção abre/fecha caixa pela tela Financeiro)
--   comissao.ver_todas / comissao.editar        admin, financial
--   ficha.editar_propria_contato                todos
--   ficha.editar_qualquer                       admin, financial
--   despesas.lancar                             admin, financial
--   dados_bancarios.editar_propria              todos (D3 literal = tirar professional daqui)
--   dados_bancarios.editar_qualquer             admin, financial
--   cliente.excluir / cliente.ver_cpf           admin, financial
--
-- Premissas (registradas em PROVAS_ETAPA6.md):
--   - Etapas 4 e 5 aplicadas (rpc_fechar_comanda_v2 com app.via_rpc; rpc_abrir_caixa; rpc_excluir_comanda).
--   - RPCs são SECURITY DEFINER (owner postgres, BYPASSRLS): as policies novas não as afetam; o que as
--     restringe é a checagem fn_pode dentro de cada uma.
--   - fn_role_operacao_caixa / fn_role_financeiro continuam existindo (stock_movements, audit_log,
--     comanda_items, client_credits/debts, rpc_iniciar_atendimento ainda as usam — fora do escopo).
--   - INSERT direto em payments: o front não faz (só a RPC); a policy passa a exigir comanda.fechar_qualquer.
--
-- Aplicar pela Management API em transação única. Reversão:
--   20261012090000_etapa6_permissoes_configuraveis.rollback.sql

-- ── a. salon_permissions ─────────────────────────────────────────────────────
create table if not exists public.salon_permissions (
  salon_id       uuid not null references public.salons(id) on delete cascade,
  permission_key text not null,
  roles          app_role[] not null default '{}',
  updated_at     timestamptz not null default now(),
  updated_by     uuid,
  primary key (salon_id, permission_key)
);
comment on table public.salon_permissions is
  'Etapa 6: quais papéis (user_roles.role) podem fazer cada ação. Lido por fn_pode(); editado em Configurações. admin sempre pode.';

alter table public.salon_permissions enable row level security;
revoke all on public.salon_permissions from public, anon;
grant select, insert, update on public.salon_permissions to authenticated;
grant all on public.salon_permissions to service_role;

drop policy if exists salon_permissions_select_staff on public.salon_permissions;
create policy salon_permissions_select_staff on public.salon_permissions
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid()));

drop policy if exists salon_permissions_insert_admin on public.salon_permissions;
create policy salon_permissions_insert_admin on public.salon_permissions
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists salon_permissions_update_admin on public.salon_permissions;
create policy salon_permissions_update_admin on public.salon_permissions
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and has_role(auth.uid(), 'admin'::app_role))
  with check (salon_id = get_user_salon_id(auth.uid()) and has_role(auth.uid(), 'admin'::app_role));

create or replace function public.fn_salon_permissions_stamp()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end
$fn$;
revoke execute on function public.fn_salon_permissions_stamp() from public, anon;

drop trigger if exists trg_salon_permissions_stamp on public.salon_permissions;
create trigger trg_salon_permissions_stamp
  before insert or update on public.salon_permissions
  for each row execute function public.fn_salon_permissions_stamp();

-- trilha (R-06): mesma fn_audit_log das tabelas de dinheiro
drop trigger if exists trg_audit_log on public.salon_permissions;
create trigger trg_audit_log
  after insert or delete or update on public.salon_permissions
  for each row execute function public.fn_audit_log();

-- ── fn_pode ──────────────────────────────────────────────────────────────────
create or replace function public.fn_pode(_uid uuid, _key text)
returns boolean
language sql stable security definer set search_path = public as $fn$
  select _uid is not null and (
    exists (select 1 from user_roles ur where ur.user_id = _uid and ur.role = 'admin'::app_role)
    or exists (
      select 1
        from user_roles ur
        join salon_permissions sp
          on sp.salon_id = ur.salon_id and sp.permission_key = _key
       where ur.user_id = _uid and ur.role = any (sp.roles)));
$fn$;
comment on function public.fn_pode(uuid, text) is
  'Etapa 6: o papel do usuário está na lista de salon_permissions da chave? admin sempre pode.';
revoke execute on function public.fn_pode(uuid, text) from public, anon;
grant execute on function public.fn_pode(uuid, text) to authenticated, service_role;

-- ── seed (padrão decidido; on conflict do nothing preserva o que o dono já tiver mudado) ──
insert into public.salon_permissions (salon_id, permission_key, roles)
select s.id, k.key, k.roles
  from public.salons s
 cross join (values
   ('caixa.abrir',                   '{admin,financial,receptionist,manager}'::app_role[]),
   ('caixa.fechar',                  '{admin,financial,receptionist,manager}'::app_role[]),
   ('caixa.reabrir_editar',          '{admin,financial}'::app_role[]),
   ('caixa.sangria_suprimento',      '{admin,financial,receptionist}'::app_role[]),
   ('comanda.fechar_qualquer',       '{admin,financial,receptionist,manager}'::app_role[]),
   ('comanda.fechar_propria',        '{admin,financial,receptionist,manager,professional}'::app_role[]),
   ('comanda.reabrir',               '{admin,financial}'::app_role[]),
   ('comanda.excluir',               '{admin,financial}'::app_role[]),
   ('comanda.desconto_manual',       '{admin,financial,receptionist}'::app_role[]),
   ('pagamento.anular',              '{admin,financial}'::app_role[]),
   ('financeiro.ver',                '{admin,financial,manager,receptionist}'::app_role[]),
   ('comissao.ver_todas',            '{admin,financial}'::app_role[]),
   ('comissao.editar',               '{admin,financial}'::app_role[]),
   ('ficha.editar_propria_contato',  '{admin,financial,receptionist,manager,professional}'::app_role[]),
   ('ficha.editar_qualquer',         '{admin,financial}'::app_role[]),
   ('despesas.lancar',               '{admin,financial}'::app_role[]),
   ('dados_bancarios.editar_propria','{admin,financial,receptionist,manager,professional}'::app_role[]),
   ('dados_bancarios.editar_qualquer','{admin,financial}'::app_role[]),
   ('cliente.excluir',               '{admin,financial}'::app_role[]),
   ('cliente.ver_cpf',               '{admin,financial}'::app_role[])
 ) as k(key, roles)
on conflict (salon_id, permission_key) do nothing;

-- ── b. policies ──────────────────────────────────────────────────────────────
-- payments: SELECT continua para staff; INSERT direto só quem fecha qualquer comanda (a RPC é DEFINER e
-- não passa por aqui); UPDATE (voided) só pagamento.anular.
drop policy if exists payments_insert_financeiro on public.payments;
create policy payments_insert_financeiro on public.payments
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comanda.fechar_qualquer'));

drop policy if exists payments_update_financeiro on public.payments;
create policy payments_update_financeiro on public.payments
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'pagamento.anular'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'pagamento.anular'));

-- caixas: SELECT continua para staff (a profissional escolhe o caixa da recepção ao fechar).
drop policy if exists caixas_insert_financeiro on public.caixas;
create policy caixas_insert_financeiro on public.caixas
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and user_id = auth.uid() and fn_pode(auth.uid(), 'caixa.abrir'));

drop policy if exists caixas_update_financeiro on public.caixas;
create policy caixas_update_financeiro on public.caixas
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid())
         and (fn_pode(auth.uid(), 'caixa.reabrir_editar')
              or coalesce(current_setting('app.via_rpc', true), '') = '1'))
  with check (salon_id = get_user_salon_id(auth.uid()));

-- caixa_movements (sangria/suprimento)
drop policy if exists caixa_movements_insert_financeiro on public.caixa_movements;
create policy caixa_movements_insert_financeiro on public.caixa_movements
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'caixa.sangria_suprimento'));

-- g. o trigger que soma a movimentação no caixa roda em nome de quem lançou: vira DEFINER para não
-- depender da policy de UPDATE em caixas.
alter function public.apply_caixa_movement() security definer set search_path = public;

-- customer_credits (crédito da fila): escrita direta = desconto manual; SELECT por salão continua.
drop policy if exists customer_credits_all_financeiro on public.customer_credits;
drop policy if exists customer_credits_write_financeiro on public.customer_credits;
create policy customer_credits_write_financeiro on public.customer_credits
  for all to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comanda.desconto_manual'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comanda.desconto_manual'));

-- financial_transactions
drop policy if exists financial_transactions_insert_financeiro on public.financial_transactions;
drop policy if exists fin_tx_insert_financeiro on public.financial_transactions;
drop policy if exists fin_tx_update_financeiro on public.financial_transactions;
drop policy if exists fin_tx_delete_financeiro on public.financial_transactions;
drop policy if exists "Users can view transactions in their salon" on public.financial_transactions;
create policy fin_tx_select on public.financial_transactions
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'financeiro.ver'));
create policy fin_tx_insert_financeiro on public.financial_transactions
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy fin_tx_update_financeiro on public.financial_transactions
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy fin_tx_delete_financeiro on public.financial_transactions
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));

-- accounts_payable (despesas) e bank_accounts
drop policy if exists "Users can view payables in their salon" on public.accounts_payable;
drop policy if exists "Users can insert payables in their salon" on public.accounts_payable;
drop policy if exists "Users can update payables in their salon" on public.accounts_payable;
drop policy if exists "Users can delete payables in their salon" on public.accounts_payable;
create policy accounts_payable_select on public.accounts_payable
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'financeiro.ver'));
create policy accounts_payable_insert on public.accounts_payable
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy accounts_payable_update on public.accounts_payable
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy accounts_payable_delete on public.accounts_payable
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));

drop policy if exists "Users can insert bank accounts in their salon" on public.bank_accounts;
drop policy if exists "Users can update bank accounts in their salon" on public.bank_accounts;
drop policy if exists "Users can delete bank accounts in their salon" on public.bank_accounts;
create policy bank_accounts_insert on public.bank_accounts
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy bank_accounts_update on public.bank_accounts
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));
create policy bank_accounts_delete on public.bank_accounts
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'despesas.lancar'));

-- comandas: DELETE direto só comanda.excluir (a rpc_excluir_comanda também checa).
drop policy if exists comandas_delete_financeiro on public.comandas;
create policy comandas_delete_financeiro on public.comandas
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comanda.excluir'));

-- professionals: própria ficha (colunas de contato, via trigger abaixo) ou ficha.editar_qualquer.
drop policy if exists "Users can update professionals in their salon" on public.professionals;
create policy professionals_update on public.professionals
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid())
         and (fn_pode(auth.uid(), 'ficha.editar_qualquer')
              or (user_id = auth.uid() and fn_pode(auth.uid(), 'ficha.editar_propria_contato'))))
  with check (salon_id = get_user_salon_id(auth.uid()));

drop policy if exists "Users can insert professionals in their salon" on public.professionals;
create policy professionals_insert on public.professionals
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'ficha.editar_qualquer'));

create or replace function public.fn_guard_professional_update()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  -- colunas que a própria profissional pode mudar (contato/endereço/redes)
  v_contato text[] := array['email','phone','mobile','avatar_url','description','site','facebook',
                            'instagram','twitter','cep','address','neighborhood','city','state','updated_at'];
begin
  if v_uid is null or coalesce(current_setting('app.via_rpc', true), '') = '1'
     or fn_pode(v_uid, 'ficha.editar_qualquer') then
    return new;
  end if;
  if old.user_id = v_uid and fn_pode(v_uid, 'ficha.editar_propria_contato') then
    if (to_jsonb(new) - v_contato) is distinct from (to_jsonb(old) - v_contato) then
      raise exception 'Na própria ficha só é permitido alterar contato e endereço (comissão, PIX, papel e dados cadastrais exigem ficha.editar_qualquer)';
    end if;
    return new;
  end if;
  raise exception 'Sem permissão para alterar a ficha da profissional';
end
$fn$;
revoke execute on function public.fn_guard_professional_update() from public, anon;

drop trigger if exists trg_guard_professional_update on public.professionals;
create trigger trg_guard_professional_update
  before update on public.professionals
  for each row execute function public.fn_guard_professional_update();

-- comissão: regras, exceções por serviço, ajustes, pagamentos, configurações
drop policy if exists "Users can view commission rules in their salon" on public.professional_commission_rules;
drop policy if exists "Users can insert commission rules in their salon" on public.professional_commission_rules;
drop policy if exists "Users can update commission rules in their salon" on public.professional_commission_rules;
drop policy if exists "Users can delete commission rules in their salon" on public.professional_commission_rules;
create policy pcr_select on public.professional_commission_rules
  for select to authenticated
  using (exists (select 1 from professionals p
                  where p.id = professional_commission_rules.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and (p.user_id = auth.uid() or fn_pode(auth.uid(), 'comissao.ver_todas'))));
create policy pcr_insert on public.professional_commission_rules
  for insert to authenticated
  with check (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_commission_rules.professional_id and p.salon_id = get_user_salon_id(auth.uid())));
create policy pcr_update on public.professional_commission_rules
  for update to authenticated
  using (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_commission_rules.professional_id and p.salon_id = get_user_salon_id(auth.uid())));
create policy pcr_delete on public.professional_commission_rules
  for delete to authenticated
  using (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_commission_rules.professional_id and p.salon_id = get_user_salon_id(auth.uid())));

drop policy if exists "Users can view commissions in their salon" on public.professional_service_commissions;
drop policy if exists psc_insert_financeiro on public.professional_service_commissions;
drop policy if exists psc_update_financeiro on public.professional_service_commissions;
drop policy if exists psc_delete_financeiro on public.professional_service_commissions;
create policy psc_select on public.professional_service_commissions
  for select to authenticated
  using (exists (select 1 from professionals p
                  where p.id = professional_service_commissions.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and (p.user_id = auth.uid() or fn_pode(auth.uid(), 'comissao.ver_todas'))));
create policy psc_insert_financeiro on public.professional_service_commissions
  for insert to authenticated
  with check (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_service_commissions.professional_id and p.salon_id = get_user_salon_id(auth.uid())));
create policy psc_update_financeiro on public.professional_service_commissions
  for update to authenticated
  using (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_service_commissions.professional_id and p.salon_id = get_user_salon_id(auth.uid())));
create policy psc_delete_financeiro on public.professional_service_commissions
  for delete to authenticated
  using (fn_pode(auth.uid(), 'comissao.editar') and exists (select 1 from professionals p
                  where p.id = professional_service_commissions.professional_id and p.salon_id = get_user_salon_id(auth.uid())));

drop policy if exists "Users can view commission_adjustments in their salon" on public.commission_adjustments;
drop policy if exists "Users can insert commission_adjustments in their salon" on public.commission_adjustments;
drop policy if exists "Users can delete commission_adjustments in their salon" on public.commission_adjustments;
create policy commission_adjustments_select on public.commission_adjustments
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid())
         and (fn_pode(auth.uid(), 'comissao.ver_todas')
              or exists (select 1 from professionals p where p.id = commission_adjustments.professional_id and p.user_id = auth.uid())));
create policy commission_adjustments_insert on public.commission_adjustments
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));
create policy commission_adjustments_delete on public.commission_adjustments
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));

drop policy if exists "view commission_payments" on public.commission_payments;
drop policy if exists commission_payments_insert_financeiro on public.commission_payments;
drop policy if exists commission_payments_update_financeiro on public.commission_payments;
drop policy if exists commission_payments_delete_financeiro on public.commission_payments;
create policy commission_payments_select on public.commission_payments
  for select to authenticated
  using (salon_id = get_user_salon_id(auth.uid())
         and (fn_pode(auth.uid(), 'comissao.ver_todas')
              or exists (select 1 from professionals p where p.id = commission_payments.professional_id and p.user_id = auth.uid())));
create policy commission_payments_insert_financeiro on public.commission_payments
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));
create policy commission_payments_update_financeiro on public.commission_payments
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));
create policy commission_payments_delete_financeiro on public.commission_payments
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));

drop policy if exists "Admins can insert commission settings" on public.commission_settings;
drop policy if exists "Admins can update commission settings" on public.commission_settings;
create policy commission_settings_insert on public.commission_settings
  for insert to authenticated
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));
create policy commission_settings_update on public.commission_settings
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'))
  with check (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'));

-- dados bancários: próprios (dados_bancarios.editar_propria) ou dados_bancarios.editar_qualquer;
-- leitura: próprios ou editar_qualquer (PIX de colega não é dado público).
drop policy if exists "Users can view bank details in their salon" on public.professional_bank_details;
drop policy if exists "Users can insert bank details in their salon" on public.professional_bank_details;
drop policy if exists "Users can update bank details in their salon" on public.professional_bank_details;
drop policy if exists "Users can delete bank details in their salon" on public.professional_bank_details;
create policy pbd_select on public.professional_bank_details
  for select to authenticated
  using (exists (select 1 from professionals p
                  where p.id = professional_bank_details.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and (p.user_id = auth.uid() or fn_pode(auth.uid(), 'dados_bancarios.editar_qualquer'))));
create policy pbd_insert on public.professional_bank_details
  for insert to authenticated
  with check (exists (select 1 from professionals p
                  where p.id = professional_bank_details.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and ((p.user_id = auth.uid() and fn_pode(auth.uid(), 'dados_bancarios.editar_propria'))
                         or fn_pode(auth.uid(), 'dados_bancarios.editar_qualquer'))));
create policy pbd_update on public.professional_bank_details
  for update to authenticated
  using (exists (select 1 from professionals p
                  where p.id = professional_bank_details.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and ((p.user_id = auth.uid() and fn_pode(auth.uid(), 'dados_bancarios.editar_propria'))
                         or fn_pode(auth.uid(), 'dados_bancarios.editar_qualquer'))));
create policy pbd_delete on public.professional_bank_details
  for delete to authenticated
  using (exists (select 1 from professionals p
                  where p.id = professional_bank_details.professional_id
                    and p.salon_id = get_user_salon_id(auth.uid())
                    and ((p.user_id = auth.uid() and fn_pode(auth.uid(), 'dados_bancarios.editar_propria'))
                         or fn_pode(auth.uid(), 'dados_bancarios.editar_qualquer'))));

-- services / card_brands: preço e taxa (chegam ao checkout público) só comissao.editar
drop policy if exists "Users can update services in their salon" on public.services;
create policy services_update on public.services
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'))
  with check (salon_id = get_user_salon_id(auth.uid()));
drop policy if exists "Users can update card brands in their salon" on public.card_brands;
create policy card_brands_update on public.card_brands
  for update to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'comissao.editar'))
  with check (salon_id = get_user_salon_id(auth.uid()));

-- clients: DELETE só cliente.excluir; SELECT continua para staff; view sem CPF/RG/nascimento (R-07)
drop policy if exists "Users can delete clients in their salon" on public.clients;
create policy clients_delete on public.clients
  for delete to authenticated
  using (salon_id = get_user_salon_id(auth.uid()) and fn_pode(auth.uid(), 'cliente.excluir'));

create or replace view public.clients_staff with (security_invoker = true) as
select id, salon_id, name, email, phone, phone_landline, notes, tags, gender,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then cpf end        as cpf,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then rg end         as rg,
       case when fn_pode(auth.uid(), 'cliente.ver_cpf') then birth_date end as birth_date,
       cep, state, city, neighborhood, address, address_number, address_complement,
       how_met, profession, avatar_url, allow_email_campaigns, allow_sms_campaigns,
       allow_online_booking, allow_whatsapp_campaigns, add_cpf_invoice, allow_ai_service,
       created_at, updated_at
  from public.clients;
comment on view public.clients_staff is
  'R-07: clients sem cpf/rg/birth_date para quem não tem cliente.ver_cpf. RLS de clients vale (security_invoker).';
revoke all on public.clients_staff from public, anon;
grant select on public.clients_staff to authenticated, service_role;

-- ── c. fn_guard_comanda_update ───────────────────────────────────────────────
create or replace function public.fn_guard_comanda_update()
returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_minha boolean;
begin
  -- service_role / cron (auth.uid() nulo), RPC transacional (app.via_rpc) e trigger aninhado
  -- (Clube/pacote ajustam discount ao inserir item; devolução ao excluir) passam.
  if v_uid is null or coalesce(current_setting('app.via_rpc', true), '') = '1' or pg_trigger_depth() > 1 then
    return new;
  end if;
  v_ref := '#' || coalesce(old.comanda_number::text, left(old.id::text, 8));

  -- F-11 (etapa 5): comanda fechada não muda de data fora de RPC (nem admin).
  if old.closed_at is not null and new.created_at is distinct from old.created_at then
    raise exception 'Comanda % está fechada: a data da comanda não pode ser alterada', v_ref;
  end if;

  -- Comanda FECHADA: fora de RPC só quem pode reabrir comanda altera.
  if old.closed_at is not null then
    if not fn_pode(v_uid, 'comanda.reabrir') then
      raise exception 'Comanda % está fechada: só quem pode reabrir comanda pode alterá-la', v_ref;
    end if;
    return new;
  end if;

  -- Comanda ABERTA: da própria profissional ou de quem pode fechar qualquer comanda.
  v_minha := old.professional_id is not null and exists (
    select 1 from professionals p where p.id = old.professional_id and p.user_id = v_uid);
  if not (v_minha or fn_pode(v_uid, 'comanda.fechar_qualquer')) then
    raise exception 'Comanda % é de outra profissional: sem permissão para alterá-la', v_ref;
  end if;
  if new.discount is distinct from old.discount and not fn_pode(v_uid, 'comanda.desconto_manual') then
    raise exception 'Sem permissão para desconto manual na comanda %', v_ref;
  end if;
  if (new.closed_at is distinct from old.closed_at
      or new.is_paid is distinct from old.is_paid
      or new.caixa_id is distinct from old.caixa_id)
     and not fn_pode(v_uid, 'comanda.fechar_qualquer') then
    raise exception 'Comanda %: fechamento fora da RPC exige permissão para fechar qualquer comanda', v_ref;
  end if;
  return new;
end
$fn$;

-- ── d. RPCs (reescritas a partir das definições vivas; só a checagem de permissão muda) ──
-- ── rpc_abrir_caixa ──
CREATE OR REPLACE FUNCTION public.rpc_abrir_caixa(p_opening_balance numeric DEFAULT 0, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  v_aberto record;
  v_id uuid;
begin
  if v_uid is null or not fn_pode(v_uid, 'caixa.abrir') then
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
$function$;

-- ── rpc_fechar_caixa ──
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

-- ── rpc_fechar_comanda_v2 ──
CREATE OR REPLACE FUNCTION public.rpc_fechar_comanda_v2(p_comanda uuid, p_caixa uuid, p_payments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT NULL::numeric, p_allow_underpaid boolean DEFAULT false, p_overpayment_mode text DEFAULT 'troco'::text, p_underpaid_as_debt boolean DEFAULT false, p_cashback jsonb DEFAULT NULL::jsonb, p_appointment_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF v_uid IS NULL THEN
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

  -- Etapa 6: quem pode fechar ESTA comanda (salon_permissions) e desconto manual acima do já gravado
  IF NOT (fn_pode(v_uid, 'comanda.fechar_qualquer')
          OR (fn_pode(v_uid, 'comanda.fechar_propria') AND EXISTS (
                SELECT 1 FROM professionals p WHERE p.id = v_comanda.professional_id AND p.user_id = v_uid))) THEN
    RAISE EXCEPTION 'Sem permissão para fechar a comanda #%: ela é de outra profissional', v_ref;
  END IF;
  IF COALESCE(p_discount, 0) > COALESCE(v_comanda.discount, 0) + 0.005
     AND NOT fn_pode(v_uid, 'comanda.desconto_manual') THEN
    RAISE EXCEPTION 'Sem permissão para desconto manual na comanda #%', v_ref;
  END IF;

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
$function$;

-- ── rpc_fechar_comanda ──
CREATE OR REPLACE FUNCTION public.rpc_fechar_comanda(p_comanda uuid, p_caixa uuid, p_payments jsonb DEFAULT '[]'::jsonb, p_discount numeric DEFAULT 0, p_allow_underpaid boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_comanda comandas%ROWTYPE;
  v_caixa caixas%ROWTYPE;
  v_subtotal numeric;
  v_total numeric;
  v_existing_paid numeric;
  v_new_paid numeric := 0;
  v_pay jsonb;
  v_method text;
  v_amount numeric;
  v_installments int;
  v_brand card_brands%ROWTYPE;
  v_fee numeric;
  v_pix_fee_pct numeric;
  v_inc_cash numeric := 0; v_inc_pix numeric := 0; v_inc_cc numeric := 0;
  v_inc_dc numeric := 0; v_inc_other numeric := 0;
BEGIN
  PERFORM set_config('app.via_rpc', '1', true);
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para fechar comanda';
  END IF;
  v_salon := get_user_salon_id(v_uid);

  SELECT * INTO v_comanda FROM comandas WHERE id = p_comanda AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF v_comanda.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Comanda já está fechada'; END IF;
  -- Etapa 6
  IF NOT (fn_pode(v_uid, 'comanda.fechar_qualquer')
          OR (fn_pode(v_uid, 'comanda.fechar_propria') AND EXISTS (
                SELECT 1 FROM professionals p WHERE p.id = v_comanda.professional_id AND p.user_id = v_uid))) THEN
    RAISE EXCEPTION 'Sem permissão para fechar a comanda #%: ela é de outra profissional', COALESCE(v_comanda.comanda_number::text, left(p_comanda::text, 8));
  END IF;
  IF COALESCE(p_discount, 0) > COALESCE(v_comanda.discount, 0) + 0.005
     AND NOT fn_pode(v_uid, 'comanda.desconto_manual') THEN
    RAISE EXCEPTION 'Sem permissão para desconto manual na comanda #%', COALESCE(v_comanda.comanda_number::text, left(p_comanda::text, 8));
  END IF;

  SELECT * INTO v_caixa FROM caixas WHERE id = p_caixa AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Caixa não encontrado'; END IF;
  IF v_caixa.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Caixa está fechado'; END IF;

  IF p_discount IS NULL OR p_discount < 0 THEN RAISE EXCEPTION 'Desconto inválido'; END IF;

  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM comanda_items WHERE comanda_id = p_comanda;
  v_total := GREATEST(0, v_subtotal - p_discount);

  -- Pagamentos já vinculados (ex.: Asaas online) abatem do que falta pagar.
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_paid
    FROM payments WHERE comanda_id = p_comanda AND voided = false;

  SELECT pix_fee_percent INTO v_pix_fee_pct
    FROM commission_settings WHERE salon_id = v_salon LIMIT 1;
  v_pix_fee_pct := COALESCE(v_pix_fee_pct, 0);

  FOR v_pay IN SELECT * FROM jsonb_array_elements(COALESCE(p_payments, '[]'::jsonb))
  LOOP
    v_method := v_pay ->> 'method';
    v_amount := (v_pay ->> 'amount')::numeric;
    v_installments := COALESCE((v_pay ->> 'installments')::int, 1);
    IF v_method NOT IN ('cash', 'pix', 'credit_card', 'debit_card', 'other') THEN
      RAISE EXCEPTION 'Método de pagamento inválido: %', v_method;
    END IF;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      RAISE EXCEPTION 'Valor de pagamento inválido';
    END IF;

    v_fee := 0;
    IF v_method IN ('credit_card', 'debit_card') THEN
      IF (v_pay ->> 'card_brand_id') IS NULL THEN
        RAISE EXCEPTION 'Bandeira do cartão obrigatória';
      END IF;
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

    v_new_paid := v_new_paid + v_amount;
    IF    v_method = 'cash'        THEN v_inc_cash  := v_inc_cash + v_amount;
    ELSIF v_method = 'pix'         THEN v_inc_pix   := v_inc_pix + v_amount;
    ELSIF v_method = 'credit_card' THEN v_inc_cc    := v_inc_cc + v_amount;
    ELSIF v_method = 'debit_card'  THEN v_inc_dc    := v_inc_dc + v_amount;
    ELSE                                v_inc_other := v_inc_other + v_amount;
    END IF;
  END LOOP;

  IF (v_existing_paid + v_new_paid) < (v_total - 0.01) AND NOT p_allow_underpaid THEN
    RAISE EXCEPTION 'Pagamento incompleto: pago % de %', v_existing_paid + v_new_paid, v_total;
  END IF;

  -- Incremento atômico (uma única UPDATE, caixa já travado por FOR UPDATE)
  UPDATE caixas SET
    total_cash        = COALESCE(total_cash, 0) + v_inc_cash,
    total_pix         = COALESCE(total_pix, 0) + v_inc_pix,
    total_credit_card = COALESCE(total_credit_card, 0) + v_inc_cc,
    total_debit_card  = COALESCE(total_debit_card, 0) + v_inc_dc,
    total_other       = COALESCE(total_other, 0) + v_inc_other,
    updated_at        = now()
  WHERE id = p_caixa;

  UPDATE comandas SET
    closed_at = now(), is_paid = true,
    subtotal = v_subtotal, discount = p_discount, total = v_total,
    caixa_id = p_caixa, updated_at = now()
  WHERE id = p_comanda;

  -- Baixa na fila: a cliente terminou
  IF v_comanda.client_id IS NOT NULL THEN
    UPDATE queue_entries
       SET status = 'completed', updated_at = now()
     WHERE salon_id = v_salon AND customer_id = v_comanda.client_id
       AND status IN ('waiting', 'checked_in', 'in_service');
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'comanda_id', p_comanda, 'subtotal', v_subtotal,
    'total', v_total, 'paid', v_existing_paid + v_new_paid);
END;
$function$;

-- ── rpc_reabrir_comanda ──
CREATE OR REPLACE FUNCTION public.rpc_reabrir_comanda(p_comanda uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_comanda comandas%ROWTYPE;
  v_caixa caixas%ROWTYPE;
  v_voided int := 0;
  v_kept int := 0;
  r record;
BEGIN
  -- Etapa 6: porta do guard + permissão configurável
  PERFORM set_config('app.via_rpc', '1', true);
  IF v_uid IS NULL OR NOT fn_pode(v_uid, 'comanda.reabrir') THEN
    RAISE EXCEPTION 'Sem permissão para reabrir comanda';
  END IF;
  v_salon := get_user_salon_id(v_uid);

  SELECT * INTO v_comanda FROM comandas WHERE id = p_comanda AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF v_comanda.closed_at IS NULL THEN RAISE EXCEPTION 'Comanda já está aberta'; END IF;

  IF v_comanda.caixa_id IS NOT NULL THEN
    SELECT * INTO v_caixa FROM caixas WHERE id = v_comanda.caixa_id FOR UPDATE;
    IF FOUND AND v_caixa.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'O caixa precisa estar aberto para reabrir a comanda';
    END IF;
  END IF;

  -- Pagamentos MANUAIS viram void (estorno explícito e auditável).
  -- Pagamentos de PROVEDOR ONLINE (asaas) NÃO são apagados nem voidados:
  -- o dinheiro existe no provedor; segue abatendo no refechamento.
  FOR r IN
    SELECT payment_method::text AS method, SUM(amount) AS total, count(*) AS qtd
      FROM payments
     WHERE comanda_id = p_comanda AND voided = false
       AND (payment_provider IS DISTINCT FROM 'asaas')
     GROUP BY payment_method
  LOOP
    IF v_comanda.caixa_id IS NOT NULL THEN
      INSERT INTO caixa_movements (caixa_id, salon_id, user_id, type, amount, reason, payment_method)
      VALUES (v_comanda.caixa_id, v_salon, v_uid, 'estorno_reabertura', r.total,
              'Reabertura da comanda ' || COALESCE(v_comanda.comanda_number::text, p_comanda::text)
              || COALESCE(': ' || NULLIF(trim(p_reason), ''), ''),
              r.method);
    END IF;
    v_voided := v_voided + r.qtd;
  END LOOP;

  UPDATE payments
     SET voided = true, voided_at = now(),
         voided_reason = 'Reabertura da comanda' || COALESCE(': ' || NULLIF(trim(p_reason), ''), '')
   WHERE comanda_id = p_comanda AND voided = false
     AND (payment_provider IS DISTINCT FROM 'asaas');

  SELECT count(*) INTO v_kept
    FROM payments WHERE comanda_id = p_comanda AND voided = false;

  UPDATE comandas SET closed_at = NULL, is_paid = false, caixa_id = NULL, updated_at = now()
   WHERE id = p_comanda;

  RETURN jsonb_build_object('ok', true, 'voided_payments', v_voided, 'kept_provider_payments', v_kept);
END;
$function$;

-- ── rpc_excluir_comanda ──
CREATE OR REPLACE FUNCTION public.rpc_excluir_comanda(p_comanda uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if v_uid is null or not fn_pode(v_uid, 'comanda.excluir') then
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
$function$;

-- ── rpc_aplicar_credito_fila ──
CREATE OR REPLACE FUNCTION public.rpc_aplicar_credito_fila(p_comanda uuid, p_credit uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_salon uuid;
  v_credit customer_credits%ROWTYPE;
  v_comanda comandas%ROWTYPE;
  v_new_discount numeric;
BEGIN
  PERFORM set_config('app.via_rpc', '1', true);
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sem permissão para aplicar crédito';
  END IF;
  v_salon := get_user_salon_id(v_uid);

  -- Lock no crédito: duas comandas em corrida não debitam o mesmo crédito.
  SELECT * INTO v_credit FROM customer_credits
   WHERE id = p_credit AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Crédito não encontrado'; END IF;
  IF v_credit.used THEN RAISE EXCEPTION 'Crédito já utilizado'; END IF;
  IF v_credit.expires_at < now() THEN RAISE EXCEPTION 'Crédito expirado'; END IF;

  SELECT * INTO v_comanda FROM comandas WHERE id = p_comanda AND salon_id = v_salon FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Comanda não encontrada'; END IF;
  IF v_comanda.closed_at IS NOT NULL THEN RAISE EXCEPTION 'Comanda já está fechada'; END IF;
  -- Etapa 6
  IF NOT (fn_pode(v_uid, 'comanda.fechar_qualquer')
          OR (fn_pode(v_uid, 'comanda.fechar_propria') AND EXISTS (
                SELECT 1 FROM professionals p WHERE p.id = v_comanda.professional_id AND p.user_id = v_uid))) THEN
    RAISE EXCEPTION 'Sem permissão para aplicar crédito na comanda de outra profissional';
  END IF;

  v_new_discount := COALESCE(v_comanda.discount, 0) + v_credit.amount;

  UPDATE customer_credits SET used = true, used_at = now() WHERE id = p_credit;
  UPDATE comandas
     SET discount = v_new_discount,
         total = GREATEST(0, COALESCE(subtotal, 0) - v_new_discount),
         updated_at = now()
   WHERE id = p_comanda;

  RETURN jsonb_build_object('ok', true, 'credit_amount', v_credit.amount, 'new_discount', v_new_discount);
END;
$function$;

-- ── grants (create or replace preserva ACL; reafirmados por segurança) ───────
revoke execute on function public.fn_guard_comanda_update() from public, anon;
revoke execute on function public.apply_caixa_movement() from public, anon;
revoke execute on function public.rpc_abrir_caixa(p_opening_balance numeric, p_notes text) from public, anon;
grant execute on function public.rpc_abrir_caixa(p_opening_balance numeric, p_notes text) to authenticated, service_role;
revoke execute on function public.rpc_fechar_caixa(p_caixa uuid, p_closing_balance numeric, p_notes text) from public, anon;
grant execute on function public.rpc_fechar_caixa(p_caixa uuid, p_closing_balance numeric, p_notes text) to authenticated, service_role;
revoke execute on function public.rpc_fechar_comanda_v2(p_comanda uuid, p_caixa uuid, p_payments jsonb, p_discount numeric, p_allow_underpaid boolean, p_overpayment_mode text, p_underpaid_as_debt boolean, p_cashback jsonb, p_appointment_ids uuid[]) from public, anon;
grant execute on function public.rpc_fechar_comanda_v2(p_comanda uuid, p_caixa uuid, p_payments jsonb, p_discount numeric, p_allow_underpaid boolean, p_overpayment_mode text, p_underpaid_as_debt boolean, p_cashback jsonb, p_appointment_ids uuid[]) to authenticated, service_role;
revoke execute on function public.rpc_fechar_comanda(p_comanda uuid, p_caixa uuid, p_payments jsonb, p_discount numeric, p_allow_underpaid boolean) from public, anon;
grant execute on function public.rpc_fechar_comanda(p_comanda uuid, p_caixa uuid, p_payments jsonb, p_discount numeric, p_allow_underpaid boolean) to authenticated, service_role;
revoke execute on function public.rpc_reabrir_comanda(p_comanda uuid, p_reason text) from public, anon;
grant execute on function public.rpc_reabrir_comanda(p_comanda uuid, p_reason text) to authenticated, service_role;
revoke execute on function public.rpc_excluir_comanda(p_comanda uuid, p_reason text) from public, anon;
grant execute on function public.rpc_excluir_comanda(p_comanda uuid, p_reason text) to authenticated, service_role;
revoke execute on function public.rpc_aplicar_credito_fila(p_comanda uuid, p_credit uuid) from public, anon;
grant execute on function public.rpc_aplicar_credito_fila(p_comanda uuid, p_credit uuid) to authenticated, service_role;
