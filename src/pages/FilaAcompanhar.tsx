import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Button } from "@/components/ui/button";
import { GlassCard, Badge, Button as NpButton, npAssets, type BadgeTone } from "@design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { diaSemanaData } from "@/lib/filaAviso";

// Acompanhamento da fila via TOKEN OPACO (falhas 2/13 corrigidas):
// - A página só enxerga a PRÓPRIA entrada (RPC fila_minha_situacao).
// - Cancelar exige o token (RPC fila_cancelar) — o crédito de pagamento
//   confirmado é gerado no SERVIDOR, nunca pelo browser.

const statusLabels: Record<string, { label: string; tone: BadgeTone; live?: boolean }> = {
  waiting: { label: "Aguardando", tone: "neutral" },
  checked_in: { label: "Check-in feito", tone: "positive" },
  in_service: { label: "Em atendimento", tone: "solid", live: true },
  completed: { label: "Concluido", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "danger" },
  no_show: { label: "Nao compareceu", tone: "danger" },
};

// Página PÚBLICA (celular, sem login): tema escuro fixo do design system aplicado aqui mesmo.
// A rota ainda recebe html.np-legacy do App.tsx; o wrapper redefine os tokens (data-theme="dark"
// + classe .dark), e o modal repete isso porque é renderizado fora do wrapper (portal).
const PUBLIC_SHELL = "dark np-bg np-bg--waves min-h-screen text-foreground [font-family:var(--np-font-body)]";
const PUBLIC_MODAL = "dark rounded-2xl border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] text-foreground shadow-[var(--np-shadow-modal)] backdrop-blur-2xl [font-family:var(--np-font-body)]";

interface MinhaSituacao {
  found: boolean;
  status?: string;
  payment_status?: string;
  people_ahead?: number;
  estimated_minutes?: number;
  service_names?: string;
  customer_first_name?: string;
  // Horário de atendimento (podem faltar até o banco ser atualizado)
  atendimento_em?: string | null;
  hoje?: string | null;
  salao_aberto?: boolean | null;
  abre?: string | null;
}

export default function FilaAcompanhar() {
  const { id: token } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const { data: entry, isLoading, refetch } = useQuery({
    queryKey: ["fila_minha_situacao", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fila_minha_situacao", { p_token: token });
      if (error) throw error;
      return data as unknown as MinhaSituacao;
    },
    enabled: !!token,
    refetchInterval: 15000,
  });

  const handleCancel = async () => {
    if (!token) return;
    setCancelling(true);
    try {
      await supabase.rpc("fila_cancelar", { p_token: token });
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div data-theme="dark" className={`${PUBLIC_SHELL} flex items-center justify-center`}>
        <RefreshCw className="h-8 w-8 animate-spin text-[color:var(--np-accent-text)]" />
      </div>
    );
  }

  if (!entry?.found) {
    return (
      <div data-theme="dark" className={`${PUBLIC_SHELL} flex flex-col items-center justify-center gap-4 p-4`}>
        <GlassCard padding={24} className="w-full max-w-sm text-center">
          <p className="text-foreground">Entrada nao encontrada.</p>
          <NpButton variant="secondary" size="lg" block className="mt-4" onClick={() => navigate("/fila")}>Voltar</NpButton>
        </GlassCard>
      </div>
    );
  }

  const status = statusLabels[entry.status || "waiting"] || statusLabels.waiting;
  const isActive = ["waiting", "checked_in"].includes(entry.status || "");
  const aheadCount = entry.people_ahead ?? 0;
  const isNext = aheadCount === 0 && isActive;
  // Compra feita fora do horário: atendimento marcado para dia futuro, ou salão ainda fechado hoje.
  const atendimentoFuturo = isActive && !!entry.atendimento_em && !!entry.hoje && entry.atendimento_em > entry.hoje;
  const salaoAindaFechadoHoje = isActive && !atendimentoFuturo && entry.salao_aberto === false
    && !!entry.atendimento_em && entry.atendimento_em === entry.hoje && !!entry.abre;
  const gotCredit = entry.payment_status === "credit";

  return (
    <div data-theme="dark" className={PUBLIC_SHELL}>
      <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col gap-6 px-4 py-8">
        <header className="flex justify-center">
          <img src={npAssets.logoWordmark} alt="NP Hair Express" className="h-auto w-44 max-w-full" />
        </header>

        <GlassCard padding={24} glow={isNext || entry.status === "in_service"} className="text-center">
          <div className="flex justify-center">
            <Badge tone={status.tone} dot live={status.live}>{status.label}</Badge>
          </div>

          <div className="mt-5 space-y-2">
            {isActive && (
              isNext ? (
                <p className="np-display text-3xl text-[color:var(--np-accent-display)]">Voce e a proxima!</p>
              ) : (
                <div>
                  <p className="np-caps">Na sua frente</p>
                  <p className="np-num mt-1 text-[96px] font-black leading-none tabular-nums text-foreground">{aheadCount}</p>
                  <p className="mt-1 text-muted-foreground">
                    {aheadCount === 1 ? "pessoa na frente" : "pessoas na frente"}
                  </p>
                </div>
              )
            )}

            {atendimentoFuturo && (
              <p className="np-display text-xl text-[color:var(--np-accent-display)]">
                Seu atendimento será {diaSemanaData(entry.atendimento_em)}
                {entry.abre ? ` a partir das ${entry.abre}` : ""}
              </p>
            )}

            {salaoAindaFechadoHoje && (
              <p className="np-display text-xl text-[color:var(--np-accent-display)]">
                O salão abre às {entry.abre}
              </p>
            )}

            {entry.status === "in_service" && (
              <p className="np-display text-2xl text-[color:var(--np-accent-display)]">Voce esta sendo atendida!</p>
            )}

            {entry.status === "completed" && (
              <p className="text-lg text-muted-foreground">Atendimento concluido. Obrigada por vir!</p>
            )}

            {(entry.status === "cancelled" || entry.status === "no_show") && (
              <p className="text-lg text-muted-foreground">
                {gotCredit
                  ? "Voce recebeu um credito valido por 30 dias."
                  : "Sua entrada na fila foi encerrada."}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-[color:var(--np-divider)] pt-4">
            <p className="np-caps">Servico</p>
            <p className="mt-1 font-medium text-foreground">{entry.service_names || "—"}</p>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <NpButton variant="secondary" size="lg" block icon={RefreshCw} onClick={() => refetch()}>
            Atualizar
          </NpButton>
          {isActive && (
            <NpButton variant="ghost" size="lg" block icon={AlertTriangle} className="text-destructive" onClick={() => setCancelDialogOpen(true)}>
              Desistir da fila
            </NpButton>
          )}
        </div>
      </div>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent data-theme="dark" className={`sm:max-w-sm ${PUBLIC_MODAL}`}>
          <DialogHeader><DialogTitle className="np-display text-xl">Desistir da fila?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            {entry.payment_status === "confirmed"
              ? "O valor pago vira um credito valido por 30 dias para usar em outra visita."
              : "Sua entrada sera cancelada."}
          </p>
          <DialogFooter>
            <Button variant="outline" className="h-12 border-border bg-transparent" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>Voltar</Button>
            <Button variant="destructive" className="h-12" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando…" : "Sim, desistir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
