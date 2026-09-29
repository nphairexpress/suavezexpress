-- 29/09/2026 — S-11: anon não tem mais privilégio de tabela nenhum em public (a fila pública usa RPCs
-- SECURITY DEFINER e edge functions). Única exceção: INSERT em queue_leads ("me avisa quando a fila
-- diminuir", policy queue_leads_anon_insert). Reversão: grant all on all tables in schema public to anon.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
revoke all on all sequences in schema public from anon;
grant insert on public.queue_leads to anon;
alter default privileges in schema public revoke all on tables from anon;
