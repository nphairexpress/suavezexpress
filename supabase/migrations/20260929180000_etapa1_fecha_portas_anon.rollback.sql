-- Reversão da 20260929180000_etapa1_fecha_portas_anon.sql (estado anterior conforme backup 20260929-162321-etapa0-inicial).
create policy professionals_anon_count on public.professionals for select using (is_active = true);
grant select, insert, update, delete, truncate, references, trigger on public.professionals to anon;

-- clube_entrar_fila(text): definição completa em 20260916170000_clube_ciclo_30_dias.sql (seção 5, primeira função).

grant execute on function public.has_role(uuid, app_role) to public, anon;
grant execute on function public.get_user_salon_id(uuid) to public, anon;
grant execute on function public.fn_role_operacao_caixa(uuid) to public, anon;
grant execute on function public.fn_card_fee_percent(card_brands, text, integer) to public, anon;
grant execute on function public.alerta_clube_lead() to public, anon;
grant execute on function public.apply_caixa_movement() to public, anon;
grant execute on function public.consome_credito_clube() to public, anon;
grant execute on function public.consome_pacote_unha() to public, anon;
grant execute on function public.devolve_pacote_unha() to public, anon;
grant execute on function public.fn_guard_comanda_update() to public, anon;
grant execute on function public.fn_guard_servico_exclusivo() to public, anon;
grant execute on function public.prevent_parallel_comanda() to public, anon;
grant execute on function public.recheck_closure_issues_on_change() to public, anon;
grant execute on function public.set_comanda_number() to public, anon;
grant execute on function public.validate_comanda_close() to public, anon;
grant execute on function public.validate_comanda_insert() to public, anon;

drop index if exists public.idx_payments_comanda_id;
drop index if exists public.idx_comandas_client_id;
drop index if exists public.idx_queue_entries_assigned_professional_id;

create policy "Users can insert their profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using (user_id = auth.uid());

-- Auth (Management API PATCH /config/auth): disable_signup=false, site_url=http://localhost:3000, uri_allow_list="".
