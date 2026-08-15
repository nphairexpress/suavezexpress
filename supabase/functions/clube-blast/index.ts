// Disparo do e-mail do Clube da Escova pra base (Express + Studio) — fila em
// public.clube_blast (3.888 contatos dedupados, 15/08/2026).
//
// - Envia em LOTES (default 150/run) respeitando o limite diário do Resend;
//   pg_cron chama 1x/dia. Idempotente: só pega status='pending', marca 'sent'.
// - Personaliza primeiro nome no assunto e no corpo; sem nome → versão neutra.
// - Link rastreável: UTM por origem (express|studio) → /clube/apresentacao/.
// - {"preview":"email@x"} envia SÓ um exemplar de teste, sem tocar na fila.
//
// Auth: header x-queue-cron-secret == QUEUE_CRON_SECRET (mesmo secret do queue-cron).
// Deploy: npx supabase functions deploy clube-blast --no-verify-jwt --project-ref ewxiaxsmohxuabcmxuyc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function primeiroNome(raw: string | null): string {
  const n = String(raw ?? "").trim().split(/\s+/)[0] || "";
  if (!n || n.length < 2 || /[@0-9]/.test(n)) return "";
  return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
}

function buildEmail(nome: string, source: string) {
  const utm = `utm_source=email&utm_medium=email&utm_campaign=clube_base_ago26&utm_content=${source}`;
  const link = `https://www.nphairexpress.com.br/clube/apresentacao/?${utm}`;
  const oi = nome ? `Oi, ${esc(nome)}.` : "Oi!";
  const subject = nome ? `${nome}, vai sobrar R$ 111 na sua conta todo mês` : "Vai sobrar R$ 111 na sua conta todo mês";
  const preheader = "A gente fez a conta da sua escova no salão, ela está aqui dentro.";
  const html = `
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<div style="background:#faf7f2;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:36px 30px;font-family:Georgia,'Times New Roman',serif;color:#2b2622;line-height:1.65;font-size:16px">
    <p style="margin:0 0 18px">${oi}</p>
    <p style="margin:0 0 18px">A gente fez uma conta aqui no salão — daquelas de papel e caneta mesmo — e o resultado surpreendeu até a gente: dá pra sobrar <b>R$ 111 na sua conta, todo mês</b>, sem você abrir mão de estar com o cabelo pronto toda semana.</p>
    <p style="margin:0 0 24px">Como? Isso a gente preparou pra te mostrar do jeito certo, numa apresentação de 1 minuto — desliza igual story:</p>
    <p style="margin:0 0 26px;text-align:center">
      <a href="${link}" style="display:inline-block;background:#F7A100;color:#17120f;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;padding:14px 30px;border-radius:99px">Ver a apresentação</a>
    </p>
    <p style="margin:0 0 18px;font-size:15px;color:#6b6257">Vale o minuto. Depois me conta o que achou.</p>
    <p style="margin:0">Um beijo,<br/>equipe NP Hair Express</p>
  </div>
  <p style="max-width:520px;margin:18px auto 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a09786;line-height:1.6">
    NP Hair Express · R. Sete de Setembro, 374 — Centro, Salto/SP · Ter a Sáb, 8h às 20h · Agosto de 2026<br/>
    Não quer receber nossas novidades? Responda este e-mail com a palavra SAIR.
  </p>
</div>`;
  return { subject, html };
}

async function sendResend(key: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124 Safari/537.36",
    },
    body: JSON.stringify({ from: "NP Hair Express <clube@nphairexpress.com.br>", to: [to], subject, html }),
  });
  return res;
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("QUEUE_CRON_SECRET") ?? "";
  if (!expected) return new Response(JSON.stringify({ error: "secret ausente" }), { status: 503 });
  if ((req.headers.get("x-queue-cron-secret") ?? "") !== expected) {
    return new Response(JSON.stringify({ error: "não autorizado" }), { status: 401 });
  }

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendKey) {
    const { data: cfg } = await supa.from("system_config").select("value").eq("key", "resend_api_key").maybeSingle();
    resendKey = cfg?.value ?? "";
  }
  if (!resendKey) return new Response(JSON.stringify({ error: "sem chave Resend" }), { status: 503 });

  const body = await req.json().catch(() => ({}));

  // Modo preview: 1 exemplar, fila intocada
  if (body.preview) {
    const { subject, html } = buildEmail(body.previewNome ?? "Cleiton", "preview");
    const r = await sendResend(resendKey, String(body.preview), `[PRÉVIA] ${subject}`, html);
    return new Response(JSON.stringify({ preview: true, status: r.status }), { status: 200 });
  }

  const batch = Math.min(Number(body.batch) || Number(Deno.env.get("BLAST_BATCH")) || 150, 400);
  const { data: rows } = await supa
    .from("clube_blast")
    .select("id, email, name, source")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(batch);

  const out = { sent: 0, failed: 0, remaining_before: rows?.length ?? 0, stopped: "" };
  for (const r of rows ?? []) {
    const { subject, html } = buildEmail(primeiroNome(r.name), r.source);
    try {
      const res = await sendResend(resendKey, r.email, subject, html);
      if (res.ok) {
        await supa.from("clube_blast").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", r.id);
        out.sent++;
      } else if (res.status === 429 || res.status === 403) {
        // limite do dia/plano — para e o próximo run continua de onde parou
        out.stopped = `resend HTTP ${res.status}`;
        break;
      } else if (res.status === 422) {
        await supa.from("clube_blast").update({ status: "invalid" }).eq("id", r.id);
        out.failed++;
      } else {
        out.failed++;
      }
    } catch (_e) {
      out.failed++;
    }
    await new Promise((ok) => setTimeout(ok, 550)); // ~2 req/s do Resend
  }

  const { count } = await supa.from("clube_blast").select("id", { count: "exact", head: true }).eq("status", "pending");
  return new Response(JSON.stringify({ ...out, pending_now: count }), { status: 200, headers: { "Content-Type": "application/json" } });
});
