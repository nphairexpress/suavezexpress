-- 29/09/2026 — R-09/D9: erros do navegador (ErrorBoundary / window.onerror) gravados pela edge
-- `client-error` com service role. Sem policy de INSERT de propósito: nenhum cliente escreve direto.
-- Leitura só de quem tem papel financeiro (fn_role_financeiro). anon não vê nada.
create table if not exists public.client_errors (
  id bigserial primary key,
  ts timestamptz not null default now(),
  user_id uuid,
  message text,
  stack text,
  url text,
  user_agent text
);

alter table public.client_errors enable row level security;

drop policy if exists client_errors_select_financeiro on public.client_errors;
create policy client_errors_select_financeiro on public.client_errors
  for select to authenticated
  using (fn_role_financeiro(auth.uid()));

revoke all on public.client_errors from anon;
revoke all on sequence public.client_errors_id_seq from anon;
