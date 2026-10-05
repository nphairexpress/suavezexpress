// Testes da regra de status do Clube no asaas-webhook (pura, nada sai da máquina).
// Rodar: deno test supabase/functions/asaas-webhook/status_clube.test.ts
import { assertEquals } from "jsr:@std/assert@1";
import { type CicloResumo, novoStatusClube, temCicloAtivo } from "./status_clube.ts";

type Cadastro = { status: string; canceladaEm: string | null };
type Evento = { evento: string; em: string; restaVencidaNoAsaas?: boolean | null };

// Aplica a sequência de eventos como o handleClube faz. Pagamento confirmado segue o caminho antigo
// (o webhook grava status 'ativo'); OVERDUE/DELETED passam pela regra nova.
function rodar(inicial: Cadastro, ciclos: CicloResumo[], eventos: Evento[]): string {
  const cad = { ...inicial };
  for (const e of eventos) {
    if (e.evento === "PAYMENT_RECEIVED" || e.evento === "PAYMENT_CONFIRMED") {
      cad.status = "ativo";
      continue;
    }
    const novo = novoStatusClube(e.evento, {
      status: cad.status,
      canceladaEm: cad.canceladaEm,
      temCicloAtivo: temCicloAtivo(ciclos, new Date(e.em)),
      restaVencidaNoAsaas: e.restaVencidaNoAsaas ?? null,
    });
    if (novo) cad.status = novo;
  }
  return cad.status;
}

// Ciclo real do pacote de unha da Gabriela (pay_8c9y…, 26/09 12:00 BRT → 26/10 12:00 BRT).
const CICLO_UNHA_GABRIELA: CicloResumo = { inicio: "2026-09-26T15:00:00Z", fim: "2026-10-26T15:00:00Z", bloqueado: false };

Deno.test("Gabriela, ordem real: RECEIVED unha 00:03 → OVERDUE esmaltação 03:02 → DELETED 17:40 termina ativo", () => {
  const fim = rodar({ status: "ativo", canceladaEm: null }, [CICLO_UNHA_GABRIELA], [
    { evento: "PAYMENT_RECEIVED", em: "2026-09-30T03:03:00Z" },
    { evento: "PAYMENT_OVERDUE", em: "2026-09-30T06:02:00Z" },
    { evento: "PAYMENT_DELETED", em: "2026-09-30T20:40:00Z" },
  ]);
  assertEquals(fim, "ativo");
});

Deno.test("Gabriela já derrubada pela regra antiga: DELETED com ciclo de unha ativo devolve ativo", () => {
  const fim = rodar({ status: "inadimplente", canceladaEm: null }, [CICLO_UNHA_GABRIELA], [
    { evento: "PAYMENT_DELETED", em: "2026-09-30T20:40:00Z" },
  ]);
  assertEquals(fim, "ativo");
});

Deno.test("só escova, mensalidade vencida e sem ciclo ativo: termina inadimplente", () => {
  const cicloVencido: CicloResumo = { inicio: "2026-08-22T22:12:00Z", fim: "2026-09-21T22:12:00Z", bloqueado: false };
  const fim = rodar({ status: "ativo", canceladaEm: null }, [cicloVencido], [
    { evento: "PAYMENT_OVERDUE", em: "2026-09-23T06:00:00Z" },
  ]);
  assertEquals(fim, "inadimplente");
});

Deno.test("só escova inadimplente: apagar a vencida mas restar outra vencida no Asaas mantém inadimplente", () => {
  const fim = rodar({ status: "inadimplente", canceladaEm: null }, [], [
    { evento: "PAYMENT_DELETED", em: "2026-09-25T12:00:00Z", restaVencidaNoAsaas: true },
  ]);
  assertEquals(fim, "inadimplente");
});

Deno.test("inadimplente sem ciclo: apagar a única vencida devolve ativo; Asaas sem resposta mantém", () => {
  assertEquals(rodar({ status: "inadimplente", canceladaEm: null }, [], [
    { evento: "PAYMENT_DELETED", em: "2026-09-25T12:00:00Z", restaVencidaNoAsaas: false },
  ]), "ativo");
  assertEquals(rodar({ status: "inadimplente", canceladaEm: null }, [], [
    { evento: "PAYMENT_DELETED", em: "2026-09-25T12:00:00Z", restaVencidaNoAsaas: null },
  ]), "inadimplente");
});

Deno.test("ciclo bloqueado (estorno) não conta como ciclo ativo", () => {
  const estornado: CicloResumo = { ...CICLO_UNHA_GABRIELA, bloqueado: true };
  assertEquals(rodar({ status: "ativo", canceladaEm: null }, [estornado], [
    { evento: "PAYMENT_OVERDUE", em: "2026-10-05T12:00:00Z" },
  ]), "inadimplente");
});

Deno.test("cancelada não ressuscita por OVERDUE nem por DELETED", () => {
  assertEquals(rodar({ status: "cancelado", canceladaEm: "2026-10-05T18:00:00Z" }, [CICLO_UNHA_GABRIELA], [
    { evento: "PAYMENT_DELETED", em: "2026-10-06T12:00:00Z", restaVencidaNoAsaas: false },
    { evento: "PAYMENT_OVERDUE", em: "2026-10-07T12:00:00Z" },
  ]), "cancelado");
  // cancelada com ciclo ainda valendo (status segue ativo até o ciclo acabar, cancelada_em preenchido)
  assertEquals(novoStatusClube("PAYMENT_OVERDUE", {
    status: "ativo", canceladaEm: "2026-10-05T18:00:00Z", temCicloAtivo: false,
  }), null);
  assertEquals(novoStatusClube("PAYMENT_DELETED", {
    status: "inadimplente", canceladaEm: "2026-10-05T18:00:00Z", temCicloAtivo: true, restaVencidaNoAsaas: false,
  }), null);
});

Deno.test("leitura de ciclos falhou (null): OVERDUE não derruba ninguém", () => {
  assertEquals(novoStatusClube("PAYMENT_OVERDUE", { status: "ativo", canceladaEm: null, temCicloAtivo: null }), null);
});

Deno.test("outros eventos não mexem no status", () => {
  for (const ev of ["PAYMENT_REFUNDED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED", "PAYMENT_UPDATED", "PAYMENT_CREATED"]) {
    assertEquals(novoStatusClube(ev, { status: "inadimplente", canceladaEm: null, temCicloAtivo: true }), null);
  }
});

Deno.test("temCicloAtivo: início incluso, fim excluso", () => {
  assertEquals(temCicloAtivo([CICLO_UNHA_GABRIELA], new Date("2026-09-26T15:00:00Z")), true);
  assertEquals(temCicloAtivo([CICLO_UNHA_GABRIELA], new Date("2026-10-26T15:00:00Z")), false);
  assertEquals(temCicloAtivo([CICLO_UNHA_GABRIELA], new Date("2026-09-26T14:59:59Z")), false);
});
