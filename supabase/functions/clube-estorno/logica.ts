// Regras da edge clube-estorno (Clube da Escova: listar cobranças, estornar, cancelar, trocar a senha).
// Sem import remoto: banco, Asaas e autenticação entram por `Deps`, para os testes trocarem por falsos.
//
// Ordem de cada ação que mexe em dinheiro (estornar/cancelar):
//   permissão → limite de tentativas → senha (hash, tempo constante) → cadastro e ciclo no sistema →
//   trava contra clique duplo → GET no Asaas (é desta cliente? está em situação que permite?) →
//   POST refund / DELETE subscription → RPC do motor → registro.
// Senha errada ou bloqueio = recusa ANTES de qualquer chamada ao Asaas.
// Nunca logar senha, motivo livre ou corpo inteiro do Asaas.
import { conferirSenha, gerarHashSenha, SENHA_MINIMO } from "./senha.ts";

export const PERMISSAO = "clube.estornar_cancelar";
export const MAX_ERRADAS = 5;
export const JANELA_MS = 15 * 60 * 1000;
export const MOTIVO_MINIMO = 10;
const EM_ANDAMENTO_EXPIRA_MS = 2 * 60 * 1000;

export type Staff =
  | { ok: true; userId: string; salonId: string; roles: string[] }
  | { ok: false; status: number; error: string };

export interface Assinante {
  id: string;
  nome: string | null;
  celular: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  status: string;
  cancelada_em: string | null;
}

export interface Ciclo {
  id: string;
  assinante_id: string;
  asaas_payment_id: string;
  inicio: string;
  fim: string;
  creditos_total: number;
  creditos_usados: number;
  bloqueado: boolean;
  estornado_em: string | null;
  origem: string;
}

export interface Registro {
  salon_id: string;
  user_id: string | null;
  origem: "botao";
  tipo: "estorno" | "cancelamento" | "troca_senha";
  resultado: string;
  assinante_id?: string | null;
  alvo?: string | null;
  valor?: number | null;
  motivo?: string | null;
  detalhe?: Record<string, unknown>;
}

export interface AsaasResposta {
  ok: boolean;
  status: number;
  // deno-lint-ignore no-explicit-any
  dados: any;
}

export interface Deps {
  autenticar(req: Request): Promise<Staff>;
  /** NPHAIR_EXPRESS_SALON_ID: o único salão deste projeto (null = não configurado → falha fechada) */
  salaoUnico(): string | null;
  pode(userId: string, chave: string): Promise<boolean>;
  /** tentativas de senha do usuário que contam no limite (senha_incorreta + tentativa_senha ainda em aberto),
   *  da mais nova para a mais velha */
  tentativasSenha(userId: string, limite: number): Promise<{ id: string; criado_em: string }[]>;
  hashSenha(salonId: string): Promise<string | null>;
  gravarHash(salonId: string, hash: string): Promise<void>;
  chaveAsaas(salonId: string): Promise<string | null>;
  assinante(id: string): Promise<Assinante | null>;
  outrosMesmoCelular(a: Assinante): Promise<{ id: string; nome: string | null; status: string }[]>;
  ciclosPorPagamento(ids: string[]): Promise<Ciclo[]>;
  /** true se já existe registro com este resultado para (tipo, alvo) */
  existeRegistro(tipo: string, alvo: string, resultado: string): Promise<boolean>;
  expirarEmAndamento(tipo: string, alvo: string, antesDe: string): Promise<void>;
  /** insere; devolve id, ou null se bateu na trava única (já em andamento/concluído) */
  registrar(r: Registro): Promise<string | null>;
  atualizarRegistro(id: string, patch: Partial<Registro>): Promise<void>;
  // deno-lint-ignore no-explicit-any
  rpc(nome: "clube_aplicar_estorno" | "clube_aplicar_cancelamento", args: Record<string, unknown>): Promise<{ data: any; error: { message: string } | null }>;
  asaas(chave: string, metodo: "GET" | "POST" | "DELETE", caminho: string, corpo?: unknown): Promise<AsaasResposta>;
  agora(): Date;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
const erro = (mensagem: string, s: number, extra: Record<string, unknown> = {}) => json({ ok: false, erro: mensagem, ...extra }, s);

const ID_PAY = /^pay_[A-Za-z0-9]{6,40}$/;
const ID_SUB = /^sub_[A-Za-z0-9]{6,40}$/;
const ID_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_PAGO = new Set(["CONFIRMED", "RECEIVED"]);
const STATUS_JA_ESTORNADO = new Set(["REFUNDED", "REFUND_REQUESTED", "REFUND_IN_PROGRESS"]);
const FORMAS_ESTORNAVEIS = new Set(["CREDIT_CARD", "PIX"]);

const STATUS_PAGAMENTO_PT: Record<string, string> = {
  PENDING: "aguardando pagamento",
  CONFIRMED: "paga",
  RECEIVED: "paga",
  RECEIVED_IN_CASH: "paga em dinheiro",
  OVERDUE: "vencida",
  REFUNDED: "estornada",
  REFUND_REQUESTED: "estorno pedido",
  REFUND_IN_PROGRESS: "estorno em andamento",
  CHARGEBACK_REQUESTED: "contestada no cartão",
  CHARGEBACK_DISPUTE: "contestação em disputa",
  AWAITING_CHARGEBACK_REVERSAL: "contestação em análise",
  DUNNING_REQUESTED: "em negativação",
  AWAITING_RISK_ANALYSIS: "em análise",
};
const FORMA_PT: Record<string, string> = {
  CREDIT_CARD: "cartão de crédito",
  PIX: "Pix",
  BOLETO: "boleto",
  DEBIT_CARD: "cartão de débito",
  UNDEFINED: "a definir",
};

/** Bloqueio por tentativas: 5 senhas erradas em até 15 min bloqueiam por 15 min a partir da 5ª. */
export function avaliarBloqueio(erradas: string[], agora: Date): { bloqueado: boolean; ate?: Date; restam: number } {
  const recentes = erradas.map((s) => new Date(s)).filter((d) => agora.getTime() - d.getTime() < JANELA_MS);
  if (erradas.length >= MAX_ERRADAS) {
    const quinta = new Date(erradas[0]);
    const primeira = new Date(erradas[MAX_ERRADAS - 1]);
    const ate = new Date(quinta.getTime() + JANELA_MS);
    if (quinta.getTime() - primeira.getTime() <= JANELA_MS && agora < ate) {
      return { bloqueado: true, ate, restam: 0 };
    }
  }
  return { bloqueado: false, restam: Math.max(0, MAX_ERRADAS - recentes.length) };
}

const horaSP = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(d);

/** Mensagem do Asaas em português legível (o Asaas já devolve description em pt-BR). */
// deno-lint-ignore no-explicit-any
export function mensagemAsaas(r: AsaasResposta, acao: string): string {
  if (r.status === 0) return `Não houve resposta do Asaas ao ${acao}. Confira a lista de cobranças antes de tentar de novo.`;
  if (r.status === 401 || r.status === 403) return `O Asaas recusou o pedido: a chave de acesso do salão não tem permissão para ${acao}.`;
  const erros = Array.isArray(r.dados?.errors) ? r.dados.errors : [];
  const desc = erros.map((e: { description?: string }) => e?.description).filter(Boolean).join(" ");
  if (desc) return `O Asaas recusou o pedido: ${String(desc).slice(0, 300)}`;
  return `O Asaas não conseguiu ${acao} (código ${r.status}). Tente de novo em alguns minutos.`;
}

// deno-lint-ignore no-explicit-any
function resumoPagamento(p: any) {
  return { status: String(p?.status ?? ""), deleted: !!p?.deleted, refunds: Array.isArray(p?.refunds) ? p.refunds.length : 0 };
}

export function criarHandler(deps: Deps) {
  return async function handler(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return erro("Método não permitido.", 405);

    const staff = await deps.autenticar(req);
    if (!staff.ok) return erro(staff.error, staff.status);
    // operação humana: precisa de usuário real (quem fez fica no registro)
    if (staff.userId === "service_role") return erro("Esta ação exige um usuário do sistema.", 403);
    const { userId, salonId } = staff;
    // clube_assinantes / clube_creditos não têm salon_id (projeto de salão único): as consultas por id não
    // filtram por salão. A amarração é esta: sem NPHAIR_EXPRESS_SALON_ID ou usuário de outro salão = recusa.
    const salao = deps.salaoUnico();
    if (!salao) return erro("Configuração do salão ausente no servidor (NPHAIR_EXPRESS_SALON_ID).", 503);
    if (salonId !== salao) return erro("Usuário fora do salão.", 403);

    // deno-lint-ignore no-explicit-any
    let body: any;
    try {
      body = await req.json();
    } catch {
      return erro("Requisição inválida.", 400);
    }
    const acao = String(body?.acao ?? "");

    // ── trocar_senha: só administrador ──────────────────────────────────────
    if (acao === "trocar_senha") {
      if (!staff.roles.includes("admin")) return erro("Só o administrador pode trocar a senha de autorização.", 403);
      const atual = typeof body.senha_atual === "string" ? body.senha_atual : "";
      const nova = typeof body.senha_nova === "string" ? body.senha_nova : "";
      if (nova.length < SENHA_MINIMO) return erro(`A senha nova precisa ter pelo menos ${SENHA_MINIMO} caracteres.`, 400);
      if (nova.length > 128) return erro("A senha nova é longa demais.", 400);
      const porta = await portaDaSenha(deps, staff, atual, { tipo: "troca_senha" });
      if (porta) return porta;
      if (nova === atual) return erro("A senha nova precisa ser diferente da atual.", 400);
      await deps.gravarHash(salonId, await gerarHashSenha(nova));
      await deps.registrar({ salon_id: salonId, user_id: userId, origem: "botao", tipo: "troca_senha", resultado: "sucesso" });
      return json({ ok: true });
    }

    if (!["listar", "estornar", "cancelar"].includes(acao)) return erro("Ação desconhecida.", 400);

    // ── permissão (servidor decide; o front só esconde o botão) ────────────
    const assinanteId = String(body?.assinante_id ?? "");
    if (!(await deps.pode(userId, PERMISSAO))) {
      if (acao !== "listar") {
        await deps.registrar({
          salon_id: salonId, user_id: userId, origem: "botao", tipo: acao === "estornar" ? "estorno" : "cancelamento",
          resultado: "sem_permissao", assinante_id: ID_UUID.test(assinanteId) ? assinanteId : null,
        }).catch(() => deps.registrar({ salon_id: salonId, user_id: userId, origem: "botao", tipo: acao === "estornar" ? "estorno" : "cancelamento", resultado: "sem_permissao" }));
      }
      return erro("Você não tem permissão para estornar ou cancelar assinaturas do Clube.", 403);
    }
    if (!ID_UUID.test(assinanteId)) return erro("Assinante inválida.", 400);

    if (acao === "listar") return await listar(deps, salonId, assinanteId);
    if (acao === "estornar") return await estornar(deps, staff, assinanteId, body);
    return await cancelar(deps, staff, assinanteId, body);
  };
}

/** Limite de tentativas + conferência da senha. Devolve Response de recusa, ou null se passou. */
async function portaDaSenha(
  deps: Deps,
  staff: { userId: string; salonId: string },
  senha: string,
  base: { tipo: Registro["tipo"]; assinante_id?: string | null; alvo?: string | null },
): Promise<Response | null> {
  // Reserva a tentativa ANTES de conferir: chamadas em paralelo enxergam as reservas umas das outras, então
  // no máximo MAX_ERRADAS chegam à conferência do hash. Reserva largada por queda da função conta como errada
  // enquanto estiver na janela.
  const tentativaId = await deps.registrar({
    salon_id: staff.salonId, user_id: staff.userId, origem: "botao", ...base, resultado: "tentativa_senha",
  });
  if (!tentativaId) throw new Error("reserva de tentativa não gravada");
  const fechar = (resultado: string) => deps.atualizarRegistro(tentativaId, { resultado });

  const anteriores = (await deps.tentativasSenha(staff.userId, MAX_ERRADAS + 1))
    .filter((t) => t.id !== tentativaId).slice(0, MAX_ERRADAS).map((t) => t.criado_em);
  const bloq = avaliarBloqueio(anteriores, deps.agora());
  if (bloq.bloqueado) {
    await fechar("bloqueado_tentativas");
    return erro(`Muitas tentativas com senha errada. Tente de novo às ${horaSP(bloq.ate!)}.`, 429);
  }
  const hash = await deps.hashSenha(staff.salonId);
  if (!hash) {
    await fechar("sem_senha_cadastrada");
    return erro("A senha de autorização ainda não foi cadastrada. Fale com o administrador.", 409);
  }
  if (!(await conferirSenha(senha, hash))) {
    await fechar("senha_incorreta");
    const restam = bloq.restam - 1;
    return erro(
      restam > 0
        ? `Senha incorreta. Restam ${restam} ${restam === 1 ? "tentativa" : "tentativas"} antes do bloqueio de 15 minutos.`
        : "Senha incorreta. Novas tentativas ficam bloqueadas por 15 minutos.",
      422,
    );
  }
  await fechar("senha_ok");
  return null;
}

async function carregarAssinante(deps: Deps, salonId: string, assinanteId: string) {
  const a = await deps.assinante(assinanteId);
  if (!a || !a.asaas_customer_id) return { a: null, chave: null };
  const chave = await deps.chaveAsaas(salonId);
  return { a, chave };
}

// ── listar ───────────────────────────────────────────────────────────────────
async function listar(deps: Deps, salonId: string, assinanteId: string): Promise<Response> {
  const { a, chave } = await carregarAssinante(deps, salonId, assinanteId);
  if (!a) return erro("Assinante não encontrada ou sem cadastro no Asaas.", 404);
  if (!chave) return erro("Pagamento indisponível: chave do Asaas do salão ausente.", 503);
  const cus = encodeURIComponent(a.asaas_customer_id!);
  const [subsR, paysR] = await Promise.all([
    deps.asaas(chave, "GET", `/subscriptions?customer=${cus}&limit=50`),
    deps.asaas(chave, "GET", `/payments?customer=${cus}&limit=100`),
  ]);
  if (!subsR.ok || !paysR.ok) return erro(mensagemAsaas(!subsR.ok ? subsR : paysR, "listar as cobranças"), 502);

  // só o que é desta cliente (o filtro do Asaas já faz; conferimos de novo)
  // deno-lint-ignore no-explicit-any
  const subs = (subsR.dados?.data ?? []).filter((s: any) => s?.customer === a.asaas_customer_id && !s?.deleted);
  // deno-lint-ignore no-explicit-any
  const pays = (paysR.dados?.data ?? []).filter((p: any) => p?.customer === a.asaas_customer_id && !p?.deleted);
  // deno-lint-ignore no-explicit-any
  const ciclos = await deps.ciclosPorPagamento(pays.map((p: any) => String(p.id)));
  const cicloDe = new Map(ciclos.filter((c) => c.assinante_id === a.id).map((c) => [c.asaas_payment_id, c]));
  const outros = await deps.outrosMesmoCelular(a);

  return json({
    ok: true,
    assinante: { id: a.id, nome: a.nome, status: a.status, cancelada_em: a.cancelada_em },
    outros_cadastros: outros.map((o) => ({ id: o.id, nome: o.nome, status: o.status })),
    // deno-lint-ignore no-explicit-any
    assinaturas: subs.map((s: any) => ({
      id: String(s.id),
      valor: Number(s.value) || 0,
      status: String(s.status ?? ""),
      ativa: s.status === "ACTIVE",
      criada_em: s.dateCreated ?? null,
      proxima_cobranca: s.nextDueDate ?? null,
      forma: FORMA_PT[String(s.billingType)] ?? String(s.billingType ?? ""),
      descricao: s.description ? String(s.description).slice(0, 120) : null,
    })),
    // deno-lint-ignore no-explicit-any
    cobrancas: pays.map((p: any) => {
      const st = String(p.status ?? "");
      const ciclo = cicloDe.get(String(p.id)) ?? null;
      const estornada = STATUS_JA_ESTORNADO.has(st) || (Array.isArray(p.refunds) && p.refunds.length > 0) || !!ciclo?.estornado_em;
      let motivoNao: string | null = null;
      if (estornada) motivoNao = "Já estornada.";
      else if (!STATUS_PAGO.has(st)) motivoNao = `Cobrança ${STATUS_PAGAMENTO_PT[st] ?? st.toLowerCase()}.`;
      else if (!FORMAS_ESTORNAVEIS.has(String(p.billingType))) motivoNao = "Esta forma de pagamento não tem estorno pelo sistema.";
      else if (!ciclo) motivoNao = "Esta cobrança não tem ciclo do Clube no sistema.";
      return {
        id: String(p.id),
        assinatura_id: p.subscription ? String(p.subscription) : null,
        valor: Number(p.value) || 0,
        vencimento: p.dueDate ?? null,
        pago_em: p.paymentDate ?? p.confirmedDate ?? p.clientPaymentDate ?? null,
        status: st,
        situacao: STATUS_PAGAMENTO_PT[st] ?? st.toLowerCase(),
        forma: FORMA_PT[String(p.billingType)] ?? String(p.billingType ?? ""),
        estornada,
        estornavel: motivoNao === null,
        motivo_nao_estornavel: motivoNao,
        ciclo: ciclo
          ? { inicio: ciclo.inicio, fim: ciclo.fim, usadas: ciclo.creditos_usados, total: ciclo.creditos_total, bloqueado: ciclo.bloqueado }
          : null,
      };
    }),
  });
}

function lerMotivoESenha(body: Record<string, unknown>): { motivo: string; senha: string } | Response {
  const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";
  const senha = typeof body.senha === "string" ? body.senha : "";
  if (motivo.length < MOTIVO_MINIMO) return erro(`Escreva o motivo (pelo menos ${MOTIVO_MINIMO} letras).`, 400);
  if (motivo.length > 500) return erro("Motivo longo demais (máximo 500 letras).", 400);
  if (!senha) return erro("Digite a senha de autorização.", 400);
  return { motivo, senha };
}

// ── estornar ─────────────────────────────────────────────────────────────────
async function estornar(
  deps: Deps,
  staff: { userId: string; salonId: string },
  assinanteId: string,
  // deno-lint-ignore no-explicit-any
  body: any,
): Promise<Response> {
  const paymentId = String(body?.payment_id ?? "");
  if (!ID_PAY.test(paymentId)) return erro("Cobrança inválida.", 400);
  const ms = lerMotivoESenha(body);
  if (ms instanceof Response) return ms;
  const base = { tipo: "estorno" as const, assinante_id: assinanteId, alvo: paymentId };

  const porta = await portaDaSenha(deps, staff, ms.senha, base);
  if (porta) return porta;

  const reg = (resultado: string, extra: Partial<Registro> = {}) =>
    deps.registrar({ salon_id: staff.salonId, user_id: staff.userId, origem: "botao", ...base, motivo: ms.motivo, resultado, ...extra });

  const { a, chave } = await carregarAssinante(deps, staff.salonId, assinanteId);
  if (!a) return erro("Assinante não encontrada ou sem cadastro no Asaas.", 404);
  if (!chave) return erro("Pagamento indisponível: chave do Asaas do salão ausente.", 503);

  const [ciclo] = (await deps.ciclosPorPagamento([paymentId])).filter((c) => c.asaas_payment_id === paymentId);
  if (!ciclo || ciclo.assinante_id !== a.id) {
    await reg("recusado", { detalhe: { motivo: "ciclo_de_outra_assinante_ou_inexistente" } });
    return erro("Esta cobrança não pertence a esta cliente no sistema.", 422);
  }
  if (ciclo.estornado_em || (await deps.existeRegistro("estorno", paymentId, "sucesso"))) {
    return json({ ok: true, ja_aplicado: true, usadas: ciclo.creditos_usados, total: ciclo.creditos_total, mensagem: "Esta cobrança já estava estornada." });
  }

  // trava de clique duplo: um "em_andamento" por cobrança (índice único no banco)
  await deps.expirarEmAndamento("estorno", paymentId, new Date(deps.agora().getTime() - EM_ANDAMENTO_EXPIRA_MS).toISOString());
  const regId = await reg("em_andamento");
  if (!regId) return erro("Este estorno já está sendo feito. Aguarde alguns segundos e atualize a lista.", 409);
  const fechar = (resultado: string, extra: Partial<Registro> = {}) => deps.atualizarRegistro(regId, { resultado, ...extra });

  // GET: a cobrança é desta cliente e está paga?
  const g = await deps.asaas(chave, "GET", `/payments/${encodeURIComponent(paymentId)}`);
  if (!g.ok) {
    await fechar("erro_asaas", { detalhe: { etapa: "consulta", http: g.status } });
    return erro(mensagemAsaas(g, "consultar a cobrança"), 502);
  }
  const p = g.dados;
  if (p?.customer !== a.asaas_customer_id) {
    await fechar("recusado", { detalhe: { motivo: "customer_diferente" } });
    return erro("Esta cobrança é de outra cliente no Asaas. Nada foi feito.", 422);
  }
  const st = String(p?.status ?? "");
  const valor = Number(p?.value) || null;
  let jaNoAsaas = false;
  if (p?.deleted) {
    await fechar("recusado", { valor, detalhe: { ...resumoPagamento(p) } });
    return erro("Esta cobrança foi removida no Asaas. Nada foi feito.", 422);
  }
  if (STATUS_JA_ESTORNADO.has(st) || (Array.isArray(p?.refunds) && p.refunds.length > 0)) {
    jaNoAsaas = true; // já devolvida no Asaas (ex.: reenvio depois de falha no motor): não estorna de novo
  } else if (!STATUS_PAGO.has(st)) {
    await fechar("recusado", { valor, detalhe: resumoPagamento(p) });
    return erro(`Só cobrança paga pode ser estornada. Situação no Asaas: ${STATUS_PAGAMENTO_PT[st] ?? st.toLowerCase()}.`, 422);
  } else if (!FORMAS_ESTORNAVEIS.has(String(p?.billingType))) {
    await fechar("recusado", { valor, detalhe: resumoPagamento(p) });
    return erro("Esta forma de pagamento não tem estorno pelo sistema. Faça pelo painel do Asaas.", 422);
  }

  let asaasStatus = st;
  if (!jaNoAsaas) {
    const r = await deps.asaas(chave, "POST", `/payments/${encodeURIComponent(paymentId)}/refund`, {
      description: "Estorno pelo sistema Sua Vez Express",
    });
    if (!r.ok) {
      const codigos = Array.isArray(r.dados?.errors) ? r.dados.errors.map((e: { code?: string }) => e?.code).filter(Boolean) : [];
      await fechar("erro_asaas", { valor, detalhe: { etapa: "estorno", http: r.status, codigos } });
      return erro(mensagemAsaas(r, "estornar a cobrança"), 502);
    }
    asaasStatus = String(r.dados?.status ?? "");
  }

  const m = await deps.rpc("clube_aplicar_estorno", {
    p_asaas_payment_id: paymentId, p_motivo: ms.motivo, p_origem: "botao", p_user_id: staff.userId,
  });
  if (m.error || !m.data?.ok) {
    await fechar("erro_motor", { valor, detalhe: { asaas_status: asaasStatus, erro: m.error ? "rpc" : String(m.data?.erro ?? "") } });
    return erro(
      "O dinheiro já foi devolvido no Asaas, mas o sistema não conseguiu bloquear o ciclo. Clique em estornar de novo para concluir: o Asaas não cobra nem devolve duas vezes.",
      500,
    );
  }
  await fechar(jaNoAsaas ? "ja_aplicado" : "sucesso", {
    valor,
    detalhe: { asaas_status: asaasStatus, usadas: m.data.usadas, total: m.data.total, lancou_financeiro: !!m.data.lancou_financeiro },
  });
  return json({
    ok: true,
    ja_aplicado: jaNoAsaas,
    usadas: m.data.usadas,
    total: m.data.total,
    valor_estornado: m.data.valor_estornado ?? valor,
    mensagem: jaNoAsaas ? "A cobrança já estava estornada no Asaas. O sistema foi atualizado." : "Estorno feito.",
  });
}

// ── cancelar ─────────────────────────────────────────────────────────────────
async function cancelar(
  deps: Deps,
  staff: { userId: string; salonId: string },
  assinanteId: string,
  // deno-lint-ignore no-explicit-any
  body: any,
): Promise<Response> {
  const subId = String(body?.subscription_id ?? "");
  if (!ID_SUB.test(subId)) return erro("Assinatura inválida.", 400);
  const ms = lerMotivoESenha(body);
  if (ms instanceof Response) return ms;
  const base = { tipo: "cancelamento" as const, assinante_id: assinanteId, alvo: subId };

  const porta = await portaDaSenha(deps, staff, ms.senha, base);
  if (porta) return porta;

  const reg = (resultado: string, extra: Partial<Registro> = {}) =>
    deps.registrar({ salon_id: staff.salonId, user_id: staff.userId, origem: "botao", ...base, motivo: ms.motivo, resultado, ...extra });

  const { a, chave } = await carregarAssinante(deps, staff.salonId, assinanteId);
  if (!a) return erro("Assinante não encontrada ou sem cadastro no Asaas.", 404);
  if (!chave) return erro("Pagamento indisponível: chave do Asaas do salão ausente.", 503);

  if (await deps.existeRegistro("cancelamento", subId, "sucesso")) {
    return json({ ok: true, ja_aplicado: true, mensagem: "Esta assinatura já estava cancelada." });
  }
  await deps.expirarEmAndamento("cancelamento", subId, new Date(deps.agora().getTime() - EM_ANDAMENTO_EXPIRA_MS).toISOString());
  const regId = await reg("em_andamento");
  if (!regId) return erro("Este cancelamento já está sendo feito. Aguarde alguns segundos e atualize a lista.", 409);
  const fechar = (resultado: string, extra: Partial<Registro> = {}) => deps.atualizarRegistro(regId, { resultado, ...extra });

  const g = await deps.asaas(chave, "GET", `/subscriptions/${encodeURIComponent(subId)}`);
  if (!g.ok) {
    await fechar("erro_asaas", { detalhe: { etapa: "consulta", http: g.status } });
    return erro(mensagemAsaas(g, "consultar a assinatura"), 502);
  }
  const s = g.dados;
  if (s?.customer !== a.asaas_customer_id) {
    await fechar("recusado", { detalhe: { motivo: "customer_diferente" } });
    return erro("Esta assinatura é de outra cliente no Asaas. Nada foi feito.", 422);
  }
  const valor = Number(s?.value) || null;
  const jaRemovida = !!s?.deleted;
  if (!jaRemovida) {
    const r = await deps.asaas(chave, "DELETE", `/subscriptions/${encodeURIComponent(subId)}`);
    if (!r.ok) {
      const codigos = Array.isArray(r.dados?.errors) ? r.dados.errors.map((e: { code?: string }) => e?.code).filter(Boolean) : [];
      await fechar("erro_asaas", { valor, detalhe: { etapa: "cancelamento", http: r.status, codigos } });
      return erro(mensagemAsaas(r, "cancelar a assinatura"), 502);
    }
  }

  // quantas assinaturas ATIVAS ainda restam deste customer (null = não deu para saber)
  let restam: number | null = null;
  const l = await deps.asaas(chave, "GET", `/subscriptions?customer=${encodeURIComponent(a.asaas_customer_id!)}&status=ACTIVE&limit=50`);
  if (l.ok && Array.isArray(l.dados?.data)) {
    // deno-lint-ignore no-explicit-any
    restam = l.dados.data.filter((x: any) => x?.id !== subId && x?.customer === a.asaas_customer_id && !x?.deleted && x?.status === "ACTIVE").length;
  }

  const m = await deps.rpc("clube_aplicar_cancelamento", {
    p_asaas_subscription_id: subId, p_asaas_customer_id: a.asaas_customer_id, p_restam_ativas: restam,
    p_origem: "botao", p_user_id: staff.userId,
  });
  if (m.error || !m.data?.ok) {
    await fechar("erro_motor", { valor, detalhe: { erro: m.error ? "rpc" : String(m.data?.erro ?? "") } });
    return erro(
      "A assinatura já foi cancelada no Asaas, mas o sistema não conseguiu atualizar o cadastro. Clique em cancelar de novo para concluir.",
      500,
    );
  }
  await fechar(jaRemovida ? "ja_aplicado" : "sucesso", { valor, detalhe: { efeito: m.data.efeito, vale_ate: m.data.vale_ate ?? null, restam } });
  return json({
    ok: true,
    ja_aplicado: jaRemovida,
    efeito: m.data.efeito,
    vale_ate: m.data.vale_ate ?? null,
    mensagem: jaRemovida ? "A assinatura já estava cancelada no Asaas. O sistema foi atualizado." : "Assinatura cancelada.",
  });
}
