import * as React from "react";
import { Icon, type IconSource } from "./Icon";
import { cx } from "../../lib/cx";

/**
 * Botão principal do sistema. Âmbar = única cor de ação.
 * Estados: default · hover (sobe 1 px + sombra âmbar no primário) · active (scale .97) ·
 * focus-visible (anel âmbar 2 px) · disabled (45 %) · loading (spinner + aria-busy).
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
  /** sm 36 px (só desktop) · md 44 px · lg 52 px · xl 64 px (terminal/TV) */
  size?: "sm" | "md" | "lg" | "xl";
  /** Ícone Lucide à esquerda */
  icon?: IconSource;
  iconRight?: IconSource;
  block?: boolean;
  /** Mostra o spinner, bloqueia o clique e marca aria-busy */
  loading?: boolean;
}

const iconSize = (size: ButtonProps["size"]) => (size === "xl" ? 24 : size === "lg" ? 20 : size === "sm" ? 16 : 18);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, iconRight, block = false, loading = false, className, children, type = "button", disabled, ...rest },
  ref,
) {
  const is = iconSize(size);
  return (
    <button
      ref={ref}
      type={type}
      className={cx("np-btn", "np-btn--" + variant, size !== "md" && "np-btn--" + size, block && "np-btn--block", loading && "np-btn--loading", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Icon name="loader-circle" size={is} className="np-spin" /> : icon && <Icon name={icon} size={is} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={is} />}
    </button>
  );
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconSource;
  /** Rótulo acessível (aria-label + title) */
  label: string;
  variant?: "default" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
  round?: boolean;
  /** Contagem exibida no canto (ex.: notificações) */
  badge?: number | string;
  /** Estado selecionado (aria-pressed), ex.: filtro ligado */
  selected?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "default", size = "md", round = false, badge, selected, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx("np-icon-btn", variant !== "default" && "np-icon-btn--" + variant, size !== "md" && "np-icon-btn--" + size, round && "np-icon-btn--round", selected && "np-icon-btn--selected", className)}
      aria-label={label}
      title={label}
      aria-pressed={selected}
      {...rest}
    >
      <Icon name={icon} size={size === "sm" ? 16 : size === "lg" ? 22 : 20} />
      {badge != null && <span className="np-count np-count--dot">{badge}</span>}
    </button>
  );
});
