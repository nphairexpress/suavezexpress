import { DollarSign } from "lucide-react";
import { GlassCard, Button, Skeleton } from "@design-system";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useServices } from "@/hooks/useServices";
import { useCommissionSettings } from "@/hooks/useCommissionSettings";
import { useMemo } from "react";
import { resolveCommissionPercent, profServiceKey } from "@/lib/commissionPercent";
import { useProfClientCommissionMap } from "@/hooks/useProfessionalClientCommissions";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface ProfessionalCommissionSummaryProps {
  professionalId: string;
  commissionPercent: number;
}

export function ProfessionalCommissionSummary({ professionalId, commissionPercent }: ProfessionalCommissionSummaryProps) {
  const { salonId } = useAuth();
  const navigate = useNavigate();
  const { services } = useServices();
  const { settings: commissionSettings } = useCommissionSettings();

  const serviceMap = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach(s => map.set(s.id, s.commission_percent || 0));
    return map;
  }, [services]);

  // Load per-professional per-service commission overrides
  const { data: profServiceCommissions } = useQuery({
    queryKey: ["prof-service-commissions", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .select("service_id, commission_percent")
        .eq("professional_id", professionalId);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!professionalId,
  });

  const profCommMap = useMemo(() => {
    const map = new Map<string, number>();
    (profServiceCommissions ?? []).forEach(c => map.set(profServiceKey(professionalId, c.service_id), c.commission_percent));
    return map;
  }, [profServiceCommissions, professionalId]);

  // Regra por par (profissional, cliente), acima do par profissional/serviço (05/10/2026)
  const { map: profClientMap } = useProfClientCommissionMap(professionalId, !!professionalId);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-commission-summary", salonId, professionalId, profCommMap.size, profClientMap.size, commissionSettings.service_cost_enabled, commissionSettings.product_cost_deduction],
    queryFn: async () => {
      if (!salonId || !professionalId) return null;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // Get comanda items for this professional this month
      const { data: items } = await supabase
        .from("comanda_items")
        .select("total_price, product_cost, service_id, comanda_id, item_type")
        .eq("professional_id", professionalId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      if (!items || items.length === 0) {
        return { totalServices: 0, totalCommission: 0, itemCount: 0 };
      }

      // Get comandas for card fee calculation
      const comandaIds = [...new Set(items.map(i => i.comanda_id))];
      const { data: comandas } = await supabase
        .from("comandas")
        .select("id, total, payments, client_id")
        .in("id", comandaIds);

      const comandaMap = new Map(comandas?.map(c => [c.id, c]) ?? []);

      let totalServices = 0;
      let totalCommission = 0;

      items.forEach(item => {
        const itemTotal = item.total_price || 0;
        const productCost = commissionSettings.service_cost_enabled ? (item.product_cost || 0) : 0;

        // Card fee proportional
        const comanda = comandaMap.get(item.comanda_id);
        let cardFee = 0;
        if (comanda) {
          const payments = comanda.payments || [];
          const totalCardFees = payments.reduce((sum: number, p: any) => sum + (p.fee_amount || 0), 0);
          const comandaTotal = comanda.total || 0;
          if (comandaTotal > 0 && totalCardFees > 0) {
            cardFee = (itemTotal / comandaTotal) * totalCardFees;
          }
        }

        // Cascata única (src/lib/commissionPercent.ts): cliente > profissional/serviço > serviço > profissional
        const { percent: itemCommissionPercent } = resolveCommissionPercent({
          itemType: item.item_type,
          serviceId: item.service_id,
          professionalId,
          clientId: comanda?.client_id,
          professional: { commission_percent: commissionPercent },
          servicePercent: item.service_id ? serviceMap.get(item.service_id) : undefined,
          profServicePercents: profCommMap,
          profClientPercents: profClientMap,
        });

        let commission: number;
        if (commissionSettings.product_cost_deduction === "after_commission") {
          const netValue = itemTotal - cardFee;
          commission = (netValue * itemCommissionPercent) / 100 - productCost;
        } else {
          const netValue = itemTotal - productCost - cardFee;
          commission = (netValue * itemCommissionPercent) / 100;
        }

        totalServices += itemTotal;
        totalCommission += commission;
      });

      return { totalServices, totalCommission, itemCount: items.length };
    },
    enabled: !!salonId && !!professionalId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <GlassCard title="Minha Comissão do Mês">
      {isLoading ? (
        <Skeleton lines={2} />
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between gap-2 text-sm">
            <span style={{ color: "var(--np-text-secondary)" }}>Total em serviços:</span>
            <span className="np-num font-medium" style={{ color: "var(--np-text-primary)" }}>{formatCurrency(data?.totalServices ?? 0)}</span>
          </div>
          <div className="flex justify-between gap-2 text-sm">
            <span style={{ color: "var(--np-text-secondary)" }}>Serviços realizados:</span>
            <span className="np-num font-medium" style={{ color: "var(--np-text-primary)" }}>{data?.itemCount ?? 0}</span>
          </div>
          <div className="pt-3" style={{ borderTop: "1px solid var(--np-divider)" }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium" style={{ color: "var(--np-text-primary)" }}>Comissão estimada:</span>
              <span className="np-num text-xl md:text-2xl" style={{ color: "var(--np-accent-text)" }}>
                {formatCurrency(data?.totalCommission ?? 0)}
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            icon={DollarSign}
            block
            className="mt-2"
            onClick={() => navigate("/comissoes")}
          >
            Ver Relatório Completo
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
