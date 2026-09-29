-- 29/09/2026 — Etapa 3 (auditoria R-06 + R-04).
-- R-06: trilha de auditoria única (quem fez o quê) nas tabelas de dinheiro e acesso. Trigger AFTER,
--       SECURITY DEFINER, nunca bloqueia a operação (qualquer erro é engolido).
-- R-04: excluir item de ESCOVA DO CLUBE devolve o crédito e tira o desconto (antes só o pacote devolvia).
-- Aplicada via Management API. Reversão: 20260929190000_...rollback.sql

-- ── R-06 ──────────────────────────────────────────────────────────────────────
create table if not exists public.audit_log (
  id bigserial primary key,
  ts timestamptz not null default now(),
  user_id uuid,
  user_email text,
  tabela text not null,
  op text not null,
  row_id uuid,
  old jsonb,
  new jsonb
);
create index if not exists audit_log_tabela_row_idx on public.audit_log (tabela, row_id);
create index if not exists audit_log_ts_idx on public.audit_log (ts desc);
alter table public.audit_log enable row level security;
drop policy if exists audit_log_financeiro_le on public.audit_log;
create policy audit_log_financeiro_le on public.audit_log for select to authenticated
  using (fn_role_financeiro(auth.uid()));
revoke all on public.audit_log from anon;
grant select on public.audit_log to authenticated;

create or replace function public.fn_audit_log() returns trigger
language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid; v_email text; v_row uuid; v_old jsonb; v_new jsonb;
begin
  begin
    v_uid := auth.uid();
    v_email := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email';
    if tg_op = 'DELETE' then v_old := to_jsonb(old); v_row := (v_old ->> 'id')::uuid;
    elsif tg_op = 'INSERT' then v_new := to_jsonb(new); v_row := (v_new ->> 'id')::uuid;
    else v_old := to_jsonb(old); v_new := to_jsonb(new); v_row := (v_new ->> 'id')::uuid;
      if v_old = v_new then return null; end if;
    end if;
    insert into public.audit_log (user_id, user_email, tabela, op, row_id, old, new)
    values (v_uid, v_email, tg_table_name, tg_op, v_row, v_old, v_new);
  exception when others then
    null; -- auditoria nunca derruba a operação
  end;
  return null;
end
$fn$;
revoke execute on function public.fn_audit_log() from public, anon;

do $$
declare t text;
begin
  foreach t in array array['payments','caixas','caixa_movements','comandas','commission_adjustments',
                           'commission_payments','professional_bank_details','professionals','system_config',
                           'client_credits','client_debts','customer_credits','user_roles','salon_secrets']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists trg_audit_log on public.%I', t);
      execute format('create trigger trg_audit_log after insert or update or delete on public.%I for each row execute function public.fn_audit_log()', t);
    end if;
  end loop;
end $$;

-- ── R-04 ──────────────────────────────────────────────────────────────────────
create or replace function public.devolve_pacote_unha() returns trigger language plpgsql
security definer set search_path = public as $fn$
declare
  v_srv text; v_m int := 0; v_p int := 0; v_q int := coalesce(old.quantity, 1); r record; v_teve boolean := false;
begin
  select upper(name) into v_srv from services where id = old.service_id;
  if v_srv = 'MANICURE' then v_m := 1;
  elsif v_srv = 'PEDICURE' then v_p := 1;
  elsif v_srv = 'MANICURE E PEDICURE EXPRESS' then v_m := 1; v_p := 1;
  end if;
  for r in
    select cs.id, cs.ciclo_id, k.origem from clube_consumos cs join clube_creditos k on k.id = cs.ciclo_id
     where cs.comanda_item_id = old.id
  loop
    v_teve := true;
    if r.origem = 'pacote_unha' then
      update clube_creditos
         set maos_usadas = greatest(0, maos_usadas - v_m * v_q), pes_usados = greatest(0, pes_usados - v_p * v_q),
             creditos_usados = greatest(0, creditos_usados - (v_m + v_p) * v_q)
       where id = r.ciclo_id;
    else
      -- esmaltação (pacote_esmaltacao) e ESCOVA DO CLUBE (asaas_pagamento / backfill / legado_manual): 1 crédito por consumo
      update clube_creditos set creditos_usados = greatest(0, creditos_usados - 1) where id = r.ciclo_id;
    end if;
    delete from clube_consumos where id = r.id;
  end loop;
  if v_teve then
    update comandas set discount = greatest(0, coalesce(discount, 0) - old.total_price) where id = old.comanda_id;
  end if;
  return old;
end
$fn$;
