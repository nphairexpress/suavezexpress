// Cron da FILA (roda a cada minuto via pg_cron + pg_net):
//
// 1) AVISO AUTOMÁTICO DE VEZ CHEGANDO — server-side, no tempo que a CLIENTE
//    escolheu (notify_minutes_before). Substitui o hook do navegador
//    (useQueueNotificationCheck), que só funcionava com a tela da recepção
//    aberta. notify_sent só é marcado quando o envio de fato SUCEDE.
// 2) LEADS "ME AVISA QUANDO A FILA DIMINUIR" (queue_leads) — cada lead novo
//    vira e-mail imediato pro dono (npimagens@gmail.com), com link wa.me.
//
// Auth: header x-queue-cron-secret == secret QUEUE_CRON_SECRET (falha fechada).
// Deploy: npx supabase functions deploy queue-cron --no-verify-jwt \
//           --project-ref ewxiaxsmohxuabcmxuyc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVO_BASE = (Deno.env.get("QUEUE_EVOLUTION_URL") ?? "http://72.60.6.168:8082").replace(/\/$/, "");
const EVO_INSTANCE = Deno.env.get("QUEUE_EVOLUTION_INSTANCE") ?? "maia-express";
const OWNER_EMAIL = Deno.env.get("QUEUE_LEADS_EMAIL") ?? "npimagens@gmail.com";

// lead.name/phone vêm de formulário PÚBLICO anônimo — escapar antes de pôr no HTML do e-mail
const esc = (s: unknown) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function sendWhatsApp(phone: string, text: string): Promise<boolean> {
  const key = Deno.env.get("EVOLUTION_KEY") ?? "";
  if (!key) { console.error("queue-cron: EVOLUTION_KEY ausente"); return false; }
  const clean = String(phone).replace(/\D/g, "");
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  try {
    const res = await fetch(`${EVO_BASE}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "apikey": key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: full, delay: 1200, text }),
    });
    if (!res.ok) console.error("queue-cron: Evolution falhou, HTTP", res.status);
    return res.ok;
  } catch (e) {
    console.error("queue-cron: Evolution erro de rede", String(e).slice(0, 120));
    return false;
  }
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("QUEUE_CRON_SECRET") ?? "";
  if (!expected) return json({ error: "QUEUE_CRON_SECRET não configurado (falha fechada)" }, 503);
  if ((req.headers.get("x-queue-cron-secret") ?? "") !== expected) {
    return json({ error: "não autorizado" }, 401);
  }

  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const out = { notified: 0, skipped_no_phone: 0, leads_emailed: 0, errors: 0 };

  // ── 1. Aviso de vez chegando ─────────────────────────────────────────────
  const { data: entries } = await supa
    .from("queue_entries")
    .select("id, salon_id, customer_name, customer_phone, position, notify_minutes_before, service:services(duration_minutes)")
    .in("status", ["waiting", "checked_in"])
    .eq("notify_sent", false)
    .not("notify_minutes_before", "is", null);

  if (entries && entries.length > 0) {
    const salonId = entries[0].salon_id;
    const { count: profCount } = await supa
      .from("professionals")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salonId)
      .eq("is_active", true);
    const professionals = Math.max(profCount || 1, 1);

    for (const entry of entries) {
      const { data: ahead } = await supa
        .from("queue_entries")
        .select("service:services(duration_minutes)")
        .eq("salon_id", entry.salon_id)
        .in("status", ["waiting", "checked_in", "in_service"])
        .lt("position", entry.position);

      // deno-lint-ignore no-explicit-any
      const totalMinAhead = (ahead || []).reduce((sum: number, e: any) => sum + (e.service?.duration_minutes || 45), 0);
      const estimatedMin = Math.ceil(totalMinAhead / professionals);
      if (estimatedMin > entry.notify_minutes_before) continue;

      const phone = String(entry.customer_phone ?? "").replace(/\D/g, "");
      if (phone.length < 10) {
        // sem telefone não há o que enviar — marca pra não re-varrer eternamente
        await supa.from("queue_entries").update({ notify_sent: true, updated_at: new Date().toISOString() }).eq("id", entry.id);
        out.skipped_no_phone++;
        continue;
      }

      const first = String(entry.customer_name ?? "").trim().split(/\s+/)[0] || "Oi";
      const message = estimatedMin <= 5
        ? `${first}, sua vez no NP Hair Express está chegando — é agora! Se não for conseguir vir, nos avise que deixamos seu crédito guardado no seu cadastro.`
        : `${first}, faltam aproximadamente ${estimatedMin} minutos para o seu atendimento no NP Hair Express. Já vá se preparando — te esperamos!`;

      const ok = await sendWhatsApp(phone, message);
      if (ok) {
        await supa.from("queue_entries").update({ notify_sent: true, updated_at: new Date().toISOString() }).eq("id", entry.id);
        out.notified++;
      } else {
        out.errors++; // fica false e o próximo minuto tenta de novo
      }
    }
  }

  // ── 2. Leads "me avisa" → e-mail do dono ─────────────────────────────────
  const { data: leads } = await supa
    .from("queue_leads")
    .select("id, name, phone, max_queue_size, created_at")
    .eq("emailed", false)
    .order("created_at", { ascending: true })
    .limit(10);

  if (leads && leads.length > 0) {
    let resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    if (!resendKey) {
      const { data: cfg } = await supa.from("system_config").select("value").eq("key", "resend_api_key").maybeSingle();
      resendKey = cfg?.value ?? "";
    }
    for (const lead of leads) {
      if (!resendKey) break;
      const phone = String(lead.phone ?? "").replace(/\D/g, "");
      const wa = phone ? `https://wa.me/${phone.startsWith("55") ? phone : "55" + phone}` : null;
      const quando = new Date(lead.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/124 Safari/537.36",
          },
          body: JSON.stringify({
            from: "Fila NP Hair Express <clube@nphairexpress.com.br>",
            to: [OWNER_EMAIL],
            subject: `🔔 Lead da fila — ${esc(String(lead.name ?? "").split(" ")[0]) || "cliente"} pediu aviso`,
            html: `
              <div style="font-family:system-ui,Arial;max-width:520px;margin:0 auto;padding:20px;color:#1f2937">
                <h2 style="color:#F7A100;margin:0 0 6px">Cliente pediu pra ser avisada da fila</h2>
                <p>Ela olhou a fila, achou grande e deixou o contato. Chama quando a fila estiver com até <b>${lead.max_queue_size}</b> pessoas:</p>
                <table style="font-size:15px;line-height:1.9">
                  <tr><td><b>Nome:</b></td><td>${esc(lead.name) || "—"}</td></tr>
                  <tr><td><b>WhatsApp:</b></td><td>${esc(lead.phone) || "—"}</td></tr>
                  <tr><td><b>Avisar com fila ≤</b></td><td>${esc(lead.max_queue_size)} pessoas</td></tr>
                  <tr><td><b>Pedido em:</b></td><td>${quando}</td></tr>
                </table>
                ${wa ? `<p style="margin-top:16px"><a href="${wa}" style="background:#25D366;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-weight:bold">Chamar no WhatsApp</a></p>` : ""}
                <p style="color:#9ca3af;font-size:12px;margin-top:20px">A recepção também pode notificar pelo painel (Fila → Leads → Notificar).</p>
              </div>`,
          }),
        });
        if (res.ok) {
          await supa.from("queue_leads").update({ emailed: true }).eq("id", lead.id);
          out.leads_emailed++;
        } else {
          console.error("queue-cron: Resend falhou, HTTP", res.status);
          out.errors++;
        }
      } catch (e) {
        console.error("queue-cron: Resend erro", String(e).slice(0, 120));
        out.errors++;
      }
    }
  }

  return json(out);
});
