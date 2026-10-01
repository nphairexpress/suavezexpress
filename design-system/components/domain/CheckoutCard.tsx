import * as React from "react";
import { Icon, type IconSource } from "../core/Icon";
import { Badge } from "../core/Badge";
import { Button } from "../core/Button";
import { brl, parseBrl, cx } from "../../lib/cx";

export interface CheckoutItem {
  name: string;
  /** Profissional que executou */
  pro?: string;
  price: number;
}

export interface PaymentMethod {
  id: string;
  label: string;
  icon: IconSource;
  disabled?: boolean;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "dinheiro", label: "Dinheiro", icon: "banknote" },
  { id: "pix", label: "Pix", icon: "qr-code" },
  { id: "debito", label: "Débito", icon: "credit-card" },
  { id: "credito", label: "Crédito", icon: "credit-card" },
  { id: "clube", label: "Clube", icon: "crown" },
];

export interface DiffFieldProps {
  /** Positivo = troco (verde); negativo = falta (vermelho); zero = neutro */
  value: number;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function DiffField({ value, label = "Diferença", className, style }: DiffFieldProps) {
  const zero = Math.abs(value) < 0.005;
  const pos = value > 0;
  const tone = zero ? "zero" : pos ? "pos" : "neg";
  return (
    <div className={cx("np-diff", "np-diff--" + tone, className)} style={style} role="status" aria-live="polite">
      <span className="np-diff__label">
        <Icon name={zero ? "equal" : pos ? "arrow-up-right" : "triangle-alert"} size={16} />
        {label}
        {!zero && (pos ? " · troco" : " · falta")}
      </span>
      <span className="np-num np-diff__value">{zero ? brl(0) : (pos ? "+ " : "− ") + brl(Math.abs(value))}</span>
    </div>
  );
}

export interface CheckoutCardProps {
  /** Ex.: "#1042" */
  number: string;
  client: string;
  ticket?: string;
  items: CheckoutItem[];
  discount?: number;
  methods?: PaymentMethod[];
  defaultMethod?: string;
  defaultReceived?: number;
  /** Texto do Clube quando a forma "clube" está escolhida */
  clubNote?: string;
  onFinish?: (r: { method: string; total: number; received: number; diff: number }) => void;
  /** Finalizando (spinner no botão) */
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/** Comanda/checkout: itens, total, formas de pagamento e campo "Diferença" (troco verde / falta vermelha). */
export function CheckoutCard({
  number,
  client,
  ticket,
  items,
  discount = 0,
  methods = DEFAULT_PAYMENT_METHODS,
  defaultMethod = "dinheiro",
  defaultReceived,
  clubNote = "Escova coberta pelo Clube",
  onFinish,
  loading = false,
  className,
  style,
}: CheckoutCardProps) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const total = subtotal - discount;
  const [method, setMethod] = React.useState(defaultMethod);
  const [received, setReceived] = React.useState(defaultReceived != null ? String(defaultReceived).replace(".", ",") : "");
  const recv = method === "dinheiro" ? parseBrl(received) : total;
  const diff = recv - total;
  return (
    <div className={cx("np-glass-card np-checkout", className)} style={style}>
      <div className="np-checkout__head">
        <div>
          <div className="np-caps">Comanda {number}</div>
          <div className="np-checkout__client">{client}</div>
        </div>
        {ticket && <span className="np-num np-checkout__ticket">{ticket}</span>}
      </div>
      <div className="np-checkout__items">
        {items.map((it, i) => (
          <div key={i} className="np-checkout__item">
            <div className="np-grow np-min0">
              <div className="np-checkout__item-name">{it.name}</div>
              {it.pro && <div className="np-caption">{it.pro}</div>}
            </div>
            <span className="np-num np-checkout__price">{brl(it.price)}</span>
          </div>
        ))}
      </div>
      <div className="np-checkout__totals">
        {discount > 0 && (
          <div className="np-checkout__discount">
            <span>Desconto</span>
            <span className="np-num">− {brl(discount)}</span>
          </div>
        )}
        <div className="np-checkout__total">
          <span>Total</span>
          <span className="np-num">{brl(total)}</span>
        </div>
      </div>
      <div>
        <div className="np-field__label np-checkout__methods-label">Forma de pagamento</div>
        <div role="radiogroup" aria-label="Forma de pagamento" className="np-pay-grid">
          {methods.map((m) => {
            const on = m.id === method;
            return (
              <button key={m.id} type="button" role="radio" aria-checked={on} disabled={m.disabled} onClick={() => setMethod(m.id)} className={cx("np-pay", on && "is-on")}>
                <Icon name={m.icon} size={20} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
      {method === "dinheiro" && (
        <div className="np-field">
          <label className="np-field__label" htmlFor={"recv-" + number}>
            Valor recebido
          </label>
          <div className="np-input-wrap">
            <span className="np-input-prefix">R$</span>
            <input id={"recv-" + number} className="np-input np-input--money np-input--icon" inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder="0,00" />
          </div>
        </div>
      )}
      {method === "clube" && (
        <Badge tone="accent" dot>
          {clubNote}
        </Badge>
      )}
      <DiffField value={diff} />
      <Button size="lg" block icon="check" loading={loading} disabled={diff < -0.004} onClick={() => onFinish?.({ method, total, received: recv, diff })}>
        Finalizar e imprimir
      </Button>
    </div>
  );
}
