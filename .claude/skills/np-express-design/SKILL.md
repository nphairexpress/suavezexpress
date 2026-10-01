---
name: np-express-design
description: Design system do Sua Vez Express (NP Hair Express). Use ao criar ou mudar qualquer tela, componente ou estilo deste repositório (redesign glassmorphism, âmbar #F09000, temas escuro/claro, sidebar flutuante, login deslizante).
---

# Design system NP Express

1. Leia `DESIGN.md` (contrato e tokens) e `design-system/README.md` (mapa da biblioteca).
2. Importe tudo de `@design-system`. Antes de criar componente, procure na vitrine `/design-system` (`src/pages/DesignSystemShowcase.tsx`).
3. Nada hardcoded: cor, fonte, espaçamento e raio vêm de `var(--np-*)`. Variáveis sempre com prefixo `--np-`, classes com `.np-`.
4. Âmbar é a única cor de ação; texto sobre âmbar é preto. Verde = positivo, vermelho = alerta. Sem creme/dourado.
5. Tema: `NpThemeProvider` + `ThemeToggle` ("Acender a luz"/"Apagar a luz"), escuro padrão, `localStorage["np-theme"]`.
6. Componente comprado (acervo 21st) tem prioridade: a estrutura e a animação vêm dele, o export do Claude Design manda na cor, no vidro e na composição.
7. Referência visual de telas: `design-system/reference/ui_kits/*/index.html`.
8. Não mude lógica de negócio (hooks de dados, `supabase.from/rpc`, permissões, rotas) ao migrar visual.
9. Valide: `npx tsc --noEmit -p tsconfig.app.json`, `npx vitest run`, e screenshot da tela nos dois temas.
