import * as React from "react";
import { Icon, type IconSource } from "../core/Icon";
import { cx } from "../../lib/cx";

/*
 * Abas com indicador deslizante.
 * Do acervo "ig-codexr-navigation-tabs" (@code.xr): hook useTabGeometry (mede offsetLeft/offsetWidth
 * da aba ativa por refs, remede no resize e quando as fontes carregam), pílula que desliza com mola
 * cubic-bezier(.2,.9,.25,1.15) em 0,45 s, ícone ativo sobe 1 px e cresce 8 %, ponto da aba ativa,
 * :active scale(.94), badge de ponto. Do export: cápsula escura de vidro, indicador âmbar e o
 * variante sublinhado. Teclado: setas esquerda/direita, Home e End.
 */

export interface NavTab {
  id: string;
  label: string;
  icon?: IconSource;
  count?: number | string;
  /** Ponto de novidade no ícone */
  dot?: boolean;
  disabled?: boolean;
}

export interface NavTabsProps {
  tabs: NavTab[];
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  /** pill = cápsula escura com indicador âmbar deslizante · underline = sublinhado âmbar · dock = barra inferior do celular (ícone em cima) */
  variant?: "pill" | "underline" | "dock";
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
}

function useTabGeometry(active: string | undefined) {
  const navRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [geo, setGeo] = React.useState({ left: 0, width: 0, ready: false });
  const measure = React.useCallback(() => {
    const el = active ? tabRefs.current[active] : null;
    if (!el) return;
    setGeo({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  }, [active]);
  React.useLayoutEffect(measure, [measure]);
  React.useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return { navRef, tabRefs, geo };
}

export function NavTabs({ tabs, value, defaultValue, onChange, variant = "pill", className, style, ...aria }: NavTabsProps) {
  const [inner, setInner] = React.useState(defaultValue ?? tabs[0]?.id);
  const cur = value ?? inner;
  const { navRef, tabRefs, geo } = useTabGeometry(cur);
  const enabled = tabs.filter((t) => !t.disabled);
  const pick = (id: string) => {
    setInner(id);
    onChange?.(id);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const i = enabled.findIndex((t) => t.id === cur);
    let next: NavTab | undefined;
    if (e.key === "ArrowRight") next = enabled[(i + 1) % enabled.length];
    if (e.key === "ArrowLeft") next = enabled[(i - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    if (next) {
      e.preventDefault();
      pick(next.id);
      tabRefs.current[next.id]?.focus();
    }
  };
  return (
    <div ref={navRef} role="tablist" aria-label={aria["aria-label"]} className={cx("np-tabs", variant !== "pill" && "np-tabs--" + variant, className)} onKeyDown={onKey} style={style}>
      <span className={cx("np-tabs__ind", geo.ready && "is-ready")} style={{ left: geo.left, width: geo.width }} aria-hidden="true" />
      {tabs.map((t) => {
        const on = t.id === cur;
        return (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            data-tab={t.id}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            disabled={t.disabled}
            className={cx("np-tab", on && "is-active")}
            onClick={() => pick(t.id)}
          >
            {t.icon && (
              <span className="np-tab__icon">
                <Icon name={t.icon} size={variant === "dock" ? 22 : 16} />
                {t.dot && <span className="np-tab__badge" />}
              </span>
            )}
            <span>{t.label}</span>
            {t.count != null && <span className="np-num np-tab__count">{t.count}</span>}
            {variant === "dock" && <span className="np-tab__dot" />}
          </button>
        );
      })}
    </div>
  );
}
