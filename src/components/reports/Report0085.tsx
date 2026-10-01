// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";
import { CHART_COLORS, CHART_GRID, CHART_TICK, CHART_TOOLTIP, NUM, ReportLoading, ReportTitle, TOTAL_ROW } from "./ReportKit";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = CHART_COLORS;

export function Report0085() {
  const { salonId } = useAuth();

  // Fetch last 12 months of comandas
  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ["report-0085", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const from = startOfMonth(subMonths(new Date(), 11));
      const { data, error } = await supabase
        .from("comandas")
        .select("id, total, created_at")
        .eq("salon_id", salonId)
        .gte("created_at", format(from, "yyyy-MM-dd"))
        .not("closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const monthMap: Record<string, { month: string; monthLabel: string; revenue: number; count: number }> = {};

    // Pre-fill last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, "yyyy-MM");
      const label = format(d, "MMM/yy", { locale: ptBR });
      monthMap[key] = { month: key, monthLabel: label, revenue: 0, count: 0 };
    }

    comandas.forEach((c: any) => {
      const key = format(new Date(c.created_at), "yyyy-MM");
      if (monthMap[key]) {
        monthMap[key].revenue += Number(c.total || 0);
        monthMap[key].count++;
      }
    });

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [comandas]);

  const chartData = useMemo(() => rows.map(r => ({ name: r.monthLabel, faturamento: r.revenue })), [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Mês: r.monthLabel,
        Comandas: r.count,
        "Faturamento (R$)": r.revenue,
        "Ticket Médio (R$)": r.count > 0 ? r.revenue / r.count : 0,
      })),
      "relatorio-0085-evolucao-faturamento"
    );
  };

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={TrendingUp}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Evolução do Faturamento Mensal
      </ReportTitle>

      <Card>
        <CardHeader><CardTitle className="np-display text-lg">Últimos 12 Meses</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--np-accent)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--np-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="name" tick={CHART_TICK} />
                <YAxis tick={CHART_TICK} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]} />
                <Area type="monotone" dataKey="faturamento" stroke="var(--np-accent)" strokeWidth={2} fillOpacity={1} fill="url(#colorFat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Comandas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.month}>
                    <TableCell className="font-medium capitalize">{r.monthLabel}</TableCell>
                    <TableCell className={NUM}>{r.count}</TableCell>
                    <TableCell className={NUM}>R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM}>R$ {(r.count > 0 ? r.revenue / r.count : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                <TableRow className={TOTAL_ROW}>
                  <TableCell>TOTAL</TableCell>
                  <TableCell className={NUM}>{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
                  <TableCell className={NUM}>R$ {rows.reduce((s, r) => s + r.revenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
