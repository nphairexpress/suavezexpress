import * as React from "react";
import { EmptyState } from "./GlassCard";

/* Gráficos em SVG do export (recriados do trio de dashboards do @code.xr): linha âmbar com
   brilho e área degradê; barras com destaque âmbar sólido. Sem recharts para não puxar o vendor-charts. */

function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return "";
  let d = "M" + pts[0][0] + "," + pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2[0] + "," + p2[1];
  }
  return d;
}

export interface LineChartProps {
  data: number[];
  labels?: string[];
  height?: number;
  /** Índice do ponto destacado (bolinha + etiqueta âmbar) */
  highlight?: number;
  format?: (v: number) => React.ReactNode;
  showGrid?: boolean;
  /** Texto do estado vazio */
  emptyLabel?: string;
}

export function LineChart({ data, labels = [], height = 180, highlight, format = (v) => v, showGrid = true, emptyLabel = "Sem dados no período" }: LineChartProps) {
  const uid = React.useId().replace(/:/g, "");
  if (!data || data.length < 2) return <EmptyState icon="chart-no-axes-column" title={emptyLabel} />;
  const W = 600;
  const H = height;
  const pad = { t: 28, r: 8, b: labels.length ? 24 : 6, l: 8 };
  const max = Math.max(...data) * 1.1 || 1;
  const pts = data.map((v, i) => [pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1), pad.t + (1 - v / max) * (H - pad.t - pad.b)] as [number, number]);
  const line = smoothPath(pts);
  const area = line + " L" + pts[pts.length - 1][0] + "," + (H - pad.b) + " L" + pts[0][0] + "," + (H - pad.b) + " Z";
  const hp = highlight != null ? pts[highlight] : null;
  return (
    <svg viewBox={"0 0 " + W + " " + H} width="100%" height={H} preserveAspectRatio="none" className="np-chart" role="img" aria-label="Gráfico de linha">
      <defs>
        <linearGradient id={"a" + uid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--np-chart-area)" }} />
          <stop offset="1" style={{ stopColor: "var(--np-accent)", stopOpacity: 0 }} />
        </linearGradient>
        <filter id={"g" + uid}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>
      {showGrid &&
        [0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + f * (H - pad.t - pad.b)} y2={pad.t + f * (H - pad.t - pad.b)} style={{ stroke: "var(--np-divider)" }} strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
      <path d={area} fill={"url(#a" + uid + ")"} />
      <path d={line} fill="none" style={{ stroke: "var(--np-accent)" }} strokeWidth="6" opacity=".35" filter={"url(#g" + uid + ")"} vectorEffect="non-scaling-stroke" />
      <path d={line} fill="none" style={{ stroke: "var(--np-accent-hover)" }} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      {hp && (
        <g>
          <line x1={hp[0]} x2={hp[0]} y1={hp[1]} y2={H - pad.b} style={{ stroke: "var(--np-accent)" }} strokeOpacity=".5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          <circle cx={hp[0]} cy={hp[1]} r="6" style={{ fill: "var(--np-bg-app)", stroke: "var(--np-accent-hover)" }} strokeWidth="3" />
        </g>
      )}
      {labels.map((l, i) => (
        <text key={i} x={pts[i] ? pts[i][0] : 0} y={H - 4} textAnchor="middle" fontSize="11" className="np-chart__label">
          {l}
        </text>
      ))}
      {hp && highlight != null && (
        <foreignObject x={hp[0] - 50} y={hp[1] - 34} width="100" height="26">
          <div className="np-chart__tip-wrap">
            <span className="np-num np-chart__tip">{format(data[highlight])}</span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

export interface BarChartProps {
  data: { label: string; value: number }[];
  height?: number;
  /** Barra em âmbar sólido com etiqueta */
  highlight?: number;
  format?: (v: number) => React.ReactNode;
  onSelect?: (index: number) => void;
  emptyLabel?: string;
}

export function BarChart({ data, height = 180, highlight, format = (v) => v, onSelect, emptyLabel = "Sem dados no período" }: BarChartProps) {
  if (!data || data.length === 0) return <EmptyState icon="chart-no-axes-column" title={emptyLabel} />;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  return (
    <div className="np-bars" style={{ height }} role="list">
      {data.map((d, i) => {
        const on = i === highlight;
        return (
          <button key={i} type="button" role="listitem" className={"np-bars__col" + (on ? " is-on" : "")} onClick={() => onSelect?.(i)} aria-pressed={on}>
            {on && <span className="np-num np-chart__tip">{format(d.value)}</span>}
            <span className="np-bars__bar" title={String(format(d.value))} style={{ height: (d.value / max) * (height - 50) }} />
            <span className="np-bars__label">{d.label}</span>
          </button>
        );
      })}
    </div>
  );
}
