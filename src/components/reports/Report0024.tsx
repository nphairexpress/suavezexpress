// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Scissors } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const COLORS = ["hsl(217, 91%, 50%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"];

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0024({ dateRange }: Props) {
  const { salonId } = useAuth();
  const [selectedProf, setSelectedProf] = useState<string>("all");

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0024-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-0024-items", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, total_price, item_type, comandas!inner(id, salon_id, created_at, closed_at)")
        .eq("comandas.salon_id", salonId)
        .eq("item_type", "service")
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("comandas.closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const filtered = selectedProf === "all" ? items : items.filter((i: any) => i.professional_id === selectedProf);
    const serviceMap: Record<string, { profName: string; serviceName: string; quantity: number; revenue: number }> = {};

    filtered.forEach((item: any) => {
      const prof = professionals.find(p => p.id === item.professional_id);
      const key = `${item.professional_id}-${item.description}`;
      if (!serviceMap[key]) {
        serviceMap[key] = { profName: prof?.name || "Não atribuído", serviceName: item.description || "Serviço", quantity: 0, revenue: 0 };
      }
      serviceMap[key].quantity += item.quantity || 1;
      serviceMap[key].revenue += Number(item.total_price || 0);
    });

    return Object.values(serviceMap)
      .map(s => ({ ...s, avgPrice: s.quantity > 0 ? s.revenue / s.quantity : 0 }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [items, selectedProf, professionals]);

  const chartData = useMemo(() => rows.slice(0, 10).map(r => ({ name: r.serviceName.substring(0, 20), quantidade: r.quantity, faturamento: r.revenue })), [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Profissional: r.profName,
        Serviço: r.serviceName,
        Quantidade: r.quantity,
        "Faturamento (R$)": r.revenue,
        "Valor Médio (R$)": r.avgPrice,
      })),
      "relatorio-0024-servicos-profissional"
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Serviços por Profissional</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedProf} onValueChange={setSelectedProf}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Todos os profissionais" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os profissionais</SelectItem>
            {professionals.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Top 10 Serviços</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                  <Legend />
                  <Bar dataKey="quantidade" name="Quantidade" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado no período</div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} registro(s)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Valor Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.profName}</TableCell>
                    <TableCell>{r.serviceName}</TableCell>
                    <TableCell className="text-right">{r.quantity}</TableCell>
                    <TableCell className="text-right">R$ {r.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">R$ {r.avgPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
                {rows.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TableCell className="text-right">{rows.reduce((s, r) => s + r.quantity, 0)}</TableCell>
                    <TableCell className="text-right">R$ {rows.reduce((s, r) => s + r.revenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell></TableCell>
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
