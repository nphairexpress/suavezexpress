import * as React from "react";
import { Icon, type IconSource } from "../core/Icon";
import { Badge, type BadgeTone } from "../core/Badge";
import { Button } from "../core/Button";
import { cx } from "../../lib/cx";

export type PendingSeverity = "alta" | "media" | "baixa";

const SEV: Record<PendingSeverity, { label: string; tone: BadgeTone; icon: IconSource }> = {
  alta: { label: "Alta", tone: "danger", icon: "octagon-alert" },
  media: { label: "Média", tone: "accent", icon: "triangle-alert" },
  baixa: { label: "Baixa", tone: "neutral", icon: "info" },
};

export interface PendingCardProps {
  severity?: PendingSeverity;
  title: string;
  description?: string;
  /** Responsável */
  owner?: string;
  /** Ex.: "Ontem, 19:40" */
  when?: string;
  /** Valor envolvido, já formatado */
  value?: string;
  actionLabel?: string;
  onAction?: () => void;
  resolved?: boolean;
  /** Resolvendo (spinner no botão) */
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Pendência de fechamento por gravidade (alta vermelho, média âmbar, baixa neutro). Sem borda lateral colorida. */
export function PendingCard({ severity = "media", title, description, owner, when, value, actionLabel = "Resolver", onAction, resolved = false, loading = false, className, style }: PendingCardProps) {
  const s = SEV[severity] ?? SEV.media;
  return (
    <div className={cx("np-glass-card np-glass-card--lift np-pending", "np-pending--" + severity, resolved && "is-resolved", className)} style={style}>
      <div className="np-pending__icon">
        <Icon name={resolved ? "check" : s.icon} size={22} />
      </div>
      <div className="np-pending__body">
        <div className="np-pending__tags">
          <Badge tone={resolved ? "positive" : s.tone} dot>
            {resolved ? "Resolvida" : "Gravidade " + s.label.toLowerCase()}
          </Badge>
          {when && <span className="np-caption">{when}</span>}
        </div>
        <div className="np-pending__title">{title}</div>
        {description && <div className="np-pending__desc">{description}</div>}
        {owner && (
          <div className="np-pending__owner">
            <Icon name="user-round" size={13} />
            {owner}
          </div>
        )}
      </div>
      <div className="np-pending__side">
        {value && <span className="np-num np-pending__value">{value}</span>}
        {onAction && !resolved && (
          <Button size="sm" variant={severity === "alta" ? "primary" : "secondary"} onClick={onAction} loading={loading}>
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
