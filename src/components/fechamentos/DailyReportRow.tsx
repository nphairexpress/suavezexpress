import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface DailyReportRowProps {
  reportDate: string;
  kpis: any;
  issuesCount?: number;
  onClick: () => void;
}

// Mesmo valor, com separador de milhar (R$ 1.240,00)
const fmt = (n: number) =>
  `R$ ${Number(n ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function DailyReportRow({
  reportDate,
  kpis,
  issuesCount,
  onClick,
}: DailyReportRowProps) {
  const date = parseISO(reportDate);
  const weekday = format(date, "EEE", { locale: ptBR });
  const day = format(date, "dd/MM");
  const hasIssues = (issuesCount ?? 0) > 0;

  return (
    <button
      onClick={onClick}
      className="w-full min-h-[60px] flex items-center justify-between gap-3 px-4 py-3 bg-transparent hover:bg-[var(--np-surface-glass-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--np-accent)] transition text-left"
    >
      <div className="flex items-center gap-3">
        {hasIssues ? (
          <AlertTriangle className="text-[color:var(--np-danger-text)] shrink-0" size={18} />
        ) : (
          <CheckCircle2 className="text-[color:var(--np-positive-text)] shrink-0" size={18} />
        )}
        <div>
          <div className="[font-family:var(--np-font-display)] font-semibold text-foreground tabular-nums">
            {day} <span className="text-muted-foreground font-normal">{weekday}</span>
          </div>
          <div className="text-sm text-muted-foreground tabular-nums">
            {kpis?.bookings?.count ?? 0} atend · ticket{" "}
            {fmt(kpis?.bookings?.average_ticket ?? 0)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="[font-family:var(--np-font-display)] font-bold text-foreground tabular-nums">{fmt(kpis?.revenue?.gross ?? 0)}</div>
        {hasIssues && (
          <div className="text-xs font-semibold text-[color:var(--np-danger-text)]">
            {issuesCount} alerta{(issuesCount ?? 0) > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </button>
  );
}
