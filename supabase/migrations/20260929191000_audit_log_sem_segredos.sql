-- 29/09/2026 — correção da 20260929190000: a auditoria copiava linhas de salon_secrets e chaves do
-- system_config para audit_log (legível por admin/financeiro). salon_secrets sai da auditoria;
-- em system_config o valor de chave/token/secret é redigido.
drop trigger if exists trg_audit_log on public.salon_secrets;

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
    if tg_table_name = 'system_config' then
      if coalesce(v_new ->> 'key', v_old ->> 'key', '') ~* '(key|token|secret|senha|password)' then
        if v_old is not null then v_old := v_old || jsonb_build_object('value', '<redigido>'); end if;
        if v_new is not null then v_new := v_new || jsonb_build_object('value', '<redigido>'); end if;
      end if;
    end if;
    insert into public.audit_log (user_id, user_email, tabela, op, row_id, old, new)
    values (v_uid, v_email, tg_table_name, tg_op, v_row, v_old, v_new);
  exception when others then
    null;
  end;
  return null;
end
$fn$;
delete from public.audit_log where tabela = 'salon_secrets';
