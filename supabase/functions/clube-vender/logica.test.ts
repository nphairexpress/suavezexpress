// Testes da edge clube-vender com Asaas e banco falsos (nada sai da máquina).
// Rodar: deno test supabase/functions/clube-vender/
import { assert, assertEquals } from "jsr:@std/assert@1";
import { criarHandler, normalizarTelefone, procurarExistentes, type Deps, type LinhaAssinante } from "./logica.ts";

type Cliente = { id: string; name: string; cpfCnpj: string; email: string; mobilePhone: string | null; phone?: string | null };
type Assinatura = { id: string; customer: string; status: string; value: number; description: string; deleted: boolean; dateCreated: string };

const FRANCINE_CEL = "11900008495";

function cenario(opts: { clientes?: Cliente[]; assinaturas?: Assinatura[]; banco?: LinhaAssinante[]; asaasFora?: boolean; bancoFora?: boolean } = {}) {
  const clientes = [...(opts.clientes ?? [])];
  const assinaturas = [...(opts.assinaturas ?? [])];
  const banco = [...(opts.banco ?? [])];
  const chamadas: { metodo: string; caminho: string; corpo?: unknown }[] = [];
  const pausa = () => new Promise((r) => setTimeout(r, Math.random() * 5));
  let n = 0;

  const deps: Deps = {
    autorizar: async (req) => req.headers.get("authorization") === "Bearer equipe",
    chaveAsaas: () => "chave-falsa-de-teste",
    ipRemoto: () => "127.0.0.1",
    assinantesAtivos: async () => {
      await pausa();
      if (opts.bancoFora) throw new Error("banco fora");
      return banco.filter((l) => ["ativo", "inadimplente"].includes(String(l.status)) && !l.cancelada_em);
    },
    asaas: async (metodo, caminho, corpo) => {
      chamadas.push({ metodo, caminho, corpo });
      await pausa();
      if (opts.asaasFora) return { ok: false, status: 503, dados: null };
      const url = new URL("https://x" + caminho);
      if (metodo === "GET" && url.pathname === "/customers") {
        const cpf = url.searchParams.get("cpfCnpj");
        const email = url.searchParams.get("email");
        const fone = url.searchParams.get("mobilePhone");
        const data = clientes.filter((c) =>
          (cpf !== null && c.cpfCnpj === cpf) ||
          (email !== null && c.email.toLowerCase() === email.toLowerCase()) ||
          (fone !== null && (c.mobilePhone ?? "").replace(/\D/g, "") === fone)
        );
        return { ok: true, status: 200, dados: { data } };
      }
      if (metodo === "GET" && url.pathname === "/subscriptions") {
        const cus = url.searchParams.get("customer");
        const st = url.searchParams.get("status");
        return { ok: true, status: 200, dados: { data: assinaturas.filter((s) => s.customer === cus && (!st || s.status === st)) } };
      }
      if (metodo === "POST" && url.pathname === "/customers") {
        const c = corpo as Cliente;
        const novo = { ...c, id: `cus_novo${++n}` };
        clientes.push(novo);
        return { ok: true, status: 200, dados: novo };
      }
      if (metodo === "POST" && url.pathname === "/subscriptions") {
        const s = corpo as { customer: string; value: number; description: string };
        const nova: Assinatura = { id: `sub_nova${++n}`, customer: s.customer, value: s.value, description: s.description, status: "ACTIVE", deleted: false, dateCreated: "2026-10-05" };
        assinaturas.push(nova);
        return { ok: true, status: 200, dados: nova };
      }
      return { ok: false, status: 404, dados: null };
    },
  };
  const handler = criarHandler(deps);
  const posts = () => chamadas.filter((c) => c.metodo !== "GET");
  return { deps, handler, chamadas, posts, assinaturas, clientes };
}

function venda(extra: Record<string, unknown> = {}) {
  return {
    plano: "4cm", nome: "Cliente Teste da Silva", cpf: "529.982.247-25", celular: "(11) 98888-1234", email: "teste@exemplo.com",
    cartao: { numero: "4111 1111 1111 1111", mesValidade: "12", anoValidade: "30", ccv: "123", nomeTitular: "CLIENTE TESTE" },
    ...extra,
  };
}

function req(corpo: unknown, auth = "Bearer equipe") {
  return new Request("http://local/clube-vender", { method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify(corpo) });
}

// Francine (dados fictícios, só o formato do caso real): 1ª assinatura 30/09 com CPF A.
const francineA: Cliente = { id: "cus_A", name: "Francine Frare", cpfCnpj: "11144477735", email: "francine@exemplo.com", mobilePhone: FRANCINE_CEL };
const subA: Assinatura = { id: "sub_A", customer: "cus_A", status: "ACTIVE", value: 197, description: "Clube da Escova — 4 escovas/mês (curto/médio)", deleted: false, dateCreated: "2026-09-30" };
const linhaA: LinhaAssinante = { id: "a1", nome: "Francine Frare", plano: "4x_curto_medio", status: "ativo", cpf: "111.444.777-35", email: "Francine@Exemplo.com", celular: "+55 (11) 90000-8495", created_at: "2026-09-30T14:29:57Z", cancelada_em: null, asaas_subscription_id: "sub_A" };

Deno.test("telefone novo: cria cliente e assinatura", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const r = await c.handler(req(venda()));
  assertEquals(r.status, 200);
  assertEquals((await r.json()).ok, true);
  assertEquals(c.posts().map((p) => p.caminho), ["/customers", "/subscriptions"]);
});

// A validação da tela aceita 10 ou 11 dígitos (com ou sem máscara, com ou sem o nono dígito).
// O lado gravado (sistema) está com +55 e máscara: "+55 (11) 90000-8495".
for (const formato of ["(11) 90000-8495", "11 90000 8495", "11900008495", "1100008495", "(11) 0000-8495"]) {
  Deno.test(`mesmo WhatsApp em outro formato (${formato}) com CPF e e-mail diferentes: avisa e não faz POST`, async () => {
    const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
    const r = await c.handler(req(venda({ cpf: "52998224725", email: "outro@exemplo.com", celular: formato })));
    assertEquals(r.status, 409);
    const b = await r.json();
    assertEquals(b.ja_tem_assinatura, true);
    assert(typeof b.confirmacao === "string" && b.confirmacao.length === 64);
    assertEquals(b.encontradas.length, 1, "Asaas e sistema apontam a mesma assinatura: um item só");
    assertEquals(b.encontradas[0].nome, "Francine Frare");
    assertEquals(b.encontradas[0].plano, "4 escovas por mês, cabelo curto ou médio");
    assertEquals(b.encontradas[0].desde, "30/09/2026");
    assertEquals(b.encontradas[0].bateu, ["WhatsApp"]);
    assertEquals(c.posts().length, 0);
  });
}

Deno.test("caso Francine: CPF e cartão diferentes, mesmo celular e e-mail: avisa por e-mail e WhatsApp", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const r = await c.handler(req(venda({ cpf: "52998224725", email: "francine@exemplo.com", celular: "11900008495", nome: "Francine C frare" })));
  assertEquals(r.status, 409);
  const b = await r.json();
  assertEquals(b.encontradas[0].bateu, ["e-mail", "WhatsApp"]);
  assertEquals(c.posts().length, 0);
});

Deno.test("confirmação válida: cria a segunda", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const dados = venda({ celular: FRANCINE_CEL });
  const aviso = await (await c.handler(req(dados))).json();
  const r = await c.handler(req({ ...dados, confirmar_segundo_pacote: aviso.confirmacao }));
  assertEquals(r.status, 200);
  assertEquals(c.posts().filter((p) => p.caminho === "/subscriptions").length, 1);
});

Deno.test("confirmação forjada, vazia ou de outra lista: não cria", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const dados = venda({ celular: FRANCINE_CEL });
  const real = (await (await c.handler(req(dados))).json()).confirmacao as string;
  const forjadas = ["", "abc", "0".repeat(64), real.slice(0, 63) + (real.endsWith("0") ? "1" : "0"), real.toUpperCase() === real ? "x" : real.toUpperCase()];
  for (const f of forjadas) {
    const r = await c.handler(req({ ...dados, confirmar_segundo_pacote: f }));
    assertEquals(r.status, 409, `token forjado aceito: ${f.slice(0, 6)}`);
  }
  // token de outra chave HMAC
  const outra = criarHandler({ ...c.deps, chaveAsaas: () => "outra-chave" });
  const tOutra = (await (await outra(req(dados))).json()).confirmacao;
  assertEquals((await c.handler(req({ ...dados, confirmar_segundo_pacote: tOutra }))).status, 409);
  assertEquals(c.posts().length, 0);
});

Deno.test("token velho não vale depois que surgiu outra assinatura", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const dados = venda({ celular: FRANCINE_CEL });
  const velho = (await (await c.handler(req(dados))).json()).confirmacao;
  c.assinaturas.push({ ...subA, id: "sub_A2", dateCreated: "2026-10-05" });
  const r = await c.handler(req({ ...dados, confirmar_segundo_pacote: velho }));
  assertEquals(r.status, 409);
  assertEquals((await r.json()).encontradas.length, 2);
  assertEquals(c.posts().length, 0);
});

Deno.test("mesmo CPF sem assinatura ativa: reaproveita o customer como hoje", async () => {
  const antigo: Cliente = { id: "cus_velho", name: "Cliente Teste", cpfCnpj: "52998224725", email: "antigo@exemplo.com", mobilePhone: "11977776666" };
  const c = cenario({ clientes: [antigo], assinaturas: [{ ...subA, id: "sub_x", customer: "cus_velho", status: "INACTIVE" }] });
  const r = await c.handler(req(venda()));
  assertEquals(r.status, 200);
  assertEquals(c.posts().map((p) => p.caminho), ["/subscriptions"]);
  assertEquals((c.posts()[0].corpo as { customer: string }).customer, "cus_velho");
});

Deno.test("cancelada não avisa (INACTIVE/removida no Asaas, cancelada_em ou status cancelado no sistema)", async () => {
  const c = cenario({
    clientes: [francineA],
    assinaturas: [{ ...subA, status: "INACTIVE" }, { ...subA, id: "sub_del", deleted: true }],
    banco: [{ ...linhaA, cancelada_em: "2026-10-05T12:00:00Z" }, { ...linhaA, id: "a2", status: "cancelado", asaas_subscription_id: null }],
  });
  const r = await c.handler(req(venda({ celular: FRANCINE_CEL })));
  assertEquals(r.status, 200);
});

Deno.test("cancelada_em preenchido com status ainda 'ativo' não avisa, mesmo se a lista do banco trouxer a linha", async () => {
  const c = cenario({ clientes: [], banco: [] });
  const r = await procurarExistentes({ ...c.deps, assinantesAtivos: async () => [{ ...linhaA, cancelada_em: "2026-10-05T12:00:00Z" }] }, { cpf: "11144477735", email: "x@y.com", celular: FRANCINE_CEL }, "escova");
  assertEquals(r.encontradas.length, 0);
});

Deno.test("unha e esmaltação ativas não barram venda de escova", async () => {
  const c = cenario({
    clientes: [francineA],
    assinaturas: [
      { ...subA, id: "sub_unha", value: 237, description: "ASSINATURA DE UNHA MENSAL - NÃO ACUMULATIVO " },
      { ...subA, id: "sub_esm", value: 148, description: "ASSINATURA DE ESMALTAÇÃO MENSAL - 4 esmaltações/mês" },
    ],
    banco: [{ ...linhaA, plano: "unha_4m2p", status: "inadimplente", asaas_subscription_id: "sub_unha" }, { ...linhaA, id: "a3", plano: "esmaltacao_4x", asaas_subscription_id: "sub_esm" }],
  });
  const r = await c.handler(req(venda({ celular: FRANCINE_CEL })));
  assertEquals(r.status, 200);
});

Deno.test("regra por produto: segunda unha avisa, unha para quem tem escova não avisa, segunda esmaltação avisa", async () => {
  const subUnha = { ...subA, id: "sub_unha", value: 237, description: "ASSINATURA DE UNHA MENSAL" };
  const subEsm = { ...subA, id: "sub_esm", value: 148, description: "ASSINATURA DE ESMALTAÇÃO MENSAL" };
  const pessoa = { cpf: "52998224725", email: "outra@exemplo.com", celular: FRANCINE_CEL };

  const soEscova = cenario({ clientes: [francineA], assinaturas: [subA] });
  assertEquals((await procurarExistentes(soEscova.deps, pessoa, "unha")).encontradas.length, 0);
  assertEquals((await procurarExistentes(soEscova.deps, pessoa, "escova")).encontradas.length, 1);

  const comUnha = cenario({ clientes: [francineA], assinaturas: [subUnha, subEsm] });
  const u = await procurarExistentes(comUnha.deps, pessoa, "unha");
  assertEquals(u.encontradas.map((e) => e.plano), ["Pacote de unha"]);
  const es = await procurarExistentes(comUnha.deps, pessoa, "esmaltacao");
  assertEquals(es.encontradas.map((e) => e.plano), ["Pacote de esmaltação"]);
  assertEquals((await procurarExistentes(comUnha.deps, pessoa, "escova")).encontradas.length, 0);
});

Deno.test("acusada só pelo banco (cadastro manual sem assinatura no Asaas): avisa", async () => {
  const gisele: LinhaAssinante = { id: "g1", nome: "Gisele Teste", plano: "4x_curto_medio", status: "ativo", cpf: null, email: "gisele@exemplo.com", celular: "11955551612", created_at: "2026-08-22T15:00:00Z", cancelada_em: null, asaas_subscription_id: null };
  const c = cenario({ banco: [gisele] });
  const r = await c.handler(req(venda({ celular: "(11) 95555-1612" })));
  assertEquals(r.status, 409);
  const b = await r.json();
  assertEquals(b.encontradas, [{ nome: "Gisele Teste", plano: "4 escovas por mês, cabelo curto ou médio", desde: "22/08/2026", bateu: ["WhatsApp"], atrasada: false }]);
  assertEquals(c.posts().length, 0);
  // e a confirmação dela libera
  const ok = await c.handler(req(venda({ celular: "(11) 95555-1612", confirmar_segundo_pacote: b.confirmacao })));
  assertEquals(ok.status, 200);
});

Deno.test("acusada só pelo Asaas (webhook ainda não gravou no sistema): avisa", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [] });
  const r = await c.handler(req(venda({ email: "francine@exemplo.com" })));
  assertEquals(r.status, 409);
  assertEquals((await r.json()).encontradas[0].bateu, ["e-mail"]);
});

Deno.test("inadimplente no sistema conta e vem marcada como atrasada", async () => {
  const c = cenario({ banco: [{ ...linhaA, status: "inadimplente", asaas_subscription_id: null }] });
  const b = await (await c.handler(req(venda({ cpf: "111.444.777-35" })))).json();
  assertEquals(b.encontradas[0].atrasada, true);
  assertEquals(b.encontradas[0].bateu, ["CPF"]);
});

Deno.test("duplo envio simultâneo: cria uma só", async () => {
  const c = cenario({});
  const rs = await Promise.all([1, 2, 3].map(() => c.handler(req(venda()))));
  const st = rs.map((r) => r.status).sort();
  assertEquals(st, [200, 409, 409]);
  assertEquals(c.posts().filter((p) => p.caminho === "/subscriptions").length, 1);
  // e um reenvio depois (fora da trava, outra instância) já enxerga a assinatura nova e avisa
  const outraInstancia = criarHandler(c.deps);
  const depois = await outraInstancia(req(venda()));
  assertEquals(depois.status, 409);
  assertEquals((await depois.json()).ja_tem_assinatura, true);
  assertEquals(c.posts().filter((p) => p.caminho === "/subscriptions").length, 1);
});

Deno.test("duplo clique no 'Sim, vender mais um pacote': cria uma só", async () => {
  const c = cenario({ clientes: [francineA], assinaturas: [subA], banco: [linhaA] });
  const dados = venda({ celular: FRANCINE_CEL });
  const token = (await (await c.handler(req(dados))).json()).confirmacao;
  const rs = await Promise.all([1, 2].map(() => c.handler(req({ ...dados, confirmar_segundo_pacote: token }))));
  assertEquals(rs.map((r) => r.status).sort(), [200, 409]);
  assertEquals(c.posts().filter((p) => p.caminho === "/subscriptions").length, 1);
});

Deno.test("Asaas fora: não vende, zero POST, 503 com explicação", async () => {
  const c = cenario({ asaasFora: true });
  const r = await c.handler(req(venda()));
  assertEquals(r.status, 503);
  assert(String((await r.json()).erro).includes("Nada foi cobrado"));
  assertEquals(c.posts().length, 0);
});

Deno.test("banco fora: não vende, zero POST", async () => {
  const c = cenario({ bancoFora: true });
  const r = await c.handler(req(venda()));
  assertEquals(r.status, 503);
  assertEquals(c.posts().length, 0);
});

Deno.test("Asaas responde 200 sem lista (formato estranho): falha fechada", async () => {
  const c = cenario({});
  const deps: Deps = { ...c.deps, asaas: async (m, p, b) => (m === "GET" ? { ok: true, status: 200, dados: { erro: "?" } } : c.deps.asaas(m, p, b)) };
  const r = await criarHandler(deps)(req(venda()));
  assertEquals(r.status, 503);
  assertEquals(c.posts().length, 0);
});

Deno.test("sem login da equipe: 401 antes de qualquer consulta", async () => {
  const c = cenario({});
  const r = await c.handler(req(venda(), "Bearer anon"));
  assertEquals(r.status, 401);
  assertEquals(c.chamadas.length, 0);
});

Deno.test("normalizarTelefone: formatos do mesmo celular dão os mesmos 8 finais", () => {
  const f = ["11900008495", "(11) 90000-8495", "+55 11 90000-8495", "5511900008495", "1100008495"].map((x) => normalizarTelefone(x)?.oito);
  assertEquals(new Set(f).size, 1);
  assertEquals(normalizarTelefone("123"), null);
});
