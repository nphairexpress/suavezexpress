import * as React from "react";
import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from "next-themes";
import { MotionConfig } from "framer-motion";

/*
 * Tema do design system ("acender e apagar a luz").
 * - Baseado em next-themes (já no projeto, v0.3): classe `dark`/`light` no <html> para conviver
 *   com o shadcn atual (Tailwind darkMode: ["class"]) e atributo data-theme="dark|light" no <html>,
 *   que é o que os tokens --np-* leem.
 * - Escuro é o padrão; a escolha persiste em localStorage "np-theme".
 * - Nesta fase o provider envolve SÓ a rota /design-system. Ao sair dela, o <html> volta
 *   exatamente como estava (classes, data-theme e color-scheme), então o app atual não muda.
 */

export type NpTheme = "dark" | "light";
export const NP_THEME_STORAGE_KEY = "np-theme";

export interface NpThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: NpTheme;
  storageKey?: string;
  /** Força um tema (ex.: ?theme=light na vitrine). Também grava no storage. */
  forcedInitialTheme?: NpTheme;
  /** Restaura o <html> ao desmontar (padrão true enquanto o app não migrou) */
  restoreOnUnmount?: boolean;
}

function ThemeAttributeSync({ restoreOnUnmount, forcedInitialTheme }: { restoreOnUnmount: boolean; forcedInitialTheme?: NpTheme }) {
  const { resolvedTheme, setTheme } = useNextTheme();
  const snapshot = React.useRef<{ dark: boolean; light: boolean; dataTheme: string | null; colorScheme: string } | null>(null);

  // Foto do <html> antes de qualquer mudança (efeitos do filho rodam antes dos do next-themes).
  React.useLayoutEffect(() => {
    const root = document.documentElement;
    snapshot.current = {
      dark: root.classList.contains("dark"),
      light: root.classList.contains("light"),
      dataTheme: root.getAttribute("data-theme"),
      colorScheme: root.style.colorScheme,
    };
    return () => {
      if (!restoreOnUnmount || !snapshot.current) return;
      const s = snapshot.current;
      root.classList.toggle("dark", s.dark);
      root.classList.toggle("light", s.light);
      if (s.dataTheme == null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", s.dataTheme);
      root.style.colorScheme = s.colorScheme;
    };
  }, [restoreOnUnmount]);

  React.useEffect(() => {
    if (forcedInitialTheme) setTheme(forcedInitialTheme);
  }, [forcedInitialTheme, setTheme]);

  React.useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme === "light" ? "light" : "dark");
  }, [resolvedTheme]);

  return null;
}

export function NpThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = NP_THEME_STORAGE_KEY,
  forcedInitialTheme,
  restoreOnUnmount = true,
}: NpThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" themes={["dark", "light"]} defaultTheme={defaultTheme} enableSystem={false} storageKey={storageKey}>
      <ThemeAttributeSync restoreOnUnmount={restoreOnUnmount} forcedInitialTheme={forcedInitialTheme} />
      {/* prefers-reduced-motion desliga as animações do framer-motion também */}
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </NextThemesProvider>
  );
}

/** [tema atual, trocar tema]. `animate` liga a transição de cor por 520 ms (classe .np-theme-anim no <html>). */
export function useNpTheme(): { theme: NpTheme; setTheme: (t: NpTheme, opts?: { animate?: boolean }) => void; toggle: () => void } {
  const { resolvedTheme, setTheme: setNext } = useNextTheme();
  const theme: NpTheme = resolvedTheme === "light" ? "light" : "dark";
  const setTheme = React.useCallback(
    (t: NpTheme, opts?: { animate?: boolean }) => {
      if (opts?.animate !== false) {
        const root = document.documentElement;
        root.classList.add("np-theme-anim");
        window.setTimeout(() => root.classList.remove("np-theme-anim"), 520);
      }
      setNext(t);
    },
    [setNext],
  );
  const toggle = React.useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [setTheme, theme]);
  return { theme, setTheme, toggle };
}
