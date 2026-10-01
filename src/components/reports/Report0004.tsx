// @ts-nocheck
import { useMemo } from "react";
import { RecordsTable } from "@design-system";
import { Button } from "@/components/ui/button";
import { Download, Users } from "lucide-react";
import { ReportTitle, ReportLoading } from "./ReportKit";
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
        .from("clients_staff")
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
    return <ReportLoading />;
  }

  const fmtBirth = (c: any) => (c.birth_date ? format(new Date(c.birth_date), "dd/MM/yyyy") : "—");

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={Users}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={clients.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Lista de Clientes — Dados Cadastrais
      </ReportTitle>

      <p className="text-sm text-muted-foreground">{clients.length} cliente(s) encontrado(s)</p>

      <RecordsTable
        aria-label="Lista de clientes com dados cadastrais"
        rows={clients}
        getRowId={(c: any) => c.id}
        selectable={false}
        emptyTitle="Nenhum cliente cadastrado"
        primary={{ header: "Nome", render: (c: any) => <span className="font-medium">{c.name}</span> }}
        columns={[
          { key: "email", header: "Email", render: (c: any) => c.email || "—" },
          { key: "phone", header: "Celular", render: (c: any) => <span className="tabular-nums">{c.phone || "—"}</span> },
          { key: "landline", header: "Telefone", render: (c: any) => <span className="tabular-nums">{c.phone_landline || "—"}</span> },
          { key: "birth", header: "Aniversário", render: (c: any) => <span className="tabular-nums">{fmtBirth(c)}</span> },
          { key: "cpf", header: "CPF", render: (c: any) => <span className="tabular-nums">{c.cpf || "—"}</span> },
        ]}
      />
    </div>
  );
}
