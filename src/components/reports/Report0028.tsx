// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0028({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0028-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-0028-items", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, unit_price, total_price, item_type, service_id, services(commission_percent), comandas!inner(id, salon_id, created_at, closed_at)")
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
    const profMap: Record<string, { profName: string; items: any[] }> = {};

    items.forEach((item: any) => {
      const pid = item.professional_id || "unknown";
      const prof = professionals.find(p => p.id === pid);
      if (!profMap[pid]) profMap[pid] = { profName: prof?.name || "Não atribuído", items: [] };

      const commissionPercent = item.services?.commission_percent || 0;
      const commission = (Number(item.total_price || 0) * commissionPercent) / 100;

      profMap[pid].items.push({
        date: item.comandas?.created_at,
        description: item.description || "Item",
        type: item.item_type === "service" ? "Serviço" : "Produto",
        total: Number(item.total_price || 0),
        commissionPercent,
        commission,
      });
    });

    return Object.entries(profMap)
      .map(([id, data]) => ({
        id,
        profName: data.profName,
        items: data.items.sort((a, b) => a.date?.localeCompare(b.date)),
        totalRevenue: data.items.reduce((s, i) => s + i.total, 0),
        totalCommission: data.items.reduce((s, i) => s + i.commission, 0),
      }))
      .filter(p => p.totalCommission > 0)
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [items, professionals]);

  const handleExport = () => {
    const exportRows: any[] = [];
    rows.forEach(r => {
      r.items.forEach(item => {
        if (item.commission > 0) {
          exportRows.push({
            Profissional: r.profName,
            Data: item.date ? format(new Date(item.date), "dd/MM/yyyy") : "",
            Descrição: item.description,
            Tipo: item.type,
            "Valor (R$)": item.total,
            "Comissão (%)": item.commissionPercent,
            "Comissão (R$)": item.commission,
          });
        }
      });
    });
    exportToExcel(exportRows, "relatorio-0028-comissoes");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Comissões Pagas no Período</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <p className="font-medium">{r.profName}</p>
              <p className="text-sm text-muted-foreground">Faturamento: R$ {r.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="text-lg font-bold text-primary">Comissão: R$ {r.totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            Total de comissões: R$ {rows.reduce((s, r) => s + r.totalCommission, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma comissão encontrada no período</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Comissão %</TableHead>
                    <TableHead className="text-right">Comissão R$</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.flatMap(r =>
                    r.items.filter(i => i.commission > 0).map((item, idx) => (
                      <TableRow key={`${r.id}-${idx}`}>
                        <TableCell className="font-medium">{r.profName}</TableCell>
                        <TableCell>{item.date ? format(new Date(item.date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.type}</TableCell>
                        <TableCell className="text-right">R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-right">{item.commissionPercent}%</TableCell>
                        <TableCell className="text-right font-medium">R$ {item.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell colSpan={4}>TOTAL</TableCell>
                    <TableCell className="text-right">R$ {rows.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">R$ {rows.reduce((s, r) => s + r.totalCommission, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
