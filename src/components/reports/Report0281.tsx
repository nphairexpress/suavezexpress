// @ts-nocheck
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { EmptyState } from "@design-system";
import { exportToExcel } from "./utils/exportExcel";
import { CHART_COLORS, CHART_GRID, CHART_TICK, CHART_TICK_SM, CHART_TOOLTIP, NUM, ReportLoading, ReportTitle, TOTAL_ROW } from "./ReportKit";
import {
  PieChart as RechartsPie, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = CHART_COLORS;
const METHOD_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  debit_card: "Cartão de Débito",
  credit_card: "Cartão de Crédito",
  other: "Outro",
  bank_transfer: "Transferência",
  check: "Cheque",
};

interface Props {
  dateRange: { from: Date; to: Date };
}

export function Report0281({ dateRange }: Props) {
  const { salonId } = useAuth();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["report-0281", salonId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("payments")
        .select("id, payment_method, amount, fee_amount, net_amount, created_at, comandas!inner(id, salon_id, created_at, closed_at)")
        .eq("comandas.salon_id", salonId)
        .gte("comandas.created_at", format(dateRange.from, "yyyy-MM-dd"))
        .lte("comandas.created_at", format(dateRange.to, "yyyy-MM-dd") + "T23:59:59")
        .not("comandas.closed_at", "is", null)
        .eq("voided", false);
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const rows = useMemo(() => {
    const methodMap: Record<string, { method: string; label: string; count: number; amount: number; fees: number; net: number }> = {};
    payments.forEach((p: any) => {
      const method = p.payment_method || "other";
      const label = METHOD_LABELS[method] || method;
      if (!methodMap[method]) methodMap[method] = { method, label, count: 0, amount: 0, fees: 0, net: 0 };
      methodMap[method].count++;
      methodMap[method].amount += Number(p.amount || 0);
      methodMap[method].fees += Number(p.fee_amount || 0);
      methodMap[method].net += Number(p.net_amount || p.amount || 0);
    });
    return Object.values(methodMap).sort((a, b) => b.amount - a.amount);
  }, [payments]);

  const chartData = useMemo(() => rows.map(r => ({ name: r.label, value: r.amount })), [rows]);
  const barData = useMemo(() => rows.map(r => ({ name: r.label, bruto: r.amount, liquido: r.net })), [rows]);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const handleExport = () => {
    exportToExcel(
      rows.map(r => ({
        "Forma de Pagamento": r.label,
        Quantidade: r.count,
        "Valor Bruto (R$)": r.amount,
        "Taxas (R$)": r.fees,
        "Valor Líquido (R$)": r.net,
        "% do Total": totalAmount > 0 ? ((r.amount / totalAmount) * 100).toFixed(1) + "%" : "0%",
      })),
      "relatorio-0281-formas-pagamento"
    );
  };

  if (isLoading) {
    return <ReportLoading />;
  }

  return (
    <div className="space-y-4">
      <ReportTitle
        icon={CreditCard}
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-2" />Exportar Excel
          </Button>
        }
      >
        Entradas por Forma de Pagamento
      </ReportTitle>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="np-display text-lg">Distribuição</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Legend wrapperStyle={{ color: "var(--np-text-secondary)", fontSize: 12 }} />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="np-display text-lg">Bruto vs Líquido</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                    <XAxis dataKey="name" tick={CHART_TICK_SM} />
                    <YAxis tick={CHART_TICK} tickFormatter={(v) => `R$${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
                    <Legend wrapperStyle={{ color: "var(--np-text-secondary)", fontSize: 12 }} />
                    <Bar dataKey="bruto" name="Bruto" fill="var(--np-accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="liquido" name="Líquido" fill="var(--np-positive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Nenhum dado</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm text-muted-foreground">{rows.length} forma(s) de pagamento</CardTitle></CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState icon="info" title="Nenhum pagamento no período" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma de Pagamento</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Valor Bruto</TableHead>
                    <TableHead className="text-right">Taxas</TableHead>
                    <TableHead className="text-right">Valor Líquido</TableHead>
                    <TableHead className="text-right">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.label}</TableCell>
                      <TableCell className={NUM}>{r.count}</TableCell>
                      <TableCell className={NUM}>R$ {r.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={NUM + " np-text-danger"}>R$ {r.fees.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={NUM}>R$ {r.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className={NUM}>{totalAmount > 0 ? ((r.amount / totalAmount) * 100).toFixed(1) : 0}%</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className={TOTAL_ROW}>
                    <TableCell>TOTAL</TableCell>
                    <TableCell className={NUM}>{rows.reduce((s, r) => s + r.count, 0)}</TableCell>
                    <TableCell className={NUM}>R$ {totalAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM + " np-text-danger"}>R$ {rows.reduce((s, r) => s + r.fees, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM}>R$ {rows.reduce((s, r) => s + r.net, 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</TableCell>
                    <TableCell className={NUM}>100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
