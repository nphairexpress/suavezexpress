-- Reversão de 20260929241000_segredos_para_vault.sql
-- Reconstrói alerta_clube_lead() e os comandos dos jobs 2..5 com o valor LITERAL, lendo do Vault
-- (por isso este arquivo também não contém segredo). Os secrets ficam no Vault; apagar só se pedido:
--   delete from vault.secrets where name in ('evolution_apikey','queue_cron_secret');
-- Definições vivas antes da migration (29/09/2026 ~22h BRT):
--   md5(pg_get_functiondef(alerta_clube_lead)) = 7b3064b67d338988578b376878bac564
--   md5(string_agg(command,'|' order by jobid) dos jobs 2..5) = 56809d399c125bd1348c4c9cf6352116

do $$
declare
  k text;
  s text;
  body text;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name = 'evolution_apikey';
  select decrypted_secret into s from vault.decrypted_secrets where name = 'queue_cron_secret';
  if k is null or s is null then
    raise exception 'Vault sem evolution_apikey/queue_cron_secret: impossível reconstruir os literais';
  end if;

  body := $body$
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
        headers := jsonb_build_object('Content-Type','application/json','apikey','__EVOLUTION_APIKEY__'),
        body := jsonb_build_object('number', d, 'delay', 1200, 'text', msg),
        timeout_milliseconds := 30000
      );
    end loop;
  end loop;
end
$body$;
  body := replace(body, '__EVOLUTION_APIKEY__', k);
  execute format('create or replace function public.alerta_clube_lead() returns void language plpgsql as %L', body);

  perform cron.alter_job(2, command := format($c$select net.http_post(
      url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/queue-cron',
      headers:='{"Content-Type":"application/json","x-queue-cron-secret":"%s"}'::jsonb,
      body:='{}'::jsonb)$c$, s));
  perform cron.alter_job(3, command := format($c$select net.http_post(
      url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/clube-blast',
      headers:='{"Content-Type":"application/json","x-queue-cron-secret":"%s"}'::jsonb,
      body:='{"batch":80}'::jsonb)$c$, s));
  perform cron.alter_job(4, command := format($c$select net.http_post(url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/placar-cron', headers:='{"Content-Type":"application/json","x-queue-cron-secret":"%s"}'::jsonb, body:='{"tipo":"terca"}'::jsonb, timeout_milliseconds:=60000)$c$, s));
  perform cron.alter_job(5, command := format($c$select net.http_post(url:='https://ewxiaxsmohxuabcmxuyc.supabase.co/functions/v1/placar-cron', headers:='{"Content-Type":"application/json","x-queue-cron-secret":"%s"}'::jsonb, body:='{"tipo":"sexta"}'::jsonb, timeout_milliseconds:=60000)$c$, s));
end $$;
