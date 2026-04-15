// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export function TopServices() {
  const { salonId } = useAuth();

  const { data: services = [] } = useQuery({
    queryKey: ["dashboard-top-services", salonId],
    queryFn: async () => {
      if (!salonId) return [];

      // Get last 30 days of comanda items with services
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: items } = await supabase
        .from("comanda_items")
        .select("service_id, quantity, total_price, comanda_id")
        .eq("item_type", "service")
        .not("service_id", "is", null)
        .gte("created_at", thirtyDaysAgo.toISOString());

      if (!items || items.length === 0) return [];

      // Get services for this salon
      const { data: salonServices } = await supabase
        .from("services")
        .select("id, name")
        .eq("salon_id", salonId);

      const serviceMap = new Map(salonServices?.map((s) => [s.id, s.name]) ?? []);
      const salonServiceIds = new Set(salonServices?.map((s) => s.id) ?? []);

      // Aggregate
      const agg: Record<string, { name: string; count: number; revenue: number }> = {};
      items.forEach((item) => {
        if (!item.service_id || !salonServiceIds.has(item.service_id)) return;
        if (!agg[item.service_id]) {
          agg[item.service_id] = {
            name: serviceMap.get(item.service_id) || "Serviço",
            count: 0,
            revenue: 0,
          };
        }
        agg[item.service_id].count += item.quantity;
        agg[item.service_id].revenue += item.total_price;
      });

      const sorted = Object.values(agg)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const maxRevenue = sorted[0]?.revenue || 1;
      return sorted.map((s) => ({
        ...s,
        percentage: Math.round((s.revenue / maxRevenue) * 100),
      }));
    },
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Serviços Mais Vendidos</CardTitle>
      </CardHeader>
      <CardContent>
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum serviço vendido nos últimos 30 dias
          </p>
        ) : (
          <div className="space-y-4">
            {services.map((service, index) => (
              <div key={service.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {index + 1}
                    </span>
                    <span className="font-medium">{service.name}</span>
                  </div>
                  <span className="text-muted-foreground">{service.count} vendas</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={service.percentage} className="h-2" />
                  <span className="text-sm font-medium min-w-[80px] text-right">
                    R$ {service.revenue.toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
