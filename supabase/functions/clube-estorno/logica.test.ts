// Testes da edge clube-estorno com banco e Asaas falsos (nada sai da máquina).
// Rodar: deno test supabase/functions/clube-estorno/
import { assert, assertEquals } from "jsr:@std/assert@1";
import { avaliarBloqueio, criarHandler, type Assinante, type Ciclo, type Deps, type Registro } from "./logica.ts";
import { conferirSenha, gerarHashSenha, iguaisTempoConstante } from "./senha.ts";

const SALAO = "9793948a-e208-4054-a4df-4b8f2b3b3965";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const RECEP = "22222222-2222-4222-8222-222222222222";
const ASS_A = "b39678e4-6b9a-449a-90ec-33241841c429";
const ASS_B = "de6d2029-55fb-47e6-b9e2-2e9b5f9a8d28";
const SENHA = "senha-de-teste-123";
const HASH = await gerarHashSenha(SENHA, 100_000);

type Chamada = { metodo: string; caminho: string };

function cenario(opts: { permitido?: boolean; papel?: string; asaasFalha?: boolean; salao?: string | null } = {}) {
  const chamadas: Chamada[] = [];
  const registros: (Registro & { id: string; criado_em: string })[] = [];
  const contagem = { hash: 0 };
  // cede a vez como um banco de verdade, para chamadas paralelas se intercalarem
  const pausa = () => new Promise((r) => setTimeout(r, Math.random() * 5));
  const rpcs: { nome: string; args: Record<string, unknown> }[] = [];
  const assinantes: Record<string, Assinante> = {
    [ASS_A]: { id: ASS_A, nome: "Francine Frare", celular: "11900008495", asaas_customer_id: "cus_A", asaas_subscription_id: "sub_aaaaaaaa", status: "ativo", cancelada_em: null },
    [ASS_B]: { id: ASS_B, nome: "Francine C frare", celular: "11900008495", asaas_customer_id: "cus_B", asaas_subscription_id: "sub_bbbbbbbb", status: "ativo", cancelada_em: null },
  };
  const ciclos: Ciclo[] = [
    { id: "c1", assinante_id: ASS_A, asaas_payment_id: "pay_aaaaaaaa", inicio: "2026-09-30T11:29:57Z", fim: "2026-10-30T11:29:57Z", creditos_total: 4, creditos_usados: 1, bloqueado: false, estornado_em: null, origem: "asaas_pagamento" },
    { id: "c2", assinante_id: ASS_B, asaas_payment_id: "pay_bbbbbbbb", inicio: "2026-10-01T11:16:11Z", fim: "2026-10-31T11:16:11Z", creditos_total: 4, creditos_usados: 0, bloqueado: false, estornado_em: null, origem: "asaas_pagamento" },
  ];
  const pagamentos: Record<string, { id: string; customer: string; status: string; value: number; billingType: string; subscription: string; refunds?: unknown[] }> = {
    pay_aaaaaaaa: { id: "pay_aaaaaaaa", customer: "cus_A", status: "CONFIRMED", value: 197, billingType: "CREDIT_CARD", subscription: "sub_aaaaaaaa" },
    pay_bbbbbbbb: { id: "pay_bbbbbbbb", customer: "cus_B", status: "CONFIRMED", value: 197, billingType: "CREDIT_CARD", subscription: "sub_bbbbbbbb" },
  };
  const assinaturas: Record<string, { id: string; customer: string; status: string; value: number; deleted: boolean }> = {
    sub_aaaaaaaa: { id: "sub_aaaaaaaa", customer: "cus_A", status: "ACTIVE", value: 197, deleted: false },
    sub_bbbbbbbb: { id: "sub_bbbbbbbb", customer: "cus_B", status: "ACTIVE", value: 197, deleted: false },
  };
  let hash: string | null = HASH;
  let n = 0;

  const deps: Deps = {
    autenticar: async (req) => {
      const tok = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
      if (tok === "admin") return { ok: true, userId: ADMIN, salonId: SALAO, roles: [opts.papel ?? "admin"] };
      if (tok === "recep") return { ok: true, userId: RECEP, salonId: SALAO, roles: ["receptionist"] };
      return { ok: false, status: 401, error: "Sessão inválida" };
    },
    salaoUnico: () => (opts.salao === undefined ? SALAO : opts.salao),
    pode: async (uid) => opts.permitido ?? uid === ADMIN,
    tentativasSenha: async (uid, limite) => {
      await pausa();
      return registros.filter((r) => r.user_id === uid && ["senha_incorreta", "tentativa_senha"].includes(r.resultado))
        .map((r) => ({ id: r.id, criado_em: r.criado_em })).reverse().slice(0, limite);
    },
    hashSenha: async () => { contagem.hash++; return hash; },
    gravarHash: async (_s, h) => { hash = h; },
    chaveAsaas: async () => "chave-falsa",
    assinante: async (id) => assinantes[id] ?? null,
    outrosMesmoCelular: async (a) => Object.values(assinantes).filter((o) => o.id !== a.id && o.celular === a.celular),
    ciclosPorPagamento: async (ids) => ciclos.filter((c) => ids.includes(c.asaas_payment_id)),
    existeRegistro: async (tipo, alvo, resultado) => registros.some((r) => r.tipo === tipo && r.alvo === alvo && r.resultado === resultado),
    expirarEmAndamento: async () => {},
    registrar: async (r) => {
      await pausa();
      if (r.resultado === "em_andamento" && registros.some((x) => x.tipo === r.tipo && x.alvo === r.alvo && ["em_andamento", "sucesso"].includes(x.resultado))) return null;
      const id = `r${++n}`;
      registros.push({ ...r, id, criado_em: new Date().toISOString() });
      return id;
    },
    atualizarRegistro: async (id, patch) => { Object.assign(registros.find((r) => r.id === id)!, patch); },
    rpc: async (nome, args) => {
      rpcs.push({ nome, args });
      if (nome === "clube_aplicar_estorno") {
        const c = ciclos.find((x) => x.asaas_payment_id === args.p_asaas_payment_id)!;
        if (c.estornado_em) return { data: { ok: true, ja_aplicado: true, usadas: c.creditos_usados, total: c.creditos_total }, error: null };
        c.estornado_em = "agora"; c.bloqueado = true;
        return { data: { ok: true, ja_aplicado: false, usadas: c.creditos_usados, total: c.creditos_total, valor_estornado: 197 }, error: null };
      }
      return { data: { ok: true, efeito: args.p_restam_ativas === 0 ? "cancelada" : "restam_assinaturas" }, error: null };
    },
    asaas: async (_chave, metodo, caminho) => {
      chamadas.push({ metodo, caminho });
      if (opts.asaasFalha && metodo !== "GET") {
        return { ok: false, status: 400, dados: { errors: [{ code: "invalid_action", description: "Não é possível estornar esta cobrança." }] } };
      }
      const pay = caminho.match(/^\/payments\/(pay_\w+)(\/refund)?$/);
      if (pay) {
        const p = pagamentos[pay[1]];
        if (!p) return { ok: false, status: 404, dados: null };
        if (metodo === "POST") { p.status = "REFUNDED"; return { ok: true, status: 200, dados: { ...p } }; }
        return { ok: true, status: 200, dados: { ...p } };
      }
      const sub = caminho.match(/^\/subscriptions\/(sub_\w+)$/);
      if (sub) {
        const s = assinaturas[sub[1]];
        if (metodo === "DELETE") { s.deleted = true; s.status = "INACTIVE"; return { ok: true, status: 200, dados: { deleted: true, id: s.id } }; }
        return { ok: true, status: 200, dados: { ...s } };
      }
      const lista = caminho.match(/^\/(subscriptions|payments)\?customer=(\w+)/);
      if (lista) {
        const fonte = lista[1] === "subscriptions" ? Object.values(assinaturas) : Object.values(pagamentos);
        const ativas = caminho.includes("status=ACTIVE");
        return { ok: true, status: 200, dados: { data: fonte.filter((x) => x.customer === lista[2] && (!ativas || x.status === "ACTIVE")) } };
      }
      return { ok: false, status: 404, dados: null };
    },
    agora: () => new Date(),
  };
  const req = (body: unknown, token = "admin") =>
    new Request("http://x/clube-estorno", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  return { handler: criarHandler(deps), req, chamadas, registros, rpcs, ciclos, pagamentos, assinaturas, contagem, deps };
}

const estorno = (over: Record<string, unknown> = {}) => ({
  acao: "estornar", assinante_id: ASS_B, payment_id: "pay_bbbbbbbb", motivo: "Cobrança duplicada da cliente", senha: SENHA, ...over,
});
const naoMexeuNoAsaas = (ch: Chamada[]) => ch.filter((c) => c.metodo !== "GET").length === 0;

Deno.test("senha: hash confere, senha errada não, formato pbkdf2$iter$salt$hash", async () => {
  const h = await gerarHashSenha("abc12345", 100_000);
  assertEquals(h.split("$").length, 4);
  assert(h.startsWith("pbkdf2$100000$"));
  assert(await conferirSenha("abc12345", h));
  assert(!(await conferirSenha("abc12346", h)));
  assert(!(await conferirSenha("abc12345", "lixo")));
  assert(!(await conferirSenha("abc12345", null)));
  assert(iguaisTempoConstante(new Uint8Array([1, 2]), new Uint8Array([1, 2])));
  assert(!iguaisTempoConstante(new Uint8Array([1, 2]), new Uint8Array([1, 3])));
});

Deno.test("senha errada: não chama o Asaas, não chama o motor e conta a tentativa", async () => {
  const t = cenario();
  const r = await t.handler(t.req(estorno({ senha: "errada" })));
  assertEquals(r.status, 422);
  assertEquals(t.chamadas.length, 0);
  assertEquals(t.rpcs.length, 0);
  assertEquals(t.registros.filter((x) => x.resultado === "senha_incorreta").length, 1);
  assert((await r.json()).erro.includes("Restam 4 tentativas"));
});

Deno.test("sem permissão: 403, registra e não chama o Asaas", async () => {
  const t = cenario({ permitido: false });
  const r = await t.handler(t.req(estorno(), "recep"));
  assertEquals(r.status, 403);
  assertEquals(t.chamadas.length, 0);
  assertEquals(t.registros[0].resultado, "sem_permissao");
  const l = await t.handler(t.req({ acao: "listar", assinante_id: ASS_B }, "recep"));
  assertEquals(l.status, 403);
  assertEquals(t.chamadas.length, 0);
});

Deno.test("trocar_senha: só admin, exige a senha atual", async () => {
  const t = cenario({ papel: "financial", permitido: true });
  const r = await t.handler(t.req({ acao: "trocar_senha", senha_atual: SENHA, senha_nova: "outra-senha-1" }));
  assertEquals(r.status, 403);
  const t2 = cenario();
  const errada = await t2.handler(t2.req({ acao: "trocar_senha", senha_atual: "x", senha_nova: "outra-senha-1" }));
  assertEquals(errada.status, 422);
  const certa = await t2.handler(t2.req({ acao: "trocar_senha", senha_atual: SENHA, senha_nova: "outra-senha-1" }));
  assertEquals(certa.status, 200);
  const antiga = await t2.handler(t2.req(estorno()));
  assertEquals(antiga.status, 422); // a senha velha deixou de valer
  assert(naoMexeuNoAsaas(t2.chamadas));
});

Deno.test("cobrança de outra cliente: recusa sem estornar (sistema e Asaas)", async () => {
  // pagamento do cadastro A pedido como se fosse do B
  const t = cenario();
  const r = await t.handler(t.req(estorno({ payment_id: "pay_aaaaaaaa" })));
  assertEquals(r.status, 422);
  assert(naoMexeuNoAsaas(t.chamadas));
  assertEquals(t.rpcs.length, 0);
  // ciclo é do B no sistema, mas no Asaas a cobrança é de outro customer
  const t2 = cenario();
  t2.pagamentos.pay_bbbbbbbb.customer = "cus_OUTRA";
  const r2 = await t2.handler(t2.req(estorno()));
  assertEquals(r2.status, 422);
  assert((await r2.json()).erro.includes("outra cliente no Asaas"));
  assert(naoMexeuNoAsaas(t2.chamadas));
  assertEquals(t2.rpcs.length, 0);
  assertEquals(t2.registros.at(-1)!.resultado, "recusado");
});

Deno.test("bloqueio: 5 senhas erradas em 15 min bloqueiam por 15 min, mesmo com a senha certa", async () => {
  const t = cenario();
  for (let i = 0; i < 5; i++) await t.handler(t.req(estorno({ senha: "errada" })));
  const r = await t.handler(t.req(estorno()));
  assertEquals(r.status, 429);
  assert((await r.json()).erro.includes("Muitas tentativas"));
  assertEquals(t.chamadas.length, 0);
  assertEquals(t.registros.at(-1)!.resultado, "bloqueado_tentativas");
});

Deno.test("avaliarBloqueio: janela e liberação", () => {
  const agora = new Date("2026-10-05T15:00:00Z");
  const min = (m: number) => new Date(agora.getTime() - m * 60_000).toISOString();
  assertEquals(avaliarBloqueio([min(1), min(2), min(3), min(4)], agora).bloqueado, false);
  assertEquals(avaliarBloqueio([min(1), min(2), min(3), min(4)], agora).restam, 1);
  assertEquals(avaliarBloqueio([min(1), min(2), min(3), min(4), min(5)], agora).bloqueado, true);
  // 5ª errada há 16 min: bloqueio já acabou
  assertEquals(avaliarBloqueio([min(16), min(17), min(18), min(19), min(20)], agora).bloqueado, false);
  // 5 erradas espalhadas em mais de 15 min: não bloqueia
  assertEquals(avaliarBloqueio([min(1), min(5), min(10), min(14), min(40)], agora).bloqueado, false);
});

Deno.test("caminho feliz: um refund, uma RPC, registro de sucesso e só no cadastro certo", async () => {
  const t = cenario();
  const r = await t.handler(t.req(estorno()));
  const b = await r.json();
  assertEquals(r.status, 200);
  assertEquals(b.ok, true);
  assertEquals(b.usadas, 0);
  assertEquals(t.chamadas.filter((c) => c.metodo === "POST").map((c) => c.caminho), ["/payments/pay_bbbbbbbb/refund"]);
  assertEquals(t.rpcs.map((x) => x.nome), ["clube_aplicar_estorno"]);
  assertEquals(t.rpcs[0].args.p_asaas_payment_id, "pay_bbbbbbbb");
  assertEquals(t.registros.at(-1)!.resultado, "sucesso");
  // o outro cadastro da mesma pessoa não foi tocado
  assertEquals(t.ciclos.find((c) => c.id === "c1")!.bloqueado, false);
  assertEquals(t.pagamentos.pay_aaaaaaaa.status, "CONFIRMED");
});

Deno.test("reenvio/clique duplo: não estorna duas vezes", async () => {
  const t = cenario();
  const [r1, r2] = await Promise.all([t.handler(t.req(estorno())), t.handler(t.req(estorno()))]);
  const st = [r1.status, r2.status].sort();
  assert(st[0] === 200 && (st[1] === 200 || st[1] === 409), `status ${st}`);
  const r3 = await t.handler(t.req(estorno()));
  assertEquals(r3.status, 200);
  assertEquals((await r3.json()).ja_aplicado, true);
  assertEquals(t.chamadas.filter((c) => c.metodo === "POST").length, 1);
  assertEquals(t.rpcs.length, 1);
});

Deno.test("Asaas já estornou (falha anterior no motor): não chama refund, só conclui o motor", async () => {
  const t = cenario();
  t.pagamentos.pay_bbbbbbbb.status = "REFUNDED";
  const r = await t.handler(t.req(estorno()));
  assertEquals(r.status, 200);
  assertEquals((await r.json()).ja_aplicado, true);
  assertEquals(t.chamadas.filter((c) => c.metodo === "POST").length, 0);
  assertEquals(t.rpcs.length, 1);
});

Deno.test("erro do Asaas: devolve a mensagem dele e não mexe no motor", async () => {
  const t = cenario({ asaasFalha: true });
  const r = await t.handler(t.req(estorno()));
  assertEquals(r.status, 502);
  assert((await r.json()).erro.includes("Não é possível estornar esta cobrança."));
  assertEquals(t.rpcs.length, 0);
  assertEquals(t.ciclos.find((c) => c.id === "c2")!.bloqueado, false);
  assertEquals(t.registros.at(-1)!.resultado, "erro_asaas");
  // a trava foi liberada: dá para tentar de novo
  t.pagamentos.pay_bbbbbbbb.status = "CONFIRMED";
});

Deno.test("cobrança não paga: recusa sem chamar refund", async () => {
  const t = cenario();
  t.pagamentos.pay_bbbbbbbb.status = "PENDING";
  const r = await t.handler(t.req(estorno()));
  assertEquals(r.status, 422);
  assert(naoMexeuNoAsaas(t.chamadas));
});

Deno.test("motivo curto ou sem senha: 400 antes de tudo", async () => {
  const t = cenario();
  assertEquals((await t.handler(t.req(estorno({ motivo: "curto" })))).status, 400);
  assertEquals((await t.handler(t.req(estorno({ senha: "" })))).status, 400);
  assertEquals(t.chamadas.length, 0);
  assertEquals(t.registros.length, 0);
});

Deno.test("cancelar: senha errada não chama o Asaas; certa apaga só a assinatura pedida", async () => {
  const t = cenario();
  const body = { acao: "cancelar", assinante_id: ASS_B, subscription_id: "sub_bbbbbbbb", motivo: "Assinatura duplicada da cliente", senha: "x" };
  const e = await t.handler(t.req(body));
  assertEquals(e.status, 422);
  assertEquals(t.chamadas.length, 0);
  const ok = await t.handler(t.req({ ...body, senha: SENHA }));
  assertEquals(ok.status, 200);
  assertEquals(t.chamadas.filter((c) => c.metodo === "DELETE").map((c) => c.caminho), ["/subscriptions/sub_bbbbbbbb"]);
  assertEquals(t.rpcs[0].args.p_restam_ativas, 0);
  assertEquals(t.assinaturas.sub_aaaaaaaa.deleted, false);
  // assinatura de outra cliente
  const outra = await t.handler(t.req({ ...body, senha: SENHA, subscription_id: "sub_aaaaaaaa" }));
  assertEquals(outra.status, 422);
  assertEquals(t.chamadas.filter((c) => c.metodo === "DELETE").length, 1);
});

Deno.test("listar: só cobranças desta cliente, marca estornável e avisa do outro cadastro", async () => {
  const t = cenario();
  const r = await t.handler(t.req({ acao: "listar", assinante_id: ASS_B }));
  const b = await r.json();
  assertEquals(r.status, 200);
  assertEquals(b.cobrancas.map((c: { id: string }) => c.id), ["pay_bbbbbbbb"]);
  assertEquals(b.cobrancas[0].estornavel, true);
  assertEquals(b.assinaturas.map((s: { id: string }) => s.id), ["sub_bbbbbbbb"]);
  assertEquals(b.outros_cadastros.map((o: { nome: string }) => o.nome), ["Francine Frare"]);
  assert(naoMexeuNoAsaas(t.chamadas));
});

Deno.test("salão: sem NPHAIR_EXPRESS_SALON_ID ou usuário de outro salão = recusa antes de tudo", async () => {
  const t = cenario({ salao: null });
  assertEquals((await t.handler(t.req(estorno()))).status, 503);
  const t2 = cenario({ salao: "00000000-0000-4000-8000-000000000000" });
  assertEquals((await t2.handler(t2.req({ acao: "listar", assinante_id: ASS_B }))).status, 403);
  assertEquals(t.chamadas.length + t2.chamadas.length, 0);
  assertEquals(t.registros.length + t2.registros.length, 0);
});

Deno.test("corrida: 10 chamadas paralelas com senha errada, no máximo 5 chegam à conferência e nenhuma ao Asaas", async () => {
  const t = cenario();
  const rs = await Promise.all(Array.from({ length: 10 }, () => t.handler(t.req(estorno({ senha: "errada" })))));
  const st = rs.map((r) => r.status);
  assert(t.contagem.hash <= 5, `conferências: ${t.contagem.hash}`);
  assertEquals(st.filter((x) => x === 422).length, t.contagem.hash);
  assertEquals(st.filter((x) => x === 429).length, 10 - t.contagem.hash);
  assertEquals(t.chamadas.length, 0);
  assertEquals(t.rpcs.length, 0);
  // e depois disso nem a senha certa passa
  const certa = await t.handler(t.req(estorno()));
  assertEquals(certa.status, 429);
  assertEquals(t.chamadas.length, 0);
  console.log(`  conferências de hash: ${t.contagem.hash} de 10; status: ${st.join(",")}`);
});

Deno.test("tentativa largada em aberto (queda da função) conta como errada", async () => {
  const t = cenario();
  for (let i = 0; i < 5; i++) {
    await t.handler(t.req(estorno({ senha: "errada" })));
  }
  // vira 4 erradas + 1 reserva em aberto
  t.registros.filter((r) => r.resultado === "senha_incorreta").at(-1)!.resultado = "tentativa_senha";
  const r = await t.handler(t.req(estorno()));
  assertEquals(r.status, 429);
  assertEquals(t.contagem.hash, 5);
});

Deno.test("sem permissão com assinante inexistente: falha de FK no registro não derruba a função", async () => {
  const t = cenario({ permitido: false });
  const gravados: Registro[] = [];
  const h = criarHandler({
    ...t.deps,
    registrar: async (r) => {
      if (r.assinante_id) throw new Error("registro falhou (23503)");
      gravados.push(r);
      return "r1";
    },
  });
  const r = await h(t.req(estorno({ assinante_id: "99999999-9999-4999-8999-999999999999" }), "recep"));
  assertEquals(r.status, 403);
  assertEquals(gravados.map((g) => [g.resultado, g.assinante_id ?? null]), [["sem_permissao", null]]);
});
