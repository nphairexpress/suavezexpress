/*
 * Peças visuais das telas de Configurações (redesign etapa 9, fase B5).
 * Só apresentação: cartões de vidro do @design-system com a mesma API do Card do shadcn,
 * avisos com tons semânticos (âmbar/verde/vermelho/neutro) e a moldura de título das seções.
 */
import * as React from "react";
import { GlassCard } from "@design-system";
import { cn } from "@/lib/utils";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

/** Cartão de vidro (GlassCard) com a mesma composição do Card do shadcn. */
export function Card({ className, children, ...rest }: DivProps) {
  return (
    <GlassCard padding={0} className={cn("min-w-0 overflow-hidden", className)} {...rest}>
      {children}
    </GlassCard>
  );
}

export function CardHeader({ className, ...rest }: DivProps) {
  return <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base sm:text-lg font-bold leading-tight tracking-tight text-foreground", className)}
      style={{ fontFamily: "var(--np-font-display)" }}
      {...rest}
    />
  );
}

export function CardDescription({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...rest} />;
}

export function CardContent({ className, ...rest }: DivProps) {
  return <div className={cn("p-5 pt-0 sm:p-6 sm:pt-0", className)} {...rest} />;
}

/** Faixa interna de um cartão (substitui bg-muted/30): preenchimento 6 % sem blur novo. */
export const insetClass = "rounded-xl border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-inset)]";

export type NoticeTone = "accent" | "positive" | "danger" | "neutral";

const NOTICE_STYLE: Record<NoticeTone, { box: React.CSSProperties; icon: string }> = {
  accent: { box: { background: "var(--np-accent-soft)", borderColor: "var(--np-accent-border)" }, icon: "var(--np-accent-text)" },
  positive: { box: { background: "var(--np-positive-soft)", borderColor: "var(--np-positive-border)" }, icon: "var(--np-positive-text)" },
  danger: { box: { background: "var(--np-danger-soft)", borderColor: "var(--np-danger-border)" }, icon: "var(--np-danger-text)" },
  neutral: { box: { background: "var(--np-surface-inset)", borderColor: "var(--np-border-glass)" }, icon: "var(--np-text-secondary)" },
};

/** Aviso informativo (substitui os cartões azul/verde/âmbar/vermelho fixos). */
export function Notice({
  tone = "neutral",
  icon: IconCmp,
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  icon?: React.ElementType;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const s = NOTICE_STYLE[tone];
  return (
    <div className={cn("rounded-2xl border p-4", className)} style={s.box}>
      <div className="flex items-start gap-3">
        {IconCmp && <IconCmp className="h-5 w-5 mt-0.5 shrink-0" style={{ color: s.icon }} />}
        <div className="min-w-0">
          {title && <h4 className="font-semibold text-sm text-foreground">{title}</h4>}
          {children && <div className="text-sm text-foreground/80 mt-1">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** Cores de tom para texto/ícone (sem cor fixa). */
export const toneText = {
  accent: { color: "var(--np-accent-text)" },
  positive: { color: "var(--np-positive-text)" },
  danger: { color: "var(--np-danger-text)" },
} as const;
