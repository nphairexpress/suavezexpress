/** Junta classes ignorando falsy. Sem tailwind-merge: as classes da biblioteca são .np-* e não conflitam. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** R$ no padrão pt-BR. */
export const brl = (v: number | string | null | undefined): string =>
  (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "1.280,50" → 1280.5 */
export const parseBrl = (s: string | number | null | undefined): number =>
  Number(String(s ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;
