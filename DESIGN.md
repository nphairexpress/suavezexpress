---
name: Sua Vez Express (NP Hair Express)
description: Glassmorphism escuro com âmbar como única cor de ação; dois temas (escuro padrão, claro) trocados por data-theme.
source: design-system-export (Claude Design, 30/09/2026) + acervo 21st comprado pelo dono
implementation: design-system/ (alias @design-system)
colors:
  black: "#17120F"
  black-deep: "#0D0A08"
  amber-300: "#FFB733"
  amber-400: "#F7A100"   # hover, texto âmbar no escuro
  amber-500: "#F09000"   # AÇÃO (única cor de ação)
  amber-600: "#D67F00"   # press
  amber-ink: "#9A5A00"   # texto âmbar no claro
  graphite-700: "#221C18"
  graphite-600: "#2E2723"
  graphite-500: "#453D38"
  mist-50: "#F7F7F8"
  mist-100: "#EEEEF0"    # fundo do tema claro
  mist-200: "#E2E2E6"
  mist-300: "#CDCDD3"
  green-500: "#22C55E"   # positivo, "Livre"
  green-700: "#15803D"
  red-500: "#EF4444"     # alerta, falta de caixa
  red-600: "#DC2626"     # vermelho sólido com texto branco
  red-700: "#B91C1C"
typography:
  display: { family: Montserrat, weights: [800, 900], tracking: "-0.02em", use: "títulos, números, senhas" }
  body: { family: Poppins, weights: [400, 500, 600], use: "todo o resto" }
  scale-px: [11, 12, 14, 16, 18, 20, 24, 30, 36, 48]
  ticket-px: { sm: 48, md: 88, lg: 140, tv: 280 }
  numbers: tabular-nums
spacing-px: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
radius-px: { sm: 8, md: 12, lg: 16, xl: 24, 2xl: 32, pill: 999, login: 28 }
layout: { sidebar-open: 280, sidebar-collapsed: 84, sidebar-gap: 16, card-padding: 24, touch-min: 44, touch-terminal: 48 }
effects:
  glass-dark: "rgba(30,25,22,.55) + blur(20px) saturate(140%) + borda branca 10% + 0 8px 32px rgba(0,0,0,.35)"
  glass-light: "rgba(255,255,255,.62) + borda branca 85%"
  shadow-accent: "0 8px 24px rgba(240,144,0,.35)"
  ease-out: "cubic-bezier(.22,1,.36,1) 240ms"
  ease-spring: "cubic-bezier(.34,1.56,.64,1) 420ms"
  lift-hover: "-5px"
---

# DESIGN.md · Sua Vez Express

Contrato visual do sistema do salão NP Hair Express. **Este arquivo é a fonte da verdade dos tokens.**
A implementação vive em `design-system/` e os valores acima existem como variáveis CSS `--np-*` em
`design-system/tokens/`. Se um valor mudar, muda aqui e no token correspondente, no mesmo commit.

## Regras (valem para todo código novo)

1. **Componente novo sai da biblioteca.** Importe de `@design-system` (`import { Button, GlassCard } from "@design-system"`). Nunca dos arquivos internos.
2. **Nada de valor visual cru.** Cor, fonte, espaçamento e raio vêm de `var(--np-*)` ou de um componente. Hex, `font-family` fora de Montserrat/Poppins e px de cor/raio soltos são proibidos (o ESLint avisa em `design-system/**` e nas telas já migradas).
3. **Toda variável do design system começa com `--np-`.** Os nomes do shadcn/Tailwind (`--accent`, `--radius`, `--background`…) continuam sendo do app antigo; não reutilize.
4. **Classes da biblioteca começam com `.np-`.** Nenhum seletor de elemento global (`body`, `a`, `*`) no CSS do design system; só `:root`/`[data-theme]` declaram variáveis.
5. **Nunca `translate` e `transform` no mesmo bloco de regra** (um sobrescreve o outro de forma confusa).
6. **Âmbar `#F09000` é a única cor de ação**, nos dois temas. Texto sobre âmbar é sempre preto (`--np-text-on-accent`). No máximo um bloco âmbar sólido por tela.
7. **Verde** = positivo/"Livre"/troco. **Vermelho** = alerta/falta de caixa. Nada de creme, bege ou dourado.
8. **Toque mínimo 44 px**; terminal da profissional 48 a 64 px; TV com texto ≥ 24 px.
9. **pt-BR em tudo**: `R$ 1.280,50`, `30/09/2026 14:32`, `7º na fila`, "−" (menos) para falta. Botão = verbo + objeto, só a primeira letra maiúscula. Sem emoji.

## Temas: acender e apagar a luz

- Mesmos tokens semânticos, dois valores: `[data-theme="dark"]` (padrão, também em `:root`) e `[data-theme="light"]`.
- `NpThemeProvider` (next-themes) põe no `<html>` a classe `dark`/`light` (convive com o shadcn) **e** `data-theme`. Escuro é o padrão; a escolha fica em `localStorage["np-theme"]`.
- `ThemeToggle`: "Acender a luz" (escuro → claro, sol) / "Apagar a luz" (claro → escuro, lua). Lugares: TopBar, sidebar recolhida, linha com chave no rodapé da sidebar, cartões em Configurações.
- Ilhas: qualquer elemento pode forçar `data-theme="dark"` (ex.: painel da foto do login).
- **Fase atual:** o provider envolve só a rota `/design-system` e devolve o `<html>` intacto ao sair. O app ainda não muda de tema.

## Superfícies

- **Vidro** (`GlassCard`, `.np-glass-card`): raio 16, padding 24; variantes `strong` (modais/TV), `glow` ("Da vez", senha chamada), `accent` (âmbar sólido), `selected`. Hover sobe 5 px.
- **Fundo**: foto grafite desfocada + gradiente + um ou dois brilhos âmbar (`.np-bg`); celular usa ondas (`.np-bg--waves`); claro usa névoa + foto clara.
- Blur só sobre o fundo fotográfico; dentro do card, campos usam preenchimento 6 % sem blur novo.
- Exceção: o cupom (`Receipt`) é papel branco opaco.

## Movimento

`ease-out` 240 ms padrão; mola 420 ms em indicadores de abas e "pop". Telas entram com fade + 8 px. Senha chamada entra com escala .85 → 1 e desfoque. `prefers-reduced-motion` desliga tudo (CSS e framer-motion).

## Estados obrigatórios de componente

default · hover · active (scale .97; ícones .94) · focus-visible (anel âmbar 2 px, offset 2) · disabled (45 %) · loading (spinner + `aria-busy`) · erro (borda/texto vermelho + `aria-invalid`) · vazio (`EmptyState`) · selecionado (âmbar).

## Onde está cada coisa

Mapa completo da biblioteca, HTMLs de referência e passo a passo de componente novo: [`design-system/README.md`](design-system/README.md). Vitrine viva: rota `/design-system` (fora do menu).
