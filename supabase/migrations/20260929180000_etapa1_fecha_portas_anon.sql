-- 29/09/2026 — Etapa 1 (auditoria): fecha o que o anônimo (anon key do bundle) conseguia acionar.
-- S-01 professionals lida por anon (CPF/RG) · S-02 clube_entrar_fila(text) sem OTP · R-13 funções internas
-- executáveis por anon · P-03 índices · S-05(3) profiles sem automatrícula.
-- Aplicada via Management API em 29/09/2026 (ledger em Vault/NP Hair Express/AUDITORIA_SISTEMA_2026-09-29/LEDGER_SQL_PRODUCAO.md).
-- Reversão: 20260929180000_etapa1_fecha_portas_anon.rollback.sql

-- S-01: a fila pública lê contagem pela RPC fila_public_bootstrap; nada público lê a tabela.
drop policy if exists professionals_anon_count on public.professionals;
revoke all on public.professionals from anon;

-- S-02: só a versão com OTP fica (o bundle só chama p_celular + p_otp).
drop function if exists public.clube_entrar_fila(text);

-- R-13: funções de apoio/trigger só para quem está logado e para o servidor.
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.get_user_salon_id(uuid) from public, anon;
revoke execute on function public.fn_role_operacao_caixa(uuid) from public, anon;
revoke execute on function public.fn_card_fee_percent(card_brands, text, integer) from public, anon;
revoke execute on function public.alerta_clube_lead() from public, anon;
revoke execute on function public.apply_caixa_movement() from public, anon;
revoke execute on function public.consome_credito_clube() from public, anon;
revoke execute on function public.consome_pacote_unha() from public, anon;
revoke execute on function public.devolve_pacote_unha() from public, anon;
revoke execute on function public.fn_guard_comanda_update() from public, anon;
revoke execute on function public.fn_guard_servico_exclusivo() from public, anon;
revoke execute on function public.prevent_parallel_comanda() from public, anon;
revoke execute on function public.recheck_closure_issues_on_change() from public, anon;
revoke execute on function public.set_comanda_number() from public, anon;
revoke execute on function public.validate_comanda_close() from public, anon;
revoke execute on function public.validate_comanda_insert() from public, anon;
-- authenticated e service_role já constam na ACL (grants explícitos), nada a conceder.

-- P-03: índices que as queries reais usam (payments por comanda era Seq Scan em loop).
create index if not exists idx_payments_comanda_id on public.payments (comanda_id);
create index if not exists idx_comandas_client_id on public.comandas (client_id);
create index if not exists idx_queue_entries_assigned_professional_id on public.queue_entries (assigned_professional_id);

-- S-05(3): perfil nasce só pelo servidor (create-professional-access / create-salon usam service role);
-- usuário logado não se automatricula nem troca de salão.
drop policy if exists "Users can insert their profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and salon_id = get_user_salon_id(auth.uid()));
