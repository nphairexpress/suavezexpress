import * as React from "react";
import { Icon } from "../core/Icon";
import { EmptyState } from "./GlassCard";
import { cx } from "../../lib/cx";

/* Calendário lateral e lista de tarefas do trio de dashboards (@code.xr, "ig-codexr-dashboards-trio").
   Do código do acervo vem o comportamento da lista (clicar alterna "feito", com o título riscado)
   e a grade de 4 colunas; do export, o vidro, o âmbar e os textos em pt-BR. */

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["Do", "Se", "Te", "Qa", "Qi", "Sx", "Sa"];

export type DayMark = "accent" | "positive" | "danger";

export interface CalendarCardProps {
  year?: number;
  /** 0 = janeiro */
  month?: number;
  selected?: number;
  onSelect?: (day: number) => void;
  /** Dias marcados: { 12: 'positive', 18: 'danger', 24: 'accent' } */
  marks?: Record<number, DayMark>;
  /** Dias desabilitados (ex.: salão fechado) */
  disabledDays?: number[];
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function CalendarCard({ year = 2026, month = 8, selected, onSelect, marks = {}, disabledDays = [], compact = false, className, style }: CalendarCardProps) {
  const [ym, setYm] = React.useState({ y: year, m: month });
  const [sel, setSel] = React.useState(selected);
  const first = new Date(ym.y, ym.m, 1).getDay();
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array.from({ length: first }, () => null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const move = (d: number) =>
    setYm(({ y, m }) => {
      const n = m + d;
      return { y: y + Math.floor(n / 12), m: (n + 12) % 12 };
    });
  return (
    <div className={cx("np-cal", compact && "np-cal--compact", className)} style={style}>
      <div className="np-cal__head">
        <span className="np-cal__month">
          {MESES[ym.m]} {ym.y}
        </span>
        <div className="np-cal__nav">
          <button type="button" className="np-icon-btn np-icon-btn--sm np-icon-btn--round" aria-label="Mês anterior" onClick={() => move(-1)}>
            <Icon name="chevron-left" size={16} />
          </button>
          <button type="button" className="np-icon-btn np-icon-btn--sm np-icon-btn--round" aria-label="Próximo mês" onClick={() => move(1)}>
            <Icon name="chevron-right" size={16} />
          </button>
        </div>
      </div>
      <div className="np-cal__grid" role="grid">
        {DIAS.map((d) => (
          <span key={d} className="np-cal__dow">
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <span key={i} />;
          const mk = marks[d];
          const isSel = d === sel;
          const off = disabledDays.includes(d);
          return (
            <button
              key={i}
              type="button"
              disabled={off}
              aria-pressed={isSel}
              onClick={() => {
                setSel(d);
                onSelect?.(d);
              }}
              className={cx("np-cal__day", "np-num", isSel ? "is-selected" : mk && "is-" + mk)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface TaskItem {
  title: string;
  meta?: string;
  duration?: string;
  durationLabel?: string;
  /** 0–100 */
  progress: number;
  done?: boolean;
}

export interface TaskListProps {
  items: TaskItem[];
  /** Clicar na linha alterna "feito" (comportamento do acervo) */
  onToggle?: (index: number) => void;
  emptyLabel?: string;
}

export function TaskList({ items, onToggle, emptyLabel = "Nada pendente por aqui" }: TaskListProps) {
  if (!items.length) return <EmptyState icon="circle-check" title={emptyLabel} />;
  return (
    <div className="np-tasks">
      {items.map((t, i) => (
        <div
          key={i}
          className={cx("np-task", t.done && "is-done", onToggle && "is-clickable")}
          onClick={onToggle ? () => onToggle(i) : undefined}
          role={onToggle ? "button" : undefined}
          tabIndex={onToggle ? 0 : undefined}
          aria-pressed={onToggle ? !!t.done : undefined}
          onKeyDown={onToggle ? (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onToggle(i)) : undefined}
        >
          <div className="np-task__main">
            <div className="np-task__title">{t.title}</div>
            {t.meta && <div className="np-task__meta">{t.meta}</div>}
          </div>
          <div>
            <div className="np-task__meta">{t.durationLabel || "Duração"}</div>
            <div className="np-num np-task__dur">{t.duration}</div>
          </div>
          <div className="np-task__prog">
            <span className="np-num np-task__pct">{t.progress}%</span>
            <div className="np-progress">
              <span style={{ width: t.progress + "%" }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
