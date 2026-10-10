import { describe, it, expect } from "vitest";
import { textoAvisoFila, diaSemanaData, dia } from "@/lib/filaAviso";

const agora = new Date(2026, 9, 10, 21, 0); // sáb 10/10/2026
const base = { aberta: false, abre: "08:00", proxima_abertura: "2026-10-11" } as const;

describe("filaAviso", () => {
  it("aberta não avisa", () => {
    expect(textoAvisoFila({ aberta: true, motivo: null, abre: null, proxima_abertura: null }, agora)).toBeNull();
  });
  it("ja_fechou", () => {
    expect(textoAvisoFila({ ...base, motivo: "ja_fechou" }, agora)).toBe(
      "O salão já fechou por hoje. Pode entrar na fila: você será atendida amanhã a partir das 08:00.");
  });
  it("ainda_nao_abriu", () => {
    expect(textoAvisoFila({ ...base, motivo: "ainda_nao_abriu", proxima_abertura: "2026-10-10" }, agora)).toBe(
      "O salão ainda não abriu. Você será atendida hoje a partir das 08:00.");
  });
  it("fechado_hoje", () => {
    expect(textoAvisoFila({ ...base, motivo: "fechado_hoje", proxima_abertura: "2026-10-13" }, agora)).toBe(
      "Hoje o salão não abre. Você será atendida terça, 13/10 a partir das 08:00.");
  });
  it("pausada", () => {
    expect(textoAvisoFila({ ...base, motivo: "pausada", proxima_abertura: "2026-10-13" }, agora)).toBe(
      "A fila está pausada no momento. Você entra na fila e será atendida assim que reabrir, terça, 13/10.");
    expect(textoAvisoFila({ ...base, motivo: "pausada", proxima_abertura: null }, agora)).toBe(
      "A fila está pausada no momento. Você entra na fila e será atendida assim que reabrir.");
  });
  it("formata datas", () => {
    expect(diaSemanaData("2026-10-11")).toBe("domingo, 11/10");
    expect(dia("2026-10-10", agora)).toBe("hoje");
  });
});
