// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, ListOrdered } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { exportToExcel } from "./utils/exportExcel";

export function Report0033() {
  const { salonId } = useAuth();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["report-0033", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price, duration_minutes, commission_percent, is_active")
        .eq("salon_id", salonId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    services.forEach(s => {
      const cat = s.category || "Sem categoria";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  const handleExport = () => {
    exportToExcel(
      services.map(s => ({
        Categoria: s.category || "Sem categoria",
        Serviço: s.name,
        "Preço (R$)": s.price || 0,
        "Duração (min)": s.duration_minutes || 0,
        "Comissão (%)": s.commission_percent || 0,
        Ativo: s.is_active ? "Sim" : "Não",
      })),
      "relatorio-0033-tabela-precos"
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Tabela de Preços dos Serviços</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={services.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      {grouped.map(([category, svcList]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {category}
              <Badge variant="secondary">{svcList.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Preço</TableHead>
                    <TableHead className="text-right">Duração</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {svcList.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-right">R$ {Number(s.price || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="text-right">{s.duration_minutes || 0} min</TableCell>
                      <TableCell className="text-right">{s.commission_percent || 0}%</TableCell>
                      <TableCell>
                        <Badge variant={s.is_active ? "default" : "secondary"}>
                          {s.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
