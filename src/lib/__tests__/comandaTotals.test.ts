import { describe, it, expect, vi } from "vitest";
vi.mock("@/lib/dynamicSupabaseClient", () => ({ supabase: {} }));
import { calcComandaTotal } from "@/lib/comandaTotals";

describe("calcComandaTotal", () => {
  it("sem desconto: total = subtotal", () => {
    expect(calcComandaTotal(120, 0)).toBe(120);
  });
  it("desconto parcial: subtotal − desconto", () => {
    expect(calcComandaTotal(117, 77)).toBe(40);
  });
  it("desconto >= subtotal (escova do Clube): total 0, nunca negativo", () => {
    expect(calcComandaTotal(77, 77)).toBe(0);
    expect(calcComandaTotal(40, 77)).toBe(0);
  });
  it("remoção com desconto devolvido: volta ao subtotal restante", () => {
    // antes: [design 40 + escova clube 77], desconto 77 -> 40; remove a escova e o trigger devolve o desconto
    expect(calcComandaTotal(40, 0)).toBe(40);
  });
});
