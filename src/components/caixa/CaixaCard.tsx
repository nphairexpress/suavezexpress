import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Pencil, RotateCcw, ChevronDown, ChevronUp, FileText, Loader2, Printer, X } from "lucide-react";
import { Caixa } from "@/hooks/useCaixas";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useNavigate } from "react-router-dom";
import { GlassCard, Badge as DsBadge, Button as DsButton } from "@design-system";
import { display, inset, money, txtAccent, txtDanger, txtPositive } from "@/components/financeiro/glass";

interface CaixaCardProps {
  caixa: Caixa;
  userName?: string;
  label?: string;
  onClose?: () => void;
  onView?: () => void;
  onEdit?: () => void;
  onReopen?: () => void;
  onRecalculate?: () => void;
  showCloseButton?: boolean;
  showEditButton?: boolean;
  showReopenButton?: boolean;
  isRecalculating?: boolean;
}

export function CaixaCard({
  caixa,
  userName,
  label,
  onClose,
  onView,
  onEdit,
  onReopen,
  onRecalculate,
  showCloseButton = false,
  showEditButton = false,
  showReopenButton = false,
  isRecalculating = false,
}: CaixaCardProps) {
  const [showComandas, setShowComandas] = useState(false);
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);
  const navigate = useNavigate();

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Fetch linked comandas (lazy)
  const { data: linkedComandas, isLoading: loadingComandas } = useQuery({
    queryKey: ["caixa-comandas", caixa.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comandas")
        .select("id, total, closed_at, created_at, comanda_number, client:clients(name), professional:professionals(name), payments(payment_method, amount)")
        .eq("caixa_id", caixa.id)
        .eq("payments.voided", false)
        .order("closed_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: showComandas || expandedMethod !== null,
  });

  // Fetch credits and debts
  const { data: caixaExtras } = useQuery({
    queryKey: ["caixa-extras", caixa.id],
    queryFn: async () => {
      const { data: comandas } = await supabase.from("comandas").select("id").eq("caixa_id", caixa.id);
      const ids = comandas?.map(c => c.id) || [];
      if (ids.length === 0) return { totalCredits: 0, totalDebts: 0 };
      const [cr, dr] = await Promise.all([
        supabase.from("client_credits").select("credit_amount").in("comanda_id", ids),
        supabase.from("client_debts" as any).select("debt_amount").in("comanda_id", ids),
      ]);
      return {
        totalCredits: (cr.data || []).reduce((s: number, c: any) => s + Number(c.credit_amount || 0), 0),
        totalDebts: (dr.data || []).reduce((s: number, d: any) => s + Number(d.debt_amount || 0), 0),
      };
    },
  });

  const totalReceived =
    (caixa.total_cash || 0) + (caixa.total_pix || 0) +
    (caixa.total_credit_card || 0) + (caixa.total_debit_card || 0) + (caixa.total_other || 0);

  const displayName = userName || caixa.profile?.full_name || "Usuário";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const totalCredits = caixaExtras?.totalCredits || 0;
  const totalDebts = caixaExtras?.totalDebts || 0;

  // Comandas filtered by payment method
  const getMethodComandas = (method: string) => {
    if (!linkedComandas) return [];
    return linkedComandas.filter((cmd: any) =>
      (cmd.payments || []).some((p: any) => p.payment_method === method)
    );
  };

  const methodLabels: Record<string, string> = {
    cash: "Dinheiro", pix: "PIX", credit_card: "Cartão Crédito",
    debit_card: "Cartão Débito", other: "Outros",
  };

  const paymentRows: { key: string; label: string; value: number }[] = [
    { key: "cash", label: "Dinheiro", value: caixa.total_cash || 0 },
    { key: "credit_card", label: "Cartão Crédito", value: caixa.total_credit_card || 0 },
    { key: "debit_card", label: "Cartão Débito", value: caixa.total_debit_card || 0 },
    { key: "pix", label: "PIX", value: caixa.total_pix || 0 },
    { key: "other", label: "Outros", value: caixa.total_other || 0 },
  ];

  return (
    <GlassCard padding={0} radius="xl" className="overflow-hidden text-sm flex flex-col">
      {/* Cabeçalho: avatar + responsável + atalhos */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <Avatar className="h-12 w-12 shrink-0 ring-2 ring-[color:var(--np-border-glass)]">
          <AvatarImage src={caixa.profile?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`${display} truncate text-base font-bold text-foreground`}>{displayName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <DsBadge tone={caixa.closed_at ? "neutral" : "positive"} dot live={!caixa.closed_at}>
              {caixa.closed_at ? "Fechado" : "Aberto"}
            </DsBadge>
            {label && <DsBadge tone="accent">{label}</DsBadge>}
          </div>
        </div>
        {onView && (
          <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={onView} title="Imprimir">
            <Printer className="h-4 w-4" />
          </Button>
        )}
        {showCloseButton && onClose && !caixa.closed_at && (
          <Button variant="ghost" size="icon" className={`h-11 w-11 shrink-0 ${txtDanger}`} onClick={onClose} title="Fechar caixa">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Informações */}
      <div className="px-4 pb-3 space-y-0.5 text-xs">
        <InfoLine label="Responsável" value={displayName} bold />
        <InfoLine label="Abertura" value={format(new Date(caixa.opened_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })} />
        <InfoLine label="Fechamento" value={caixa.closed_at ? format(new Date(caixa.closed_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : ""} />
        <InfoLine label="Valor Inicial (Dinheiro)" value={fmt(caixa.opening_balance || 0)} />
      </div>

      {/* Sangrias & Total em Caixa */}
      <div className="mx-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className={`${inset} p-3`}>
          <h6 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sangr & Supr</h6>
          <p className="text-xs font-medium text-muted-foreground mb-1">Sangrias e Suprimentos</p>
          <p className="text-xs text-muted-foreground italic">Nenhuma movimentação</p>
        </div>

        <div className={`${inset} p-3`}>
          <h6 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Total em Caixa</h6>
          <div className="space-y-0.5 text-xs">
            {paymentRows.map(({ key, label, value }) => (
              <div key={key}>
                <button
                  type="button"
                  className="flex min-h-[28px] items-center justify-between w-full rounded-md px-1 -mx-1 transition-colors hover:bg-[var(--np-surface-glass-hover)]"
                  onClick={() => setExpandedMethod(expandedMethod === key ? null : key)}
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className={`${money} ${value > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{fmt(value)}</span>
                </button>
                {/* Expandido: comandas desta forma */}
                {expandedMethod === key && (
                  <div className="ml-2 mt-0.5 mb-1 space-y-0.5 border-l-2 border-[color:var(--np-accent-border)] pl-2">
                    {loadingComandas ? (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    ) : getMethodComandas(key).length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">Sem comandas</p>
                    ) : (
                      getMethodComandas(key).map((cmd: any) => {
                        const methodAmount = (cmd.payments || [])
                          .filter((p: any) => p.payment_method === key)
                          .reduce((s: number, p: any) => s + Number(p.amount), 0);
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            className="flex justify-between w-full text-[11px] text-foreground hover:text-primary transition-colors"
                            onClick={() => navigate(`/comandas?comanda=${cmd.id}`)}
                          >
                            <span className="truncate mr-1">{(cmd.client as any)?.name || "Avulso"}</span>
                            <span className={`shrink-0 font-medium ${money}`}>{fmt(methodAmount)}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-between pl-3 text-[11px] text-muted-foreground">
              <span>Valor Inicial (S)</span>
              <span className={money}>{fmt(caixa.opening_balance || 0)}</span>
            </div>

            <div className="border-t border-border pt-1.5 mt-1.5 flex items-baseline justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">TOTAL FATURADO</span>
              <span className={`${display} ${money} text-base font-bold text-foreground`}>{fmt(totalReceived)}</span>
            </div>

            {totalCredits > 0 && (
              <div className={`flex justify-between text-[11px] ${txtPositive}`}>
                <span>Créditos</span>
                <span className={money}>{fmt(totalCredits)}</span>
              </div>
            )}
            {totalDebts > 0 && (
              <div className={`flex justify-between text-[11px] font-semibold ${txtDanger}`}>
                <span>Dívidas</span>
                <span className={money}>-{fmt(totalDebts)}</span>
              </div>
            )}

            {caixa.closed_at && caixa.closing_balance !== null && (
              <>
                <div className="border-t border-border pt-1 mt-1" />
                <div className="flex justify-between text-[11px]">
                  <span className="text-muted-foreground">Declarado</span>
                  <span className={money}>{fmt(caixa.closing_balance)}</span>
                </div>
                <div className="flex justify-between font-semibold text-xs">
                  <span>TOTAL</span>
                  <span className={money}>{fmt(totalReceived)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Comandas (sanfona) */}
      <div className="px-4 pt-2 pb-2">
        <button
          type="button"
          onClick={() => setShowComandas(prev => !prev)}
          className="flex min-h-[36px] items-center gap-1.5 w-full text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Comandas
          <span className="ml-auto">
            {showComandas ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>
        {showComandas && (
          <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
            {loadingComandas ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground mx-auto my-2" />
            ) : !linkedComandas || linkedComandas.length === 0 ? (
              <p className="text-[11px] text-muted-foreground italic py-1">Nenhuma comanda.</p>
            ) : (
              linkedComandas.map((cmd: any) => (
                <button
                  key={cmd.id}
                  type="button"
                  className="flex justify-between w-full text-[11px] text-foreground rounded-md px-1.5 py-1 transition-colors hover:bg-[var(--np-surface-glass-hover)]"
                  onClick={() => navigate(`/comandas?comanda=${cmd.id}`)}
                >
                  <span className="truncate mr-2">
                    #{cmd.comanda_number ? String(cmd.comanda_number).padStart(4, "0") : "—"} {(cmd.client as any)?.name || "Avulso"}
                  </span>
                  <span className={`shrink-0 font-semibold ${txtAccent} ${money}`}>{fmt(cmd.total || 0)}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="mt-auto flex flex-wrap gap-2 border-t border-border px-4 py-3">
        {onRecalculate && (
          <DsButton size="md" variant="secondary" className="flex-1 min-w-[120px]" icon={RotateCcw} loading={isRecalculating} onClick={onRecalculate} disabled={isRecalculating}>
            Recalcular
          </DsButton>
        )}
        {showReopenButton && onReopen && caixa.closed_at && (
          <DsButton size="md" variant="secondary" className="flex-1 min-w-[120px]" icon={RotateCcw} onClick={onReopen}>
            Reabrir
          </DsButton>
        )}
        {showEditButton && onEdit && !caixa.closed_at && (
          <DsButton size="md" variant="secondary" className="flex-1 min-w-[120px]" icon={Pencil} onClick={onEdit}>
            Editar
          </DsButton>
        )}
        {onView && (
          <DsButton size="md" variant="primary" className="flex-1 min-w-[120px]" icon={Eye} onClick={onView}>
            Detalhes
          </DsButton>
        )}
        {showCloseButton && onClose && !caixa.closed_at && (
          <DsButton size="md" variant="danger" className="flex-1 min-w-[120px]" onClick={onClose}>
            Fechar Caixa
          </DsButton>
        )}
      </div>
    </GlassCard>
  );
}

function InfoLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <p className="truncate">
      <span className={`${bold ? "font-semibold" : "font-medium"} text-foreground`}>{label}:</span>{" "}
      <span className="text-muted-foreground tabular-nums">{value || "—"}</span>
    </p>
  );
}
