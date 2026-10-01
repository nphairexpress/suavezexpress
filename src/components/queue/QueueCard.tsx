import { Button, IconButton, Badge, type BadgeTone } from "@design-system";
import { ChevronUp, ChevronDown, CheckCircle, UserPlus, SkipForward, X, Clock, CreditCard, Banknote, AlertCircle, Crown, UserX, Scissors, UserRound } from "lucide-react";
import type { QueueEntry } from "@/types/queue";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueCardProps {
  entry: QueueEntry;
  isFirst: boolean;
  isLast: boolean;
  onCheckIn: () => void;
  onAssignProfessional: () => void;
  onSkip: () => void;
  onRemove: () => void;
  onNoShow?: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onComplete?: () => void;
}

const statusConfig: Record<string, { label: string; tone: BadgeTone; live?: boolean }> = {
  waiting: { label: "Aguardando", tone: "neutral" },
  checked_in: { label: "Presente", tone: "positive" },
  in_service: { label: "Em atendimento", tone: "accent", live: true },
};

/*
 * Cartão da fila no padrão do QueueTicketCard do design system (mesmas classes np-ticket:
 * SENHA gigante em Montserrat 900). O componente do DS só aceita as ações "Chamar/Pular";
 * a fila administrativa precisa de "Atender/Pular/Remover/Não atendida/Finalizar", então o
 * cartão é montado aqui com a mesma estrutura visual.
 */
export function QueueCard({ entry, isFirst, isLast, onAssignProfessional, onSkip, onRemove, onNoShow, onMoveUp, onMoveDown, onComplete }: QueueCardProps) {
  const status = statusConfig[entry.status] || statusConfig.waiting;
  const timeInQueue = formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: false });
  const inService = entry.status === "in_service";

  return (
    <div className={`np-glass-card np-glass-card--lift np-ticket np-ticket--sm ${inService ? "is-called" : ""}`}>
      <div className="np-ticket__head">
        <span className="np-caps">Senha · {entry.source === "online" ? "Online" : "Presencial"}</span>
        <Badge tone={status.tone} dot live={status.live}>{status.label}</Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="np-num np-ticket__code tabular-nums">{entry.position}</div>
        {!inService && (
          <div className="flex gap-2">
            <IconButton icon={ChevronUp} label="Subir na fila" onClick={onMoveUp} disabled={isFirst} />
            <IconButton icon={ChevronDown} label="Descer na fila" onClick={onMoveDown} disabled={isLast} />
          </div>
        )}
      </div>

      <div className="np-ticket__info">
        <div className="np-ticket__client truncate">{entry.customer_name}</div>
        <div className="np-ticket__meta">
          {entry.service?.name && (
            <span><Scissors size={14} />{entry.service.name}</span>
          )}
          {entry.service?.price !== undefined && (
            <span className="np-num text-foreground tabular-nums">
              R$ {entry.service.price.toFixed(2).replace(".", ",")}
            </span>
          )}
          <span><Clock size={14} />{timeInQueue}</span>
        </div>
        <div className="np-ticket__meta">
          {entry.professional ? (
            <span className="text-foreground font-medium"><UserRound size={14} />{entry.professional.name}</span>
          ) : (
            <span><UserRound size={14} />Profissional da vez</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {entry.payment_method === "clube" && (
          <Badge tone="solid"><Crown size={12} />CLUBE — já paga</Badge>
        )}
        {entry.source === "online" && entry.payment_status === "confirmed" && (
          <Badge tone="positive">
            {entry.payment_method === "credit_card" ? (
              <><CreditCard size={12} />Cartão pago</>
            ) : (
              <><Banknote size={12} />PIX pago</>
            )}
          </Badge>
        )}
        {entry.source === "online" && entry.payment_status === "pending" && (
          <Badge tone="danger"><AlertCircle size={12} />Pagamento pendente</Badge>
        )}
        {entry.source === "walk_in" && (
          <Badge tone="neutral">Cobrar no balcão</Badge>
        )}
      </div>

      {!inService ? (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" icon={UserPlus} onClick={onAssignProfessional} className="flex-1 min-w-[140px]">
            Atender
          </Button>
          <Button variant="secondary" icon={SkipForward} onClick={onSkip}>
            Pular
          </Button>
          <Button variant="ghost" icon={X} onClick={onRemove} className="text-destructive">
            Remover
          </Button>
          {onNoShow && (
            <Button variant="ghost" icon={UserX} onClick={onNoShow}>
              Não atendida
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {onComplete && (
            <Button size="lg" variant="success" icon={CheckCircle} onClick={onComplete} className="flex-1 min-w-[160px]">
              Finalizar atendimento
            </Button>
          )}
          <Button variant="ghost" icon={X} onClick={onRemove} className="text-destructive">
            Remover da fila
          </Button>
        </div>
      )}
    </div>
  );
}
