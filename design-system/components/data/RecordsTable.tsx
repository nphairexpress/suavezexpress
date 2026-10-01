import * as React from "react";
import { Icon, type IconSource } from "../core/Icon";
import { Checkbox } from "../core/Input";
import { EmptyState, Skeleton } from "../surfaces/GlassCard";
import { cx } from "../../lib/cx";

/*
 * Tabela de registros. Parte do acervo 21st "23604-records-table" (theshanelevine): grade com
 * linhas explícitas, primeira coluna fixa (sticky), seleção por linha e "selecionar todos" com
 * estado parcial, cabeçalho com ícone e ordenação (seta gira 180° no sentido inverso), etiquetas
 * com ponto colorido, rodapé de cálculos. O CSS original não veio no download: refeito com os
 * tokens do design system (vidro, divisores, âmbar na seleção). Adição: o export não tinha tabela.
 */

export interface RecordsColumn<T> {
  key: string;
  header: string;
  icon?: IconSource;
  /** Valor para ordenar; sem ele a coluna não ordena */
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
  width?: number | string;
  /** Conteúdo do rodapé de cálculos */
  footer?: (rows: T[]) => React.ReactNode;
}

export interface RecordsTableProps<T> {
  rows: T[];
  columns: RecordsColumn<T>[];
  getRowId: (row: T) => string;
  /** Coluna fixa à esquerda (nome do registro) */
  primary: { header: string; render: (row: T) => React.ReactNode; sortValue?: (row: T) => string | number; footer?: (rows: T[]) => React.ReactNode };
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Altura máxima com rolagem interna */
  maxHeight?: number | string;
  "aria-label"?: string;
  className?: string;
}

export function Tag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "positive" | "danger" }) {
  return (
    <span className={cx("np-tag", "np-tag--" + tone)}>
      <span className="np-tag__dot" />
      {label}
    </span>
  );
}

type Sort = { key: string; dir: 1 | -1 } | null;

export function RecordsTable<T>({
  rows,
  columns,
  getRowId,
  primary,
  selectable = true,
  selected: selectedProp,
  onSelectedChange,
  onRowClick,
  loading = false,
  emptyTitle = "Nenhum registro",
  emptyDescription,
  maxHeight,
  className,
  ...aria
}: RecordsTableProps<T>) {
  const [inner, setInner] = React.useState<Set<string>>(new Set());
  const selected = selectedProp ?? inner;
  const setSelected = (s: Set<string>) => {
    setInner(s);
    onSelectedChange?.(s);
  };
  const [sort, setSort] = React.useState<Sort>(primary.sortValue ? { key: "__primary", dir: 1 } : null);

  const visible = React.useMemo(() => {
    if (!sort) return rows;
    const getter = sort.key === "__primary" ? primary.sortValue : columns.find((c) => c.key === sort.key)?.sortValue;
    if (!getter) return rows;
    return [...rows].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      const v = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return v * sort.dir;
    });
  }, [rows, sort, columns, primary]);

  const all = visible.length > 0 && visible.every((r) => selected.has(getRowId(r)));
  const some = !all && visible.some((r) => selected.has(getRowId(r)));
  const toggleSort = (key: string) => setSort((cur) => (cur && cur.key === key ? { key, dir: (cur.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    visible.forEach((r) => (all ? next.delete(getRowId(r)) : next.add(getRowId(r))));
    setSelected(next);
  };
  const SortArrow = ({ k }: { k: string }) => (
    <span className={cx("np-records__sort", sort?.key === k && "is-visible", sort?.key === k && sort.dir === -1 && "is-desc")}>
      <Icon name="arrow-down" size={12} />
    </span>
  );
  const hasFooter = !!primary.footer || columns.some((c) => c.footer);

  return (
    <div className={cx("np-records", className)}>
      <div className="np-records__scroll" tabIndex={0} aria-label={aria["aria-label"] ?? "Tabela de registros. Role para ver todas as colunas."} style={{ maxHeight }}>
        <table className="np-records__table">
          <thead>
            <tr>
              <th className="np-records__th np-records__sticky">
                <div className="np-records__primary-head">
                  {selectable && <Checkbox checked={all} mixed={some} onChange={toggleAll} aria-label="Selecionar todos" />}
                  {primary.sortValue ? (
                    <button type="button" className="np-records__hbtn" onClick={() => toggleSort("__primary")}>
                      {primary.header}
                      <SortArrow k="__primary" />
                    </button>
                  ) : (
                    <span>{primary.header}</span>
                  )}
                </div>
              </th>
              {columns.map((c) => (
                <th key={c.key} className={cx("np-records__th", c.align === "right" && "np-right")} style={{ width: c.width }}>
                  <button type="button" className="np-records__hbtn" onClick={c.sortValue ? () => toggleSort(c.key) : undefined} disabled={!c.sortValue}>
                    {c.icon && (
                      <span className="np-records__hicon">
                        <Icon name={c.icon} size={15} />
                      </span>
                    )}
                    <span className="np-truncate">{c.header}</span>
                    {c.sortValue && <SortArrow k={c.key} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <tr key={i} className="np-records__row">
                    <td className="np-records__td np-records__sticky" colSpan={columns.length + 1}>
                      <Skeleton lines={1} />
                    </td>
                  </tr>
                ))
              : visible.map((row) => {
                  const id = getRowId(row);
                  const on = selected.has(id);
                  return (
                    <tr key={id} className={cx("np-records__row", on && "is-selected", onRowClick && "is-clickable")} aria-selected={selectable ? on : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                      <td className="np-records__td np-records__sticky np-records__primary">
                        {selectable && (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={on} onChange={() => toggleRow(id)} aria-label="Selecionar linha" />
                          </span>
                        )}
                        {primary.render(row)}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} className={cx("np-records__td", c.align === "right" && "np-right")}>
                          {c.render(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
          {hasFooter && !loading && visible.length > 0 && (
            <tfoot>
              <tr className="np-records__calc">
                <td className="np-records__td np-records__sticky">{primary.footer?.(visible)}</td>
                {columns.map((c) => (
                  <td key={c.key} className={cx("np-records__td", c.align === "right" && "np-right")}>
                    {c.footer?.(visible) ?? <span className="np-text-tertiary">—</span>}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
        {!loading && visible.length === 0 && <EmptyState icon="users" title={emptyTitle} description={emptyDescription} />}
      </div>
    </div>
  );
}
