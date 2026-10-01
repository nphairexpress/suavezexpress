import * as React from "react";
import { Icon } from "../core/Icon";
import { Avatar } from "../core/Badge";
import { ThemeToggle } from "../core/ThemeToggle";
import { cx } from "../../lib/cx";

/** Cabeçalho de tela (export do Claude Design): saudação/título, busca em pílula, ações, interruptor de tema, sino e usuário. */
export interface TopBarProps {
  /** Saudação/título da tela, Montserrat 800 */
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** null esconde a busca */
  searchPlaceholder?: string | null;
  notifications?: number;
  onNotificationsClick?: () => void;
  user?: { name: string; role?: string; avatar?: string };
  /** Mostra o interruptor de tema ("Acender a luz" / "Apagar a luz") */
  themeToggle?: boolean;
  onSearch?: (q: string) => void;
  /** Botão de menu para abrir a sidebar no celular */
  onMenuClick?: () => void;
  /** Ações extras entre busca e sino */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function TopBar({
  title,
  subtitle,
  searchPlaceholder = "Buscar cliente, comanda, senha…",
  notifications,
  onNotificationsClick,
  user,
  themeToggle = false,
  onSearch,
  onMenuClick,
  children,
  className,
  style,
}: TopBarProps) {
  return (
    <header className={cx("np-topbar", className)} style={style}>
      {onMenuClick && (
        <button type="button" className="np-icon-btn np-icon-btn--round np-topbar__menu" aria-label="Abrir menu" onClick={onMenuClick}>
          <Icon name="menu" size={20} />
        </button>
      )}
      <div className="np-topbar__title-wrap">
        <h1 className="np-display np-topbar__title">{title}</h1>
        {subtitle && <p className="np-topbar__subtitle">{subtitle}</p>}
      </div>
      {searchPlaceholder && (
        <div className="np-input-wrap np-topbar__search">
          <Icon name="search" size={16} />
          <input className="np-input np-input--icon np-input--pill" placeholder={searchPlaceholder} aria-label={searchPlaceholder} onChange={(e) => onSearch?.(e.target.value)} />
        </div>
      )}
      {children}
      {themeToggle && <ThemeToggle />}
      {notifications != null && (
        <button type="button" className="np-icon-btn np-icon-btn--round" aria-label="Notificações" onClick={onNotificationsClick}>
          <Icon name="bell" size={20} />
          {notifications > 0 && <span className="np-count np-count--danger np-count--dot">{notifications}</span>}
        </button>
      )}
      {user && (
        <div className="np-topbar__user">
          <Avatar name={user.name} src={user.avatar} size={36} />
          <div className="np-topbar__user-text">
            <div className="np-topbar__user-name">{user.name}</div>
            {user.role && <div className="np-topbar__user-role">{user.role}</div>}
          </div>
        </div>
      )}
    </header>
  );
}
