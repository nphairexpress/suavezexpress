// PLACAR DO EXPRESS — relatório automático pro dono e pro gerente.
//
// Terça (semana fechada) e sexta (parcial + preparação do sábado), enviado por
// WhatsApp via Evolution `maia-express`. Ninguém digita: o número sai do banco.
// Métricas = as combinadas na reunião de gestão (16/08/2026): faturamento,
// atendimentos, ticket, clientes novas × que voltaram, Clube, unha→cabelo.
//
// Auth: header x-queue-cron-secret == QUEUE_CRON_SECRET.
// Destinos: settings-like via env PLACAR_WHATSAPP (lista separada por vírgula).
// Deploy: npx supabase functions deploy placar-cron --no-verify-jwt --project-ref ewxiaxsmohxuabcmxuyc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EVO_BASE = (Deno.env.get("QUEUE_EVOLUTION_URL") ?? "http://72.60.6.168:8082").replace(/\/$/, "");
const EVO_INSTANCE = Deno.env.get("QUEUE_EVOLUTION_INSTANCE") ?? "maia-express";
const SALON = "9793948a-e208-4054-a4df-4b8f2b3b3965";

const brl = (n: number) => `R$ ${Number(n || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

// Data local (America/Sao_Paulo) como YYYY-MM-DD, sem depender do TZ do runtime
function hojeSP(): Date {
  const s = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
  return new Date(s);
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function sendWhatsApp(phone: string, text: string) {
  const key = Deno.env.get("EVOLUTION_KEY") ?? "";
  if (!key) return false;
  const clean = phone.replace(/\D/g, "");
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  try {
    const r = await fetch(`${EVO_BASE}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: full, delay: 1200, text }),
    });
    return r.ok;
  } catch { return false; }
}

// deno-lint-ignore no-explicit-any
async function metricas(supa: any, de: string, ate: string) {
  const { data: comandas } = await supa
    .from("comandas").select("id, total, client_id, created_at")
    .eq("salon_id", SALON).eq("is_paid", true)
    .gte("created_at", `${de}T00:00:00`).lt("created_at", `${ate}T23:59:59`);

  const lista = comandas ?? [];
  const bruto = lista.reduce((s: number, c: { total: number }) => s + Number(c.total || 0), 0);
  const n = lista.length;
  const ticket = n ? bruto / n : 0;
  const clientes = [...new Set(lista.map((c: { client_id: string }) => c.client_id).filter(Boolean))];

  // novas = primeira comanda paga da cliente dentro do período
  let novas = 0;
  for (const cid of clientes) {
    const { data: p } = await supa.from("comandas").select("created_at")
      .eq("client_id", cid).eq("is_paid", true).order("created_at", { ascending: true }).limit(1);
    if (p?.[0] && p[0].created_at >= `${de}T00:00:00`) novas++;
  }

  // Clube: assinaturas ativas
  const { count: clube } = await supa.from("clube_assinantes")
    .select("id", { count: "exact", head: true }).eq("status", "active");

  return { bruto, n, ticket, clientes: clientes.length, novas, voltaram: clientes.length - novas, clube: clube ?? 0 };
}

Deno.serve(async (req) => {
  const expected = Deno.env.get("QUEUE_CRON_SECRET") ?? "";
  if (!expected) return j({ error: "secret ausente" }, 503);
  if ((req.headers.get("x-queue-cron-secret") ?? "") !== expected) return j({ error: "não autorizado" }, 401);

  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  const hoje = hojeSP();
  const tipo = body.tipo ?? (hoje.getDay() === 5 ? "sexta" : "terca");

  // Terça: semana fechada (últimos 7 dias até ontem). Sexta: parcial (desde terça).
  const fim = new Date(hoje); fim.setDate(fim.getDate() - (tipo === "terca" ? 1 : 0));
  const ini = new Date(fim); ini.setDate(ini.getDate() - (tipo === "terca" ? 6 : (fim.getDay() + 5) % 7));

  const atual = await metricas(supa, iso(ini), iso(fim));

  // período anterior de mesmo tamanho, pra comparar
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1;
  const fimAnt = new Date(ini); fimAnt.setDate(fimAnt.getDate() - 1);
  const iniAnt = new Date(fimAnt); iniAnt.setDate(iniAnt.getDate() - (dias - 1));
  const ant = await metricas(supa, iso(iniAnt), iso(fimAnt));

  const delta = ant.bruto ? Math.round(((atual.bruto - ant.bruto) / ant.bruto) * 100) : 0;
  const seta = delta > 0 ? `+${delta}%` : `${delta}%`;
  const fmt = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  const cab = tipo === "terca"
    ? `*PLACAR DA SEMANA* (${fmt(ini)} a ${fmt(fim)})`
    : `*PARCIAL DA SEMANA* (${fmt(ini)} a ${fmt(fim)})`;

  const linhas = [
    cab,
    "",
    `Faturamento: *${brl(atual.bruto)}*  (${seta} vs período anterior)`,
    `Atendimentos: *${atual.n}*  ·  Ticket: *${brl(atual.ticket)}*`,
    `Clientes: *${atual.clientes}*  —  ${atual.novas} novas, ${atual.voltaram} voltaram`,
    `Clube da Escova: *${atual.clube} assinantes ativos*`,
    "",
    tipo === "terca"
      ? "Na reunião: o que explica esse número e o que muda esta semana."
      : "Prepara o sábado: escala completa, estoque conferido e a oferta que a equipe vai puxar.",
  ];
  const texto = linhas.join("\n");

  const destinos = (Deno.env.get("PLACAR_WHATSAPP") ?? "5511976847114").split(",").map((s) => s.trim()).filter(Boolean);
  let enviados = 0;
  for (const d of destinos) if (await sendWhatsApp(d, texto)) enviados++;

  return j({ tipo, periodo: `${iso(ini)}..${iso(fim)}`, metricas: atual, anterior: ant, enviados, destinos: destinos.length });
});
