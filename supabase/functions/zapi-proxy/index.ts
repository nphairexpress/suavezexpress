// Envio de WhatsApp da FILA — hoje via Evolution v2 (instância do salão).
//
// HISTÓRICO: nasceu como proxy da Z-API (salon_secrets.zapi_*). Em 15/08/2026 a
// assinatura da Z-API expirou ("you must subscribe to this instance again") e
// TODO aviso da fila morria calado — a função devolvia o erro da Z-API com
// HTTP 200 e os callers marcavam notify_sent=true sem nada ter chegado.
// Transporte trocado para a Evolution v2 da VPS, instância `maia-express`
// (o número 19 99009-1315 do próprio salão, mesmo canal web da Maia).
// Nome e contrato da função mantidos: todos os callers continuam iguais.
//
// SEGURANÇA: exige JWT válido de usuário com salão (ou service_role para
// chamadas server→server internas). O salonId NÃO vem do browser.
//
// Deploy: npx supabase functions deploy zapi-proxy --no-verify-jwt \
//           --project-ref ewxiaxsmohxuabcmxuyc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireStaff } from "../_shared/auth.ts";

const EVO_BASE = (Deno.env.get("QUEUE_EVOLUTION_URL") ?? "http://72.60.6.168:8082").replace(/\/$/, "");
const EVO_INSTANCE = Deno.env.get("QUEUE_EVOLUTION_INSTANCE") ?? "maia-express";
// A instância acima pertence ao NP Hair Express — nunca enviar por ela em nome
// de outro salão (deploy é single-tenant, mas a guarda fica).
const EVO_SALON_ID = Deno.env.get("QUEUE_EVOLUTION_SALON_ID") ?? "9793948a-e208-4054-a4df-4b8f2b3b3965";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const staff = await requireStaff(req, supa);
    if (!staff.ok) return json({ error: staff.error }, staff.status);

    const { phone, message, salonId: bodySalonId } = await req.json();
    if (!phone || !message) return json({ error: "phone e message obrigatórios" }, 400);

    // Salão = o do usuário autenticado. service_role pode indicar no body.
    let salonId = staff.salonId;
    if (salonId === "*") {
      salonId = bodySalonId;
      if (!salonId) return json({ error: "salonId obrigatório para service_role" }, 400);
    }

    if (salonId !== EVO_SALON_ID) {
      return json({ sent: false, error: "Canal de envio não configurado para este salão" }, 200);
    }

    const evoKey = Deno.env.get("EVOLUTION_KEY") ?? "";
    if (!evoKey) {
      console.error("zapi-proxy: EVOLUTION_KEY ausente — aviso NÃO enviado");
      return json({ sent: false, error: "EVOLUTION_KEY not configured" }, 200);
    }

    const cleanPhone = String(phone).replace(/\D/g, "");
    const fullPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    const res = await fetch(`${EVO_BASE}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { "apikey": evoKey, "Content-Type": "application/json" },
      body: JSON.stringify({ number: fullPhone, delay: 1200, text: String(message) }),
    });

    const result = await res.json().catch(() => ({}));
    const sent = res.ok;
    if (!sent) console.error("zapi-proxy: Evolution falhou, HTTP", res.status);
    return json({ sent, status: res.status, result }, 200);
  } catch (error) {
    console.error("zapi-proxy error:", error);
    return json({ error: "Erro interno" }, 500);
  }
});
