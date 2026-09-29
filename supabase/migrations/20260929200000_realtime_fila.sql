-- 29/09/2026 — P-07: a Fila admin assina postgres_changes em queue_entries/queue_leads, mas a publicação
-- supabase_realtime estava vazia (nenhum evento chegava; a tela só atualizava por refetch).
-- RLS continua valendo para o Realtime. Reversão: alter publication supabase_realtime drop table ...
alter publication supabase_realtime add table public.queue_entries, public.queue_leads;
