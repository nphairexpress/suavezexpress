// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0175({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0175-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-0175-items", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, total_price, item_type, comandas!inner(id, salon_id, created_at, closed_at)")
        .eq("item_type", "service")
        .eq("comandas.salon_id", salonId)
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("comandas.closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const profMap: Record<string, { profName: string; services: Record<string, { name: string; qty: number; revenue: number }> }> = {};

    items.forEach((item: any) => {
      const pid = item.professional_id || "unknown";
      const prof = professionals.find(p => p.id === pid);
      if (!profMap[pid]) profMap[pid] = { profName: prof?.name || "Não atribuído", services: {} };
      const svcName = item.description || "Serviço";
      if (!profMap[pid].services[svcName]) profMap[pid].services[svcName] = { name: svcName, qty: 0, revenue: 0 };
      profMap[pid].services[svcName].qty += item.quantity || 1;
      profMap[pid].services[svcName].revenue += Number(item.total_price || 0);
    });

    return Object.entries(profMap)
      .map(([id, data]) => ({
        id,
        profName: data.profName,
        services: Object.values(data.services).sort((a, b) => b.revenue - a.revenue),
        totalRevenue: Object.values(data.services).reduce((s, sv) => s + sv.revenue, 0),
        totalQty: Object.values(data.services).reduce((s, sv) => s + sv.qty, 0),
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [items, professionals]);

  const handleExport = () => {
    const exportRows: any[] = [];
    rows.forEach(r => {
      r.services.forEach(s => {
        exportRows.push({
          Profissional: r.profName,
          Serviço: s.name,
          Quantidade: s.qty,
          "Faturamento (R$)": s.revenue,
        });
      });
    });
    exportToExcel(exportRows, "relatorio-0175-faturamento-servico-profissional");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Faturamento de Serviço por Profissional</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum dado encontrado no período</CardContent></Card>
      ) : (
        rows.map(r => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>{r.profName}</span>
                <span className="text-primary">R$ {r.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serviço</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {r.services.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell className="text-right">{s.qty}</TableCell>
                        <TableCell className="text-right">R$ {s.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell>Subtotal</TableCell>
                      <TableCell className="text-right">{r.totalQty}</TableCell>
                      <TableCell className="text-right">R$ {r.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {rows.length > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4 flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL GERAL</span>
            <span className="font-bold text-lg text-primary">
              R$ {rows.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
