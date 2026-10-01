import { DollarSign, Users, Calendar, TrendingUp } from "lucide-react";
import { StatCard } from "@design-system";
import { useAuth } from "@/contexts/AuthContext";
import { Sensitive } from "@/components/common/SensitiveData";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

interface DashboardStatsProps {
  professionalId?: string | null;
}

export function DashboardStats({ professionalId }: DashboardStatsProps) {
  const { salonId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", salonId, professionalId],
    queryFn: async () => {
      if (!salonId) return null;

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const lastMonthEnd = monthStart;

      if (professionalId) {
        // Professional-specific stats: use comanda_items filtered by professional_id
        const { data: monthItems } = await supabase
          .from("comanda_items")
          .select("total_price, comanda_id")
          .eq("professional_id", professionalId)
          .gte("created_at", monthStart)
          .lt("created_at", monthEnd);

        const monthRevenue = monthItems?.reduce((s, i) => s + (i.total_price || 0), 0) ?? 0;

        const { data: lastMonthItems } = await supabase
          .from("comanda_items")
          .select("total_price, comanda_id")
          .eq("professional_id", professionalId)
          .gte("created_at", lastMonthStart)
          .lt("created_at", lastMonthEnd);

        const lastMonthRevenue = lastMonthItems?.reduce((s, i) => s + (i.total_price || 0), 0) ?? 0;

        // Appointments count
        const { count: monthAppts } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("salon_id", salonId)
          .eq("professional_id", professionalId)
          .gte("scheduled_at", monthStart)
          .lt("scheduled_at", monthEnd);

        const { count: lastMonthAppts } = await supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("salon_id", salonId)
          .eq("professional_id", professionalId)
          .gte("scheduled_at", lastMonthStart)
          .lt("scheduled_at", lastMonthEnd);

        // Ticket (unique comandas)
        const uniqueComandaIds = new Set(monthItems?.map(i => i.comanda_id) ?? []);
        const monthCount = uniqueComandaIds.size;
        const monthTicket = monthCount > 0 ? monthRevenue / monthCount : 0;

        const lastUniqueComandaIds = new Set(lastMonthItems?.map(i => i.comanda_id) ?? []);
        const lastMonthCount = lastUniqueComandaIds.size;
        const lastMonthTicket = lastMonthCount > 0 ? lastMonthRevenue / lastMonthCount : 0;

        // Clients attended this month (from appointments)
        const { data: monthClientAppts } = await supabase
          .from("appointments")
          .select("client_id")
          .eq("salon_id", salonId)
          .eq("professional_id", professionalId)
          .gte("scheduled_at", monthStart)
          .lt("scheduled_at", monthEnd)
          .not("client_id", "is", null);

        const uniqueClients = new Set(monthClientAppts?.map(a => a.client_id) ?? []);

        const { data: lastMonthClientAppts } = await supabase
          .from("appointments")
          .select("client_id")
          .eq("salon_id", salonId)
          .eq("professional_id", professionalId)
          .gte("scheduled_at", lastMonthStart)
          .lt("scheduled_at", lastMonthEnd)
          .not("client_id", "is", null);

        const lastUniqueClients = new Set(lastMonthClientAppts?.map(a => a.client_id) ?? []);

        return {
          monthRevenue,
          revenueChange: calcChange(monthRevenue, lastMonthRevenue),
          monthAppts: monthAppts ?? 0,
          apptsChange: calcChange(monthAppts ?? 0, lastMonthAppts ?? 0),
          monthTicket,
          ticketChange: calcChange(monthTicket, lastMonthTicket),
          newClients: uniqueClients.size,
          clientsChange: calcChange(uniqueClients.size, lastUniqueClients.size),
        };
      }

      // Salon-wide stats (original logic)
      const { data: monthCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", monthStart)
        .lt("closed_at", monthEnd)
        .eq("is_paid", true);

      const monthRevenue = monthCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      const { data: lastMonthCom } = await supabase
        .from("comandas")
        .select("total")
        .eq("salon_id", salonId)
        .gte("closed_at", lastMonthStart)
        .lt("closed_at", lastMonthEnd)
        .eq("is_paid", true);

      const lastMonthRevenue = lastMonthCom?.reduce((s, c) => s + (c.total || 0), 0) ?? 0;

      const { count: monthAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", monthStart)
        .lt("scheduled_at", monthEnd);

      const { count: lastMonthAppts } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("scheduled_at", lastMonthStart)
        .lt("scheduled_at", lastMonthEnd);

      const monthCount = monthCom?.length ?? 0;
      const monthTicket = monthCount > 0 ? monthRevenue / monthCount : 0;

      const lastMonthCount = lastMonthCom?.length ?? 0;
      const lastMonthTicket = lastMonthCount > 0 ? lastMonthRevenue / lastMonthCount : 0;

      const { count: newClientsMonth } = await supabase
        .from("clients_staff")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd);

      const { count: newClientsLastMonth } = await supabase
        .from("clients_staff")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .gte("created_at", lastMonthStart)
        .lt("created_at", lastMonthEnd);

      return {
        monthRevenue,
        revenueChange: calcChange(monthRevenue, lastMonthRevenue),
        monthAppts: monthAppts ?? 0,
        apptsChange: calcChange(monthAppts ?? 0, lastMonthAppts ?? 0),
        monthTicket,
        ticketChange: calcChange(monthTicket, lastMonthTicket),
        newClients: newClientsMonth ?? 0,
        clientsChange: calcChange(newClientsMonth ?? 0, newClientsLastMonth ?? 0),
      };
    },
    enabled: !!salonId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const isProfessional = !!professionalId;

  const stats = [
    {
      title: isProfessional ? "Meu Faturamento" : "Faturamento do Mês",
      value: formatCurrency(data?.monthRevenue ?? 0),
      change: data?.revenueChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: DollarSign,
      sensitive: true,
    },
    {
      title: isProfessional ? "Meus Atendimentos" : "Atendimentos do Mês",
      value: String(data?.monthAppts ?? 0),
      change: data?.apptsChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: Calendar,
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(data?.monthTicket ?? 0),
      change: data?.ticketChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: TrendingUp,
      sensitive: true,
    },
    {
      title: isProfessional ? "Clientes Atendidos" : "Novos Clientes",
      value: String(data?.newClients ?? 0),
      change: data?.clientsChange ?? 0,
      changeLabel: "vs mês anterior",
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.title}
          title={stat.title}
          value={stat.sensitive ? <Sensitive>{stat.value}</Sensitive> : stat.value}
          // Mesmo texto de antes: "+12" quando sobe, "-5" quando cai, "0" quando igual.
          change={stat.change > 0 ? `+${stat.change}` : String(stat.change)}
          trend={stat.change < 0 ? "down" : "up"}
          hint={stat.changeLabel}
          icon={stat.icon}
          loading={isLoading}
          className="min-w-0"
        />
      ))}
    </div>
  );
}
