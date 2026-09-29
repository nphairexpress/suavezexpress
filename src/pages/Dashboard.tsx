import { lazy, Suspense } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { TopServices } from "@/components/dashboard/TopServices";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { ProfessionalCommissionSummary } from "@/components/dashboard/ProfessionalCommissionSummary";
import { Sensitive } from "@/components/common/SensitiveData";
import { useCurrentProfessional } from "@/hooks/useCurrentProfessional";

// recharts (~400 kB) só entra quando o gráfico de faturamento renderiza.
const RevenueChart = lazy(() =>
  import("@/components/dashboard/RevenueChart").then((m) => ({ default: m.RevenueChart }))
);

export default function Dashboard() {
  const { professional, professionalId, isProfessionalUser } = useCurrentProfessional();

  return (
    <AppLayoutNew>
      <div className="space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <DashboardStats professionalId={professionalId} />

        {/* Quick Actions */}
        <QuickActions />

        {/* Upcoming Appointments - shown early for professionals on mobile */}
        {isProfessionalUser && (
          <UpcomingAppointments professionalId={professionalId} />
        )}

        {/* Main Content Grid */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Revenue Chart - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Sensitive block>
              <Suspense fallback={<div className="h-[380px] rounded-lg border bg-card animate-pulse" />}>
                <RevenueChart />
              </Suspense>
            </Sensitive>
          </div>

          {/* Commission Summary for professionals, Top Services for others */}
          {isProfessionalUser && professional ? (
            <ProfessionalCommissionSummary
              professionalId={professional.id}
              commissionPercent={professional.commission_percent ?? 0}
            />
          ) : (
            <TopServices />
          )}
        </div>

        {/* Upcoming Appointments for non-professional users */}
        {!isProfessionalUser && (
          <UpcomingAppointments />
        )}
      </div>
    </AppLayoutNew>
  );
}
