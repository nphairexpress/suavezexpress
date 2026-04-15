import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, CheckCircle, UserPlus, SkipForward, X, Clock } from "lucide-react";
import type { QueueEntry } from "@/types/queue";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueCardProps {
  entry: QueueEntry;
  onCheckIn: () => void;
  onAssignProfessional: () => void;
  onSkip: () => void;
  onRemove: () => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting: { label: "Aguardando", className: "bg-blue-100 text-blue-800" },
  checked_in: { label: "Presente", className: "bg-green-100 text-green-800" },
  in_service: { label: "Em atendimento", className: "bg-orange-100 text-orange-800" },
};

export function QueueCard({ entry, onCheckIn, onAssignProfessional, onSkip, onRemove }: QueueCardProps) {
  const status = statusConfig[entry.status] || statusConfig.waiting;
  const timeInQueue = formatDistanceToNow(new Date(entry.created_at), { locale: ptBR, addSuffix: false });

  return (
    <Card className="mb-2">
      <CardContent className="flex items-center gap-3 py-3">
        <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab shrink-0" />
        <span className="text-lg font-bold w-8 text-center shrink-0">{entry.position}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{entry.customer_name}</span>
            <Badge variant="outline" className={status.className}>{status.label}</Badge>
            <Badge variant="outline">{entry.source === "online" ? "Online" : "Presencial"}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span>{entry.service?.name}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeInQueue}</span>
            {entry.professional && <span className="font-medium text-foreground">{entry.professional.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {entry.status === "waiting" && entry.source === "online" && (
            <Button variant="ghost" size="icon" title="Check-in" onClick={onCheckIn}>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </Button>
          )}
          {(entry.status === "checked_in" || (entry.status === "waiting" && entry.source === "walk_in")) && (
            <Button variant="ghost" size="icon" title="Atribuir profissional" onClick={onAssignProfessional}>
              <UserPlus className="h-4 w-4 text-blue-600" />
            </Button>
          )}
          {entry.status !== "in_service" && (
            <Button variant="ghost" size="icon" title="Pular" onClick={onSkip}>
              <SkipForward className="h-4 w-4 text-orange-600" />
            </Button>
          )}
          <Button variant="ghost" size="icon" title="Remover" onClick={onRemove}>
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
