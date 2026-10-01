import * as React from "react";
import { GlassSidebar, type GlassSidebarProps } from "../components/navigation/GlassSidebar";
import { TopBar, type TopBarProps } from "../components/navigation/TopBar";
import { cx } from "../lib/cx";

/*
 * Moldura de tela (template). Composição do ui_kit "painel" do export: fundo fotográfico desfocado
 * (.np-bg), sidebar de vidro FLUTUANTE solta 16 px das bordas, conteúdo rolando ao lado com
 * fade + 8 px na troca de tela. Do acervo "14941-dashboard-sidebar": moldura sidebar + área de
 * conteúdo, recolher pelo botão, e no celular a sidebar vira gaveta sobre um véu.
 * A troca de rota/tela é de quem usa: passe activeId/onSelect para a sidebar.
 */

export interface AppShellProps {
  sidebar: GlassSidebarProps;
  /** Sem topBar, a área de conteúdo começa direto (use PageHeader dentro da página) */
  topBar?: TopBarProps;
  /** Chave da tela atual: muda = anima a entrada do conteúdo */
  screenKey?: string;
  /** Fundo: photo = foto grafite desfocada · waves = ondas (celular) · plain = só a cor do tema */
  background?: "photo" | "waves" | "plain";
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ sidebar, topBar, screenKey, background = "photo", children, className }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const select = (id: string) => {
    setMobileOpen(false);
    sidebar.onSelect?.(id);
  };
  return (
    <div className={cx("np-app np-shell", background === "photo" && "np-bg", background === "waves" && "np-bg np-bg--waves", background === "plain" && "np-bg--plain", className)}>
      <div className={cx("np-shell__sidebar", mobileOpen && "is-open")}>
        <GlassSidebar {...sidebar} onSelect={select} />
      </div>
      {mobileOpen && <button type="button" className="np-shell__scrim" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <main className="np-shell__main">
        {topBar && <TopBar {...topBar} onMenuClick={() => setMobileOpen(true)} className={cx("np-shell__topbar", topBar.className)} />}
        <div key={screenKey} className="np-shell__content np-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
