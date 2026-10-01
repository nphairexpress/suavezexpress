// @ts-nocheck
import { useState } from "react";
import { EmptyState, GlassCard, Skeleton } from "@design-system";
import { display } from "@/components/financeiro/glass";
import { BarChart3 } from "lucide-react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyReports } from "@/hooks/useDailyReports";
import { DailyReportRow } from "@/components/fechamentos/DailyReportRow";
import { DailyReportDetailModal } from "@/components/fechamentos/DailyReportDetailModal";
import { MonthlyReportButton } from "@/components/fechamentos/MonthlyReportButton";
import { ExtratoTab } from "@/components/fechamentos/ExtratoTab";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface SelectedReport {
  date: string;
  kpis: any;
}

export default function Fechamentos() {
  const { salonId } = useAuth();
  const { data: reports, isLoading, error } = useDailyReports(salonId);
  const [selected, setSelected] = useState<SelectedReport | null>(null);

  return (
    <AppLayoutNew>
      <div className="max-w-5xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <BarChart3 className="h-8 w-8 text-[color:var(--np-accent-text)] shrink-0 mt-1" />
            <div>
              <h1 className={`${display} text-2xl md:text-3xl font-bold tracking-tight text-foreground`}>Fechamentos</h1>
              <p className="text-muted-foreground text-sm">
                Relatórios diários consolidados (PagBank + comandas + pendências)
              </p>
            </div>
          </div>
          <MonthlyReportButton salonId={salonId} />
        </header>

        <Tabs defaultValue="diarios" className="space-y-4">
          <TabsList className="grid h-12 grid-cols-2 w-full sm:w-[420px]">
            <TabsTrigger value="diarios">Relatórios diários</TabsTrigger>
            <TabsTrigger value="extrato">Extrato bancário</TabsTrigger>
          </TabsList>

          <TabsContent value="diarios" className="space-y-2">
            {isLoading && (
              <GlassCard radius="xl" padding={20} aria-label="Carregando…">
                <Skeleton lines={4} />
              </GlassCard>
            )}

            {error && (
              <div className="p-4 text-sm text-[color:var(--np-danger-text)] bg-[var(--np-danger-soft)] border border-[color:var(--np-danger-border)] rounded-xl">
                Erro ao carregar fechamentos:{" "}
                {String((error as any)?.message ?? error)}
              </div>
            )}

            {!isLoading && !error && (reports?.length ?? 0) === 0 && (
              <GlassCard radius="xl">
                <EmptyState
                  icon="calendar"
                  title="Nenhum fechamento gerado ainda."
                  description={'Use "Gerar Mensal" ou aguarde o cron das 7h.'}
                />
              </GlassCard>
            )}

            {(reports?.length ?? 0) > 0 && (
            <GlassCard radius="xl" padding={0} className="overflow-hidden">
              <div className="hidden sm:flex items-center justify-between border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Dia · atendimentos · ticket médio</span>
                <span>Faturamento</span>
              </div>
              <div className="divide-y divide-border">
              {reports?.map((r: any) => (
                <DailyReportRow
                  key={r.id}
                  reportDate={r.report_date}
                  kpis={r.kpis}
                  issuesCount={(r.kpis as any)?._issues_count}
                  onClick={() =>
                    setSelected({ date: r.report_date, kpis: r.kpis })
                  }
                />
              ))}
              </div>
            </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="extrato">
            <ExtratoTab />
          </TabsContent>
        </Tabs>

        {selected && (
          <DailyReportDetailModal
            open
            onClose={() => setSelected(null)}
            reportDate={selected.date}
            kpis={selected.kpis}
          />
        )}
      </div>
    </AppLayoutNew>
  );
}
