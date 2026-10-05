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
// 05/10/2026: antes de criar, confere se a cliente já tem escova ativa (Asaas
// + clube_assinantes, por CPF, e-mail e WhatsApp) e devolve aviso em vez de
// criar a segunda; só cria com o token de confirmação. Regras em `logica.ts`.
//
// Auth: verify_jwt LIGADO (deploy SEM --no-verify-jwt) — só usuário logado do
// sistema chama. Nunca logar dados de cartão.
import { ASAAS_BASE, criarHandler, type LinhaAssinante } from "./logica.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const headersServico = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

const handler = criarHandler({
  chaveAsaas: () => Deno.env.get("ASAAS_KEY") ?? "",

  // verify_jwt aceita também a anon key — aqui exigimos USUÁRIO logado
  // (role "authenticated" no JWT) E com papel na equipe (linha em user_roles),
  // senão o endpoint viraria alvo de teste de cartão roubado por qualquer um
  // com a anon key do bundle ou uma conta avulsa do projeto.
  autorizar: async (req) => {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.role !== "authenticated" || !payload.sub) return false;
    const check = await fetch(
      `${SUPABASE_URL}/rest/v1/user_roles?user_id=eq.${payload.sub}&select=role&limit=1`,
      { headers: headersServico },
    );
    const papeis = check.ok ? await check.json() : [];
    return Array.isArray(papeis) && papeis.length > 0;
  },

  asaas: async (metodo, caminho, corpo) => {
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
    return { ok: res.ok, status: res.status, dados };
  },

  // Assinantes que ainda contam (ativo/inadimplente, sem cancelamento). Falha = lança (venda barrada).
  assinantesAtivos: async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/clube_assinantes?select=id,nome,plano,status,cpf,email,celular,created_at,cancelada_em,asaas_subscription_id` +
        `&status=in.(ativo,inadimplente)&cancelada_em=is.null&limit=5000`,
      { headers: headersServico },
    );
    if (!res.ok) throw new Error("clube_assinantes " + res.status);
    const linhas = await res.json();
    if (!Array.isArray(linhas)) throw new Error("clube_assinantes formato");
    return linhas as LinhaAssinante[];
  },

  ipRemoto: (req) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "",
});

Deno.serve(handler);
