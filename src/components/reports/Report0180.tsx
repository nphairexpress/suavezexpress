// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0180({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0180-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name").eq("salon_id", salonId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-0180-items", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, unit_price, total_price, item_type, comandas!inner(id, salon_id, created_at, closed_at, clients(name))")
        .eq("comandas.salon_id", salonId)
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("comandas.closed_at", "is", null)
        .order("created_at", { referencedTable: "comandas", ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    return items.map((item: any) => {
      const prof = professionals.find(p => p.id === item.professional_id);
      return {
        date: item.comandas?.created_at,
        client: item.comandas?.clients?.name || "—",
        description: item.description || "Item",
        type: item.item_type,
        profName: prof?.name || "—",
        quantity: item.quantity || 1,
        unitPrice: Number(item.unit_price || 0),
        total: Number(item.total_price || 0),
      };
    });
  }, [items, professionals]);

  const totalServices = rows.filter(r => r.type === "service").reduce((s, r) => s + r.total, 0);
  const totalProducts = rows.filter(r => r.type === "product").reduce((s, r) => s + r.total, 0);
  const totalGeral = rows.reduce((s, r) => s + r.total, 0);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Data: r.date ? format(new Date(r.date), "dd/MM/yyyy") : "",
        Cliente: r.client,
        Descrição: r.description,
        Tipo: r.type === "service" ? "Serviço" : "Produto",
        Profissional: r.profName,
        Qtd: r.quantity,
        "Valor Unit. (R$)": r.unitPrice,
        "Total (R$)": r.total,
      })),
      "relatorio-0180-servicos-produtos-vendidos"
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Serviços e Produtos Vendidos</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Serviços</p>
            <p className="text-xl font-bold">R$ {totalServices.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Produtos</p>
            <p className="text-xl font-bold">R$ {totalProducts.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Geral</p>
            <p className="text-xl font-bold text-primary">R$ {totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} item(ns) vendido(s)</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum item vendido no período</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Vlr. Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 500).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">{r.date ? format(new Date(r.date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{r.client}</TableCell>
                      <TableCell>{r.description}</TableCell>
                      <TableCell>
                        <Badge variant={r.type === "service" ? "default" : "secondary"}>
                          {r.type === "service" ? "Serviço" : "Produto"}
                        </Badge>
                      </TableCell>
                      <TableCell>{r.profName}</TableCell>
                      <TableCell className="text-right">{r.quantity}</TableCell>
                      <TableCell className="text-right">R$ {r.unitPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right font-medium">R$ {r.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
