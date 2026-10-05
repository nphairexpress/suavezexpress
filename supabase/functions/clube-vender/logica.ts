// Regras da edge clube-vender (venda presencial do Clube da Escova pela recepção).
// Sem import remoto: Asaas, banco e autenticação entram por `Deps`, para os testes trocarem por falsos.
//
// Trava contra assinatura duplicada (05/10/2026, mesma regra do checkout do site, npexpress 61338e2).
// Caso que motivou: a mesma cliente assinou em 30/09 e 01/10 com CPF e cartão diferentes, mesmo
// celular e mesmo e-mail, e ficou com duas cobranças mensais.
//
// Antes de qualquer POST no Asaas, procura assinatura ATIVA do mesmo produto da mesma pessoa por
// CPF, e-mail e WhatsApp (8 últimos dígitos) em DUAS fontes, e avisa se QUALQUER uma acusar:
//   - Asaas: é quem cobra. Pega a assinatura recém-criada que o webhook ainda não gravou no sistema.
//   - clube_assinantes (status ativo/inadimplente, sem cancelada_em): pega cadastro manual que não
//     tem assinatura no Asaas (asaas_customer_id "manual_…") e cliente cujo dado no Asaas diverge.
// Regra por produto: esta tela só vende escova, então só escova ativa vira aviso. Pacote de unha
// (R$ 237) e de esmaltação (R$ 148) não contam como escova.
// Achou: não cria nada e devolve o aviso com os dados (quem chama é a equipe logada) e um token
// HMAC das assinaturas encontradas. Só cria se o reenvio trouxer esse token. Nova assinatura que
// surgir no meio do caminho muda o token, e o reenvio volta a avisar.
// Falha em qualquer consulta = não vende (falha fechada). Nunca logar dados de cartão.

export const ASAAS_BASE = "https://api.asaas.com/v3";

export type Produto = "escova" | "unha" | "esmaltacao";

export const PLANOS: Record<string, { valor: number; descricao: string; produto: Produto }> = {
  "4cm": { valor: 197.0, descricao: "Clube da Escova — 4 escovas/mês (curto/médio)", produto: "escova" },
  "4long": { valor: 247.0, descricao: "Clube da Escova — 4 escovas/mês (longo)", produto: "escova" },
  "8cm": { valor: 347.0, descricao: "Clube da Escova — 8 escovas/mês (curto/médio)", produto: "escova" },
  "8long": { valor: 447.0, descricao: "Clube da Escova — 8 escovas/mês (longo)", produto: "escova" },
};

// Cobrança presencial: endereço do salão no titular (Asaas exige CEP+número).
export const CEP_SALAO = "13320040"; // R. 7 de Setembro, 374 — Centro, Salto/SP
export const NUMERO_SALAO = "374";

// Valor da assinatura no Asaas -> produto e texto de recepção.
const POR_VALOR: Record<number, { produto: Produto; texto: string }> = {
  197: { produto: "escova", texto: "4 escovas por mês, cabelo curto ou médio" },
  247: { produto: "escova", texto: "4 escovas por mês, cabelo longo" },
  347: { produto: "escova", texto: "8 escovas por mês, cabelo curto ou médio" },
  447: { produto: "escova", texto: "8 escovas por mês, cabelo longo" },
  237: { produto: "unha", texto: "Pacote de unha" },
  148: { produto: "esmaltacao", texto: "Pacote de esmaltação" },
};

// Plano gravado em clube_assinantes -> produto e texto de recepção.
const POR_PLANO_BANCO: Record<string, { produto: Produto; texto: string }> = {
  "4x_curto_medio": POR_VALOR[197],
  "4x_longo": POR_VALOR[247],
  "8x_curto_medio": POR_VALOR[347],
  "8x_longo": POR_VALOR[447],
  "unha_4m2p": POR_VALOR[237],
  "esmaltacao_4x": POR_VALOR[148],
};

const MAX_CLIENTES_CONFERIDOS = 10;
const TRAVA_MS = 2 * 60 * 1000;

export const soDigitos = (v: unknown) => String(v ?? "").replace(/\D/g, "");

export function hojeSaoPaulo(agora?: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(agora ?? new Date());
}

/** "2026-09-30" ou timestamp -> "30/09/2026" (dia em São Paulo). */
export function dataBR(valor: unknown): string | null {
  const s = String(valor ?? "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.split("-").reverse().join("/");
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return hojeSaoPaulo(d).split("-").reverse().join("/");
}

/** Telefone BR -> { oito, onze, dez } ou null. Aceita máscara, +55/55 e com/sem nono dígito. */
export function normalizarTelefone(valor: unknown): { oito: string; onze: string | null; dez: string | null } | null {
  let d = soDigitos(valor);
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length !== 10 && d.length !== 11) return null;
  const ddd = d.slice(0, 2);
  const numero = d.slice(2);
  let onze: string | null = null;
  let dez: string | null = null;
  if (numero.length === 9) {
    onze = d;
    dez = ddd + numero.slice(1);
  } else if (/^[6-9]/.test(numero)) {
    onze = ddd + "9" + numero; // celular antigo sem o nono dígito
    dez = d;
  } else {
    dez = d; // fixo
  }
  return { oito: d.slice(-8), onze, dez };
}

// deno-lint-ignore no-explicit-any
export function produtoDaAssinaturaAsaas(s: any): { produto: Produto; texto: string } | null {
  const v = POR_VALOR[Number(s?.value)];
  if (v) return v;
  const desc = String(s?.description ?? "");
  if (desc.indexOf("Clube da Escova") === 0) return { produto: "escova", texto: "Clube da Escova" };
  return null;
}

export function produtoDoPlanoBanco(plano: unknown): { produto: Produto; texto: string } | null {
  return POR_PLANO_BANCO[String(plano ?? "")] ?? null;
}

const ERROS_ASAAS: Record<string, string> = {
  invalid_creditCard: "Cartão recusado. Confira número, validade e CVV — ou tente outro cartão.",
  invalid_cpfCnpj: "CPF inválido — confira os números.",
  invalid_value: "Valor do plano inválido.",
  invalid_customer: "Não foi possível validar os dados da cliente. Confira nome, CPF e e-mail.",
};

// deno-lint-ignore no-explicit-any
export function mensagemErroAsaas(corpo: any): string {
  const erros = corpo && Array.isArray(corpo.errors) ? corpo.errors : [];
  for (const e of erros) if (e?.code && ERROS_ASAAS[e.code]) return ERROS_ASAAS[e.code];
  if (erros[0]?.description) return String(erros[0].description);
  return "Não foi possível concluir a assinatura. Tente de novo.";
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

// ---------------------------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
export type RespostaAsaas = { ok: boolean; status: number; dados: any };

export interface LinhaAssinante {
  id: string;
  nome: string | null;
  plano: string | null;
  status: string | null;
  cpf: string | null;
  email: string | null;
  celular: string | null;
  created_at: string | null;
  cancelada_em: string | null;
  asaas_subscription_id: string | null;
}

export interface Deps {
  /** Usuário logado da equipe (role authenticated + linha em user_roles). */
  autorizar(req: Request): Promise<boolean>;
  /** Chave do Asaas ("" se ausente). Também é a chave do HMAC do token de confirmação. */
  chaveAsaas(): string;
  asaas(metodo: string, caminho: string, corpo?: unknown): Promise<RespostaAsaas>;
  /** Linhas de clube_assinantes ativas/inadimplentes. Lança erro se a consulta falhar. */
  assinantesAtivos(): Promise<LinhaAssinante[]>;
  ipRemoto(req: Request): string;
  agora?(): number;
}

export interface Venda {
  plano: string;
  produto: Produto;
  valor: number;
  descricao: string;
  nome: string;
  cpf: string;
  email: string;
  celular: string;
  cartao: { holderName: string; number: string; expiryMonth: string; expiryYear: string; ccv: string };
}

export function validarEntrada(e: Record<string, unknown>): { ok: true; venda: Venda } | { ok: false; erro: string } {
  const plano = PLANOS[String(e.plano ?? "")];
  if (!plano) return { ok: false, erro: "Plano inválido." };
  const nome = String(e.nome ?? "").trim();
  if (nome.length < 5 || !nome.includes(" ")) return { ok: false, erro: "Informe o nome completo da cliente." };
  const cpf = soDigitos(e.cpf);
  if (cpf.length !== 11) return { ok: false, erro: "CPF inválido — confira os 11 dígitos." };
  const email = String(e.email ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
  const celular = soDigitos(e.celular);
  if (celular.length < 10 || celular.length > 11) return { ok: false, erro: "Celular inválido — use o número com DDD." };

  const cartao = (e.cartao ?? {}) as Record<string, unknown>;
  const numeroCartao = soDigitos(cartao.numero);
  if (numeroCartao.length < 13 || numeroCartao.length > 19) return { ok: false, erro: "Número do cartão inválido." };
  const nomeTitular = String(cartao.nomeTitular ?? "").trim();
  if (nomeTitular.length < 2) return { ok: false, erro: "Informe o nome impresso no cartão." };
  const mesNum = parseInt(soDigitos(cartao.mesValidade), 10);
  if (!mesNum || mesNum < 1 || mesNum > 12) return { ok: false, erro: "Mês de validade inválido." };
  let anoValidade = soDigitos(cartao.anoValidade);
  if (anoValidade.length === 2) anoValidade = "20" + anoValidade;
  if (anoValidade.length !== 4) return { ok: false, erro: "Ano de validade inválido." };
  const ccv = soDigitos(cartao.ccv);
  if (ccv.length < 3 || ccv.length > 4) return { ok: false, erro: "CVV inválido." };

  return {
    ok: true,
    venda: {
      plano: String(e.plano), produto: plano.produto, valor: plano.valor, descricao: plano.descricao,
      nome, cpf, email, celular,
      cartao: { holderName: nomeTitular, number: numeroCartao, expiryMonth: String(mesNum).padStart(2, "0"), expiryYear: anoValidade, ccv },
    },
  };
}

// ---------------------------------------------------------------------------------------------

export class ErroConsulta extends Error {}

export type DadoQueBateu = "CPF" | "e-mail" | "WhatsApp";

/** O que a recepção vê no aviso. */
export interface Encontrada {
  nome: string;
  plano: string;
  desde: string | null;
  bateu: DadoQueBateu[];
  atrasada: boolean;
}

const ORDEM_BATEU: DadoQueBateu[] = ["CPF", "e-mail", "WhatsApp"];

function quaisBatem(
  alvo: { cpf: string; email: string; oito: string | null },
  outro: { cpf: unknown; email: unknown; telefones: unknown[] },
): DadoQueBateu[] {
  const r: DadoQueBateu[] = [];
  if (soDigitos(outro.cpf).length === 11 && soDigitos(outro.cpf) === alvo.cpf) r.push("CPF");
  const em = String(outro.email ?? "").trim().toLowerCase();
  if (em && em === alvo.email) r.push("e-mail");
  if (alvo.oito && outro.telefones.some((t) => soDigitos(t).length >= 8 && soDigitos(t).slice(-8) === alvo.oito)) r.push("WhatsApp");
  return r;
}

async function listaAsaas(deps: Deps, caminho: string): Promise<Record<string, unknown>[]> {
  const r = await deps.asaas("GET", caminho);
  if (!r.ok || !r.dados || !Array.isArray(r.dados.data)) throw new ErroConsulta("consulta " + r.status);
  return r.dados.data;
}

/**
 * Procura assinatura ativa do produto `produto` da mesma pessoa no Asaas e no sistema. Só faz GET/SELECT.
 * Retorna as encontradas (já sem repetição), os ids que entram no token e o customer do CPF (reaproveitado).
 * Lança ErroConsulta se qualquer fonte não responder direito (quem chama barra a venda).
 */
export async function procurarExistentes(deps: Deps, venda: Pick<Venda, "cpf" | "email" | "celular">, produto: Produto) {
  const tel = normalizarTelefone(venda.celular);
  const alvo = { cpf: venda.cpf, email: venda.email.trim().toLowerCase(), oito: tel ? tel.oito : null };

  const consultas: Promise<Record<string, unknown>[]>[] = [
    listaAsaas(deps, "/customers?limit=10&cpfCnpj=" + encodeURIComponent(alvo.cpf)),
    listaAsaas(deps, "/customers?limit=20&email=" + encodeURIComponent(alvo.email)),
  ];
  for (const f of tel ? [tel.onze, tel.dez].filter(Boolean) as string[] : []) {
    consultas.push(listaAsaas(deps, "/customers?limit=20&mobilePhone=" + encodeURIComponent(f)));
  }
  let linhas: LinhaAssinante[];
  let resultados: Record<string, unknown>[][];
  try {
    [linhas, ...resultados] = await Promise.all([deps.assinantesAtivos(), ...consultas]) as [LinhaAssinante[], ...Record<string, unknown>[][]];
  } catch (e) {
    throw e instanceof ErroConsulta ? e : new ErroConsulta("consulta");
  }
  if (!Array.isArray(linhas)) throw new ErroConsulta("banco");
  const porCpf = resultados[0];

  // Conferência local: o filtro do Asaas é só o primeiro corte.
  const clientes = new Map<string, { bateu: DadoQueBateu[]; nome: string }>();
  for (const c of resultados.flat()) {
    const id = String(c?.id ?? "");
    if (!id || clientes.has(id)) continue;
    const bateu = quaisBatem(alvo, { cpf: c.cpfCnpj, email: c.email, telefones: [c.mobilePhone, c.phone] });
    if (bateu.length > 0) clientes.set(id, { bateu, nome: String(c.name ?? "") });
  }

  const ids = Array.from(clientes.keys()).slice(0, MAX_CLIENTES_CONFERIDOS);
  const listas = await Promise.all(
    ids.map((id) => listaAsaas(deps, "/subscriptions?status=ACTIVE&limit=50&customer=" + encodeURIComponent(id))),
  );

  const porSub = new Map<string, Encontrada>();
  const idsToken = new Set<string>();
  listas.forEach((lista, i) => {
    const cli = clientes.get(ids[i])!;
    for (const s of lista) {
      if (!s || s.status !== "ACTIVE" || s.deleted) continue;
      const p = produtoDaAssinaturaAsaas(s);
      if (!p || p.produto !== produto) continue;
      const sid = String(s.id);
      idsToken.add("asaas:" + sid);
      porSub.set(sid, { nome: cli.nome, plano: p.texto, desde: dataBR(s.dateCreated), bateu: cli.bateu, atrasada: false });
    }
  });

  const soNoBanco: Encontrada[] = [];
  for (const l of linhas) {
    if (!l || l.cancelada_em) continue;
    if (l.status !== "ativo" && l.status !== "inadimplente") continue;
    const p = produtoDoPlanoBanco(l.plano);
    if (!p || p.produto !== produto) continue;
    const bateu = quaisBatem(alvo, { cpf: l.cpf, email: l.email, telefones: [l.celular] });
    if (bateu.length === 0) continue;
    idsToken.add("sistema:" + l.id);
    const daAsaas = l.asaas_subscription_id ? porSub.get(l.asaas_subscription_id) : undefined;
    const item: Encontrada = {
      nome: String(l.nome ?? "").trim() || daAsaas?.nome || "",
      plano: p.texto,
      desde: daAsaas?.desde ?? dataBR(l.created_at),
      bateu: ORDEM_BATEU.filter((b) => bateu.includes(b) || daAsaas?.bateu.includes(b)),
      atrasada: l.status === "inadimplente",
    };
    if (daAsaas) porSub.set(l.asaas_subscription_id!, item);
    else soNoBanco.push(item);
  }

  const encontradas = [...porSub.values(), ...soNoBanco];
  return {
    encontradas,
    ids: Array.from(idsToken).sort(),
    customerIdPorCpf: porCpf.length > 0 ? String(porCpf[0].id) : null,
  };
}

export async function tokenConfirmacao(chave: string, produto: Produto, ids: string[]): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(chave), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode("clube-vender|segundo-pacote|" + produto + "|" + ids.join(",")));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// ---------------------------------------------------------------------------------------------

export function criarHandler(deps: Deps) {
  // Duplo envio (duplo clique, reenvio): trava por pessoa+plano+cartão enquanto a criação está em
  // andamento e por 2 minutos depois de criada. Vale dentro da instância; entre instâncias, a
  // assinatura recém-criada já aparece na consulta e muda o token.
  const travas = new Map<string, { emAndamento: boolean; em: number }>();
  const agora = () => (deps.agora ? deps.agora() : Date.now());

  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    const chave = deps.chaveAsaas();
    if (!chave) return json({ ok: false, erro: "Pagamento indisponível (chave ausente)." }, 500);

    let autorizado = false;
    try { autorizado = await deps.autorizar(req); } catch (_) { autorizado = false; }
    if (!autorizado) return json({ ok: false, erro: "Não autorizado." }, 401);

    let e: Record<string, unknown>;
    try { e = await req.json(); } catch (_) { return json({ ok: false, erro: "Requisição inválida." }, 400); }
    if (!e || typeof e !== "object") return json({ ok: false, erro: "Requisição inválida." }, 400);

    const v = validarEntrada(e);
    if (!v.ok) return json({ ok: false, erro: v.erro }, 400);
    const venda = v.venda;

    const tel = normalizarTelefone(venda.celular);
    const trava = [venda.cpf, tel ? tel.oito : venda.celular, venda.plano, venda.cartao.number.slice(-4)].join("|");
    const t = travas.get(trava);
    if (t && (t.emAndamento || agora() - t.em < TRAVA_MS)) {
      return json({ ok: false, em_andamento: true, erro: "Esta venda já foi enviada e está sendo processada. Aguarde um instante antes de tentar de novo." }, 409);
    }
    travas.set(trava, { emAndamento: true, em: agora() });
    let criou = false;

    try {
      // (0) já existe assinatura ativa do mesmo produto dessa pessoa?
      let existente: Awaited<ReturnType<typeof procurarExistentes>>;
      try {
        existente = await procurarExistentes(deps, venda, venda.produto);
      } catch (_) {
        // Falha fechada: sem conseguir conferir, não cobra. Cobrança dupla vira estorno e cliente brava.
        return json({
          ok: false,
          erro: "Não deu para conferir se ela já é assinante. Nada foi cobrado. Tente de novo em instantes.",
        }, 503);
      }

      if (existente.ids.length > 0) {
        const token = await tokenConfirmacao(chave, venda.produto, existente.ids);
        const enviado = typeof e.confirmar_segundo_pacote === "string" ? e.confirmar_segundo_pacote : "";
        if (!iguais(enviado, token)) {
          return json({ ok: false, ja_tem_assinatura: true, confirmacao: token, encontradas: existente.encontradas }, 409);
        }
      }

      // (a) cliente existente pelo CPF (mesma regra de antes), senão cria
      let customerId = existente.customerIdPorCpf;
      if (!customerId) {
        const criacao = await deps.asaas("POST", "/customers", {
          name: venda.nome, cpfCnpj: venda.cpf, email: venda.email, mobilePhone: venda.celular,
        });
        if (!criacao.ok || !criacao.dados?.id) return json({ ok: false, erro: mensagemErroAsaas(criacao.dados) }, 422);
        customerId = String(criacao.dados.id);
      }

      // (b) assinatura mensal com cartão — 1ª cobrança hoje
      const assinatura = await deps.asaas("POST", "/subscriptions", {
        customer: customerId,
        billingType: "CREDIT_CARD",
        value: venda.valor,
        nextDueDate: hojeSaoPaulo(),
        cycle: "MONTHLY",
        description: venda.descricao,
        creditCard: venda.cartao,
        creditCardHolderInfo: {
          name: venda.nome, email: venda.email, cpfCnpj: venda.cpf,
          postalCode: CEP_SALAO, addressNumber: NUMERO_SALAO, mobilePhone: venda.celular,
        },
        remoteIp: deps.ipRemoto(req),
      });
      if (!assinatura.ok || !assinatura.dados?.id) return json({ ok: false, erro: mensagemErroAsaas(assinatura.dados) }, 422);

      criou = true;
      return json({ ok: true, id: assinatura.dados.id, valor: venda.valor });
    } catch (_) {
      // nunca logar payloads (contêm dados de cartão)
      return json({ ok: false, erro: "Falha de comunicação com o meio de pagamento. Tente de novo." }, 502);
    } finally {
      // Criou: segura 2 min. Não criou (recusa, aviso, erro): libera na hora.
      if (criou) travas.set(trava, { emAndamento: false, em: agora() });
      else travas.delete(trava);
    }
  };
}
