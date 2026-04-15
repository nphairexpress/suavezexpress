import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldAlert, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DeletionLog {
  id: string;
  comanda_id: string;
  client_name: string | null;
  professional_name: string | null;
  comanda_total: number;
  reason: string;
  deleted_by: string;
  original_created_at: string;
  original_closed_at: string | null;
  created_at: string;
  deleted_by_profile?: { full_name: string } | null;
}

export function AuditLogSection() {
  const { salonId } = useAuth();
  const [logs, setLogs] = useState<DeletionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!salonId) return;
    loadLogs();
  }, [salonId]);

  const loadLogs = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("comanda_deletions")
      .select("*, deleted_by_profile:profiles!comanda_deletions_deleted_by_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      setLogs(data as DeletionLog[]);
    } else {
      // If join fails, try without profile join
      const { data: fallback } = await supabase
        .from("comanda_deletions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((fallback || []) as DeletionLog[]);
    }
    setIsLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-semibold">Auditoria do Sistema</h2>
          <p className="text-sm text-muted-foreground">Registro de todas as ações críticas realizadas no sistema</p>
        </div>
      </div>

      {/* Comandas Excluídas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Trash2 className="h-4 w-4 text-destructive" />
            Comandas Excluídas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma exclusão registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data da Exclusão</TableHead>
                  <TableHead>Comanda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Excluída por</TableHead>
                  <TableHead>Status Original</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono text-muted-foreground">
                        #{log.comanda_id?.slice(0, 8).toUpperCase()}
                      </span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        {log.original_created_at && format(new Date(log.original_created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{log.client_name || "—"}</TableCell>
                    <TableCell>{log.professional_name || "—"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(log.comanda_total)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-sm">{log.reason || "Sem motivo"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {(log.deleted_by_profile as any)?.full_name || log.deleted_by?.slice(0, 8) || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.original_closed_at ? (
                        <Badge variant="secondary">Fechada</Badge>
                      ) : (
                        <Badge className="bg-amber-500">Aberta</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
