import * as React from "react";
import { Icon } from "../core/Icon";
import { Badge, StatusPill, Avatar, type BadgeTone, type ProfessionalStatus } from "../core/Badge";
import { Button } from "../core/Button";
import { cx } from "../../lib/cx";

/** Componentes de domínio do salão (export do Claude Design; não existem no acervo). */

export type TicketStatus = "aguardando" | "chamada" | "atendimento" | "ausente";

const TICKET_STATUS: Record<TicketStatus, { label: string; tone: BadgeTone; live?: boolean }> = {
  aguardando: { label: "Aguardando", tone: "neutral" },
  chamada: { label: "Chamando agora", tone: "solid", live: true },
  atendimento: { label: "Em atendimento", tone: "positive", live: true },
  ausente: { label: "Não compareceu", tone: "danger" },
};

export interface QueueTicketCardProps {
  /** Ex.: "A027" */
  ticket: string;
  client: string;
  service?: string;
  professional?: string;
  /** Ex.: "12 min" */
  wait?: string;
  position?: number;
  status?: TicketStatus;
  /** sm 48 px · md 88 px · lg 140 px de senha */
  size?: "sm" | "md" | "lg";
  onCall?: () => void;
  onSkip?: () => void;
  /** Ação em andamento (ex.: chamando pelo painel) */
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Cartão da fila com a SENHA gigante (Montserrat 900); âmbar e com brilho quando está sendo chamada. */
export function QueueTicketCard({ ticket, client, service, professional, wait, position, status = "aguardando", size = "md", onCall, onSkip, loading = false, className, style }: QueueTicketCardProps) {
  const s = TICKET_STATUS[status] ?? TICKET_STATUS.aguardando;
  const called = status === "chamada";
  return (
    <div className={cx("np-glass-card np-glass-card--lift np-ticket", "np-ticket--" + size, called && "np-glass-card--glow is-called", status === "ausente" && "is-absent", className)} style={style}>
      <div className="np-ticket__head">
        <span className="np-caps">Senha{position != null ? " · " + position + "º na fila" : ""}</span>
        <Badge tone={s.tone} dot live={s.live}>
          {s.label}
        </Badge>
      </div>
      <div className="np-num np-ticket__code">{ticket}</div>
      <div className="np-ticket__info">
        <div className="np-ticket__client">{client}</div>
        <div className="np-ticket__meta">
          {service && (
            <span>
              <Icon name="scissors" size={14} />
              {service}
            </span>
          )}
          {professional && (
            <span>
              <Icon name="user-round" size={14} />
              {professional}
            </span>
          )}
          {wait && (
            <span>
              <Icon name="clock" size={14} />
              {wait}
            </span>
          )}
        </div>
      </div>
      {(onCall || onSkip) && (
        <div className="np-ticket__actions">
          {onCall && (
            <Button icon={called ? "volume-2" : "megaphone"} onClick={onCall} loading={loading} className="np-grow">
              {called ? "Chamar de novo" : "Chamar"}
            </Button>
          )}
          {onSkip && (
            <Button variant="secondary" icon="skip-forward" onClick={onSkip} disabled={loading}>
              Pular
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export interface ProfessionalCardProps {
  name: string;
  avatar?: string;
  role?: string;
  /** davez = âmbar (próxima a atender) · livre = verde · atendendo = neutro */
  status?: ProfessionalStatus;
  /** Senha em atendimento */
  ticket?: string;
  client?: string;
  /** Tempo decorrido, ex.: "18:42" */
  elapsed?: string;
  today?: number;
  /** Posição na vez */
  turn?: number;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/** Status da profissional: "Da vez" / "Livre" / "Atendendo". */
export function ProfessionalCard({ name, avatar, role, status = "livre", ticket, client, elapsed, today, turn, onAction, actionLabel, className, style }: ProfessionalCardProps) {
  const davez = status === "davez";
  return (
    <div className={cx("np-glass-card np-glass-card--lift np-pro", "np-pro--" + status, davez && "np-glass-card--glow", className)} style={style}>
      <div className="np-pro__head">
        <div className="np-pro__avatar">
          <Avatar name={name} src={avatar} size={52} />
          {turn != null && <span className="np-num np-pro__turn">{turn}º</span>}
        </div>
        <div className="np-pro__id">
          <div className="np-pro__name">{name}</div>
          {role && <div className="np-pro__role">{role}</div>}
        </div>
        <StatusPill status={status} />
      </div>
      {status === "atendendo" && (
        <div className="np-pro__now">
          <span className="np-num np-pro__ticket">{ticket}</span>
          <span className="np-pro__client">{client}</span>
          <span className="np-num np-pro__elapsed">{elapsed}</span>
        </div>
      )}
      <div className="np-pro__foot">
        <span>
          Hoje: <b className="np-num">{today ?? 0}</b> atendimentos
        </span>
        {onAction && (
          <Button size="sm" variant={davez ? "primary" : "secondary"} onClick={onAction}>
            {actionLabel || (davez ? "Chamar próxima" : "Ver")}
          </Button>
        )}
      </div>
    </div>
  );
}
