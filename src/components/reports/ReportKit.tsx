// Peças visuais compartilhadas pelos relatórios (só apresentação; nenhuma regra de dado aqui).
import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paleta categórica dos gráficos, presa aos tokens do tema (muda sozinha entre claro e escuro). */
export const CHART_COLORS = [
  "var(--np-accent)",
  "var(--np-positive)",
  "var(--np-text-secondary)",
  "var(--np-danger)",
  "var(--np-amber-300)",
  "var(--np-green-700)",
  "var(--np-amber-ink)",
  "var(--np-red-700)",
];

export const CHART_GRID = "var(--np-divider)";
export const CHART_TICK = { fill: "var(--np-text-tertiary)", fontSize: 12 };
export const CHART_TICK_SM = { fill: "var(--np-text-tertiary)", fontSize: 11 };
export const CHART_TOOLTIP = {
  contentStyle: {
    backgroundColor: "var(--np-surface-glass-strong)",
    border: "1px solid var(--np-border-strong)",
    borderRadius: 12,
    color: "var(--np-text-primary)",
    backdropFilter: "blur(12px)",
  },
  labelStyle: { color: "var(--np-text-primary)", fontWeight: 600 },
  itemStyle: { color: "var(--np-text-secondary)" },
  cursor: { fill: "var(--np-surface-inset)" },
};

/** Cabeçalho de um relatório: ícone em chip âmbar suave, título Montserrat e ações (exportar) à direita. */
export function ReportTitle({
  icon: IconCmp,
  tone = "accent",
  children,
  actions,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "accent" | "danger";
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {IconCmp && (
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={
              tone === "danger"
                ? { background: "var(--np-danger-soft)", color: "var(--np-danger-text)" }
                : { background: "var(--np-accent-soft)", color: "var(--np-accent-text)" }
            }
          >
            <IconCmp className="h-5 w-5" />
          </span>
        )}
        <h3 className="np-display min-w-0 text-lg text-foreground sm:text-xl">{children}</h3>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Carregando padrão dos relatórios. */
export function ReportLoading() {
  return (
    <div className="flex h-64 items-center justify-center" aria-busy="true">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Classes das células numéricas (alinhadas à direita, números tabulares). */
export const NUM = "text-right tabular-nums";
/** Linha de total em destaque. */
export const TOTAL_ROW = "bg-muted/60 font-bold tabular-nums text-foreground hover:bg-muted/60 border-t-2 border-border";

/** Pílula de valor com tom semântico (verde, vermelho, âmbar, neutro), legível nos dois temas. */
export function ToneText({ tone, className, children }: { tone: "positive" | "danger" | "accent" | "muted"; className?: string; children: React.ReactNode }) {
  const color =
    tone === "positive"
      ? "var(--np-positive-text)"
      : tone === "danger"
        ? "var(--np-danger-text)"
        : tone === "accent"
          ? "var(--np-accent-text)"
          : "var(--np-text-secondary)";
  return (
    <span className={cn("tabular-nums", className)} style={{ color }}>
      {children}
    </span>
  );
}
