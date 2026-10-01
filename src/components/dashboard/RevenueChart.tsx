// @ts-nocheck
import { useState } from "react";
import { GlassCard, BarChart, brl } from "@design-system";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";

const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function RevenueChart() {
  const { salonId } = useAuth();

  const { data: chartData = [] } = useQuery({
    queryKey: ["dashboard-revenue-chart", salonId],
    queryFn: async () => {
      if (!salonId) return [];

      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 7);

      const { data: comandas } = await supabase
        .from("comandas")
        .select("total, closed_at")
        .eq("salon_id", salonId)
        .eq("is_paid", true)
        .gte("closed_at", monday.toISOString())
        .lt("closed_at", sunday.toISOString());

      // Build daily totals Mon-Sun
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return {
          date: d,
          name: dayNames[(1 + i) % 7 === 0 ? 0 : (1 + i) % 7],
          receita: 0,
        };
      });
      // Fix day names: Mon=1, Tue=2...Sun=0
      days[0].name = "Seg";
      days[1].name = "Ter";
      days[2].name = "Qua";
      days[3].name = "Qui";
      days[4].name = "Sex";
      days[5].name = "Sáb";
      days[6].name = "Dom";

      comandas?.forEach((c) => {
        if (!c.closed_at) return;
        const closedDate = new Date(c.closed_at);
        const diffDays = Math.floor((closedDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          days[diffDays].receita += c.total || 0;
        }
      });

      return days.map(({ name, receita }) => ({ name, receita }));
    },
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Destaque começa no dia de hoje (Seg = 0 ... Dom = 6), mesma ordem do array acima.
  // Clicar numa barra mostra o valor daquele dia (substitui o tooltip do recharts).
  const [selectedDay, setSelectedDay] = useState(() => (new Date().getDay() + 6) % 7);

  return (
    <GlassCard title="Faturamento da Semana">
      <BarChart
        data={chartData.map((d) => ({ label: d.name, value: d.receita }))}
        height={300}
        highlight={selectedDay}
        onSelect={setSelectedDay}
        format={(v) => brl(v)}
      />
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: "var(--np-accent)" }} />
          <span style={{ color: "var(--np-text-secondary)" }}>Faturamento Real</span>
        </div>
      </div>
    </GlassCard>
  );
}
