# design-system/ · biblioteca do Sua Vez Express

Contrato e tokens: [`../DESIGN.md`](../DESIGN.md). Vitrine: rota `/design-system` (`src/pages/DesignSystemShowcase.tsx`), nos dois temas.

## Uso

```tsx
import { NpThemeProvider, AppShell, PageHeader, Button, GlassCard } from "@design-system";
```

- Tokens `--np-*` entram globalmente por `src/index.css` (só variáveis, não mudam o app antigo).
- O CSS dos componentes entra por `design-system/index.ts` (fica no chunk de quem importa a biblioteca).
- O `NpThemeProvider` já envolve o app inteiro (Fase A). Tela nova dentro do `AppLayoutNew` (que renderiza o `AppShell`) usa `PageHeader` e os componentes daqui.

## Mapa

| Pasta | O que tem |
|---|---|
| `tokens/` | `colors.css` (marca + semânticos dos dois temas), `typography.css`, `spacing.css`, `effects.css`, `index.css` (importado pelo app) |
| `styles/` | `fonts.css` (Google Fonts), `base.css` (vidro, fundos, keyframes, `.np-app`), `components.css` (classes do export), `acervo.css` (componentes do acervo 21st e extensões) |
| `theme/` | `NpThemeProvider` e `useNpTheme` (next-themes, classe `dark` + `data-theme`, `localStorage["np-theme"]`) |
| `components/core/` | `Icon` (registro Lucide), `Button`, `IconButton`, `Input`, `PasswordInput`, `Checkbox`, `UploadButton`, `Badge`, `CountBadge`, `StatusPill`, `StatusIndicator`, `Avatar`, `ThemeToggle` |
| `components/surfaces/` | `GlassCard`, `StatCard`, `EmptyState`, `Skeleton`, `LineChart`, `BarChart`, `CalendarCard`, `TaskList` |
| `components/navigation/` | `GlassSidebar`, `NavTabs`, `TopBar` |
| `components/auth/` | `LoginSlider` (tela de login oficial) |
| `components/domain/` | `QueueTicketCard`, `ProfessionalCard`, `CheckoutCard`, `DiffField`, `CashCard`, `Receipt`, `PendingCard` |
| `components/data/` | `RecordsTable`, `Tag` |
| `templates/` | `AppShell` (fundo + sidebar flutuante + top bar + conteúdo; gaveta no celular), `PageHeader` |
| `assets/` | logos (só fundo escuro) e fundos; `npAssets` em `assets/index.ts` |
| `lib/` | `cx`, `brl`, `parseBrl` |
| `guidelines/` | cartões HTML de fundamentos (cores, tipo, espaçamento, efeitos, marca) |
| `reference/` | HTMLs do export que abrem sozinhos por `file://` (precisam de internet para React/Babel do unpkg) |
| `lint/` | `adherence.oxlintrc.json` original; as regras equivalentes estão no `eslint.config.js` |

### HTMLs de referência

- `reference/components/*/*.card.html`: cartões de cada grupo de componentes.
- `reference/ui_kits/{login,painel,recepcao,terminal,tv}/index.html`: protótipos de tela do export (painel do dono, recepção no celular, terminal da profissional, TV da fila).
- `reference/thumbnail.html` e `guidelines/*.html`.
- Usam o CSS original do export (`reference/styles.css`, nomes sem `--np-`) e `reference/_ds_bundle.js`. São referência visual, não código do app.

### Origem de cada componente

- **Do código do acervo 21st (recolorido pelos tokens):** `LoginSlider` (login deslizante), `GlassSidebar` (sidebar de vidro com submenu + sidebar shopping), `NavTabs` (navigation tabs), `UploadButton` (file upload button), `ThemeToggle` (theme toggle 554), `Badge`/`StatusPill`/`StatusIndicator` (status 25395), `RecordsTable`/`Tag` (records table 23604), `AppShell` (moldura do dashboard sidebar 14941), `TaskList` (comportamento do trio de dashboards).
- **Do export do Claude Design:** todo o resto (tokens, vidro, domínio do salão, gráficos, calendário, top bar).

## Componente novo

1. Veja se já existe na vitrine. Se for variação, acrescente uma prop no componente existente.
2. Crie em `components/<grupo>/Nome.tsx`, tipado, com os estados do DESIGN.md (hover, active, focus-visible, disabled, loading, erro, vazio, selecionado quando fizer sentido).
3. Estilo em `styles/acervo.css` (ou arquivo novo importado em `styles/index.css`): classes `.np-nome__parte`, só `var(--np-*)`, nunca `translate` e `transform` no mesmo bloco.
4. Ícone novo: importe do `lucide-react` e registre em `components/core/Icon.tsx`.
5. Exporte em `index.ts` e coloque na vitrine nos dois temas.
6. Se partir de um componente comprado, comente no topo de qual pasta do acervo veio e o que foi mantido.
