// @ts-nocheck
import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { PageHeader, GlassCard, EmptyState, Skeleton } from "@design-system";
import { useAuth } from "@/contexts/AuthContext";
import { useClosureIssues } from "@/hooks/useClosureIssues";
import { IssueCard } from "@/components/pendencias/IssueCard";
import { IssueRequestCorrectionModal } from "@/components/pendencias/IssueRequestCorrectionModal";

export default function Pendencias() {
  const { salonId } = useAuth();
  const { data: issues, isLoading, error } = useClosureIssues(salonId);
  const [selected, setSelected] = useState<any>(null);

  const openCount = issues?.length ?? 0;

  return (
    <AppLayoutNew>
      <div className="max-w-4xl space-y-4 md:space-y-6">
        <PageHeader
          eyebrow="Fechamento"
          title="Pendências de Fechamento"
          description={
            <span className="tabular-nums">
              {openCount} aberta{openCount !== 1 ? "s" : ""}
            </span>
          }
        />

        {isLoading && (
          <GlassCard aria-busy="true">
            <span className="sr-only">Carregando…</span>
            <Skeleton lines={3} />
          </GlassCard>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-xl border p-4 text-sm"
            style={{ background: "var(--np-danger-soft)", borderColor: "var(--np-danger-border)", color: "var(--np-danger-text)" }}
          >
            Erro ao carregar pendências: {String((error as any)?.message ?? error)}
          </div>
        )}

        <div className="space-y-3">
          {issues?.map((i: any) => (
            <IssueCard
              key={i.id}
              issue={i}
              onRequestCorrection={() => setSelected(i)}
            />
          ))}
          {!isLoading && !error && openCount === 0 && (
            <GlassCard>
              <EmptyState icon="circle-check" title="Nenhuma pendência aberta" />
            </GlassCard>
          )}
        </div>

        {selected && (
          <IssueRequestCorrectionModal
            open
            onClose={() => setSelected(null)}
            issue={selected}
          />
        )}
      </div>
    </AppLayoutNew>
  );
}
