import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { PageHeader, GlassCard, StatCard, EmptyState, Badge, brl } from "@design-system";
import { txtAccent, txtPositive, inset } from "@/components/clients/clientsUi";
import { Loader2, Gift, Clock, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientLoyalty() {
  const { salonId } = useAuth();

  const { data: credits, isLoading } = useQuery({
    queryKey: ["client-credits", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("client_credits")
        .select("*, clients(name, email, phone)")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const stats = {
    total: credits?.length || 0,
    active: credits?.filter(c => !c.is_used && !c.is_expired && new Date(c.expires_at) > new Date()).length || 0,
    used: credits?.filter(c => c.is_used).length || 0,
    expired: credits?.filter(c => c.is_expired || (!c.is_used && new Date(c.expires_at) <= new Date())).length || 0,
    totalValue: credits?.filter(c => !c.is_used && !c.is_expired && new Date(c.expires_at) > new Date()).reduce((sum, c) => sum + Number(c.credit_amount), 0) || 0,
  };

  if (isLoading) {
    return <AppLayoutNew><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AppLayoutNew>;
  }

  return (
    <AppLayoutNew>
      <div className="space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Clientes"
          title="Programa de Fidelidade"
          description="Créditos de desconto gerados automaticamente ao fechar comandas (7% do valor, válido por 15 dias para compras acima de R$100)"
        />

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Créditos Gerados" value={stats.total} icon={Gift} />
          <StatCard title="Ativos" value={stats.active} icon={Clock} />
          <StatCard title="Utilizados" value={stats.used} icon={CheckCircle} />
          <StatCard title="Valor Ativo Total" value={brl(stats.totalValue)} />
        </div>

        {!credits || credits.length === 0 ? (
          <GlassCard>
            <EmptyState
              icon={Gift}
              title="Nenhum crédito gerado ainda"
              description="Créditos são gerados automaticamente ao fechar comandas"
              className="py-8"
            />
          </GlassCard>
        ) : (
          <GlassCard title="Histórico de Créditos" className="p-4 sm:p-6" padding="">
              <div className="space-y-3">
                {credits.map((credit: any) => {
                  const isExpired = credit.is_expired || (!credit.is_used && new Date(credit.expires_at) <= new Date());
                  const status = credit.is_used ? "used" : isExpired ? "expired" : "active";
                  const statusConfig = {
                    active: { label: "Ativo", tone: "accent" as const, icon: Clock },
                    used: { label: "Utilizado", tone: "positive" as const, icon: CheckCircle },
                    expired: { label: "Expirado", tone: "danger" as const, icon: XCircle },
                  };
                  const config = statusConfig[status];
                  const StatusIcon = config.icon;

                  return (
                    <div key={credit.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 ${inset}`}>
                      <div className="flex min-w-0 items-center gap-4">
                        <StatusIcon className={`h-5 w-5 shrink-0 ${status === "active" ? txtAccent : status === "used" ? txtPositive : "text-muted-foreground"}`} />
                        <div>
                          <p className="font-medium text-foreground">{(credit.clients as any)?.name || "Cliente"}</p>
                          <p className="text-sm text-muted-foreground tabular-nums">
                            Criado em {format(new Date(credit.created_at), "dd/MM/yyyy", { locale: ptBR })}
                            {" • "}Expira em {format(new Date(credit.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="np-num text-lg text-foreground">{brl(credit.credit_amount)}</span>
                        <Badge tone={config.tone}>{config.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>
        )}
      </div>
    </AppLayoutNew>
  );
}
