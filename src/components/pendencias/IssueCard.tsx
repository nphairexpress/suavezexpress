// @ts-nocheck
import { Button } from "@/components/ui/button";
import { Badge, Icon } from "@design-system";
import { MessageCircle, CheckCircle2, Ban, UserRound } from "lucide-react";
import { useResolveIssue } from "@/hooks/useClosureIssues";

// Só apresentação: gravidade do dado (high/medium/low) -> visual do PendingCard (alta/media/baixa).
const SEVERITY_VIEW: Record<string, { cls: "alta" | "media" | "baixa"; label: string; tone: "danger" | "accent" | "neutral"; icon: string }> = {
  high: { cls: "alta", label: "Gravidade alta", tone: "danger", icon: "octagon-alert" },
  medium: { cls: "media", label: "Gravidade média", tone: "accent", icon: "triangle-alert" },
  low: { cls: "baixa", label: "Gravidade baixa", tone: "neutral", icon: "info" },
};

// Labels humanos pra campos técnicos vindos do detector
const FIELD_LABELS: Record<string, string> = {
  method: "Método",
  system_total: "Sistema diz",
  pagbank_total: "PagBank registrou",
  expected_pagbank: "Esperado PagBank",
  asaas_subtracted: "Asaas online descontado",
  diff: "Diferença",
  total: "Total",
  subtotal: "Subtotal",
  discount: "Desconto",
  expected_total: "Total esperado",
  items_sum: "Soma dos itens",
  has_payment: "Tem pagamento?",
  has_comanda: "Comanda correspondente?",
  brand: "Bandeira",
  brand_label: "Bandeira",
  amount: "Valor",
  liquido: "Valor líquido",
  method_code: "Código método",
  hours_open: "Horas em aberto",
  quantity: "Quantidade",
  service: "Serviço",
  client_id: "Cliente",
  balance: "Saldo",
  asaas_id: "ID Asaas",
  status: "Status",
  billing_type: "Tipo cobrança",
  value: "Valor",
  date_created: "Criada em",
  description: "Descrição",
  candidate_comandas: "Comandas candidatas",
  queue_link: "Veio da fila online?",
  // falta_dinheiro (rpc_fechar_caixa)
  esperado_dinheiro: "Dinheiro esperado",
  saldo_inicial: "Saldo inicial",
  dinheiro_comandas: "Dinheiro das comandas",
  suprimentos: "Suprimentos",
  sangrias: "Sangrias",
  contado: "Contado",
  falta: "Falta",
  caixa_id: "Caixa",
};

const METHOD_LABELS: Record<string, string> = {
  credit: "Crédito",
  debit: "Débito",
  credit_card: "Crédito",
  debit_card: "Débito",
  pix: "PIX",
  cash: "Dinheiro",
};

function fmtBRL(n: number): string {
  return `R$ ${Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function fmtValue(key: string, value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value);

  // Métodos
  if (key === "method") return METHOD_LABELS[String(value).toLowerCase()] ?? String(value);

  // Valores monetários
  const moneyKeys = [
    "system_total", "pagbank_total", "expected_pagbank", "asaas_subtracted",
    "diff", "total", "subtotal", "discount", "expected_total", "items_sum",
    "amount", "liquido", "value", "balance",
    "esperado_dinheiro", "saldo_inicial", "dinheiro_comandas", "suprimentos", "sangrias", "contado", "falta",
  ];
  if (moneyKeys.includes(key) && typeof value === "number") {
    const sign = key === "diff" && value > 0 ? "+" : "";
    return `${sign}${fmtBRL(value)}`;
  }

  return String(value);
}

function FieldList({ obj }: { obj: Record<string, any> }) {
  if (!obj || typeof obj !== "object") return null;
  const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs ml-2 text-foreground">
      {entries.map(([k, v]) => (
        <>
          <dt key={`k-${k}`} className="font-medium text-muted-foreground">
            {FIELD_LABELS[k] ?? k}:
          </dt>
          <dd key={`v-${k}`} className="font-mono tabular-nums break-all">
            {fmtValue(k, v)}
          </dd>
        </>
      ))}
    </dl>
  );
}

interface Props {
  issue: any;
  onRequestCorrection: () => void;
}

export function IssueCard({ issue, onRequestCorrection }: Props) {
  const resolve = useResolveIssue();
  const profName = issue.professionals?.name ?? "—";
  const comandaNum = issue.comandas?.comanda_number ?? null;
  const clientName = issue.comandas?.clients?.name ?? null;
  const severity = (issue.severity ?? "low") as keyof typeof SEVERITY_VIEW;
  const view = SEVERITY_VIEW[severity] ?? SEVERITY_VIEW.low;

  return (
    <div className={`np-glass-card np-pending np-pending--${view.cls}`}>
      <div className="np-pending__icon" aria-hidden="true">
        <Icon name={view.icon} size={22} />
      </div>
      <div className="np-pending__body">
        <div className="np-pending__tags">
          <Badge tone={view.tone} dot>{view.label}</Badge>
          <span className="np-caption tabular-nums">
            {issue.detected_date}
            {comandaNum != null && ` · Comanda #${comandaNum}`}
            {clientName && ` · ${clientName}`}
          </span>
        </div>
        <div className="np-pending__title">{issue.description}</div>
        {(issue.expected_value != null || issue.actual_value != null) && (
          <details className="np-pending__desc text-xs">
            <summary className="cursor-pointer font-medium text-foreground min-h-[32px] flex items-center">Detalhes</summary>
            <div className="mt-2 space-y-3 rounded-xl border border-border bg-muted/40 p-3">
              {issue.expected_value && (
                <div>
                  <div className="np-caps mb-1">
                    Esperado
                  </div>
                  <FieldList obj={issue.expected_value} />
                </div>
              )}
              {issue.actual_value && (
                <div>
                  <div className="np-caps mb-1">
                    Recebido
                  </div>
                  <FieldList obj={issue.actual_value} />
                </div>
              )}
            </div>
          </details>
        )}
        <div className="np-pending__owner">
          <UserRound className="h-3.5 w-3.5" />
          Profissional: <strong className="text-foreground">{profName}</strong>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            size="sm"
            className="h-11 gap-1.5"
            onClick={onRequestCorrection}
            disabled={resolve.isPending}
          >
            <MessageCircle className="h-4 w-4" />
            Solicitar correção
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-11 gap-1.5"
            disabled={resolve.isPending}
            onClick={() =>
              resolve.mutate({ id: issue.id, action: "marked_resolved" })
            }
          >
            <CheckCircle2 className="h-4 w-4" />
            Marcar resolvido
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-11 gap-1.5"
            disabled={resolve.isPending}
            onClick={() => {
              const reason = window.prompt("Motivo (opcional):") ?? "";
              resolve.mutate({ id: issue.id, action: "ignored", reason });
            }}
          >
            <Ban className="h-4 w-4" />
            Ignorar
          </Button>
        </div>
      </div>
    </div>
  );
}
