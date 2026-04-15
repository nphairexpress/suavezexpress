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
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0008({ dateRange }: Props) {
  const { salonId } = useAuth();
  const [selectedService, setSelectedService] = useState<string>("all");

  const { data: services = [] } = useQuery({
    queryKey: ["report-0008-services", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("services").select("id, name").eq("salon_id", salonId).eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ["report-0008-data", salonId, dateRange.from, dateRange.to, selectedService],
    queryFn: async () => {
      if (!salonId || selectedService === "all") return [];
      const { data, error } = await supabase
        .from("comanda_items")
        .select("id, description, quantity, total_price, comanda_id, comandas!inner(id, created_at, closed_at, salon_id, clients(id, name, email, phone, phone_landline, birth_date))")
        .eq("service_id", selectedService)
        .eq("comandas.salon_id", salonId)
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId && selectedService !== "all",
  });

  const rows = useMemo(() => {
    const clientMap: Record<string, { name: string; email: string; phone: string; phone_landline: string; birth_date: string; visits: number; total: number }> = {};
    comandas.forEach((item: any) => {
      const client = item.comandas?.clients;
      if (!client) return;
      const key = client.id;
      if (!clientMap[key]) {
        clientMap[key] = { name: client.name, email: client.email || "", phone: client.phone || "", phone_landline: client.phone_landline || "", birth_date: client.birth_date || "", visits: 0, total: 0 };
      }
      clientMap[key].visits += item.quantity || 1;
      clientMap[key].total += Number(item.total_price || 0);
    });
    return Object.values(clientMap).sort((a, b) => b.visits - a.visits);
  }, [comandas]);

  const handleExport = () => {
    const serviceName = services.find(s => s.id === selectedService)?.name || "servico";
    exportToExcel(
      rows.map(r => ({
        Nome: r.name,
        Email: r.email,
        Celular: r.phone,
        Telefone: r.phone_landline,
        Aniversário: r.birth_date ? format(new Date(r.birth_date), "dd/MM/yyyy") : "",
        Visitas: r.visits,
        "Total Gasto": r.total,
      })),
      `relatorio-0008-${serviceName}`
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Clientes por Serviço no Período</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Selecione um serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Selecione um serviço...</SelectItem>
            {services.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedService === "all" ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Selecione um serviço para ver os clientes</CardContent></Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} cliente(s) encontrado(s)</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado para este serviço no período</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Aniversário</TableHead>
                      <TableHead className="text-right">Visitas</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell>{r.phone_landline || "—"}</TableCell>
                        <TableCell>{r.birth_date ? format(new Date(r.birth_date), "dd/MM/yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">{r.visits}</TableCell>
                        <TableCell className="text-right">R$ {r.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
