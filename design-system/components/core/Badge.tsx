import * as React from "react";
import { cx } from "../../lib/cx";

/*
 * Badge / StatusPill partem do acervo 21st "25395-status" (diceui): pílula com indicador
 * de ponto que pulsa (anel em ping + miolo), slots data-slot="status|status-indicator|status-label".
 * Cores e tons vêm do export do Claude Design (âmbar sólido = "Da vez", verde = livre, vermelho = alerta).
 */

export type BadgeTone = "neutral" | "accent" | "positive" | "danger" | "solid";

export interface BadgeProps {
  tone?: BadgeTone;
  dot?: boolean;
  /** Ponto pulsando (ao vivo) */
  live?: boolean;
  size?: "md" | "lg";
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function StatusIndicator({ live = false, className }: { live?: boolean; className?: string }) {
  return <span data-slot="status-indicator" className={cx("np-badge__dot", live && "np-badge__dot--live", className)} aria-hidden="true" />;
}

export function Badge({ tone = "neutral", dot = false, live = false, size = "md", children, className, style }: BadgeProps) {
  return (
    <span
      data-slot="status"
      data-variant={tone}
      className={cx("np-badge", tone !== "neutral" && "np-badge--" + tone, live && "np-badge--live", size === "lg" && "np-badge--lg", className)}
      style={style}
    >
      {(dot || live) && <StatusIndicator live={live} />}
      <span data-slot="status-label">{children}</span>
    </span>
  );
}

export interface CountBadgeProps {
  count: number | string;
  tone?: "accent" | "danger";
  className?: string;
}

export function CountBadge({ count, tone = "accent", className }: CountBadgeProps) {
  return <span className={cx("np-count", tone === "danger" && "np-count--danger", className)}>{count}</span>;
}

export type ProfessionalStatus = "davez" | "livre" | "atendendo" | "pausa" | "ausente";

const STATUS: Record<ProfessionalStatus, { tone: BadgeTone; label: string; live: boolean }> = {
  davez: { tone: "solid", label: "Da vez", live: true },
  livre: { tone: "positive", label: "Livre", live: false },
  atendendo: { tone: "neutral", label: "Atendendo", live: true },
  pausa: { tone: "neutral", label: "Em pausa", live: false },
  ausente: { tone: "danger", label: "Ausente", live: false },
};

export interface StatusPillProps {
  /** davez = âmbar sólido · livre = verde · atendendo = neutro pulsando */
  status?: ProfessionalStatus;
  children?: React.ReactNode;
}

export function StatusPill({ status = "livre", children }: StatusPillProps) {
  const s = STATUS[status] ?? STATUS.livre;
  return (
    <Badge tone={s.tone} dot live={s.live}>
      {children ?? s.label}
    </Badge>
  );
}

export interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Avatar({ src, name = "", size = 40, className, style }: AvatarProps) {
  const ini = name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span className={cx("np-avatar", className)} style={{ width: size, height: size, fontSize: size * 0.36, ...style }}>
      {src ? <img src={src} alt={name} /> : ini}
    </span>
  );
}
