/*
 * Classes de apresentação da frente Clientes / Fidelidade / Marketing.
 * Só tokens --np-* do design system (mudam sozinhos entre tema claro e escuro), sem cor fixa.
 */

/** Conteúdo de Dialog do shadcn em vidro forte, legível nos dois temas. */
export const glassModal =
  "border-[color:var(--np-border-glass)] bg-[var(--np-surface-glass-strong)] backdrop-blur-2xl sm:rounded-2xl shadow-[var(--np-shadow-glass)] text-foreground";

/** Títulos de modal em Montserrat. */
export const modalTitle = "[font-family:var(--np-font-display)] text-lg font-extrabold tracking-tight";

/** Títulos de seção em Montserrat. */
export const display = "[font-family:var(--np-font-display)] font-extrabold tracking-tight";

/** Semânticas como texto (contraste AA nos dois temas). */
export const txtPositive = "text-[color:var(--np-positive-text)]";
export const txtDanger = "text-[color:var(--np-danger-text)]";
export const txtAccent = "text-[color:var(--np-accent-text)]";

/** Caixas semânticas suaves. */
export const boxPositive = "border border-[color:var(--np-positive-border)] bg-[var(--np-positive-soft)]";
export const boxDanger = "border border-[color:var(--np-danger-border)] bg-[var(--np-danger-soft)]";
export const boxAccent = "border border-[color:var(--np-accent-border)] bg-[var(--np-accent-soft)]";

/** Botões contornados semânticos (verde = crédito, vermelho = dívida). */
export const btnPositiveOutline =
  "border-[color:var(--np-positive-border)] bg-[var(--np-positive-soft)] text-[color:var(--np-positive-text)] hover:bg-[var(--np-positive-soft)] hover:text-[color:var(--np-positive-text)] hover:brightness-110";
export const btnDangerOutline =
  "border-[color:var(--np-danger-border)] bg-[var(--np-danger-soft)] text-[color:var(--np-danger-text)] hover:bg-[var(--np-danger-soft)] hover:text-[color:var(--np-danger-text)] hover:brightness-110";

/** Preenchimento interno dentro de um cartão de vidro (6 %, sem blur novo). */
export const inset = "rounded-xl border border-[color:var(--np-border-glass)] bg-[var(--np-surface-inset)]";

/** Cabeçalho de tabela de vidro. */
export const tableHead = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

/** Lista de abas (shadcn Tabs) no estilo cápsula do design system. */
export const tabsList =
  "h-auto w-full justify-start gap-1 overflow-x-auto rounded-full border border-[color:var(--np-border-glass)] bg-[var(--np-surface-inset)] p-1";
export const tabsTrigger =
  "min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-semibold text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[var(--np-shadow-accent)]";
