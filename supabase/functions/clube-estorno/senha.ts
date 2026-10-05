// Senha de autorização de estorno/cancelamento do Clube.
// PBKDF2-SHA256 (WebCrypto, sem dependência externa), salt aleatório de 16 bytes.
// Formato guardado em salon_secrets.senha_estorno_hash: pbkdf2$<iterações>$<salt base64>$<hash base64>
// O MESMO arquivo é usado pela edge clube-estorno e pelo scripts/carregar-senha-estorno.ts.

export const PBKDF2_ITERACOES = 310_000;
export const SENHA_MINIMO = 8;
const BYTES_HASH = 32;

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derivar(senha: string, salt: Uint8Array, iteracoes: number): Promise<Uint8Array> {
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: iteracoes },
    chave,
    BYTES_HASH * 8,
  );
  return new Uint8Array(bits);
}

export async function gerarHashSenha(senha: string, iteracoes = PBKDF2_ITERACOES): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(senha, salt, iteracoes);
  return `pbkdf2$${iteracoes}$${b64(salt)}$${b64(hash)}`;
}

/** Comparação em tempo constante (não para no primeiro byte diferente). */
export function iguaisTempoConstante(a: Uint8Array, b: Uint8Array): boolean {
  let dif = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

/** true só se a senha confere com o hash guardado. Hash mal formado = false (falha fechada). */
export async function conferirSenha(senha: string, guardado: string | null | undefined): Promise<boolean> {
  if (!guardado || typeof senha !== "string" || senha.length === 0) return false;
  const partes = guardado.split("$");
  if (partes.length !== 4 || partes[0] !== "pbkdf2") return false;
  const iteracoes = Number(partes[1]);
  if (!Number.isInteger(iteracoes) || iteracoes < 100_000 || iteracoes > 5_000_000) return false;
  let salt: Uint8Array, esperado: Uint8Array;
  try {
    salt = deB64(partes[2]);
    esperado = deB64(partes[3]);
  } catch {
    return false;
  }
  if (salt.length < 16 || esperado.length !== BYTES_HASH) return false;
  const obtido = await derivar(senha, salt, iteracoes);
  return iguaisTempoConstante(obtido, esperado);
}
