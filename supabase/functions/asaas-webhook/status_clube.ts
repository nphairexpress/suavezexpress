// Decisão do status do cadastro do Clube (clube_assinantes) em cobrança vencida/apagada. Pura e testável
// (testes em ./status_clube.test.ts). A ligação com banco e Asaas fica em ./index.ts (handleClube).
//
// 05/10/2026 (caso Gabriela Molle): clube_assinantes tem UMA linha por customer do Asaas, mas a mesma cliente
// pode ter escova, pacote de unha e pacote de esmaltação como assinaturas diferentes, cada uma com seus ciclos
// em clube_creditos (por origem). A cobrança vencida de UMA assinatura (esmaltação nunca paga) derrubava o
// cadastro inteiro e travava o pacote de unha já pago.
//
// Regra: o status do cadastro passa a refletir "existe algo pago valendo hoje".
// - PAYMENT_OVERDUE: só marca inadimplente se a cliente não tem NENHUM ciclo ativo não bloqueado
//   (inicio <= agora < fim), de qualquer produto. Com ciclo ativo, mantém.
// - PAYMENT_DELETED: cadastro inadimplente volta a ativo se ela tem ciclo ativo ou se não resta cobrança vencida
//   no Asaas.
// - Cancelada (status 'cancelado' ou cancelada_em preenchido) nunca muda por esses eventos.
// Isso não libera o que não foi pago: os gatilhos de consumo (consome_credito_clube, consome_pacote_unha nos
// ramos unha e esmaltação, clube_entrar_fila) exigem, além de status 'ativo', um ciclo ativo da ORIGEM do
// próprio produto. Pagamento confirmado continua no caminho antigo (marca ativo e cria o ciclo).

export type StatusClube = "ativo" | "inadimplente" | "cancelado";

export interface CicloResumo {
  inicio: string;
  fim: string;
  bloqueado: boolean;
}

export interface SituacaoClube {
  status: string;
  canceladaEm: string | null;
  /** null = não foi possível saber (erro de leitura): nada muda */
  temCicloAtivo: boolean | null;
  /** só usado em PAYMENT_DELETED; null = não consultado ou falhou */
  restaVencidaNoAsaas?: boolean | null;
}

/** Algum ciclo não bloqueado vale agora (inicio <= agora < fim), de qualquer produto. */
export function temCicloAtivo(ciclos: CicloResumo[], agora: Date): boolean {
  const t = agora.getTime();
  return ciclos.some((c) => !c.bloqueado && new Date(c.inicio).getTime() <= t && t < new Date(c.fim).getTime());
}

/** Novo status do cadastro, ou null para não mexer. */
export function novoStatusClube(evento: string, s: SituacaoClube): StatusClube | null {
  if (s.status === "cancelado" || s.canceladaEm) return null;

  if (evento === "PAYMENT_OVERDUE") {
    if (s.temCicloAtivo !== false) return null; // tem algo pago valendo (ou não deu para saber): mantém
    return s.status === "inadimplente" ? null : "inadimplente";
  }

  if (evento === "PAYMENT_DELETED") {
    if (s.status !== "inadimplente") return null;
    if (s.temCicloAtivo === true || s.restaVencidaNoAsaas === false) return "ativo";
    return null;
  }

  return null;
}
