-- 29/09/2026 — S-09: segredos literais no banco vão para o Vault do Supabase (extensão supabase_vault).
--
-- Antes:
--   (1) public.alerta_clube_lead() carregava a apikey da Evolution (VPS 8082, instância maia-express)
--       literal no header do net.http_post.
--   (2) cron.job 2 (fila-avisos-e-leads), 3 (clube-blast-diario), 4 (placar-terca) e 5 (placar-sexta)
--       carregavam o header x-queue-cron-secret literal no comando. Os quatro usam o MESMO valor.
--
-- Depois:
--   - Secrets no Vault: 'evolution_apikey' e 'queue_cron_secret' (um por valor distinto).
--     ESTE ARQUIVO NÃO CONTÉM OS VALORES. Eles são criados ANTES por um script fora do repo
--     (~/Vault/02 - Clientes/NP Hair Express/AUDITORIA_SISTEMA_2026-09-29/aplicar_vault_secrets.sh),
--     que lê o valor atual do próprio banco (pg_proc.prosrc / cron.job.command) e chama
--     vault.create_secret(<valor>, '<nome>') sem o valor sair do servidor.
--   - alerta_clube_lead() e os 4 comandos de cron passam a ler
--     (select decrypted_secret from vault.decrypted_secrets where name = '<nome>').
--     Os jobs rodam como 'postgres' (cron.job.username), que enxerga o Vault; anon/authenticated não.
--   - url, body, schedule e timeout dos jobs ficam idênticos.
--
-- Aplicar pela Management API em transação única, DEPOIS do script de secrets. Reversão:
--   20260929241000_segredos_para_vault.rollback.sql (reconstrói os literais lendo do Vault).

-- ── pré-requisito: secrets já existem no Vault ───────────────────────────────
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'evolution_apikey') then
    raise exception 'Vault: secret evolution_apikey ausente — rode aplicar_vault_secrets.sh antes desta migration';
  end if;
  if not exists (select 1 from vault.secrets where name = 'queue_cron_secret') then
    raise exception 'Vault: secret queue_cron_secret ausente — rode aplicar_vault_secrets.sh antes desta migration';
  end if;
end $$;

-- ── (1) alerta_clube_lead lê a apikey do Vault ───────────────────────────────
create or replace function public.alerta_clube_lead()
returns void
language plpgsql as $function$
declare r record; msg text; destinos text[] := array['5511976847114','5511973836456','5511993939085']; d text;
begin
  for r in select * from clube_leads where alertado = false order by created_at loop
    -- marca ANTES de enviar (evita duplicar se dois ticks concorrerem); envio com timeout folgado
    update clube_leads set alertado = true, alertado_em = now() where id = r.id and alertado = false;
    if not found then continue; end if;
    msg := '*LEAD DO CLUBE DA ESCOVA*' || chr(10) || chr(10) ||
           'Nome: ' || coalesce(r.nome,'-') || chr(10) ||
           'WhatsApp: ' || coalesce(r.whatsapp,'-') || chr(10) ||
           'E-mail: ' || coalesce(r.email,'-') || chr(10) ||
           'Plano: ' || coalesce(r.plano,'-') || chr(10) ||
           'Valor: R$ ' || coalesce(r.valor::text,'-') || chr(10) ||
           'Onde parou: ' || coalesce(r.origem,'-') || chr(10) || chr(10) ||
           'Ela escolheu o plano e nao concluiu o pagamento. Ligar hoje.';
    foreach d in array destinos loop
      perform net.http_post(
        url := 'http://72.60.6.168:8082/message/sendText/maia-express',
        headers := jsonb_build_object('Content-Type','application/json','apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'evolution_apikey')),
        body := jsonb_build_object('number', d, 'delay', 1200, 'text', msg),
        timeout_milliseconds := 30000
      );
    end loop;
  end loop;
end
$function$;

-- ── (2) cron.job 2..5 leem x-queue-cron-secret do Vault ──────────────────────
select cron.alter_job(2, command := $cmd$select net.http_post(
      url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/queue-cron',
      headers:=jsonb_build_object('Content-Type','application/json','x-queue-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='queue_cron_secret')),
      body:='{}'::jsonb)$cmd$);

select cron.alter_job(3, command := $cmd$select net.http_post(
      url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/clube-blast',
      headers:=jsonb_build_object('Content-Type','application/json','x-queue-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='queue_cron_secret')),
      body:='{"batch":80}'::jsonb)$cmd$);

select cron.alter_job(4, command := $cmd$select net.http_post(url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/placar-cron', headers:=jsonb_build_object('Content-Type','application/json','x-queue-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='queue_cron_secret')), body:='{"tipo":"terca"}'::jsonb, timeout_milliseconds:=60000)$cmd$);

select cron.alter_job(5, command := $cmd$select net.http_post(url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/placar-cron', headers:=jsonb_build_object('Content-Type','application/json','x-queue-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='queue_cron_secret')), body:='{"tipo":"sexta"}'::jsonb, timeout_milliseconds:=60000)$cmd$);

-- ── garantias ────────────────────────────────────────────────────────────────
do $$
begin
  -- nenhum literal sobrou
  if exists (select 1 from pg_proc where proname = 'alerta_clube_lead' and pronamespace = 'public'::regnamespace
             and prosrc ~ '''apikey'',\s*''[^'']+''') then
    raise exception 'alerta_clube_lead ainda tem apikey literal';
  end if;
  if exists (select 1 from cron.job where jobid in (2,3,4,5) and command ~ '"x-queue-cron-secret"\s*:\s*"') then
    raise exception 'cron.job ainda tem x-queue-cron-secret literal';
  end if;
  -- Vault fora do alcance dos papéis do app (padrão do Supabase; só confirma)
  if has_table_privilege('anon', 'vault.decrypted_secrets', 'select')
     or has_table_privilege('authenticated', 'vault.decrypted_secrets', 'select')
     or has_table_privilege('anon', 'vault.secrets', 'select')
     or has_table_privilege('authenticated', 'vault.secrets', 'select')
     or has_schema_privilege('anon', 'vault', 'usage')
     or has_schema_privilege('authenticated', 'vault', 'usage') then
    raise exception 'Vault legível por anon/authenticated — revogar antes de seguir';
  end if;
end $$;
