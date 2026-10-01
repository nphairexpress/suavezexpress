import * as React from "react";
import { cx } from "../lib/cx";

/** Cabeçalho de página dentro do AppShell: rótulo em caixa alta, título Montserrat 800, descrição, ações à direita e faixa opcional (abas/filtros). */
export interface PageHeaderProps {
  /** Rótulo pequeno em caixa alta acima do título (ex.: "VENDAS") */
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Botões à direita (no máximo um primário âmbar) */
  actions?: React.ReactNode;
  /** Abaixo do título: NavTabs, filtros */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, children, className }: PageHeaderProps) {
  return (
    <div className={cx("np-page-header", className)}>
      <div className="np-page-header__row">
        <div className="np-min0">
          {eyebrow && <div className="np-caps">{eyebrow}</div>}
          <h1 className="np-display np-page-header__title">{title}</h1>
          {description && <p className="np-page-header__desc">{description}</p>}
        </div>
        {actions && <div className="np-page-header__actions">{actions}</div>}
      </div>
      {children && <div className="np-page-header__extra">{children}</div>}
    </div>
  );
}
