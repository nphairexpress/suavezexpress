// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, EmptyState } from "@design-system";
import { ReportLoading, CHART_GRID, CHART_TICK, CHART_TOOLTIP } from "./ReportKit";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, Send, Eye, MousePointerClick, AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const TYPE_LABELS: Record<string, string> = {
  cashback: "Cashback",
  expiring: "Cashback Expirando",
  birthday: "Aniversário",
  welcome: "Boas-vindas",
  campaign: "Campanha",
  return_reminder: "Lembrete de Retorno",
};

const PERIOD_OPTIONS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Últimos 90 dias", days: 90 },
];

export function EmailReportsTab() {
  const { salonId } = useAuth();
  const [period, setPeriod] = useState(30);
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: emailLogs = [], isLoading } = useQuery({
    queryKey: ["email-reports", salonId, period],
    queryFn: async () => {
      if (!salonId) return [];
      const since = subDays(new Date(), period).toISOString();
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("salon_id", salonId)
        .gte("created_at", since)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const filtered = useMemo(() => {
    if (typeFilter === "all") return emailLogs;
    return emailLogs.filter((l: any) => l.email_type === typeFilter);
  }, [emailLogs, typeFilter]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const sent = filtered.filter((l: any) => l.status === "sent").length;
    const delivered = filtered.filter((l: any) => l.delivered_at).length;
    const opened = filtered.filter((l: any) => l.opened_at).length;
    const clicked = filtered.filter((l: any) => l.clicked_at).length;
    const failed = filtered.filter((l: any) => l.status === "failed" || l.status === "bounced" || l.status === "complained").length;
    return { total, sent, delivered, opened, clicked, failed };
  }, [filtered]);

  const chartData = useMemo(() => [
    { name: "Enviados", value: stats.sent, color: "var(--np-text-secondary)" },
    { name: "Entregues", value: stats.delivered, color: "var(--np-positive)" },
    { name: "Abertos", value: stats.opened, color: "var(--np-accent)" },
    { name: "Clicados", value: stats.clicked, color: "var(--np-amber-300)" },
    { name: "Falharam", value: stats.failed, color: "var(--np-danger)" },
  ], [stats]);

  const typeOptions = useMemo(() => {
    const types = [...new Set(emailLogs.map((l: any) => l.email_type))];
    return types.sort();
  }, [emailLogs]);

  const statusBadge = (log: any) => {
    const ic = "h-3 w-3 mr-1 inline-block align-[-2px]";
    if (log.clicked_at) return <Badge tone="accent"><MousePointerClick className={ic} />Clicado</Badge>;
    if (log.opened_at) return <Badge tone="accent"><Eye className={ic} />Aberto</Badge>;
    if (log.delivered_at) return <Badge tone="positive"><CheckCircle2 className={ic} />Entregue</Badge>;
    if (log.status === "sent") return <Badge tone="neutral"><Send className={ic} />Enviado</Badge>;
    if (log.status === "bounced") return <Badge tone="danger"><XCircle className={ic} />Bounce</Badge>;
    if (log.status === "complained") return <Badge tone="danger"><AlertTriangle className={ic} />Spam</Badge>;
    if (log.status === "failed") return <Badge tone="danger"><XCircle className={ic} />Falhou</Badge>;
    return <Badge tone="neutral">{log.status}</Badge>;
  };

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <Button
              key={opt.days}
              variant={period === opt.days ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-11 w-full sm:w-[200px]">
            <SelectValue placeholder="Tipo de e-mail" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {typeOptions.map(t => (
              <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total, icon: Mail, color: "var(--np-accent-text)" },
          { label: "Enviados", value: stats.sent, icon: Send, color: "var(--np-text-secondary)" },
          { label: "Entregues", value: stats.delivered, icon: CheckCircle2, color: "var(--np-positive-text)" },
          { label: "Abertos", value: stats.opened, icon: Eye, color: "var(--np-accent-text)" },
          { label: "Clicados", value: stats.clicked, icon: MousePointerClick, color: "var(--np-accent-text)" },
          { label: "Falharam", value: stats.failed, icon: AlertTriangle, color: "var(--np-danger-text)" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <item.icon className="h-5 w-5 mx-auto mb-2" style={{ color: item.color }} />
              <p className="np-num text-2xl text-foreground">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {stats.total > 0 && item.label !== "Total" && (
                <p className="text-xs tabular-nums text-muted-foreground mt-1">
                  {((item.value / stats.total) * 100).toFixed(1)}%
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="np-display text-lg">Funil de E-mails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="name" tick={CHART_TICK} />
                  <YAxis tick={CHART_TICK} />
                  <Tooltip {...CHART_TOOLTIP} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhum e-mail enviado no período
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="np-display text-lg">Histórico de E-mails ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <EmptyState icon={Mail} title="Nenhum e-mail encontrado no período" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm tabular-nums">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge tone="neutral">
                          {TYPE_LABELS[log.email_type] || log.email_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">{log.subject}</TableCell>
                      <TableCell className="text-sm">{log.to_email || "—"}</TableCell>
                      <TableCell>{statusBadge(log)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-destructive">
                        {log.error_message || "—"}
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
