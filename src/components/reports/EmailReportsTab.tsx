// @ts-nocheck
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    { name: "Enviados", value: stats.sent, color: "hsl(217, 91%, 50%)" },
    { name: "Entregues", value: stats.delivered, color: "hsl(142, 76%, 36%)" },
    { name: "Abertos", value: stats.opened, color: "hsl(38, 92%, 50%)" },
    { name: "Clicados", value: stats.clicked, color: "hsl(262, 83%, 58%)" },
    { name: "Falharam", value: stats.failed, color: "hsl(0, 84%, 60%)" },
  ], [stats]);

  const typeOptions = useMemo(() => {
    const types = [...new Set(emailLogs.map((l: any) => l.email_type))];
    return types.sort();
  }, [emailLogs]);

  const statusBadge = (log: any) => {
    if (log.clicked_at) return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100"><MousePointerClick className="h-3 w-3 mr-1" />Clicado</Badge>;
    if (log.opened_at) return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100"><Eye className="h-3 w-3 mr-1" />Aberto</Badge>;
    if (log.delivered_at) return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Entregue</Badge>;
    if (log.status === "sent") return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100"><Send className="h-3 w-3 mr-1" />Enviado</Badge>;
    if (log.status === "bounced") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Bounce</Badge>;
    if (log.status === "complained") return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Spam</Badge>;
    if (log.status === "failed") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
    return <Badge variant="secondary">{log.status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
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
          <SelectTrigger className="w-[200px]">
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
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: stats.total, icon: Mail, color: "text-primary" },
          { label: "Enviados", value: stats.sent, icon: Send, color: "text-blue-600" },
          { label: "Entregues", value: stats.delivered, icon: CheckCircle2, color: "text-green-600" },
          { label: "Abertos", value: stats.opened, icon: Eye, color: "text-amber-600" },
          { label: "Clicados", value: stats.clicked, icon: MousePointerClick, color: "text-purple-600" },
          { label: "Falharam", value: stats.failed, icon: AlertTriangle, color: "text-destructive" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-4 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-2 ${item.color}`} />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              {stats.total > 0 && item.label !== "Total" && (
                <p className="text-xs text-muted-foreground mt-1">
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
          <CardTitle className="text-lg">Funil de E-mails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
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
          <CardTitle className="text-lg">Histórico de E-mails ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum e-mail encontrado no período</p>
            </div>
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
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
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
