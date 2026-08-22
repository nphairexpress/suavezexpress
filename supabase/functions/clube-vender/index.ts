// Venda PRESENCIAL do Clube da Escova pela recepção (tela da Fila).
//
// Por que existe: passar o cartão na maquininha NÃO cria recorrência — a
// assinatura tem que nascer no Asaas (cartão tokenizado lá cobra todo mês).
// Este endpoint é o mesmo fluxo do checkout do site (npexpress /api/assinar),
// portado pro Sua Vez: cria/acha o customer pelo CPF e cria a subscription
// mensal com cartão. A ativação do assinante (clube_assinantes + créditos +
// e-mail de boas-vindas) segue 100% com a edge `asaas-webhook`, que casa o
// pagamento confirmado pelos valores 197/247/347/447.
//
// Auth: verify_jwt LIGADO (deploy SEM --no-verify-jwt) — só usuário logado do
// sistema chama. Nunca logar dados de cartão.

const ASAAS_BASE = "https://api.asaas.com/v3";

const PLANOS: Record<string, { valor: number; descricao: string }> = {
  "4cm": { valor: 197.0, descricao: "Clube da Escova — 4 escovas/mês (curto/médio)" },
  "4long": { valor: 247.0, descricao: "Clube da Escova — 4 escovas/mês (longo)" },
  "8cm": { valor: 347.0, descricao: "Clube da Escova — 8 escovas/mês (curto/médio)" },
  "8long": { valor: 447.0, descricao: "Clube da Escova — 8 escovas/mês (longo)" },
};

// Cobrança presencial: endereço do salão no titular (Asaas exige CEP+número).
const CEP_SALAO = "13320040"; // R. 7 de Setembro, 374 — Centro, Salto/SP
const NUMERO_SALAO = "374";

const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

function hojeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

const ERROS_ASAAS: Record<string, string> = {
  invalid_creditCard: "Cartão recusado. Confira número, validade e CVV — ou tente outro cartão.",
  invalid_cpfCnpj: "CPF inválido — confira os números.",
  invalid_value: "Valor do plano inválido.",
  invalid_customer: "Não foi possível validar os dados da cliente. Confira nome, CPF e e-mail.",
};

// deno-lint-ignore no-explicit-any
function mensagemErroAsaas(corpo: any): string {
  const erros = corpo && Array.isArray(corpo.errors) ? corpo.errors : [];
  for (const e of erros) if (e?.code && ERROS_ASAAS[e.code]) return ERROS_ASAAS[e.code];
  if (erros[0]?.description) return String(erros[0].description);
  return "Não foi possível concluir a assinatura. Tente de novo.";
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

// deno-lint-ignore no-explicit-any
async function asaas(metodo: string, caminho: string, corpo?: any) {
  const res = await fetch(ASAAS_BASE + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      access_token: Deno.env.get("ASAAS_KEY") ?? "",
      "User-Agent": "suavez-clube-vender",
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  let dados = null;
  try { dados = await res.json(); } catch (_) { dados = null; }
  return { ok: res.ok, dados };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!Deno.env.get("ASAAS_KEY")) return json({ ok: false, erro: "Pagamento indisponível (chave ausente)." }, 500);

  // verify_jwt aceita também a anon key — aqui exigimos USUÁRIO logado
  // (role "authenticated" no JWT) E com papel na equipe (linha em user_roles),
  // senão o endpoint viraria alvo de teste de cartão roubado por qualquer um
  // com a anon key do bundle ou uma conta avulsa do projeto.
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "authenticated" || !payload.sub) {
      return json({ ok: false, erro: "Não autorizado." }, 401);
    }
    const check = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/rest/v1/user_roles?user_id=eq.${payload.sub}&select=role&limit=1`,
      {
        headers: {
          apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        },
      },
    );
    const papeis = check.ok ? await check.json() : [];
    if (!Array.isArray(papeis) || papeis.length === 0) {
      return json({ ok: false, erro: "Não autorizado." }, 401);
    }
  } catch (_) {
    return json({ ok: false, erro: "Não autorizado." }, 401);
  }

  let e: Record<string, unknown>;
  try { e = await req.json(); } catch (_) { return json({ ok: false, erro: "Requisição inválida." }, 400); }

  const plano = PLANOS[String(e.plano ?? "")];
  if (!plano) return json({ ok: false, erro: "Plano inválido." }, 400);

  const nome = String(e.nome ?? "").trim();
  if (nome.length < 5 || !nome.includes(" ")) return json({ ok: false, erro: "Informe o nome completo da cliente." }, 400);
  const cpf = soDigitos(e.cpf);
  if (cpf.length !== 11) return json({ ok: false, erro: "CPF inválido — confira os 11 dígitos." }, 400);
  const email = String(e.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, erro: "E-mail inválido." }, 400);
  const celular = soDigitos(e.celular);
  if (celular.length < 10 || celular.length > 11) return json({ ok: false, erro: "Celular inválido — use o número com DDD." }, 400);

  const cartao = (e.cartao ?? {}) as Record<string, unknown>;
  const numeroCartao = soDigitos(cartao.numero);
  if (numeroCartao.length < 13 || numeroCartao.length > 19) return json({ ok: false, erro: "Número do cartão inválido." }, 400);
  const nomeTitular = String(cartao.nomeTitular ?? "").trim();
  if (nomeTitular.length < 2) return json({ ok: false, erro: "Informe o nome impresso no cartão." }, 400);
  const mesNum = parseInt(soDigitos(cartao.mesValidade), 10);
  if (!mesNum || mesNum < 1 || mesNum > 12) return json({ ok: false, erro: "Mês de validade inválido." }, 400);
  let anoValidade = soDigitos(cartao.anoValidade);
  if (anoValidade.length === 2) anoValidade = "20" + anoValidade;
  if (anoValidade.length !== 4) return json({ ok: false, erro: "Ano de validade inválido." }, 400);
  const ccv = soDigitos(cartao.ccv);
  if (ccv.length < 3 || ccv.length > 4) return json({ ok: false, erro: "CVV inválido." }, 400);

  try {
    // (a) cliente existente pelo CPF, senão cria
    let customerId: string | null = null;
    const busca = await asaas("GET", "/customers?cpfCnpj=" + encodeURIComponent(cpf));
    if (busca.ok && Array.isArray(busca.dados?.data) && busca.dados.data.length > 0) {
      customerId = busca.dados.data[0].id;
    }
    if (!customerId) {
      const criacao = await asaas("POST", "/customers", {
        name: nome, cpfCnpj: cpf, email, mobilePhone: celular,
      });
      if (!criacao.ok || !criacao.dados?.id) return json({ ok: false, erro: mensagemErroAsaas(criacao.dados) }, 422);
      customerId = criacao.dados.id;
    }

    // (b) assinatura mensal com cartão — 1ª cobrança hoje
    const assinatura = await asaas("POST", "/subscriptions", {
      customer: customerId,
      billingType: "CREDIT_CARD",
      value: plano.valor,
      nextDueDate: hojeSaoPaulo(),
      cycle: "MONTHLY",
      description: plano.descricao,
      creditCard: {
        holderName: nomeTitular,
        number: numeroCartao,
        expiryMonth: String(mesNum).padStart(2, "0"),
        expiryYear: anoValidade,
        ccv,
      },
      creditCardHolderInfo: {
        name: nome, email, cpfCnpj: cpf,
        postalCode: CEP_SALAO, addressNumber: NUMERO_SALAO, mobilePhone: celular,
      },
      remoteIp: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
    });
    if (!assinatura.ok || !assinatura.dados?.id) return json({ ok: false, erro: mensagemErroAsaas(assinatura.dados) }, 422);

    return json({ ok: true, id: assinatura.dados.id, valor: plano.valor });
  } catch (_) {
    // nunca logar payloads (contêm dados de cartão)
    return json({ ok: false, erro: "Falha de comunicação com o meio de pagamento. Tente de novo." }, 502);
  }
});
