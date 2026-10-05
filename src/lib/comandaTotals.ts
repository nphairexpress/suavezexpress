import { supabase } from "@/lib/dynamicSupabaseClient";

/** Total líquido da comanda: subtotal − desconto, nunca negativo. */
export function calcComandaTotal(subtotal: number, discount: number): number {
  return Math.max(0, Number(subtotal || 0) - Number(discount || 0));
}

/**
 * Recalcula subtotal/total depois de inserir, remover ou editar item.
 * Lê o `discount` ATUAL do banco depois da operação, porque os triggers do Clube
 * e dos pacotes (consome_credito_clube, consome_pacote_unha, devolve_pacote_unha)
 * mexem nele no INSERT/DELETE do item. Não escreve `discount`.
 */
export async function recalcComandaTotals(comandaId: string): Promise<void> {
  const [{ data: items, error: itemsErr }, { data: com, error: comErr }] = await Promise.all([
    supabase.from("comanda_items").select("total_price").eq("comanda_id", comandaId),
    supabase.from("comandas").select("discount").eq("id", comandaId).single(),
  ]);
  if (itemsErr) throw itemsErr;
  if (comErr) throw comErr;
  const subtotal = (items || []).reduce((acc: number, i: any) => acc + Number(i.total_price || 0), 0);
  const total = calcComandaTotal(subtotal, Number((com as any)?.discount || 0));
  const { error } = await supabase.from("comandas").update({ subtotal, total }).eq("id", comandaId);
  if (error) throw error;
}
