// Carga da senha de autorização de estorno/cancelamento do Clube (uma vez, no deploy, ou para redefinir
// sem a senha atual). Este arquivo NÃO contém a senha: ela vem do cofre.
//
// Uso (na raiz do repo, depois da migration 20261005100000 aplicada):
//   set -a; . ~/.config/credentials/suavez_supabase.env; . ~/.config/credentials/suavez_estorno.env; set +a
//   deno run --allow-env=SUAVEZ_SENHA_ESTORNO,SUPABASE_PAT_SUAVEZ --allow-net=api.supabase.com scripts/carregar-senha-estorno.ts
//
// Calcula o hash com o MESMO código da edge (supabase/functions/clube-estorno/senha.ts) e grava em
// salon_secrets.senha_estorno_hash pela Management API. Não imprime senha nem hash.
import { gerarHashSenha, conferirSenha, SENHA_MINIMO } from "../supabase/functions/clube-estorno/senha.ts";

const PROJETO = "ewxiaxsmohxuabcmxuyc";
const SALAO = "9793948a-e208-4054-a4df-4b8f2b3b3965";

const senha = Deno.env.get("SUAVEZ_SENHA_ESTORNO") ?? "";
const pat = Deno.env.get("SUPABASE_PAT_SUAVEZ") ?? "";
if (senha.length < SENHA_MINIMO) {
  console.error(`SUAVEZ_SENHA_ESTORNO ausente ou com menos de ${SENHA_MINIMO} caracteres. Nada foi gravado.`);
  Deno.exit(1);
}
if (!pat) {
  console.error("SUPABASE_PAT_SUAVEZ ausente. Nada foi gravado.");
  Deno.exit(1);
}

const hash = await gerarHashSenha(senha);
if (!(await conferirSenha(senha, hash))) {
  console.error("Conferência do hash falhou. Nada foi gravado.");
  Deno.exit(1);
}
if (!/^pbkdf2\$\d+\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/.test(hash)) {
  console.error("Hash em formato inesperado. Nada foi gravado.");
  Deno.exit(1);
}

const sql = `update public.salon_secrets
   set senha_estorno_hash = '${hash}', senha_estorno_atualizada_em = now()
 where salon_id = '${SALAO}'
returning salon_id;`;

const r = await fetch(`https://api.supabase.com/v1/projects/${PROJETO}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const corpo = await r.json().catch(() => null);
if (!r.ok || !Array.isArray(corpo) || corpo.length !== 1) {
  console.error(`Falha ao gravar (HTTP ${r.status}). Confira se a migration 20261005100000 foi aplicada.`);
  Deno.exit(1);
}
console.log("Senha de autorização gravada (1 salão). Teste: estorno com senha errada deve ser recusado.");
