// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { exportToExcel } from "./utils/exportExcel";

export function Report0004() {
  const { salonId } = useAuth();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["report-0004", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, email, phone, phone_landline, birth_date, cpf")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const handleExport = () => {
    exportToExcel(
      clients.map(c => ({
        Nome: c.name,
        Email: c.email || "",
        Celular: c.phone || "",
        Telefone: c.phone_landline || "",
        Aniversário: c.birth_date ? format(new Date(c.birth_date), "dd/MM/yyyy") : "",
        CPF: c.cpf || "",
      })),
      "relatorio-0004-clientes"
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Lista de Clientes — Dados Cadastrais</h3>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={clients.length === 0}>
          <Download className="h-4 w-4 mr-2" />Exportar Excel
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{clients.length} cliente(s) encontrado(s)</CardTitle></CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum cliente cadastrado</div>
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
                    <TableHead>CPF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>{c.phone_landline || "—"}</TableCell>
                      <TableCell>{c.birth_date ? format(new Date(c.birth_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell>{c.cpf || "—"}</TableCell>
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
