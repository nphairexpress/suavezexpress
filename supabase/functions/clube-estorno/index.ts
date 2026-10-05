// Clube da Escova: estorno de cobrança e cancelamento de assinatura pelo sistema, com senha de autorização.
// Regras em ./logica.ts (testes em ./logica.test.ts). Aqui só a ligação com Supabase, Asaas e auth.
//
// Auth: verify_jwt LIGADO (deploy SEM --no-verify-jwt) + requireStaff + permissão clube.estornar_cancelar
// conferida no servidor (fn_pode). Salão = o do usuário logado, nunca do corpo da requisição.
// Chave do Asaas: salon_secrets.asaas_api_key (cofre backend-only). Nada de senha, motivo ou corpo do Asaas
// em console.log.
//
// Deploy: npx supabase functions deploy clube-estorno --project-ref ewxiaxsmohxuabcmxuyc
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireStaff, getSalonSecrets } from "../_shared/auth.ts";
import { corsHeaders, criarHandler, type Deps } from "./logica.ts";

const ASAAS_BASE = "https://api.asaas.com/v3";

const supa = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const deps: Deps = {
  autenticar: (req) => requireStaff(req, supa),
  salaoUnico: () => Deno.env.get("NPHAIR_EXPRESS_SALON_ID") || null,
  async pode(userId, chave) {
    const { data, error } = await supa.rpc("fn_pode", { _uid: userId, _key: chave });
    return !error && data === true;
  },
  async tentativasSenha(userId, limite) {
    const { data, error } = await supa.from("clube_estornos").select("id, criado_em")
      .eq("user_id", userId).in("resultado", ["senha_incorreta", "tentativa_senha"])
      .order("criado_em", { ascending: false }).limit(limite);
    if (error) throw new Error("contagem de tentativas falhou");
    return data ?? [];
  },
  async hashSenha(salonId) {
    const { data } = await supa.from("salon_secrets").select("senha_estorno_hash").eq("salon_id", salonId).maybeSingle();
    return data?.senha_estorno_hash ?? null;
  },
  async gravarHash(salonId, hash) {
    const { data, error } = await supa.from("salon_secrets")
      .update({ senha_estorno_hash: hash, senha_estorno_atualizada_em: new Date().toISOString() })
      .eq("salon_id", salonId).select("salon_id");
    if (error || !data?.length) throw new Error("falha ao gravar a senha");
  },
  async chaveAsaas(salonId) {
    const s = await getSalonSecrets(supa, salonId);
    return s?.asaas_api_key || null;
  },
  async assinante(id) {
    const { data } = await supa.from("clube_assinantes")
      .select("id, nome, celular, asaas_customer_id, asaas_subscription_id, status, cancelada_em")
      .eq("id", id).maybeSingle();
    return data ?? null;
  },
  async outrosMesmoCelular(a) {
    const fim8 = String(a.celular ?? "").replace(/\D/g, "").slice(-8);
    if (fim8.length < 8) return [];
    const { data } = await supa.from("clube_assinantes").select("id, nome, celular, status").neq("id", a.id);
    return (data ?? [])
      .filter((o: { celular: string | null }) => String(o.celular ?? "").replace(/\D/g, "").slice(-8) === fim8)
      .map((o: { id: string; nome: string | null; status: string }) => ({ id: o.id, nome: o.nome, status: o.status }));
  },
  async ciclosPorPagamento(ids) {
    if (!ids.length) return [];
    const { data } = await supa.from("clube_creditos")
      .select("id, assinante_id, asaas_payment_id, inicio, fim, creditos_total, creditos_usados, bloqueado, estornado_em, origem")
      .in("asaas_payment_id", ids);
    return data ?? [];
  },
  async existeRegistro(tipo, alvo, resultado) {
    const { data } = await supa.from("clube_estornos").select("id").eq("tipo", tipo).eq("alvo", alvo).eq("resultado", resultado).limit(1);
    return (data ?? []).length > 0;
  },
  async expirarEmAndamento(tipo, alvo, antesDe) {
    await supa.from("clube_estornos").update({ resultado: "interrompido", atualizado_em: new Date().toISOString() })
      .eq("tipo", tipo).eq("alvo", alvo).eq("resultado", "em_andamento").lt("criado_em", antesDe);
  },
  async registrar(r) {
    const { data, error } = await supa.from("clube_estornos").insert(r).select("id").single();
    if (error) {
      if (error.code === "23505") return null; // trava de clique duplo
      throw new Error(`registro falhou (${error.code ?? "?"})`);
    }
    return data.id as string;
  },
  async atualizarRegistro(id, patch) {
    await supa.from("clube_estornos").update({ ...patch, atualizado_em: new Date().toISOString() }).eq("id", id);
  },
  async rpc(nome, args) {
    const { data, error } = await supa.rpc(nome, args);
    return { data, error: error ? { message: error.message } : null };
  },
  async asaas(chave, metodo, caminho, corpo) {
    try {
      const res = await fetch(ASAAS_BASE + caminho, {
        method: metodo,
        headers: { "Content-Type": "application/json", access_token: chave, "User-Agent": "suavez-clube-estorno" },
        body: corpo ? JSON.stringify(corpo) : undefined,
      });
      let dados = null;
      try { dados = await res.json(); } catch { dados = null; }
      return { ok: res.ok, status: res.status, dados };
    } catch {
      return { ok: false, status: 0, dados: null };
    }
  },
  agora: () => new Date(),
};

const handler = criarHandler(deps);

Deno.serve(async (req) => {
  try {
    return await handler(req);
  } catch (e) {
    // só a mensagem interna (sem corpo de requisição, senha ou resposta do Asaas)
    console.error("clube-estorno: falha inesperada:", e instanceof Error ? e.message : "erro");
    return new Response(JSON.stringify({ ok: false, erro: "Falha inesperada. Atualize a lista de cobranças para ver a situação antes de tentar de novo." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    });
  }
});
