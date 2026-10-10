// Testes do aviso "pagou fora do horário" (puros, nada sai da máquina).
// Rodar: deno test supabase/functions/_shared/
import { assertEquals } from "jsr:@std/assert@1";
import { formatarDiaPtBR, montarAvisoForaDoHorario, primeiroNome } from "./whatsapp_fila.ts";

const TOK = "11111111-2222-3333-4444-555555555555";
const LINK = `Acompanhe sua posição aqui: https://suavezexpress.vercel.app/fila/acompanhar/${TOK}`;
const INICIO = "Oi Bruna! Recebemos seu pagamento e você já está na fila do NP Hair Express.";

Deno.test("formatarDiaPtBR: dia da semana + DD/MM", () => {
  assertEquals(formatarDiaPtBR("2026-10-10"), "sábado, 10/10");
  assertEquals(formatarDiaPtBR("2026-10-13"), "terça-feira, 13/10");
  assertEquals(formatarDiaPtBR("2026-10-11"), "domingo, 11/10");
  assertEquals(formatarDiaPtBR("2027-01-05"), "terça-feira, 05/01");
});

Deno.test("formatarDiaPtBR: vazio ou inválido → null", () => {
  assertEquals(formatarDiaPtBR(null), null);
  assertEquals(formatarDiaPtBR(""), null);
  assertEquals(formatarDiaPtBR("2026-02-30"), null);
  assertEquals(formatarDiaPtBR("amanhã"), null);
});

Deno.test("primeiroNome", () => {
  assertEquals(primeiroNome("  Bruna  Souza Lima "), "Bruna");
  assertEquals(primeiroNome(null), "");
});

Deno.test("aberta → não envia (null)", () => {
  assertEquals(montarAvisoForaDoHorario("Bruna", { aberta: true, motivo: null, abre: "08:00" }, TOK), null);
  assertEquals(montarAvisoForaDoHorario("Bruna", null, TOK), null);
  assertEquals(montarAvisoForaDoHorario("Bruna", {}, TOK), null);
});

Deno.test("ja_fechou (sábado 23h) → próxima abertura com dia e hora", () => {
  const t = montarAvisoForaDoHorario("Bruna Souza",
    { aberta: false, motivo: "ja_fechou", abre: "08:00", fecha: "20:00", proxima_abertura: "2026-10-13" }, TOK);
  assertEquals(t, `${INICIO} O salão está fechado agora: seu atendimento será terça-feira, 13/10 a partir das 08:00. ${LINK}`);
});

Deno.test("fechado_hoje (domingo) → próxima abertura", () => {
  const t = montarAvisoForaDoHorario("Bruna",
    { aberta: false, motivo: "fechado_hoje", abre: "08:00", proxima_abertura: "2026-10-13" }, TOK);
  assertEquals(t, `${INICIO} O salão está fechado agora: seu atendimento será terça-feira, 13/10 a partir das 08:00. ${LINK}`);
});

Deno.test("ainda_nao_abriu (6h) → hoje a partir das abre", () => {
  const t = montarAvisoForaDoHorario("Bruna",
    { aberta: false, motivo: "ainda_nao_abriu", abre: "08:00", proxima_abertura: "2026-10-14" }, TOK);
  assertEquals(t, `${INICIO} O salão está fechado agora: seu atendimento é hoje a partir das 08:00. ${LINK}`);
});

Deno.test("pausada → sem data, equipe avisa", () => {
  const t = montarAvisoForaDoHorario("Bruna",
    { aberta: false, motivo: "pausada", abre: "08:00", proxima_abertura: "2026-10-14" }, TOK);
  assertEquals(t, `${INICIO} A fila está pausada no momento; a equipe te avisa quando reabrir. ${LINK}`);
});

Deno.test("fechado sem proxima_abertura (14 dias fechado) → texto genérico", () => {
  const t = montarAvisoForaDoHorario("Bruna",
    { aberta: false, motivo: "fechado_hoje", abre: "08:00", proxima_abertura: null }, TOK);
  assertEquals(t, `${INICIO} O salão está fechado agora: seu atendimento será na próxima abertura do salão a partir das 08:00. ${LINK}`);
});

Deno.test("sem nome e sem token → 'Oi!' e sem link", () => {
  const t = montarAvisoForaDoHorario("",
    { aberta: false, motivo: "ja_fechou", abre: "08:00", proxima_abertura: "2026-10-13" }, null);
  assertEquals(t, "Oi! Recebemos seu pagamento e você já está na fila do NP Hair Express. O salão está fechado agora: seu atendimento será terça-feira, 13/10 a partir das 08:00.");
});

Deno.test("sem markdown no texto (WhatsApp)", () => {
  const t = montarAvisoForaDoHorario("Bruna",
    { aberta: false, motivo: "ja_fechou", abre: "08:00", proxima_abertura: "2026-10-13" }, TOK) ?? "";
  assertEquals(/[*_~`]/.test(t), false);
});
