// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@design-system";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, UserCheck } from "lucide-react";
import { ReportTitle, ReportLoading, NUM, CHART_GRID, CHART_TICK, CHART_TOOLTIP } from "./ReportKit";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { exportToExcel } from "./utils/exportExcel";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["var(--np-accent)", "var(--np-positive)", "var(--np-text-secondary)", "var(--np-text-tertiary)", "var(--np-danger)"];

const PROFILES = {
  vip: { label: "VIP", color: "accent", minSpend: 2000, minVisits: 10 },
  frequente: { label: "Frequente", color: "positive", minSpend: 500, minVisits: 5 },
  regular: { label: "Regular", color: "neutral", minSpend: 200, minVisits: 2 },
  esporadico: { label: "Esporádico", color: "neutral", minSpend: 0, minVisits: 1 },
  inativo: { label: "Inativo", color: "danger", minSpend: 0, minVisits: 0 },
};

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0015({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: clients = [], isLoading: loadClients } = useQuery({
    queryKey: ["report-0015-clients", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase.from("clients_staff").select("id, name, email, phone").eq("salon_id", salonId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const { data: comandas = [], isLoading: loadComandas } = useQuery({
    queryKey: ["report-0015-comandas", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("comandas")
        .select("id, client_id, total, created_at")
        .eq("salon_id", salonId)
        .gte("created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("closed_at", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const clientStats: Record<string, { visits: number; total: number; lastVisit: string }> = {};
    comandas.forEach((c: any) => {
      if (!c.client_id) return;
      if (!clientStats[c.client_id]) clientStats[c.client_id] = { visits: 0, total: 0, lastVisit: "" };
      clientStats[c.client_id].visits++;
      clientStats[c.client_id].total += Number(c.total || 0);
      if (c.created_at > clientStats[c.client_id].lastVisit) clientStats[c.client_id].lastVisit = c.created_at;
    });

    return clients.map(client => {
      const stats = clientStats[client.id] || { visits: 0, total: 0, lastVisit: "" };
      let profile = "inativo";
      if (stats.total >= PROFILES.vip.minSpend && stats.visits >= PROFILES.vip.minVisits) profile = "vip";
      else if (stats.total >= PROFILES.frequente.minSpend && stats.visits >= PROFILES.frequente.minVisits) profile = "frequente";
      else if (stats.total >= PROFILES.regular.minSpend && stats.visits >= PROFILES.regular.minVisits) profile = "regular";
      else if (stats.visits >= PROFILES.esporadico.minVisits) profile = "esporadico";
      return { ...client, ...stats, profile };
    }).sort((a, b) => b.total - a.total);
  }, [clients, comandas]);

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[r.profile] = (counts[r.profile] || 0) + 1; });
    return Object.entries(PROFILES).map(([key, val]) => ({
      name: val.label,
      value: counts[key] || 0,
    }));
  }, [rows]);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        Nome: r.name,
        Email: r.email || "",
        Celular: r.phone || "",
        Perfil: PROFILES[r.profile as keyof typeof PROFILES]?.label || r.profile,
        Visitas: r.visits,
        "Total Gasto": r.total,
        "Última Visita": r.lastVisit ? format(new Date(r.lastVisit), "dd/MM/yyyy") : "",
      })),
      "relatorio-0015-perfil-compra"
    );
  };

  const isLoading = loadClients || loadComandas;

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={UserCheck}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Clientes por Perfil de Compra
      </ReportTitle>

      <Card>
        <CardHeader><CardTitle className="np-display text-lg">Distribuição de Perfis</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="name" tick={CHART_TICK} />
                <YAxis tick={CHART_TICK} />
                <Tooltip {...CHART_TOOLTIP} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} cliente(s)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Visitas</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead>Última Visita</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 200).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      <Badge tone={PROFILES[r.profile as keyof typeof PROFILES]?.color} dot>
                        {PROFILES[r.profile as keyof typeof PROFILES]?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={NUM}>{r.visits}</TableCell>
                    <TableCell className={NUM}>R$ {r.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className="tabular-nums">{r.lastVisit ? format(new Date(r.lastVisit), "dd/MM/yyyy") : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
