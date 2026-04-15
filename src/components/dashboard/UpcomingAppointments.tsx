import { Clock, User, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const statusConfig: Record<string, { label: string; className: string }> = {
  scheduled: { label: "Agendado", className: "status-scheduled" },
  confirmed: { label: "Confirmado", className: "status-confirmed" },
  in_progress: { label: "Em atendimento", className: "status-in_progress" },
  completed: { label: "Finalizado", className: "status-completed" },
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base md:text-lg font-semibold">
          {professionalId ? "Meus Próximos Atendimentos" : "Próximos Atendimentos"}
        </CardTitle>
        <Button variant="outline" size="sm" className="text-xs md:text-sm shrink-0" onClick={() => navigate("/agenda")}>
          Ver Agenda
        </Button>
      </CardHeader>
      <CardContent className="px-3 md:px-6">
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum atendimento pendente para hoje
          </p>
        ) : (
          <div className="space-y-2 md:space-y-3">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-lg border p-3 md:p-4 transition-colors hover:bg-muted/50"
              >
                {/* Mobile: stack layout / Desktop: horizontal */}
                <div className="flex items-start gap-3 md:items-center md:gap-4">
                  <Avatar className="h-9 w-9 md:h-10 md:w-10 shrink-0 mt-0.5 md:mt-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs md:text-sm">
                      {appointment.clientInitials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content area */}
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Client name + service */}
                    <p className="font-medium text-sm md:text-base leading-tight">
                      {appointment.clientName}
                    </p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">
                      {appointment.service}
                    </p>

                    {/* Row 2 (mobile only): time + status */}
                    <div className="flex items-center gap-2 mt-1.5 md:hidden">
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{appointment.time}</span>
                        <span className="text-muted-foreground">({appointment.duration})</span>
                      </div>
                      {statusConfig[appointment.status] && (
                        <Badge variant="secondary" className={`${statusConfig[appointment.status].className} text-[10px] px-1.5 py-0`}>
                          {statusConfig[appointment.status].label}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Desktop only: professional + time + status + chevron */}
                  <div className="hidden md:flex items-center gap-4">
                    {!professionalId && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>{appointment.professional}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.time}</span>
                      <span className="text-muted-foreground text-xs">{appointment.duration}</span>
                    </div>

                    {statusConfig[appointment.status] && (
                      <Badge variant="secondary" className={statusConfig[appointment.status].className}>
                        {statusConfig[appointment.status].label}
                      </Badge>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
