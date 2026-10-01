import * as React from "react";
import { Icon } from "../core/Icon";
import { Badge } from "../core/Badge";
import { brl, cx } from "../../lib/cx";

export interface CashLine {
  /** Ex.: "Dinheiro", "Pix", "Débito" */
  label: string;
  expected: number;
  /** Valor contado no fechamento; ausente = igual ao esperado */
  counted?: number;
}

export interface CashCardProps {
  title?: string;
  openedBy?: string;
  openedAt?: string;
  status?: "aberto" | "fechado";
  lines: CashLine[];
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** Caixa com esperado × contado por forma; falta em vermelho com brilho de alerta. */
export function CashCard({ title = "Caixa da recepção", openedBy, openedAt, status = "aberto", lines, footer, className, style }: CashCardProps) {
  const exp = lines.reduce((s, l) => s + l.expected, 0);
  const cnt = lines.reduce((s, l) => s + (l.counted ?? l.expected), 0);
  const diff = cnt - exp;
  const short = diff < -0.004;
  return (
    <div className={cx("np-glass-card np-cash", short && "is-short", className)} style={style}>
      <div className="np-cash__head">
        <div>
          <div className="np-cash__title">{title}</div>
          <div className="np-caption">
            {openedBy && "Aberto por " + openedBy}
            {openedAt && " · " + openedAt}
          </div>
        </div>
        <Badge tone={status === "aberto" ? "positive" : "neutral"} dot live={status === "aberto"}>
          {status === "aberto" ? "Aberto" : "Fechado"}
        </Badge>
      </div>
      <table className="np-table">
        <thead>
          <tr>
            <th>Forma</th>
            <th className="np-right">Esperado</th>
            <th className="np-right">Contado</th>
            <th className="np-right">Dif.</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const d = (l.counted ?? l.expected) - l.expected;
            return (
              <tr key={i}>
                <td>{l.label}</td>
                <td className="np-num np-right np-cash__cell">{brl(l.expected)}</td>
                <td className="np-num np-right np-cash__cell">{brl(l.counted ?? l.expected)}</td>
                <td className={cx("np-num np-right np-cash__diff", d < -0.004 ? "np-text-danger" : d > 0.004 ? "np-text-positive" : "np-text-tertiary")}>
                  {Math.abs(d) < 0.005 ? "—" : (d > 0 ? "+" : "−") + brl(Math.abs(d))}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="np-cash__totals">
        <div className="np-cash__box">
          <div className="np-label">Total esperado</div>
          <div className="np-num np-cash__big">{brl(exp)}</div>
        </div>
        <div className={cx("np-cash__box", short ? "np-cash__box--short" : "np-cash__box--ok")}>
          <div className="np-cash__verdict">
            <Icon name={short ? "triangle-alert" : "circle-check"} size={14} />
            {short ? "Falta no caixa" : "Caixa confere"}
          </div>
          <div className="np-num np-cash__big">{short ? "− " + brl(Math.abs(diff)) : brl(diff)}</div>
        </div>
      </div>
      {footer}
    </div>
  );
}

export interface ReceiptProps {
  number: string;
  date: string;
  client: string;
  ticket?: string;
  items: { name: string; pro?: string; price: number }[];
  discount?: number;
  method?: string;
  received?: number;
  change?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** Cupom de comprovante (papel branco, borda serrilhada, 300 px): único elemento opaco claro no tema escuro. */
export function Receipt({ number, date, client, ticket, items, discount = 0, method, received, change, className, style }: ReceiptProps) {
  const total = items.reduce((s, i) => s + i.price, 0) - discount;
  return (
    <div className={cx("np-receipt", className)} style={style}>
      <div className="np-center">
        <div className="np-receipt__brand">
          NP HAIR <span>EXPRESS</span>
        </div>
        <div className="np-receipt__sub">Salto/SP · Comprovante sem valor fiscal</div>
      </div>
      <div className="np-receipt__rule" />
      <div className="np-receipt__row np-receipt__muted">
        <span>Comanda {number}</span>
        <span>{date}</span>
      </div>
      <div className="np-receipt__row np-receipt__muted">
        <span>{client}</span>
        {ticket && <span>Senha {ticket}</span>}
      </div>
      <div className="np-receipt__rule" />
      {items.map((it, i) => (
        <div key={i} className="np-receipt__row np-receipt__item">
          <span>
            {it.name}
            {it.pro ? " · " + it.pro : ""}
          </span>
          <span className="np-receipt__price">{brl(it.price)}</span>
        </div>
      ))}
      {discount > 0 && (
        <div className="np-receipt__row np-receipt__item np-receipt__muted">
          <span>Desconto</span>
          <span>− {brl(discount)}</span>
        </div>
      )}
      <div className="np-receipt__rule" />
      <div className="np-receipt__row np-receipt__total">
        <span>TOTAL</span>
        <span className="np-num">{brl(total)}</span>
      </div>
      {method && (
        <div className="np-receipt__row np-receipt__muted">
          <span>Pago em {method}</span>
          <span>{received != null ? brl(received) : ""}</span>
        </div>
      )}
      {change != null && change > 0 && (
        <div className="np-receipt__row np-receipt__muted">
          <span>Troco</span>
          <span>{brl(change)}</span>
        </div>
      )}
      <div className="np-receipt__slogan">Beleza pra quem não para!</div>
    </div>
  );
}
