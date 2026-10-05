// Gestão do Clube da Escova: assinaturas ativas/inadimplentes, uso dos
// ciclo de 30 dias (a partir do pagamento confirmado) e faturamento. Leitura pura — quem escreve nas tabelas do
// Clube é só o servidor (webhook Asaas / venda presencial / edge clube-estorno, aberta pelo botão Cobranças).
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { VenderClubeModal } from "@/components/clube/VenderClubeModal";
import { CobrancasClubeModal } from "@/components/clube/CobrancasClubeModal";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";
import { Crown, Users, AlertTriangle, Banknote, Sparkles, Receipt } from "lucide-react";
import { PageHeader, StatCard, GlassCard, Badge, Button, EmptyState, Skeleton } from "@design-system";

type Assinante = {
  id: string;
  nome: string | null;
  celular: string | null;
  plano: string;
  teto_mensal: number;
  status: string;
  created_at: string | null;
  cancelada_em: string | null;
};

type Credito = {
  assinante_id: string; creditos_total: number; creditos_usados: number; inicio: string; fim: string;
  origem: string; maos_usadas: number; pes_usados: number;
};

// ciclos de pacote (unha/esmaltação) convivem com o da escova na mesma assinante
const PACOTE_ESMALTACAO_VALOR = 148;
const ehEscova = (c: Credito) => c.origem !== "pacote_unha" && c.origem !== "pacote_esmaltacao";

function usoDoCiclo(c: Credito): { texto: string; faltam: number } {
  if (c.origem === "pacote_unha") {
    return { texto: `Mãos ${c.maos_usadas} de 4 · Pés ${c.pes_usados} de 2`, faltam: Math.max(0, 4 - c.maos_usadas) + Math.max(0, 2 - c.pes_usados) };
  }
  const t = c.origem === "pacote_esmaltacao" ? "Esmaltação " : "";
  return { texto: `${t}${c.creditos_usados} de ${c.creditos_total}`, faltam: Math.max(0, c.creditos_total - c.creditos_usados) };
}

const fmtDia = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(iso));

const PLANO_ROTULO: Record<string, { rotulo: string; valor: number }> = {
  "4x_curto_medio": { rotulo: "4x · curto/médio", valor: 197 },
  "4x_longo": { rotulo: "4x · longo", valor: 247 },
  "8x_curto_medio": { rotulo: "8x · curto/médio", valor: 347 },
  "8x_longo": { rotulo: "8x · longo", valor: 447 },
  unha_4m2p: { rotulo: "Unha · 4 mãos + 2 pés", valor: 237 },
  esmaltacao_4x: { rotulo: "Esmaltação · 4/mês", valor: 148 },
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

function competenciaAtual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(new Date()).slice(0, 7);
}

export default function ClubeAdmin() {
  const comp = competenciaAtual();
  const agora = new Date().toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["clube-admin", comp],
    queryFn: async () => {
      const [assinantesRes, creditosRes, receitaRes] = await Promise.all([
        supabase.from("clube_assinantes").select("id, nome, celular, plano, teto_mensal, status, created_at, cancelada_em").order("created_at", { ascending: false }),
        // ciclos ATIVOS agora (inicio <= agora < fim); um assinante pode ter mais de um se renovou antes do fim
        supabase.from("clube_creditos").select("assinante_id, creditos_total, creditos_usados, inicio, fim, origem, maos_usadas, pes_usados")
          .eq("bloqueado", false).lte("inicio", agora).gt("fim", agora).order("fim", { ascending: true }),
        // receitas menos estornos (despesa "Estorno Clube da Escova", mesma categoria) do mês
        supabase.from("financial_transactions").select("amount, transaction_date, transaction_type")
          .eq("category", "Clube da Escova").in("transaction_type", ["income", "expense"])
          .gte("transaction_date", `${comp}-01`),
      ]);
      return {
        assinantes: (assinantesRes.data ?? []) as Assinante[],
        creditos: (creditosRes.data ?? []) as Credito[],
        receitaMes: (receitaRes.data ?? []).reduce(
          (s, t) => s + (t.transaction_type === "expense" ? -1 : 1) * Number(t.amount || 0), 0),
      };
    },
  });

  const assinantes = data?.assinantes ?? [];
  // ciclo vigente POR TIPO (escova / unha / esmaltação) = o ativo que termina primeiro (ordem já vem por fim asc)
  const creditosPorAssinante = new Map<string, Credito[]>();
  for (const c of data?.creditos ?? []) {
    const lista = creditosPorAssinante.get(c.assinante_id) ?? [];
    const tipo = ehEscova(c) ? "escova" : c.origem;
    if (!lista.some((x) => (ehEscova(x) ? "escova" : x.origem) === tipo)) lista.push(c);
    creditosPorAssinante.set(c.assinante_id, lista);
  }
  // cancelada com ciclo pago ainda valendo: segue "ativo" no motor, mas não conta como assinatura ativa
  const ativos = assinantes.filter((a) => a.status === "ativo" && !a.cancelada_em);
  const inadimplentes = assinantes.filter((a) => a.status === "inadimplente");
  const mrr = ativos.reduce((s, a) => s + (PLANO_ROTULO[a.plano]?.valor ?? 0)
    + ((creditosPorAssinante.get(a.id) ?? []).some((c) => c.origem === "pacote_esmaltacao") ? PACOTE_ESMALTACAO_VALOR : 0), 0);
  const usadasCiclos = (data?.creditos ?? []).filter(ehEscova).reduce((s, c) => s + c.creditos_usados, 0);

  const [venderOpen, setVenderOpen] = useState(false);
  const [cobrancasDe, setCobrancasDe] = useState<{ id: string; nome: string | null } | null>(null);
  const { pode } = useSalonPermissions();
  const podeEstornar = pode("clube.estornar_cancelar");

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Assinaturas"
          title="Clube da Escova"
          description={<>Potencial de recorrência (planos ativos): <b className="np-num whitespace-nowrap text-foreground">{brl(mrr)}/mês</b></>}
          actions={<Button variant="secondary" icon={Crown} onClick={() => setVenderOpen(true)}>Vender Clube</Button>}
        />

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Assinaturas ativas" value={ativos.length} icon={Users} loading={isLoading} />
          <StatCard title="Inadimplentes" value={<span className={inadimplentes.length ? "np-text-danger" : undefined}>{inadimplentes.length}</span>} icon={AlertTriangle} loading={isLoading} />
          <StatCard title="Recebido no mês" value={brl(data?.receitaMes ?? 0)} icon={Banknote} loading={isLoading} />
          <StatCard title="Escovas usadas nos ciclos ativos" value={usadasCiclos} icon={Sparkles} loading={isLoading} />
        </div>

        <GlassCard title="Assinantes" subtitle={isLoading ? undefined : `${assinantes.length} no total`} padding={0} className="overflow-hidden [&>.np-card-head]:px-6 [&>.np-card-head]:pt-6">
          {isLoading ? (
            <div className="p-6"><Skeleton lines={4} /></div>
          ) : assinantes.length === 0 ? (
            <EmptyState icon={Crown} title="Nenhuma assinatura ainda." />
          ) : (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Assinante</th>
                      <th className="px-3 py-3 font-medium">WhatsApp</th>
                      <th className="px-3 py-3 font-medium">Plano</th>
                      <th className="px-3 py-3 font-medium">Status</th>
                      <th className="px-3 py-3 font-medium">Usadas no ciclo</th>
                      <th className="px-3 py-3 font-medium">Ciclo válido até</th>
                      <th className="px-6 py-3 font-medium text-right">Faltam</th>
                      {podeEstornar && <th className="px-6 py-3 font-medium text-right"><span className="sr-only">Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {assinantes.map((a) => {
                      // sem ciclo ativo = sem pagamento confirmado válido hoje: nada disponível
                      const ciclos = creditosPorAssinante.get(a.id) ?? [];
                      const temEsmaltacao = ciclos.some((c) => c.origem === "pacote_esmaltacao");
                      return (
                        <tr key={a.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-3 font-semibold text-foreground">{a.nome ?? "—"}</td>
                          <td className="px-3 py-3 text-muted-foreground">{a.celular ?? "—"}</td>
                          <td className="px-3 py-3">
                            {PLANO_ROTULO[a.plano]?.rotulo ?? a.plano}
                            <span className="text-muted-foreground whitespace-nowrap"> · {brl(PLANO_ROTULO[a.plano]?.valor ?? 0)}</span>
                            {temEsmaltacao && (
                              <div>Esmaltação · 4/mês<span className="text-muted-foreground whitespace-nowrap"> · {brl(PACOTE_ESMALTACAO_VALOR)}</span></div>
                            )}
                          </td>
                          <td className="px-3 py-3"><StatusAssinante status={a.status} cancelada={a.cancelada_em} ciclos={ciclos} /></td>
                          <td className="px-3 py-3">{ciclos.length ? ciclos.map((c) => <div key={c.origem + c.fim}>{usoDoCiclo(c).texto}</div>) : "—"}</td>
                          <td className="px-3 py-3">{ciclos.length ? ciclos.map((c) => <div key={c.origem + c.fim}>{fmtDia(c.fim)}</div>) : <span className="np-text-danger">sem ciclo ativo</span>}</td>
                          <td className="px-6 py-3 text-right font-semibold">{ciclos.length ? ciclos.map((c) => <div key={c.origem + c.fim}>{usoDoCiclo(c).faltam}</div>) : 0}</td>
                          {podeEstornar && (
                            <td className="px-6 py-3 text-right">
                              <Button variant="ghost" size="sm" icon={Receipt} onClick={() => setCobrancasDe({ id: a.id, nome: a.nome })}>
                                Cobranças
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Celular: um cartão por assinante */}
              <ul className="md:hidden divide-y divide-border">
                {assinantes.map((a) => {
                  const ciclos = creditosPorAssinante.get(a.id) ?? [];
                  const temEsmaltacao = ciclos.some((c) => c.origem === "pacote_esmaltacao");
                  return (
                    <li key={a.id} className="px-4 py-4 space-y-2 tabular-nums">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">{a.nome ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.celular ?? "—"}</div>
                        </div>
                        <StatusAssinante status={a.status} cancelada={a.cancelada_em} ciclos={ciclos} />
                      </div>
                      <div className="text-sm">
                        {PLANO_ROTULO[a.plano]?.rotulo ?? a.plano}
                        <span className="text-muted-foreground whitespace-nowrap"> · {brl(PLANO_ROTULO[a.plano]?.valor ?? 0)}</span>
                        {temEsmaltacao && (
                          <div>Esmaltação · 4/mês<span className="text-muted-foreground whitespace-nowrap"> · {brl(PACOTE_ESMALTACAO_VALOR)}</span></div>
                        )}
                      </div>
                      {ciclos.length ? (
                        ciclos.map((c) => (
                          <div key={c.origem + c.fim} className="flex flex-wrap items-center justify-between gap-x-3 text-sm rounded-lg bg-muted/40 px-3 py-2">
                            <span>{usoDoCiclo(c).texto}</span>
                            <span className="text-muted-foreground">até {fmtDia(c.fim)} · faltam <b className="text-foreground">{usoDoCiclo(c).faltam}</b></span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm np-text-danger">sem ciclo ativo</div>
                      )}
                      {podeEstornar && (
                        <Button variant="secondary" block icon={Receipt} onClick={() => setCobrancasDe({ id: a.id, nome: a.nome })}>
                          Cobranças
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </GlassCard>
      </div>
      <VenderClubeModal open={venderOpen} onClose={() => setVenderOpen(false)} />
      {podeEstornar && <CobrancasClubeModal assinante={cobrancasDe} onClose={() => setCobrancasDe(null)} />}
    </AppLayoutNew>
  );
}

function StatusAssinante({ status, cancelada, ciclos }: { status: string; cancelada?: string | null; ciclos?: Credito[] }) {
  if (status === "ativo" && cancelada) {
    const ate = (ciclos ?? []).map((c) => c.fim).sort().at(-1);
    return <Badge dot>{ate ? `Cancelada · vale até ${fmtDia(ate)}` : "Cancelada"}</Badge>;
  }
  if (status === "ativo") return <Badge tone="positive" dot>Ativa</Badge>;
  if (status === "inadimplente") return <Badge tone="danger" dot>Inadimplente</Badge>;
  return <Badge>Cancelada</Badge>;
}
