// Replay do caso Francine (30/09 + 01/10) contra o Asaas e o banco REAIS, só leitura.
// O fetch deste teste recusa qualquer método que não seja GET (Asaas e banco).
// Pula sozinho sem as variáveis. Rodar:
//   set -a; . ~/.config/credentials/suavez_supabase.env; set +a
//   REPLAY_ASAAS_KEY=<chave lida de salon_secrets, sem ecoar> deno test --allow-net --allow-env supabase/functions/clube-vender/replay_francine.test.ts
// Saída mascarada: nome só com a inicial, telefone só com os 4 finais.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { ASAAS_BASE, criarHandler, type LinhaAssinante } from "./logica.ts";

// Sem --allow-env o Deno lança ao ler variável: aí o teste só pula.
const env = (k: string) => { try { return Deno.env.get(k) ?? ""; } catch (_) { return ""; } };
const CHAVE = env("REPLAY_ASAAS_KEY");
const SERVICO = env("SUPABASE_SERVICE_ROLE_SUAVEZ");
const URL_SB = "https://ewxiaxsmohxuabcmxuyc.supabase.co";
const DIA_DA_VENDA = "2026-10-01"; // a 2ª assinatura nasceu neste dia

async function somenteGet(url: string, headers: Record<string, string>, metodo = "GET") {
  if (metodo !== "GET") throw new Error("replay recusa " + metodo);
  return await fetch(url, { method: "GET", headers });
}

Deno.test({
  name: "replay Francine: a venda de 01/10 teria sido avisada (estado anterior à venda, só GET)",
  ignore: !CHAVE || !SERVICO,
  fn: async () => {
    const hdrSb = { apikey: SERVICO, Authorization: `Bearer ${SERVICO}` };
    const r = await somenteGet(`${URL_SB}/rest/v1/clube_assinantes?select=id,nome,plano,status,cpf,email,celular,created_at,cancelada_em,asaas_subscription_id&nome=ilike.francine*`, hdrSb);
    const linhas = (await r.json()) as LinhaAssinante[];
    assertEquals(linhas.length, 2, "esperava as 2 linhas da Francine");
    const segunda = linhas.find((l) => String(l.created_at).startsWith(DIA_DA_VENDA))!;
    assert(segunda, "linha da venda de 01/10");

    const metodos: string[] = [];
    let subsEscondidas = 0;
    const handler = criarHandler({
      autorizar: async () => true,
      chaveAsaas: () => CHAVE,
      ipRemoto: () => "",
      asaas: async (metodo, caminho) => {
        metodos.push(metodo);
        const res = await somenteGet(ASAAS_BASE + caminho, { access_token: CHAVE, "User-Agent": "suavez-clube-vender-replay" }, metodo);
        // deno-lint-ignore no-explicit-any
        const dados: any = await res.json();
        // Volta no tempo: assinatura criada a partir de 01/10 ainda não existia na hora da venda.
        if (caminho.startsWith("/subscriptions") && Array.isArray(dados?.data)) {
          const antes = dados.data.length;
          dados.data = dados.data.filter((s: { dateCreated: string }) => s.dateCreated < DIA_DA_VENDA);
          subsEscondidas += antes - dados.data.length;
        }
        return { ok: res.ok, status: res.status, dados };
      },
      assinantesAtivos: async () => {
        const res = await somenteGet(`${URL_SB}/rest/v1/clube_assinantes?select=id,nome,plano,status,cpf,email,celular,created_at,cancelada_em,asaas_subscription_id&status=in.(ativo,inadimplente)&cancelada_em=is.null&limit=5000`, hdrSb);
        if (!res.ok) throw new Error("banco " + res.status);
        const todas = (await res.json()) as LinhaAssinante[];
        return todas.filter((l) => String(l.created_at) < DIA_DA_VENDA);
      },
    });

    // Os dados que a cliente usou na venda de 01/10 (CPF e e-mail daquela linha, celular dela).
    const corpo = {
      plano: "4cm", nome: segunda.nome, cpf: segunda.cpf, email: segunda.email, celular: String(segunda.celular).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, ""),
      cartao: { numero: "4111111111111111", mesValidade: "12", anoValidade: "30", ccv: "123", nomeTitular: "REPLAY" },
    };
    const resp = await handler(new Request("http://replay", { method: "POST", body: JSON.stringify(corpo) }));
    const b = await resp.json();
    const tel4 = String(segunda.celular).replace(/\D/g, "").slice(-4);
    console.log(JSON.stringify({
      status: resp.status,
      ja_tem_assinatura: b.ja_tem_assinatura ?? false,
      tel4,
      cpf_igual_a_primeira: linhas.every((l) => l.cpf === segunda.cpf),
      assinaturas_de_01_10_em_diante_escondidas: subsEscondidas,
      encontradas: (b.encontradas ?? []).map((e: { nome: string; plano: string; desde: string; bateu: string[] }) => ({ nome: e.nome.slice(0, 1) + "…", plano: e.plano, desde: e.desde, bateu: e.bateu })),
      metodos_usados: Array.from(new Set(metodos)),
    }, null, 1));
    assertEquals(resp.status, 409);
    assertEquals(b.ja_tem_assinatura, true);
    assert(metodos.every((m) => m === "GET"));
  },
});
