// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { exportToExcel } from "./utils/exportExcel";

export function Report0010() {
  const { salonId } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["report-0010", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, phone_landline")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const duplicates = useMemo(() => {
    const phoneMap: Record<string, any[]> = {};
    clients.forEach(c => {
      const phone = (c.phone || "").replace(/\D/g, "");
      if (phone.length >= 8) {
        if (!phoneMap[phone]) phoneMap[phone] = [];
        phoneMap[phone].push(c);
      }
    });
    return Object.entries(phoneMap)
      .filter(([_, arr]) => arr.length > 1)
      .map(([phone, arr]) => ({ phone, clients: arr, count: arr.length }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  const flatRows = useMemo(() => {
    return duplicates.flatMap(d =>
      d.clients.map(c => ({ ...c, duplicatePhone: d.phone, groupCount: d.count }))
    );
  }, [duplicates]);

  const handleExport = () => {
    exportToExcel(
      flatRows.map(r => ({
        "Celular Duplicado": r.duplicatePhone,
        "Qtd. Duplicatas": r.groupCount,
        Nome: r.name,
        Email: r.email || "",
        Celular: r.phone || "",
        Telefone: r.phone_landline || "",
      })),
      "relatorio-0010-celulares-duplicados"
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-semibold">Clientes com Celulares Duplicados</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={duplicates.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {duplicates.length} celular(es) duplicado(s) encontrado(s), afetando {flatRows.length} clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {duplicates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum celular duplicado encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Celular</TableHead>
                    <TableHead>Duplicatas</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone Fixo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicates.map(group => (
                    group.clients.map((c, i) => (
                      <TableRow key={c.id} className={i === 0 ? "border-t-2" : ""}>
                        {i === 0 && (
                          <TableCell rowSpan={group.count} className="align-top font-mono">
                            {group.phone}
                          </TableCell>
                        )}
                        {i === 0 && (
                          <TableCell rowSpan={group.count} className="align-top">
                            <Badge variant="destructive">{group.count}x</Badge>
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.email || "—"}</TableCell>
                        <TableCell>{c.phone_landline || "—"}</TableCell>
                      </TableRow>
                    ))
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
