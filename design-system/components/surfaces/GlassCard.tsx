import * as React from "react";
import { motion } from "framer-motion";
import { Icon, type IconSource } from "../core/Icon";
import { cx } from "../../lib/cx";

/**
 * Cartão de vidro: base de todas as superfícies (blur 20 px, borda branca 10 %, sombra suave).
 * Estados: default · hover (lift sobe 5 px) · selected (borda e brilho âmbar) · loading (esqueleto) · vazio (EmptyState).
 */
export interface GlassCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  as?: "div" | "section" | "article" | "aside" | "li";
  /** Sobe 5 px no hover (padrão motion.div whileHover y:-5 do @code.xr) */
  lift?: boolean;
  /** lg = 16 px (rounded-2xl) · xl = 24 px (painéis grandes, tema claro) */
  radius?: "lg" | "xl";
  tone?: "default" | "strong" | "accent";
  /** Brilho âmbar ao redor */
  glow?: boolean;
  /** Selecionado: borda âmbar + brilho */
  selected?: boolean;
  /** Mostra esqueleto no lugar do conteúdo */
  loading?: boolean;
  padding?: number | string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Elemento à direita do título (botão, abas, link) */
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export function Skeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx("np-skeleton-stack", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <span key={i} className="np-skeleton" style={{ width: i === lines - 1 ? "60%" : "100%" }} />
      ))}
    </div>
  );
}

export function GlassCard({
  as = "div",
  lift = false,
  radius = "lg",
  tone = "default",
  glow = false,
  selected = false,
  loading = false,
  padding = 24,
  title,
  subtitle,
  action,
  children,
  className,
  style,
  ...rest
}: GlassCardProps) {
  const Tag = as as React.ElementType;
  const onAccent = tone === "accent";
  return (
    <Tag
      className={cx(
        "np-glass-card",
        lift && "np-glass-card--lift",
        radius === "xl" && "np-glass-card--xl",
        tone !== "default" && "np-glass-card--" + tone,
        glow && "np-glass-card--glow",
        selected && "np-glass-card--selected",
        className,
      )}
      style={{ padding, ...style }}
      aria-busy={loading || undefined}
      aria-selected={selected || undefined}
      {...rest}
    >
      {(title || action) && (
        <div className="np-card-head">
          <div>
            {title && <h3 className={cx("np-card-title", onAccent && "np-on-accent")}>{title}</h3>}
            {subtitle && <p className={cx("np-card-subtitle", onAccent && "np-on-accent-2")}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {loading ? <Skeleton /> : children}
    </Tag>
  );
}

export interface StatCardProps {
  title: string;
  /** Valor já formatado: "R$ 4.280,00", "38" */
  value: React.ReactNode;
  /** Variação em %, sem o sinal de %: "12,5" */
  change?: string | number;
  trend?: "up" | "down";
  /** Ícone Lucide no quadrado âmbar */
  icon?: IconSource;
  hint?: string;
  /** Cartão inteiro em âmbar (destaque do dia) */
  accent?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Padrão StatsCard do @code.xr (motion.div, glass-card p-6 rounded-2xl, hover y:-5). */
export function StatCard({ title, value, change, trend = "up", icon, hint, accent = false, loading = false, className, style }: StatCardProps) {
  const up = trend === "up";
  return (
    <motion.div
      className={cx("np-glass-card np-stat", accent && "np-glass-card--accent", className)}
      style={{ padding: 24, ...style }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      aria-busy={loading || undefined}
    >
      <div className="np-stat__row">
        <div className="np-stat__text">
          <p className={cx("np-stat__title", accent && "np-on-accent-2")}>{title}</p>
          {loading ? (
            <span className="np-skeleton np-skeleton--value" />
          ) : (
            <h2 className={cx("np-num np-stat__value", accent && "np-on-accent")}>{value}</h2>
          )}
          {change != null && !loading && (
            <p className={cx("np-stat__change", accent ? "np-on-accent" : up ? "np-text-positive" : "np-text-danger")}>
              <Icon name={up ? "arrow-up-right" : "arrow-down-right"} size={16} />
              {change}%{hint && <span className={cx("np-stat__hint", accent && "np-on-accent-2")}>{hint}</span>}
            </p>
          )}
        </div>
        {icon && (
          <div className={cx("np-stat__icon", accent && "np-stat__icon--on-accent")}>
            <Icon name={icon} size={24} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

export interface EmptyStateProps {
  icon?: IconSource;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** Estado vazio padrão (adição intencional: listas, tabelas e cartões sem dados). */
export function EmptyState({ icon = "info", title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("np-empty", className)} role="status">
      <span className="np-empty__icon">
        <Icon name={icon} size={22} />
      </span>
      <div className="np-empty__title">{title}</div>
      {description && <div className="np-empty__desc">{description}</div>}
      {action}
    </div>
  );
}
