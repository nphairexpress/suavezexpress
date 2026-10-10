// Testes da decisão de reconciliação do queue-cron (pura, nada sai da máquina).
// Rodar: deno test supabase/functions/queue-cron/
import { assertEquals } from "jsr:@std/assert@1";
import { decidirReconciliacao, mesmoTelefone } from "./reconcilia.ts";

Deno.test("RECEIVED → confirmar (PIX pago, caso Bruna 09/10)", () => {
  assertEquals(decidirReconciliacao({ status: "RECEIVED", deleted: false }), "confirmar");
});

Deno.test("CONFIRMED → confirmar (cartão aprovado)", () => {
  assertEquals(decidirReconciliacao({ status: "CONFIRMED", deleted: false }), "confirmar");
});

Deno.test("PENDING → nada (cliente ainda não pagou)", () => {
  assertEquals(decidirReconciliacao({ status: "PENDING", deleted: false }), "nada");
});

Deno.test("OVERDUE → nada (venceu sem pagar, não mexe)", () => {
  assertEquals(decidirReconciliacao({ status: "OVERDUE", deleted: false }), "nada");
});

Deno.test("DELETED → cancelar", () => {
  assertEquals(decidirReconciliacao({ status: "DELETED" }), "cancelar");
});

Deno.test("cobrança removida (deleted=true, status ainda PENDING) → cancelar", () => {
  assertEquals(decidirReconciliacao({ status: "PENDING", deleted: true }), "cancelar");
});

Deno.test("REFUNDED → cancelar", () => {
  assertEquals(decidirReconciliacao({ status: "REFUNDED", deleted: false }), "cancelar");
});

Deno.test("status desconhecido ou ausente → nada", () => {
  assertEquals(decidirReconciliacao({ status: "AWAITING_RISK_ANALYSIS" }), "nada");
  assertEquals(decidirReconciliacao({ status: "STATUS_INVENTADO" }), "nada");
  assertEquals(decidirReconciliacao({}), "nada");
  assertEquals(decidirReconciliacao(null), "nada");
});

Deno.test("status em minúsculas é tratado igual", () => {
  assertEquals(decidirReconciliacao({ status: "received" }), "confirmar");
});

Deno.test("mesmoTelefone: com DDI 55 vs sem → true", () => {
  assertEquals(mesmoTelefone("5511987654321", "11987654321"), true);
});

Deno.test("mesmoTelefone: com máscara → true", () => {
  assertEquals(mesmoTelefone("+55 (11) 98765-4321", "11987654321"), true);
});

Deno.test("mesmoTelefone: números diferentes → false", () => {
  assertEquals(mesmoTelefone("11987654321", "11987654322"), false);
});

Deno.test("mesmoTelefone: menos de 8 dígitos → false", () => {
  assertEquals(mesmoTelefone("7654321", "11987654321"), false);
  assertEquals(mesmoTelefone("1234567", "1234567"), false);
});

Deno.test("mesmoTelefone: vazio ou nulo → false", () => {
  assertEquals(mesmoTelefone("", "11987654321"), false);
  assertEquals(mesmoTelefone(null, undefined), false);
  assertEquals(mesmoTelefone("", ""), false);
});
