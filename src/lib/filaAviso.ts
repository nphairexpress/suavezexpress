// Textos do horário de atendimento da fila online. A fila vende 24h: fora do
// horário a cliente compra normalmente e é AVISADA de quando será atendida.
// O servidor decide (fuso do salão); aqui só se formata.

export interface FilaAvisoInput {
  aberta: boolean;
  motivo: "pausada" | "fechado_hoje" | "ainda_nao_abriu" | "ja_fechou" | null;
  abre: string | null;
  proxima_abertura: string | null;
}

const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function parseIso(iso: string): { a: number; m: number; d: number } | null {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!a || !m || !d) return null;
  return { a, m, d };
}

/** "sábado, 11/10" (sempre com dia da semana e data). */
export function diaSemanaData(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const p = parseIso(iso);
  if (!p) return null;
  const dow = new Date(p.a, p.m - 1, p.d).getDay();
  return `${SEMANA[dow]}, ${String(p.d).padStart(2, "0")}/${String(p.m).padStart(2, "0")}`;
}

/** "hoje", "amanhã" ou "sábado, 11/10", relativo ao dia do aparelho. */
export function dia(iso: string | null | undefined, agora: Date = new Date()): string | null {
  if (!iso) return null;
  const p = parseIso(iso);
  if (!p) return null;
  const alvo = new Date(p.a, p.m - 1, p.d);
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const dif = Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
  if (dif === 0) return "hoje";
  if (dif === 1) return "amanhã";
  return diaSemanaData(iso);
}

/** Texto do aviso quando a fila está fora do horário; null quando aberta. */
export function textoAvisoFila(fila: FilaAvisoInput, agora: Date = new Date()): string | null {
  if (fila.aberta) return null;
  const quando = dia(fila.proxima_abertura, agora);
  const aPartir = fila.abre ? ` a partir das ${fila.abre}` : "";
  switch (fila.motivo) {
    case "ainda_nao_abriu":
      return `O salão ainda não abriu. Você será atendida hoje${aPartir}.`;
    case "ja_fechou":
      return `O salão já fechou por hoje. Pode entrar na fila: você será atendida${quando ? ` ${quando}` : " na próxima abertura"}${aPartir}.`;
    case "fechado_hoje":
      return `Hoje o salão não abre. Você será atendida${quando ? ` ${quando}` : " na próxima abertura"}${aPartir}.`;
    case "pausada":
      return `A fila está pausada no momento. Você entra na fila e será atendida assim que reabrir${quando && quando !== "hoje" ? `, ${quando}` : ""}.`;
    default:
      return `Você será atendida na próxima abertura${quando ? `, ${quando}` : ""}${aPartir}.`;
  }
}
