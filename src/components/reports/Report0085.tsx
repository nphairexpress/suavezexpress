// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";

const COLORS = ["hsl(217, 91%, 50%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"];

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
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Evolução do Faturamento Mensal</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Últimos 12 Meses</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]} />
                <Area type="monotone" dataKey="faturamento" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorFat)" />
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
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right">R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {(r.count > 0 ? r.revenue / r.count : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right">{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
                  <TableCell className="text-right">R$ {rows.reduce((s, r) => s + r.revenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
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
