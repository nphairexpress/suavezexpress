// Gestão do Clube da Escova: assinaturas ativas/inadimplentes, uso dos
// créditos do mês e faturamento. Leitura pura — quem escreve nas tabelas do
// Clube é só o servidor (webhook Asaas / venda presencial).
import { useQuery } from "@tanstack/react-query";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Users, AlertTriangle, Banknote, Sparkles } from "lucide-react";

type Assinante = {
  id: string;
  nome: string | null;
  celular: string | null;
  plano: string;
  teto_mensal: number;
  status: string;
  created_at: string | null;
};

type Credito = { assinante_id: string; competencia: string; creditos_total: number; creditos_usados: number };

const PLANO_ROTULO: Record<string, { rotulo: string; valor: number }> = {
  "4x_curto_medio": { rotulo: "4x · curto/médio", valor: 197 },
  "4x_longo": { rotulo: "4x · longo", valor: 247 },
  "8x_curto_medio": { rotulo: "8x · curto/médio", valor: 347 },
  "8x_longo": { rotulo: "8x · longo", valor: 447 },
};

const brl = (n: number) => `R$ ${n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

function competenciaAtual(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" })
    .format(new Date()).slice(0, 7);
}

export default function ClubeAdmin() {
  const comp = competenciaAtual();

  const { data, isLoading } = useQuery({
    queryKey: ["clube-admin", comp],
    queryFn: async () => {
      const [assinantesRes, creditosRes, receitaRes] = await Promise.all([
        supabase.from("clube_assinantes").select("id, nome, celular, plano, teto_mensal, status, created_at").order("created_at", { ascending: false }),
        supabase.from("clube_creditos").select("assinante_id, competencia, creditos_total, creditos_usados").eq("competencia", comp),
        supabase.from("financial_transactions").select("amount, transaction_date")
          .eq("category", "Clube da Escova").eq("transaction_type", "income")
          .gte("transaction_date", `${comp}-01`),
      ]);
      return {
        assinantes: (assinantesRes.data ?? []) as Assinante[],
        creditos: (creditosRes.data ?? []) as Credito[],
        receitaMes: (receitaRes.data ?? []).reduce((s, t) => s + Number(t.amount || 0), 0),
      };
    },
  });

  const assinantes = data?.assinantes ?? [];
  const creditosPorAssinante = new Map((data?.creditos ?? []).map((c) => [c.assinante_id, c]));
  const ativos = assinantes.filter((a) => a.status === "ativo");
  const inadimplentes = assinantes.filter((a) => a.status === "inadimplente");
  const mrr = ativos.reduce((s, a) => s + (PLANO_ROTULO[a.plano]?.valor ?? 0), 0);
  const usadasMes = (data?.creditos ?? []).reduce((s, c) => s + c.creditos_usados, 0);

  return (
    <AppLayoutNew>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold">Clube da Escova</h1>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Users className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
            <p className="text-2xl font-bold">{ativos.length}</p>
            <p className="text-xs text-muted-foreground">Assinaturas ativas</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
            <p className="text-2xl font-bold">{inadimplentes.length}</p>
            <p className="text-xs text-muted-foreground">Inadimplentes</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Banknote className="h-5 w-5 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{brl(data?.receitaMes ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Recebido no mês</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Sparkles className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{usadasMes}</p>
            <p className="text-xs text-muted-foreground">Escovas usadas no mês</p>
          </CardContent></Card>
        </div>

        <p className="text-sm text-muted-foreground -mt-2">
          Potencial de recorrência (planos ativos): <b>{brl(mrr)}/mês</b>
        </p>

        <div className="border rounded-lg overflow-x-auto bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="p-3 font-medium">Assinante</th>
                <th className="p-3 font-medium">WhatsApp</th>
                <th className="p-3 font-medium">Plano</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Usadas no mês</th>
                <th className="p-3 font-medium">Faltam</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>
              ) : assinantes.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma assinatura ainda.</td></tr>
              ) : (
                assinantes.map((a) => {
                  const cred = creditosPorAssinante.get(a.id);
                  const teto = cred?.creditos_total ?? a.teto_mensal;
                  const usadas = cred?.creditos_usados ?? 0;
                  return (
                    <tr key={a.id} className="border-b last:border-b-0 hover:bg-muted/30">
                      <td className="p-3 font-medium">{a.nome ?? "—"}</td>
                      <td className="p-3 text-muted-foreground">{a.celular ?? "—"}</td>
                      <td className="p-3">
                        {PLANO_ROTULO[a.plano]?.rotulo ?? a.plano}
                        <span className="text-muted-foreground"> · {brl(PLANO_ROTULO[a.plano]?.valor ?? 0)}</span>
                      </td>
                      <td className="p-3">
                        {a.status === "ativo" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativa</Badge>
                        ) : a.status === "inadimplente" ? (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Inadimplente</Badge>
                        ) : (
                          <Badge variant="secondary">Cancelada</Badge>
                        )}
                      </td>
                      <td className="p-3">{usadas} de {teto}</td>
                      <td className="p-3 font-medium">{Math.max(0, teto - usadas)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayoutNew>
  );
}
