// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";
import { CHART_COLORS, CHART_GRID, CHART_TICK, CHART_TOOLTIP, NUM, ReportLoading, ReportTitle, TOTAL_ROW } from "./ReportKit";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = CHART_COLORS;

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0021({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0021-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ["report-0021-comandas", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select("id, professional_id, total, created_at")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const profMap: Record<string, { comandas: number; revenue: number }> = {};
    comandas.forEach((c: any) => {
      const pid = c.professional_id || "unknown";
      if (!profMap[pid]) profMap[pid] = { comandas: 0, revenue: 0 };
      profMap[pid].comandas++;
      profMap[pid].revenue += Number(c.total || 0);
    });

    return professionals
      .map(p => {
        const stats = profMap[p.id] || { comandas: 0, revenue: 0 };
        return {
          id: p.id,
          name: p.name,
          comandas: stats.comandas,
          revenue: stats.revenue,
          avgTicket: stats.comandas > 0 ? stats.revenue / stats.comandas : 0,
        };
      })
      .filter(p => p.comandas > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [professionals, comandas]);

  const chartData = useMemo(() => rows.map(r => ({ name: r.name, faturamento: r.revenue, ticket: r.avgTicket })), [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Profissional: r.name,
        Comandas: r.comandas,
        "Faturamento (R$)": r.revenue,
        "Ticket Médio (R$)": r.avgTicket,
      })),
      "relatorio-0021-faturamento-profissional"
    );
  };

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={UserCog}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Faturamento por Profissional
      </ReportTitle>

      <Card>
        <CardHeader><CardTitle className="np-display text-lg">Faturamento por Profissional</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_TICK} />
                  <YAxis tick={CHART_TICK} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, ""]} />
                  <Bar dataKey="faturamento" name="Faturamento" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado no período</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} profissional(is)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Comandas</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className={NUM}>{r.comandas}</TableCell>
                    <TableCell className={NUM}>R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM}>R$ {r.avgTicket.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                {rows.length > 0 && (
                  <TableRow className={TOTAL_ROW}>
                    <TableCell>TOTAL</TableCell>
                    <TableCell className={NUM}>{rows.reduce((s, r) => s + r.comandas, 0)}</TableCell>
                    <TableCell className={NUM}>R$ {rows.reduce((s, r) => s + r.revenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM}>R$ {(rows.reduce((s, r) => s + r.revenue, 0) / rows.reduce((s, r) => s + r.comandas, 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
