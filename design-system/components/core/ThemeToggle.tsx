import * as React from "react";
import { motion } from "framer-motion";
import { Icon } from "./Icon";
import { useNpTheme, type NpTheme } from "../../theme/ThemeProvider";
import { cx } from "../../lib/cx";

/*
 * Interruptor "acender e apagar a luz".
 * Parte do acervo 21st "554-theme-toggle" (campsite): useTheme do next-themes, guarda de
 * montagem (não renderiza antes de saber o tema, evita piscar) e o seletor em cartões com o
 * indicador animado por framer-motion (layoutId). Do export do Claude Design vêm os rótulos
 * "Acender a luz"/"Apagar a luz", o ícone sol/lua que gira e as cores âmbar.
 * Variante "switch" = linha com chave do acervo "ig-frontendjoe-sidebar-shopping".
 */

export interface ThemeToggleProps {
  /** icon = botão redondo (top bar, sidebar recolhida) · pill = ícone + rótulo · switch = linha com chave (sidebar) · cards = seletor Escuro/Claro (configurações) */
  variant?: "icon" | "pill" | "switch" | "cards";
  size?: "sm" | "md" | "lg";
  className?: string;
  style?: React.CSSProperties;
}

function useMounted() {
  const [m, setM] = React.useState(false);
  React.useEffect(() => setM(true), []);
  return m;
}

function SunMoon({ dark, size, spin }: { dark: boolean; size: number; spin: number }) {
  return (
    <span className="np-theme-toggle__icons" style={{ width: size, height: size }} key={spin}>
      <span className={cx("np-theme-toggle__icon", dark && "is-on")}>
        <Icon name="sun" size={size} />
      </span>
      <span className={cx("np-theme-toggle__icon", !dark && "is-on")}>
        <Icon name="moon" size={size} />
      </span>
    </span>
  );
}

const OPTIONS: { value: NpTheme; label: string; hint: string }[] = [
  { value: "dark", label: "Escuro", hint: "Luz apagada" },
  { value: "light", label: "Claro", hint: "Luz acesa" },
];

export function ThemeToggle({ variant = "icon", size = "md", className, style }: ThemeToggleProps) {
  const mounted = useMounted();
  const { theme, setTheme, toggle } = useNpTheme();
  const [spin, setSpin] = React.useState(0);
  const dark = theme !== "light";
  const label = dark ? "Acender a luz" : "Apagar a luz";
  const is = size === "sm" ? 16 : size === "lg" ? 24 : 20;
  const click = () => {
    setSpin((n) => n + 1);
    toggle();
  };

  if (!mounted) {
    // Reserva o espaço sem conteúdo (padrão do acervo: nada antes de montar).
    return variant === "cards" ? null : <span className={cx("np-theme-toggle-placeholder", "np-theme-toggle-placeholder--" + variant)} style={style} aria-hidden="true" />;
  }

  if (variant === "cards") {
    return (
      <div className={cx("np-theme-cards", className)} style={style} role="radiogroup" aria-label="Tema da interface">
        {OPTIONS.map((o) => {
          const on = theme === o.value;
          return (
            <button key={o.value} type="button" role="radio" aria-checked={on} className={cx("np-theme-card", on && "is-on")} onClick={() => setTheme(o.value)}>
              <span className="np-theme-card__preview" data-theme={o.value}>
                <span className="np-theme-card__side" />
                <span className="np-theme-card__body">
                  <span className="np-theme-card__line" />
                  <span className="np-theme-card__line np-theme-card__line--short" />
                  <span className="np-theme-card__chip" />
                </span>
              </span>
              <span className="np-theme-card__label">
                <Icon name={o.value === "dark" ? "moon" : "sun"} size={16} />
                {o.label}
                <span className="np-theme-card__hint">{o.hint}</span>
              </span>
              {on && <motion.span className="np-theme-card__indicator" layoutId="np-active-theme" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
            </button>
          );
        })}
      </div>
    );
  }

  if (variant === "switch") {
    return (
      <button type="button" className={cx("np-theme-switch-row", className)} onClick={click} aria-pressed={!dark} aria-label={label} style={style}>
        <Icon name={dark ? "moon" : "sun"} size={20} />
        <span className="np-theme-switch-row__label">{dark ? "Luz apagada" : "Luz acesa"}</span>
        <span className={cx("np-switch", !dark && "is-on")}>
          <span />
        </span>
      </button>
    );
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        className={cx("np-btn np-btn--secondary np-theme-toggle", size === "lg" && "np-btn--lg", size === "sm" && "np-btn--sm", className)}
        onClick={click}
        aria-label={label}
        aria-pressed={!dark}
        style={style}
      >
        <SunMoon dark={dark} size={is} spin={spin} />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cx("np-icon-btn np-icon-btn--round np-theme-toggle", size === "sm" && "np-icon-btn--sm", size === "lg" && "np-icon-btn--lg", className)}
      onClick={click}
      aria-label={label}
      title={label}
      aria-pressed={!dark}
      style={style}
    >
      <SunMoon dark={dark} size={is} spin={spin} />
    </button>
  );
}
