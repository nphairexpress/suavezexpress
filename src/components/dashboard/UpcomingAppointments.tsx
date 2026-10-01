import { Clock, User, ChevronRight } from "lucide-react";
import { GlassCard, Button, Badge, EmptyState, type BadgeTone } from "@design-system";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; tone: BadgeTone; live?: boolean }> = {
  scheduled: { label: "Agendado", tone: "neutral" },
  confirmed: { label: "Confirmado", tone: "positive" },
  in_progress: { label: "Em atendimento", tone: "accent", live: true },
  completed: { label: "Finalizado", tone: "neutral" },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

function formatDuration(minutes: number) {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}` : `${h}h`;
  }
  return `${minutes}min`;
}

interface UpcomingAppointmentsProps {
  professionalId?: string | null;
}

export function UpcomingAppointments({ professionalId }: UpcomingAppointmentsProps) {
  const { salonId } = useAuth();
  const navigate = useNavigate();

  const { data: appointments = [] } = useQuery({
    queryKey: ["dashboard-upcoming", salonId, professionalId],
    queryFn: async () => {
      if (!salonId) return [];

      const now = new Date();
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      let query = supabase
        .from("appointments")
        .select(`
          id,
          scheduled_at,
          duration_minutes,
          status,
          client:clients(name),
          professional:professionals(name),
          service:services(name)
        `)
        .eq("salon_id", salonId)
        .gte("scheduled_at", now.toISOString())
        .lt("scheduled_at", todayEnd)
        .in("status", ["scheduled", "confirmed", "in_progress"])
        .order("scheduled_at", { ascending: true })
        .limit(8);

      if (professionalId) {
        query = query.eq("professional_id", professionalId);
      }

      const { data } = await query;

      return (data ?? []).map((a: any) => ({
        id: a.id,
        clientName: a.client?.name ?? "Cliente não informado",
        clientInitials: getInitials(a.client?.name ?? "CI"),
        service: a.service?.name ?? "Serviço",
        professional: a.professional?.name ?? "Profissional",
        time: new Date(a.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        duration: formatDuration(a.duration_minutes),
        status: a.status as string,
      }));
    },
    enabled: !!salonId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });

  return (
    <GlassCard
      title={professionalId ? "Meus Próximos Atendimentos" : "Próximos Atendimentos"}
      action={
        <Button variant="secondary" size="sm" className="shrink-0" onClick={() => navigate("/agenda")}>
          Ver Agenda
        </Button>
      }
    >
      {appointments.length === 0 ? (
        <EmptyState icon="calendar" title="Nenhum atendimento pendente para hoje" />
      ) : (
        <div className="space-y-2 md:space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="rounded-xl p-3 md:p-4"
              style={{ background: "var(--np-surface-inset)", border: "1px solid var(--np-divider)" }}
            >
              {/* Mobile: stack layout / Desktop: horizontal */}
              <div className="flex items-start gap-3 md:items-center md:gap-4">
                <span
                  className="np-avatar mt-0.5 md:mt-0"
                  style={{ width: 40, height: 40, fontSize: 14 }}
                  aria-hidden="true"
                >
                  {appointment.clientInitials}
                </span>

                {/* Content area */}
                <div className="flex-1 min-w-0">
                  {/* Row 1: Client name + service */}
                  <p className="font-medium text-sm md:text-base leading-tight" style={{ color: "var(--np-text-primary)" }}>
                    {appointment.clientName}
                  </p>
                  <p className="text-xs md:text-sm truncate mt-0.5" style={{ color: "var(--np-text-secondary)" }}>
                    {appointment.service}
                  </p>

                  {/* Row 2 (mobile only): time + status */}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 md:hidden">
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3" style={{ color: "var(--np-text-tertiary)" }} />
                      <span className="np-num font-medium" style={{ color: "var(--np-text-primary)" }}>{appointment.time}</span>
                      <span style={{ color: "var(--np-text-secondary)" }}>({appointment.duration})</span>
                    </div>
                    {statusConfig[appointment.status] && (
                      <Badge tone={statusConfig[appointment.status].tone} dot live={statusConfig[appointment.status].live}>
                        {statusConfig[appointment.status].label}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Desktop only: professional + time + status + chevron */}
                <div className="hidden md:flex items-center gap-4">
                  {!professionalId && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "var(--np-text-secondary)" }}>
                      <User className="h-4 w-4" />
                      <span>{appointment.professional}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4" style={{ color: "var(--np-text-tertiary)" }} />
                    <span className="np-num font-medium" style={{ color: "var(--np-text-primary)" }}>{appointment.time}</span>
                    <span className="text-xs" style={{ color: "var(--np-text-secondary)" }}>{appointment.duration}</span>
                  </div>

                  {statusConfig[appointment.status] && (
                    <Badge tone={statusConfig[appointment.status].tone} dot live={statusConfig[appointment.status].live}>
                      {statusConfig[appointment.status].label}
                    </Badge>
                  )}

                  <ChevronRight className="h-4 w-4" style={{ color: "var(--np-text-tertiary)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
