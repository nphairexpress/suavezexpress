import { describe, it, expect } from "vitest";
import {
  resolveCommissionPercent,
  effectiveProfessionalId,
  buildProfClientPercentMap,
  profServiceKey,
  isMissingTableError,
} from "../commissionPercent";

const MARCILENE = "prof-marcilene";
const WANESSA = "prof-wanessa";
const ROSELY = "cli-rosely";
const OUTRA = "cli-outra";
const MANICURE = "srv-manicure";
const LAVAGEM = "srv-lavagem";
const SEM_REGRA = "srv-sem-regra";

const profServicePercents = new Map<string, number>([
  [profServiceKey(MARCILENE, MANICURE), 60],
  [profServiceKey(WANESSA, LAVAGEM), 30],
]);
const profClientPercents = buildProfClientPercentMap([
  { professional_id: MARCILENE, client_id: ROSELY, commission_percent: "70" },
]);
const marcilene = { commission_percent: 0, package_commission_percent: 0 };

const base = { profServicePercents, profClientPercents };

describe("resolveCommissionPercent: cascata", () => {
  it("só o padrão da profissional quando não há outra regra", () => {
    expect(
      resolveCommissionPercent({ ...base, itemType: "service", serviceId: SEM_REGRA, professionalId: "prof-x", clientId: OUTRA, professional: { commission_percent: 40 } }),
    ).toEqual({ percent: 40, source: "profissional" });
  });

  it("percentual do serviço (> 0) vence o padrão; serviço com 0 cai no padrão", () => {
    const p = { commission_percent: 40 };
    expect(resolveCommissionPercent({ ...base, serviceId: SEM_REGRA, servicePercent: 50, professionalId: "prof-x", clientId: OUTRA, professional: p }))
      .toEqual({ percent: 50, source: "servico" });
    expect(resolveCommissionPercent({ ...base, serviceId: SEM_REGRA, servicePercent: 0, professionalId: "prof-x", clientId: OUTRA, professional: p }))
      .toEqual({ percent: 40, source: "profissional" });
  });

  it("par profissional/serviço vence o serviço", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, servicePercent: 50, professionalId: MARCILENE, clientId: OUTRA, professional: marcilene }))
      .toEqual({ percent: 60, source: "profissional_servico" });
  });

  it("cliente com regra: o par profissional/cliente vence o par profissional/serviço", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, servicePercent: 50, professionalId: MARCILENE, clientId: ROSELY, professional: marcilene }))
      .toEqual({ percent: 70, source: "cliente" });
  });

  it("a regra por cliente vale para qualquer serviço da mesma profissional, inclusive sem regra de serviço", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: SEM_REGRA, professionalId: MARCILENE, clientId: ROSELY, professional: marcilene }))
      .toEqual({ percent: 70, source: "cliente" });
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: null, professionalId: MARCILENE, clientId: ROSELY, professional: marcilene }))
      .toEqual({ percent: 70, source: "cliente" });
  });

  it("cliente sem regra fica no par profissional/serviço", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, professionalId: MARCILENE, clientId: OUTRA, professional: marcilene }).percent).toBe(60);
  });

  it("outra profissional atendendo a mesma cliente não muda", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: LAVAGEM, professionalId: WANESSA, clientId: ROSELY, professional: { commission_percent: 0 } }))
      .toEqual({ percent: 30, source: "profissional_servico" });
  });

  it("item de pacote de unha (serviço com valor rateado) também recebe a regra da cliente", () => {
    // O valor rateado mora no próprio item; o percentual é o do par cliente.
    const r = resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, professionalId: MARCILENE, clientId: ROSELY, professional: marcilene });
    expect(r).toEqual({ percent: 70, source: "cliente" });
    expect((39.5 * r.percent) / 100).toBeCloseTo(27.65, 2);
  });

  it("venda de pacote (item_type package) segue no ramo próprio, sem regra por cliente", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "package", serviceId: null, professionalId: MARCILENE, clientId: ROSELY, professional: { commission_percent: 0, package_commission_percent: 60 } }))
      .toEqual({ percent: 60, source: "pacote" });
    expect(resolveCommissionPercent({ ...base, itemType: "package", professionalId: MARCILENE, clientId: ROSELY, professional: { commission_percent: 10, package_commission_percent: 0 } }))
      .toEqual({ percent: 10, source: "profissional" });
  });

  it("comanda sem cliente não usa a regra por cliente", () => {
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, professionalId: MARCILENE, clientId: null, professional: marcilene }))
      .toEqual({ percent: 60, source: "profissional_servico" });
  });

  it("profissional do item vazio cai no da comanda e então pega a regra da cliente", () => {
    const prof = effectiveProfessionalId(null, MARCILENE);
    expect(prof).toBe(MARCILENE);
    expect(effectiveProfessionalId(WANESSA, MARCILENE)).toBe(WANESSA);
    expect(effectiveProfessionalId(undefined, undefined)).toBeNull();
    expect(resolveCommissionPercent({ ...base, itemType: "service", serviceId: MANICURE, professionalId: prof, clientId: ROSELY, professional: marcilene }).percent).toBe(70);
  });

  it("sem mapas (tabela ausente) o resultado é o de antes", () => {
    expect(resolveCommissionPercent({ itemType: "service", serviceId: MANICURE, professionalId: MARCILENE, clientId: ROSELY, professional: marcilene, profServicePercents }).percent).toBe(60);
  });

  it("par profissional/serviço com 0 vale como 0 (não cai para o serviço)", () => {
    const m = new Map([[profServiceKey("p", "s"), 0]]);
    expect(resolveCommissionPercent({ serviceId: "s", servicePercent: 50, professionalId: "p", professional: { commission_percent: 40 }, profServicePercents: m }).percent).toBe(0);
  });
});

describe("isMissingTableError", () => {
  it("reconhece relação ausente e ignora outros erros", () => {
    expect(isMissingTableError({ code: "PGRST205", message: "Could not find the table" })).toBe(true);
    expect(isMissingTableError({ code: "42P01", message: 'relation "x" does not exist' })).toBe(true);
    expect(isMissingTableError({ code: "42501", message: "permission denied" })).toBe(false);
    expect(isMissingTableError(null)).toBe(false);
  });
});
