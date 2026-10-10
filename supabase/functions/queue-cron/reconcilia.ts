// Reconciliação da fila online sem webhook (pura e testável; testes em ./reconcilia.test.ts).
// A ligação com banco e Asaas fica em ./index.ts.
//
// 09/10/2026 (caso Bruna, R$87): o Asaas ficou horas sem disparar webhooks; o PIX ficou RECEIVED no Asaas,
// mas a purchase_intents seguiu 'pending' e a cliente nunca entrou na fila. O queue-cron passa a consultar
// a cobrança e fazer o papel do webhook quando ele não chega.
//
// Regra (dado o que o GET /v3/payments/{id} devolve):
// - RECEIVED ou CONFIRMED            → "confirmar" (RPC webhook_pagamento_confirmado, igual ao webhook)
// - removida (deleted=true/DELETED) ou REFUNDED → "cancelar" (intent pending → cancelled)
// - qualquer outro status            → "nada"

export type AcaoReconciliacao = "confirmar" | "cancelar" | "nada";

export type CobrancaAsaas = {
  status?: string | null;
  deleted?: boolean | null;
};

export function decidirReconciliacao(cobranca: CobrancaAsaas | null | undefined): AcaoReconciliacao {
  if (!cobranca) return "nada";
  const status = String(cobranca.status ?? "").toUpperCase();
  // Cobrança removida no Asaas volta com deleted=true (o status pode continuar PENDING).
  if (cobranca.deleted === true || status === "DELETED" || status === "REFUNDED") return "cancelar";
  if (status === "RECEIVED" || status === "CONFIRMED") return "confirmar";
  return "nada";
}

// Mesma pessoa pelo telefone: compara os 8 últimos dígitos (ignora DDI 55, DDD com/sem 9 e máscara).
// Menos de 8 dígitos em qualquer lado → false (não dá pra afirmar que é a mesma pessoa).
export function mesmoTelefone(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = String(a ?? "").replace(/\D/g, "");
  const db = String(b ?? "").replace(/\D/g, "");
  if (da.length < 8 || db.length < 8) return false;
  return da.slice(-8) === db.slice(-8);
}
