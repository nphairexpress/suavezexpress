import * as React from "react";
import { Icon, type IconSource } from "../core/Icon";
import { Avatar, CountBadge } from "../core/Badge";
import { ThemeToggle } from "../core/ThemeToggle";
import { cx } from "../../lib/cx";

/*
 * Sidebar de vidro flutuante.
 * Estrutura e animações do acervo:
 *  - "ig-frontendjoe-sidebar-glass-submenu": lista ul/li, submenu sanfonado com a altura MEDIDA
 *    em useLayoutEffect e animada em 0,5 s, chevron gira -180°, um submenu aberto por vez,
 *    aria-expanded / aria-current, item fixo no rodapé.
 *  - "ig-frontendjoe-sidebar-shopping": botão de recolher (largura em transição 0,35 s), bloco de
 *    perfil, linha "Dark mode" com chave (aqui ThemeToggle variant="switch").
 * Do export do Claude Design: 280 px aberta / 84 px recolhida, raio 24, item ativo em bloco âmbar
 * sólido com texto preto, rótulos de seção em caixa alta, separadores com brilho, contagens âmbar,
 * busca em pílula, chip "Recolher".
 */

export interface SidebarChild {
  id: string;
  label: string;
  badge?: number | string;
  badgeTone?: "accent" | "danger";
}

export interface SidebarItem {
  id: string;
  label: string;
  /** Ícone Lucide */
  icon: IconSource;
  /** Contagem à direita (âmbar; tone danger = vermelho) */
  badge?: number | string;
  badgeTone?: "accent" | "danger";
  /** Submenu sanfonado */
  children?: SidebarChild[];
  disabled?: boolean;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

export interface GlassSidebarProps {
  title?: string;
  /** Wordmark (fundo escuro). Se ausente, mostra `title` em Montserrat */
  logoSrc?: string;
  user?: { name: string; subtitle?: string; avatar?: string };
  onUserClick?: () => void;
  /** Clique no logo/título (ex.: voltar para a tela inicial) */
  onLogoClick?: () => void;
  sections: SidebarSection[];
  /** Itens colados no rodapé (ex.: Sair) */
  footer?: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Número no sino */
  notifications?: number;
  /** true = botão sol/lua no topo · 'collapsed' = só recolhida · 'switch' = linha com chave no rodapé · false = sem */
  themeToggle?: boolean | "collapsed" | "switch";
  showSearch?: boolean;
  onSearch?: (q: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function NavItem({
  item,
  activeId,
  open,
  onToggleOpen,
  onSelect,
  collapsed,
}: {
  item: SidebarItem;
  activeId?: string;
  open: boolean;
  onToggleOpen: () => void;
  onSelect?: (id: string) => void;
  collapsed: boolean;
}) {
  const kids = item.children ?? [];
  const hasKids = kids.length > 0;
  const kidActive = hasKids && kids.some((c) => c.id === activeId);
  const active = item.id === activeId || (collapsed && kidActive);
  const contentRef = React.useRef<HTMLUListElement>(null);
  const [height, setHeight] = React.useState(0);
  const isOpen = hasKids && open && !collapsed;

  // Acervo: altura medida com getBoundingClientRect e animada pela transição do .np-subnav.
  React.useLayoutEffect(() => {
    if (!contentRef.current) return;
    setHeight(isOpen ? contentRef.current.getBoundingClientRect().height : 0);
  }, [isOpen, kids.length]);

  return (
    <li className="np-nav-li">
      <button
        type="button"
        className={cx("np-nav-item", active && "np-nav-item--active", isOpen && !kidActive && "np-nav-item--open", kidActive && !collapsed && "np-nav-item--parent-active")}
        title={collapsed ? item.label : undefined}
        aria-current={item.id === activeId ? "page" : undefined}
        aria-expanded={hasKids && !collapsed ? isOpen : undefined}
        disabled={item.disabled}
        onClick={() => {
          if (hasKids && !collapsed) onToggleOpen();
          else onSelect?.(hasKids ? kids[0].id : item.id);
        }}
      >
        <span className="np-nav-item__icon">
          <Icon name={item.icon} size={20} />
        </span>
        <span className="np-nav-item__label">{item.label}</span>
        {item.badge != null && <CountBadge count={item.badge} tone={item.badgeTone} />}
        {hasKids && <Icon name="chevron-down" size={18} className="np-nav-item__chev" />}
      </button>
      {hasKids && !collapsed && (
        <div className="np-subnav" style={{ height }}>
          <ul ref={contentRef}>
            {kids.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  tabIndex={isOpen ? 0 : -1}
                  className={cx("np-subnav-item", c.id === activeId && "np-subnav-item--active")}
                  aria-current={c.id === activeId ? "page" : undefined}
                  onClick={() => onSelect?.(c.id)}
                >
                  <span className="np-subnav-item__label">{c.label}</span>
                  {c.badge != null && <CountBadge count={c.badge} tone={c.badgeTone} />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export function GlassSidebar({
  title = "Sua Vez Express",
  logoSrc,
  user,
  onUserClick,
  onLogoClick,
  sections,
  footer = [],
  activeId,
  onSelect,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  notifications,
  themeToggle = false,
  showSearch = true,
  onSearch,
  className,
  style,
}: GlassSidebarProps) {
  const [c, setC] = React.useState(defaultCollapsed);
  const collapsed = collapsedProp ?? c;
  const toggle = () => {
    setC(!collapsed);
    onCollapsedChange?.(!collapsed);
  };
  // Acervo: só um submenu aberto por vez; abre sozinho o que contém a tela ativa.
  const all = [...sections.flatMap((s) => s.items), ...footer];
  const parentOfActive = all.find((it) => it.children?.some((k) => k.id === activeId))?.id ?? null;
  const [openId, setOpenId] = React.useState<string | null>(parentOfActive);
  React.useEffect(() => {
    if (parentOfActive) setOpenId(parentOfActive);
  }, [parentOfActive]);

  const renderItems = (items: SidebarItem[]) =>
    items.map((it) => (
      <NavItem
        key={it.id}
        item={it}
        activeId={activeId}
        open={openId === it.id}
        onToggleOpen={() => setOpenId((prev) => (prev === it.id ? null : it.id))}
        onSelect={onSelect}
        collapsed={collapsed}
      />
    ));

  return (
    <aside className={cx("np-sidebar", collapsed && "np-sidebar--collapsed", className)} style={style} aria-label="Menu principal">
      <div className={cx("np-sidebar__top", collapsed && "is-collapsed")}>
        <div className="np-hide-collapsed np-sidebar__brand">
          {(() => {
            const brand = logoSrc ? (
              <span className="np-logo-chip">
                <img src={logoSrc} alt={title} className="np-sidebar__logo" />
              </span>
            ) : (
              <span className="np-display np-sidebar__title">{title}</span>
            );
            return onLogoClick ? (
              <button type="button" className="np-sidebar__brand-btn" onClick={onLogoClick} aria-label={title + ": tela inicial"}>
                {brand}
              </button>
            ) : (
              brand
            );
          })()}
        </div>
        {notifications != null && (
          <button type="button" className="np-icon-btn np-icon-btn--ghost np-icon-btn--round np-sidebar__bell" aria-label="Notificações">
            <Icon name="bell" size={20} />
            {notifications > 0 && <span className="np-count np-count--danger np-count--dot">{notifications}</span>}
          </button>
        )}
        {(themeToggle === true || (themeToggle === "collapsed" && collapsed) || (themeToggle === "switch" && collapsed)) && <ThemeToggle size={collapsed ? "md" : "sm"} />}
        <button type="button" onClick={toggle} className="np-sidebar__collapse" aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir" : "Recolher"} aria-expanded={!collapsed}>
          <Icon name={collapsed ? "chevron-right" : "chevron-left"} size={16} strokeWidth={2.5} />
          {!collapsed && "Recolher"}
        </button>
      </div>
      <div className="np-sidebar__sep" />
      {user && (
        <>
          <button type="button" className="np-nav-item np-sidebar__user" title={collapsed ? user.name : undefined} onClick={onUserClick}>
            <Avatar name={user.name} src={user.avatar} size={44} />
            <span className="np-nav-item__label np-sidebar__user-text">
              <span className="np-sidebar__user-name">{user.name}</span>
              <span className="np-sidebar__user-sub">
                <Icon name="arrow-left-right" size={12} />
                {user.subtitle || "Trocar usuário"}
              </span>
            </span>
            <Icon name="chevron-right" size={18} className="np-nav-item__chev" />
          </button>
          <div className="np-sidebar__sep" />
        </>
      )}
      {showSearch && !collapsed && (
        <div className="np-input-wrap np-sidebar__search">
          <Icon name="search" size={16} />
          <input className="np-input np-input--icon np-input--pill np-input--caps" placeholder="Buscar…" aria-label="Buscar no menu" onChange={(e) => onSearch?.(e.target.value)} />
        </div>
      )}
      {showSearch && collapsed && (
        <button type="button" className="np-nav-item" aria-label="Buscar" onClick={toggle}>
          <span className="np-nav-item__icon">
            <Icon name="search" size={20} />
          </span>
        </button>
      )}
      <nav className="np-sidebar__nav">
        {sections.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div className="np-sidebar__sep np-sidebar__sep--tight" />}
            {s.title && <div className="np-nav-section">{s.title}</div>}
            <ul className="np-nav-list">{renderItems(s.items)}</ul>
          </React.Fragment>
        ))}
      </nav>
      {(footer.length > 0 || themeToggle === "switch") && (
        <>
          <div className="np-sidebar__sep" />
          <ul className="np-nav-list">
            {renderItems(footer)}
            {themeToggle === "switch" && !collapsed && (
              <li className="np-nav-li">
                <ThemeToggle variant="switch" />
              </li>
            )}
          </ul>
        </>
      )}
    </aside>
  );
}
