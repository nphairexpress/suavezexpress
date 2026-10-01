// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@design-system";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Clock } from "lucide-react";
import { ReportTitle, ReportLoading, NUM } from "./ReportKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";

export function Report0020() {
  const { salonId } = useAuth();

  const { data: clients = [], isLoading: loadClients } = useQuery({
    queryKey: ["report-0020-clients", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("clients_staff")
        .select("id, name, email, phone, return_days")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: comandas = [], isLoading: loadComandas } = useQuery({
    queryKey: ["report-0020-comandas", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select("id, client_id, created_at")
        .eq("salon_id", salonId)
        .not("closed_at", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const lastVisit: Record<string, string> = {};
    comandas.forEach((c: any) => {
      if (c.client_id && (!lastVisit[c.client_id] || c.created_at > lastVisit[c.client_id])) {
        lastVisit[c.client_id] = c.created_at;
      }
    });

    const today = new Date();
    return clients
      .filter(c => c.return_days && c.return_days > 0 && lastVisit[c.id])
      .map(c => {
        const last = new Date(lastVisit[c.id]);
        const daysSince = differenceInDays(today, last);
        const delay = daysSince - (c.return_days || 30);
        return { ...c, lastVisitDate: lastVisit[c.id], daysSince, returnDays: c.return_days, delay };
      })
      .filter(c => c.delay > 0)
      .sort((a, b) => b.delay - a.delay);
  }, [clients, comandas]);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Nome: r.name,
        Email: r.email || "",
        Celular: r.phone || "",
        "Última Visita": format(new Date(r.lastVisitDate), "dd/MM/yyyy"),
        "Retorno Recomendado (dias)": r.returnDays,
        "Dias desde última visita": r.daysSince,
        "Dias de Atraso": r.delay,
      })),
      "relatorio-0020-retorno-atrasado"
    );
  };

  const isLoading = loadClients || loadComandas;

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={Clock}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Clientes com Retorno Atrasado
      </ReportTitle>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {rows.length} cliente(s) com retorno atrasado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon="circle-check"
              title={'Nenhum cliente com retorno atrasado. Verifique se os clientes possuem "dias de retorno" configurados.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Celular</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead className="text-right">Retorno (dias)</TableHead>
                    <TableHead className="text-right">Dias Passados</TableHead>
                    <TableHead className="text-right">Atraso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="tabular-nums">{r.phone || "—"}</TableCell>
                      <TableCell className="tabular-nums">{format(new Date(r.lastVisitDate), "dd/MM/yyyy")}</TableCell>
                      <TableCell className={NUM}>{r.returnDays}</TableCell>
                      <TableCell className={NUM}>{r.daysSince}</TableCell>
                      <TableCell className="text-right">
                        <Badge tone={r.delay > 30 ? "danger" : "accent"} dot className="tabular-nums">
                          {r.delay} dias
                        </Badge>
                      </TableCell>
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
