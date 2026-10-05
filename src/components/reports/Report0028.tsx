// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Coins } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EmptyState } from "@design-system";
import { exportToExcel } from "./utils/exportExcel";
import { NUM, ReportLoading, ReportTitle, TOTAL_ROW } from "./ReportKit";
import { resolveCommissionPercent, effectiveProfessionalId, profServiceKey } from "@/lib/commissionPercent";
import { useProfClientCommissionMap } from "@/hooks/useProfessionalClientCommissions";

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0028({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: professionals = [] } = useQuery({
    queryKey: ["report-0028-profs", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professionals").select("id, name, commission_percent, package_commission_percent").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  // Mesma cascata da tela de Comissões (src/lib/commissionPercent.ts)
  const { data: profServiceRows = [] } = useQuery({
    queryKey: ["report-0028-psc", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("professional_service_commissions").select("professional_id, service_id, commission_percent");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });
  const profServiceMap = useMemo(() => {
    const m = new Map<string, number>();
    profServiceRows.forEach((c: any) => m.set(profServiceKey(c.professional_id, c.service_id), c.commission_percent));
    return m;
  }, [profServiceRows]);
  const { map: profClientMap } = useProfClientCommissionMap();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["report-0028-items", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, professional_id, quantity, unit_price, total_price, item_type, service_id, services(commission_percent), comandas!inner(id, salon_id, created_at, closed_at, client_id, professional_id)")
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

      const effProfId = effectiveProfessionalId(item.professional_id, item.comandas?.professional_id);
      const { percent: commissionPercent } = resolveCommissionPercent({
        itemType: item.item_type,
        serviceId: item.service_id,
        professionalId: effProfId,
        clientId: item.comandas?.client_id,
        professional: professionals.find(p => p.id === effProfId),
        servicePercent: item.services?.commission_percent,
        profServicePercents: profServiceMap,
        profClientPercents: profClientMap,
      });
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
  }, [items, professionals, profServiceMap, profClientMap]);

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
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={Coins}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Comissões Pagas no Período
      </ReportTitle>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(r => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <p className="np-display text-base">{r.profName}</p>
              <p className="text-sm tabular-nums text-muted-foreground">Faturamento: R$ {r.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
              <p className="np-num mt-1 text-lg text-[color:var(--np-accent-text)]">Comissão: R$ {r.totalCommission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm tabular-nums text-muted-foreground">
            Total de comissões: R$ {rows.reduce((s, r) => s + r.totalCommission, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon="info" title="Nenhuma comissão encontrada no período" />
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
                        <TableCell className={NUM}>R$ {item.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                        <TableCell className={NUM}>{item.commissionPercent}%</TableCell>
                        <TableCell className={NUM + " font-medium"}>R$ {item.commission.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className={TOTAL_ROW}>
                    <TableCell colSpan={4}>TOTAL</TableCell>
                    <TableCell className={NUM}>R$ {rows.reduce((s, r) => s + r.totalRevenue, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell></TableCell>
                    <TableCell className={NUM}>R$ {rows.reduce((s, r) => s + r.totalCommission, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
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
