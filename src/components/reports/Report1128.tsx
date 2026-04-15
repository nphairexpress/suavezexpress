// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, UserCog } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const COLORS = ["hsl(217, 91%, 50%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)", "hsl(330, 80%, 50%)", "hsl(180, 70%, 40%)"];

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report1128({ dateRange }: Props) {
  const { salonId } = useAuth();
  const [selectedProf, setSelectedProf] = useState<string>("all");

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-1128-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-1128-items", salonId, dateRange.from, dateRange.to, selectedProf],
    queryFn: async () => {
      if (!salonId || selectedProf === "all") return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, total_price, item_type, service_id, services(category), comandas!inner(id, salon_id, created_at, closed_at)")
        .eq("professional_id", selectedProf)
        .eq("comandas.salon_id", salonId)
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("comandas.closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId && selectedProf !== "all",
  });

  const rows = useMemo(() => {
    const catMap: Record<string, { category: string; quantity: number; revenue: number }> = {};
    items.forEach((item: any) => {
      const category = item.services?.category || (item.item_type === "product" ? "Produtos" : "Sem categoria");
      if (!catMap[category]) catMap[category] = { category, quantity: 0, revenue: 0 };
      catMap[category].quantity += item.quantity || 1;
      catMap[category].revenue += Number(item.total_price || 0);
    });
    return Object.values(catMap).sort((a, b) => b.revenue - a.revenue);
  }, [items]);

  const chartData = useMemo(() => rows.map(r => ({ name: r.category, value: r.revenue })), [rows]);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);

  const handleExport = () => {
    const profName = professionals.find(p => p.id === selectedProf)?.name || "profissional";
    exportToExcel(
      rows.map(r => ({
        Categoria: r.category,
        Quantidade: r.quantity,
        "Faturamento (R$)": r.revenue,
        "% do Total": totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) + "%" : "0%",
      })),
      `relatorio-1128-${profName}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Vendas por Categoria — Profissional</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedProf} onValueChange={setSelectedProf}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um profissional" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Selecione um profissional...</SelectItem>
            {professionals.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProf === "all" ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Selecione um profissional para ver as vendas por categoria</CardContent></Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribuição por Categoria</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                      <Legend />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado no período</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} categoria(s)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">% do Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell className="text-right">{r.quantity}</TableCell>
                        <TableCell className="text-right">R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{totalRevenue > 0 ? ((r.revenue / totalRevenue) * 100).toFixed(1) : 0}%</TableCell>
                      </TableRow>
                    ))}
                    {rows.length > 0 && (
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{rows.reduce((s, r) => s + r.quantity, 0)}</TableCell>
                        <TableCell className="text-right">R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
