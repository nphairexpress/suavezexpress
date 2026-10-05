// Cobranças e assinaturas de uma assinante do Clube, com estorno e cancelamento.
// Tudo passa pela edge `clube-estorno` (permissão, senha e Asaas são conferidos no servidor).
// A senha digitada vive só no estado deste diálogo e some ao voltar, fechar ou concluir.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Notice } from "@/components/settings/settingsUi";
import { Badge, Button, PasswordInput, Skeleton } from "@design-system";
import { AlertTriangle, ArrowLeft, Receipt, RotateCcw, XCircle } from "lucide-react";

type Assinatura = {
  id: string; valor: number; status: string; ativa: boolean; criada_em: string | null;
  proxima_cobranca: string | null; forma: string; descricao: string | null;
};
type Cobranca = {
  id: string; assinatura_id: string | null; valor: number; vencimento: string | null; pago_em: string | null;
  status: string; situacao: string; forma: string; estornada: boolean; estornavel: boolean;
  motivo_nao_estornavel: string | null;
  ciclo: { inicio: string; fim: string; usadas: number; total: number; bloqueado: boolean } | null;
};
type Lista = {
  ok: true;
  assinante: { id: string; nome: string | null; status: string; cancelada_em: string | null };
  outros_cadastros: { id: string; nome: string | null; status: string }[];
  assinaturas: Assinatura[];
  cobrancas: Cobranca[];
};
type Confirmacao =
  | { tipo: "estorno"; cobranca: Cobranca }
  | { tipo: "cancelamento"; assinatura: Assinatura };

const MOTIVO_MINIMO = 10;

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
/** "2026-10-01" ou "2026-10-01 11:16:11" → "01/10/2026" (sem fuso: é data do Asaas) */
const dataAsaas = (s: string | null) => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "—";
};
const diaMes = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(iso));

/** Corpo de erro da edge (vem no context da FunctionsHttpError). */
async function erroDaEdge(error: unknown, padrao: string): Promise<string> {
  try {
    const body = await (error as { context?: Response }).context?.json();
    if (body?.erro) return String(body.erro);
  } catch {
    /* sem corpo legível */
  }
  return padrao;
}

async function chamar<T>(body: Record<string, unknown>, padrao: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke("clube-estorno", { body });
  if (error) throw new Error(await erroDaEdge(error, padrao));
  if (!data?.ok) throw new Error(data?.erro ?? padrao);
  return data as T;
}

// âmbar fica só para ação: situação usa verde (paga), vermelho (vencida/contestada) ou neutro
function tomSituacao(c: Cobranca): "positive" | "danger" | "neutral" {
  if (c.estornada) return "neutral";
  if (c.status === "CONFIRMED" || c.status === "RECEIVED") return "positive";
  if (c.status === "OVERDUE" || c.status.startsWith("CHARGEBACK")) return "danger";
  return "neutral";
}

export function CobrancasClubeModal({
  assinante,
  onClose,
}: {
  assinante: { id: string; nome: string | null } | null;
  onClose: () => void;
}) {
  const open = !!assinante;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmar, setConfirmar] = useState<Confirmacao | null>(null);
  const [motivo, setMotivo] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);

  const lista = useQuery({
    queryKey: ["clube-cobrancas", assinante?.id],
    enabled: open,
    staleTime: 0,
    retry: false,
    queryFn: () => chamar<Lista>({ acao: "listar", assinante_id: assinante!.id }, "Não foi possível carregar as cobranças."),
  });

  // senha e motivo nunca sobrevivem a troca de tela ou de assinante
  useEffect(() => {
    if (!open) {
      setConfirmar(null);
      setMotivo("");
      setSenha("");
      setErroEnvio(null);
    }
  }, [open]);

  function abrirConfirmacao(c: Confirmacao) {
    setMotivo("");
    setSenha("");
    setErroEnvio(null);
    setConfirmar(c);
  }
  function voltar() {
    if (enviando) return;
    setSenha("");
    setErroEnvio(null);
    setConfirmar(null);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmar || !assinante || enviando) return;
    setEnviando(true);
    setErroEnvio(null);
    try {
      if (confirmar.tipo === "estorno") {
        const r = await chamar<{ mensagem?: string }>(
          { acao: "estornar", assinante_id: assinante.id, payment_id: confirmar.cobranca.id, motivo: motivo.trim(), senha },
          "Não foi possível estornar.",
        );
        toast({ title: r.mensagem ?? "Estorno feito.", description: `${brl(confirmar.cobranca.valor)} de ${assinante.nome ?? "assinante"}` });
      } else {
        const r = await chamar<{ mensagem?: string; vale_ate?: string | null }>(
          { acao: "cancelar", assinante_id: assinante.id, subscription_id: confirmar.assinatura.id, motivo: motivo.trim(), senha },
          "Não foi possível cancelar.",
        );
        toast({
          title: r.mensagem ?? "Assinatura cancelada.",
          description: r.vale_ate ? `As escovas pagas valem até ${diaMes(r.vale_ate)}.` : undefined,
        });
      }
      setSenha("");
      setMotivo("");
      setConfirmar(null);
      await Promise.all([
        lista.refetch(),
        queryClient.invalidateQueries({ queryKey: ["clube-admin"] }),
      ]);
    } catch (err) {
      setSenha("");
      setErroEnvio(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setEnviando(false);
    }
  }

  const dados = lista.data;
  const podeEnviar = motivo.trim().length >= MOTIVO_MINIMO && senha.length > 0 && !enviando;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="w-[calc(100vw-32px)] max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl bg-card text-foreground border-border p-5 sm:p-6">
        {!confirmar ? (
          <>
            <DialogHeader className="text-left pr-8">
              <DialogTitle className="flex items-center gap-2 font-[family:var(--np-font-display)] font-extrabold tracking-[-0.01em]">
                <Receipt className="h-5 w-5 shrink-0 text-primary" /> Cobranças
              </DialogTitle>
              <DialogDescription className="text-muted-foreground break-words">
                {assinante?.nome ?? "Assinante"} · dados direto do Asaas
              </DialogDescription>
            </DialogHeader>

            {lista.isLoading ? (
              <Skeleton lines={5} />
            ) : lista.isError ? (
              <div className="space-y-3">
                <Notice tone="danger" icon={AlertTriangle} title="Não deu para carregar">
                  {(lista.error as Error)?.message}
                </Notice>
                <Button variant="secondary" block onClick={() => lista.refetch()}>Tentar de novo</Button>
              </div>
            ) : dados ? (
              <div className="space-y-5 min-w-0">
                {dados.outros_cadastros.length > 0 && (
                  <Notice tone="accent" icon={AlertTriangle} title="Mesmo WhatsApp em outro cadastro do Clube">
                    {dados.outros_cadastros.map((o) => `${o.nome ?? "Sem nome"} (${o.status})`).join(", ")}.
                    {" "}Confira se está no cadastro certo antes de estornar ou cancelar.
                  </Notice>
                )}

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assinaturas</h3>
                  {dados.assinaturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma assinatura no Asaas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dados.assinaturas.map((s) => (
                        <li key={s.id} className="rounded-xl border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-inset)] p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold np-num tabular-nums">{brl(s.valor)}/mês</span>
                            {s.ativa ? <Badge tone="positive" dot>Ativa</Badge> : <Badge>Encerrada</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {s.forma} · desde {dataAsaas(s.criada_em)}
                            {s.ativa && s.proxima_cobranca && <> · próxima cobrança {dataAsaas(s.proxima_cobranca)}</>}
                          </div>
                          {s.ativa && (
                            <Button
                              variant="ghost"
                              icon={XCircle}
                              className="np-text-danger w-full sm:w-auto"
                              onClick={() => abrirConfirmacao({ tipo: "cancelamento", assinatura: s })}
                            >
                              Cancelar assinatura
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cobranças</h3>
                  {dados.cobrancas.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma cobrança no Asaas.</p>
                  ) : (
                    <ul className="space-y-2">
                      {dados.cobrancas.map((c) => (
                        <li key={c.id} className="rounded-xl border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-inset)] p-3 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold np-num tabular-nums">{brl(c.valor)}</span>
                            <Badge tone={tomSituacao(c)} dot>{c.estornada ? "Estornada" : c.situacao}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {c.forma} · {c.pago_em ? `paga em ${dataAsaas(c.pago_em)}` : `vence ${dataAsaas(c.vencimento)}`}
                          </div>
                          {c.ciclo && (
                            <div className="text-sm">
                              Escovas do ciclo: <b className="tabular-nums">{c.ciclo.usadas} de {c.ciclo.total}</b>
                              <span className="text-muted-foreground"> · até {diaMes(c.ciclo.fim)}</span>
                              {c.ciclo.bloqueado && <span className="np-text-danger"> · bloqueado</span>}
                            </div>
                          )}
                          {c.estornavel ? (
                            <Button
                              variant="ghost"
                              icon={RotateCcw}
                              className="np-text-danger w-full sm:w-auto"
                              onClick={() => abrirConfirmacao({ tipo: "estorno", cobranca: c })}
                            >
                              Estornar cobrança
                            </Button>
                          ) : (
                            c.motivo_nao_estornavel &&
                            !c.estornada &&
                            (c.status === "CONFIRMED" || c.status === "RECEIVED") && (
                              <p className="text-xs text-muted-foreground">{c.motivo_nao_estornavel}</p>
                            )
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            ) : null}
          </>
        ) : (
          <form onSubmit={enviar} className="space-y-4 min-w-0" autoComplete="off">
            <DialogHeader className="text-left pr-8">
              <DialogTitle className="flex items-center gap-2 font-[family:var(--np-font-display)] font-extrabold tracking-[-0.01em]">
                {confirmar.tipo === "estorno" ? <RotateCcw className="h-5 w-5 shrink-0 np-text-danger" /> : <XCircle className="h-5 w-5 shrink-0 np-text-danger" />}
                {confirmar.tipo === "estorno" ? "Estornar cobrança" : "Cancelar assinatura"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">Confira antes de confirmar. Não dá para desfazer.</DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-inset)] p-3 text-sm space-y-1">
              <div className="font-semibold text-foreground break-words">{assinante?.nome ?? "Assinante"}</div>
              {confirmar.tipo === "estorno" ? (
                <div className="tabular-nums">
                  <b>{brl(confirmar.cobranca.valor)}</b>
                  <span className="text-muted-foreground"> · {confirmar.cobranca.forma} · paga em {dataAsaas(confirmar.cobranca.pago_em ?? confirmar.cobranca.vencimento)}</span>
                </div>
              ) : (
                <div className="tabular-nums">
                  <b>{brl(confirmar.assinatura.valor)}/mês</b>
                  <span className="text-muted-foreground"> · desde {dataAsaas(confirmar.assinatura.criada_em)}</span>
                </div>
              )}
            </div>

            <Notice tone="danger" icon={AlertTriangle} title="O que vai acontecer">
              {confirmar.tipo === "estorno" ? (
                <ul className="list-disc pl-4 space-y-1">
                  <li>O dinheiro volta para o cartão da cliente. Pode levar até 10 dias úteis para aparecer na fatura.</li>
                  <li>
                    As escovas deste ciclo deixam de valer.
                    {confirmar.cobranca.ciclo && confirmar.cobranca.ciclo.usadas > 0
                      ? ` Ela já usou ${confirmar.cobranca.ciclo.usadas} de ${confirmar.cobranca.ciclo.total}; essas não são cobradas de novo.`
                      : " Nenhuma foi usada."}
                  </li>
                  <li>A assinatura continua. Para parar as próximas cobranças, cancele a assinatura também.</li>
                </ul>
              ) : (
                <ul className="list-disc pl-4 space-y-1">
                  <li>As próximas cobranças param e a cobrança que estava para vencer some do Asaas.</li>
                  <li>Se ela tem um ciclo pago em andamento, as escovas valem até o fim dele.</li>
                  <li>O valor já pago não volta. Para devolver, estorne a cobrança.</li>
                </ul>
              )}
            </Notice>

            <div className="np-field">
              <label className="np-field__label" htmlFor="clube-estorno-motivo">Motivo</label>
              <textarea
                id="clube-estorno-motivo"
                className="np-input !h-auto min-h-[88px] py-3 resize-y"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                placeholder="Ex.: cobrança duplicada, cliente pediu para sair"
                disabled={enviando}
                required
              />
              <span className="np-field__hint">
                {motivo.trim().length < MOTIVO_MINIMO ? `Pelo menos ${MOTIVO_MINIMO} letras.` : "Fica registrado com seu nome."}
              </span>
            </div>

            <PasswordInput
              label="Senha de autorização"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="off"
              name="senha-autorizacao-clube"
              data-lpignore="true"
              data-1p-ignore="true"
              disabled={enviando}
              required
            />

            {erroEnvio && (
              <Notice tone="danger" icon={AlertTriangle} title="Não foi feito">
                {erroEnvio}
              </Notice>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" icon={ArrowLeft} onClick={voltar} disabled={enviando}>
                Voltar
              </Button>
              <Button type="submit" variant="danger" loading={enviando} disabled={!podeEnviar}>
                {confirmar.tipo === "estorno" ? "Confirmar estorno" : "Confirmar cancelamento"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
