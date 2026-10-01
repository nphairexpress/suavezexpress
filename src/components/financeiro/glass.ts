/*
 * Classes de vidro da frente Financeiro (caixas, contas a pagar, fechamentos).
 * Só apresentação: tokens --np-* do design system, sem cor fixa.
 */

/** Conteúdo de Dialog do shadcn em vidro forte (legível nos dois temas). */
export const glassModal =
  "border-[color:var(--np-border-glass)] bg-[var(--np-surface-glass-strong)] backdrop-blur-2xl sm:rounded-2xl shadow-[var(--np-shadow-glass)] text-foreground";

/** Títulos e números de destaque em Montserrat. */
export const display = "[font-family:var(--np-font-display)]";
export const modalTitle = "[font-family:var(--np-font-display)] text-lg font-bold tracking-tight";

/** Semânticas: verde = ok, vermelho = falta/alerta, âmbar = ação. */
export const txtDanger = "text-[color:var(--np-danger-text)]";
export const txtPositive = "text-[color:var(--np-positive-text)]";
export const txtAccent = "text-[color:var(--np-accent-text)]";
export const boxDanger = "border border-[color:var(--np-danger-border)] bg-[var(--np-danger-soft)] text-[color:var(--np-danger-text)]";
export const boxPositive = "border border-[color:var(--np-positive-border)] bg-[var(--np-positive-soft)] text-[color:var(--np-positive-text)]";
export const boxAccent = "border border-[color:var(--np-accent-border)] bg-[var(--np-accent-soft)] text-[color:var(--np-accent-text)]";

/** Preenchimento interno de vidro (dentro de um cartão de vidro: 6 %, sem novo blur). */
export const inset = "rounded-xl border border-[color:var(--np-border-glass)] bg-[var(--np-surface-inset)]";

/** Tabelas de vidro (shadcn Table dentro de um cartão). */
export const tableHead = "text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
export const money = "tabular-nums";
