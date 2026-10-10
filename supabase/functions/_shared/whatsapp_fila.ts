// WhatsApp da FILA (Evolution maia-express) + aviso "pagou fora do horário".
// Usado pelo asaas-webhook e pelo queue-cron. Testes: ./whatsapp_fila.test.ts
//
// Regra do dono (10/10/2026): a fila online vende 24 h; queue_settings é o HORÁRIO
// DE ATENDIMENTO. Quem paga com o salão fechado entra na fila e é avisada no
// WhatsApp de quando será atendida. Tudo aqui é best-effort: nunca lança.

const LINK_ACOMPANHAR = "https://suavezexpress.vercel.app/fila/acompanhar/";

// Envio pela mesma via de sempre do queue-cron (env lida na hora da chamada).
export async function sendWhatsApp(phone: string, text: string, tag = "queue-cron"): Promise<boolean> {
  const base = (Deno.env.get("QUEUE_EVOLUTION_URL") ?? "http://72.60.6.168:8082").replace(/\/$/, "");
  const instance = Deno.env.get("QUEUE_EVOLUTION_INSTANCE") ?? "maia-express";
  const key = Deno.env.get("EVOLUTION_KEY") ?? "";
  if (!key) { console.error(`${tag}: EVOLUTION_KEY ausente`); return false; }
  const clean = String(phone).replace(/\D/g, "");
  const full = clean.startsWith("55") ? clean : `55${clean}`;
  try {
    const res = await fetch(`${base}/message/sendText/${instance}`, {
      method: "POST",
      headers: { "apikey": key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: full, delay: 1200, text }),
      signal: AbortSignal.timeout(10_000), // no webhook, Evolution travada não pode segurar a resposta ao Asaas
    });
    if (!res.ok) console.error(`${tag}: Evolution falhou, HTTP`, res.status);
    return res.ok;
  } catch (e) {
    console.error(`${tag}: Evolution erro de rede`, String(e).slice(0, 120));
    return false;
  }
}

export type EstadoAbertura = {
  aberta?: boolean | null;
  motivo?: string | null; // pausada | fechado_hoje | ainda_nao_abriu | ja_fechou | null
  abre?: string | null; // "HH:MM"
  fecha?: string | null;
  proxima_abertura?: string | null; // "YYYY-MM-DD"
};

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

// "2026-10-14" → "quarta-feira, 14/10". Data inválida → null.
export function formatarDiaPtBR(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (isNaN(d.getTime()) || d.getUTCDate() !== Number(m[3])) return null;
  return `${DIAS[d.getUTCDay()]}, ${m[3]}/${m[2]}`;
}

export function primeiroNome(nome: string | null | undefined): string {
  return String(nome ?? "").trim().split(/\s+/)[0] ?? "";
}

// Texto do aviso. null = salão aberto (ou estado desconhecido): não envia nada.
export function montarAvisoForaDoHorario(
  nome: string | null | undefined,
  estado: EstadoAbertura | null | undefined,
  trackingToken: string | null | undefined,
): string | null {
  if (!estado || estado.aberta !== false) return null;
  const n = primeiroNome(nome);
  const abertura = `Oi${n ? ` ${n}` : ""}! Recebemos seu pagamento e você já está na fila do NP Hair Express.`;
  const link = trackingToken ? ` Acompanhe sua posição aqui: ${LINK_ACOMPANHAR}${trackingToken}` : "";
  const aPartir = estado.abre ? ` a partir das ${estado.abre}` : "";

  let meio: string;
  if (estado.motivo === "pausada") {
    // Pausa é manual: a data calculada pela RPC não garante reabertura.
    meio = " A fila está pausada no momento; a equipe te avisa quando reabrir.";
  } else if (estado.motivo === "ainda_nao_abriu") {
    meio = ` O salão está fechado agora: seu atendimento é hoje${aPartir}.`;
  } else {
    const dia = formatarDiaPtBR(estado.proxima_abertura);
    meio = dia
      ? ` O salão está fechado agora: seu atendimento será ${dia}${aPartir}.`
      : ` O salão está fechado agora: seu atendimento será na próxima abertura do salão${aPartir}.`;
  }
  return `${abertura}${meio}${link}`;
}

// Lê a entrada recém-criada, consulta o horário e avisa se estiver fora dele.
// Devolve um rótulo curto para log/resposta. Nunca lança.
// deno-lint-ignore no-explicit-any
export async function avisarSeForaDoHorario(supa: any, queueEntryId: string | null | undefined, tag: string): Promise<string> {
  try {
    if (!queueEntryId) return "aviso_sem_entry";
    const { data: entry, error } = await supa
      .from("queue_entries")
      .select("salon_id, customer_name, customer_phone, tracking_token")
      .eq("id", queueEntryId)
      .maybeSingle();
    if (error || !entry) {
      console.error(`${tag}: aviso fora do horário, entrada ${queueEntryId} não lida`, error?.message ?? "");
      return "aviso_erro_leitura";
    }
    const { data: estado, error: estErr } = await supa.rpc("fila_estado_abertura", { p_salon: entry.salon_id });
    if (estErr) {
      console.error(`${tag}: fila_estado_abertura falhou`, estErr.message);
      return "aviso_erro_estado";
    }
    const texto = montarAvisoForaDoHorario(entry.customer_name, estado as EstadoAbertura, entry.tracking_token);
    if (!texto) return "aviso_nao_precisa";
    const phone = String(entry.customer_phone ?? "").replace(/\D/g, "");
    if (phone.length < 10) return "aviso_sem_telefone";
    const ok = await sendWhatsApp(phone, texto, tag);
    console.log(`${tag}: aviso fora do horário (${(estado as EstadoAbertura)?.motivo ?? "?"}) entrada ${queueEntryId} → ${ok ? "enviado" : "falhou"}`);
    return ok ? "aviso_enviado" : "aviso_falhou";
  } catch (e) {
    console.error(`${tag}: aviso fora do horário erro inesperado`, String(e).slice(0, 160));
    return "aviso_erro";
  }
}
