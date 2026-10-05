// Resolução PURA do percentual de comissão de um item de comanda (uma regra só para todas as telas).
//
// Cascata, da mais fraca para a mais forte:
//   1. professionals.commission_percent (padrão da profissional)
//   2. services.commission_percent (se > 0)
//   3. professional_service_commissions (par profissional, serviço)
//   4. professional_client_commissions (par profissional, cliente) — pedido do Cleiton 05/10/2026
// Item de venda de pacote (item_type = "package") fica no ramo próprio:
//   professionals.package_commission_percent || professionals.commission_percent, sem as regras 2 a 4.
// A regra por cliente vale para qualquer serviço que AQUELA profissional fizer para AQUELA cliente; outra
// profissional atendendo a mesma cliente não é afetada (a chave é o par).

export type CommissionPercentSource = "profissional" | "servico" | "profissional_servico" | "cliente" | "pacote";

export interface CommissionProfessionalInfo {
  commission_percent?: number | null;
  package_commission_percent?: number | null;
}

export interface ResolveCommissionInput {
  itemType?: string | null;
  serviceId?: string | null;
  /** Profissional efetiva do item: comanda_items.professional_id ou, se vazio, comandas.professional_id. */
  professionalId?: string | null;
  /** comandas.client_id */
  clientId?: string | null;
  professional?: CommissionProfessionalInfo | null;
  /** services.commission_percent do serviço do item (undefined se o serviço não é conhecido) */
  servicePercent?: number | null;
  /** Chave profServiceKey(profissional, serviço) → percentual */
  profServicePercents?: Map<string, number>;
  /** Chave profClientKey(profissional, cliente) → percentual */
  profClientPercents?: Map<string, number>;
}

export interface ResolvedCommissionPercent {
  percent: number;
  source: CommissionPercentSource;
}

export const profServiceKey = (professionalId: string, serviceId: string) => `${professionalId}:${serviceId}`;
export const profClientKey = (professionalId: string, clientId: string) => `${professionalId}:${clientId}`;

/** Profissional efetiva do item (o do item; se vazio, o da comanda). */
export function effectiveProfessionalId(
  itemProfessionalId?: string | null,
  comandaProfessionalId?: string | null,
): string | null {
  return itemProfessionalId || comandaProfessionalId || null;
}

export function resolveCommissionPercent(input: ResolveCommissionInput): ResolvedCommissionPercent {
  const prof = input.professional ?? {};
  const base = Number(prof.commission_percent) || 0;

  if (input.itemType === "package") {
    const pkg = Number(prof.package_commission_percent) || 0;
    return pkg ? { percent: pkg, source: "pacote" } : { percent: base, source: "profissional" };
  }

  let result: ResolvedCommissionPercent = { percent: base, source: "profissional" };

  const servicePercent = Number(input.servicePercent) || 0;
  if (input.serviceId && servicePercent) {
    result = { percent: servicePercent, source: "servico" };
  }

  if (input.serviceId && input.professionalId && input.profServicePercents) {
    const key = profServiceKey(input.professionalId, input.serviceId);
    if (input.profServicePercents.has(key)) {
      result = { percent: Number(input.profServicePercents.get(key)), source: "profissional_servico" };
    }
  }

  if (input.clientId && input.professionalId && input.profClientPercents) {
    const key = profClientKey(input.professionalId, input.clientId);
    if (input.profClientPercents.has(key)) {
      result = { percent: Number(input.profClientPercents.get(key)), source: "cliente" };
    }
  }

  return result;
}

/** Monta o mapa (profissional, cliente) → percentual a partir das linhas da tabela. */
export function buildProfClientPercentMap(
  rows: Array<{ professional_id: string; client_id: string; commission_percent: number | string }> | null | undefined,
): Map<string, number> {
  const map = new Map<string, number>();
  (rows ?? []).forEach(r => map.set(profClientKey(r.professional_id, r.client_id), Number(r.commission_percent)));
  return map;
}

/**
 * Erro de "tabela não existe" (migration ainda não aplicada): a tela segue sem a regra por cliente em vez
 * de quebrar. PostgREST devolve PGRST205/42P01 para relação ausente.
 */
export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "PGRST205" || error.code === "42P01" || /does not exist|Could not find the table/i.test(error.message ?? "");
}
