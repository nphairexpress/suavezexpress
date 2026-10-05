import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, UserPlus, Search } from "lucide-react";
import { Button, Input, EmptyState } from "@design-system";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";
import { useProfessionalClientCommissions } from "@/hooks/useProfessionalClientCommissions";

// Clientes com comissão diferenciada (par profissional, cliente). Pedido do Cleiton 05/10/2026.
// Vale acima do percentual por serviço, só para esta profissional. Visível e editável só com comissao.editar.
// Busca de cliente sempre pela view clients_staff (select direto em clients dá 42501 em cpf/rg).

interface ClientHit { id: string; name: string; phone: string | null }

const finalFone = (phone: string | null) => {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length >= 4 ? `final ${d.slice(-4)}` : "";
};

const parsePct = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};

export function ProfessionalClientCommissionsSection({ professionalId }: { professionalId: string }) {
  const { salonId } = useAuth();
  const { pode, isLoading: loadingPerms } = useSalonPermissions();
  const canEdit = pode("comissao.editar");
  const { rows, isLoading, addRule, updateRule, removeRule, isSaving } = useProfessionalClientCommissions(professionalId);

  // Nomes das clientes já cadastradas
  const ids = useMemo(() => rows.map(r => r.client_id).sort(), [rows]);
  const { data: names = {} } = useQuery({
    queryKey: ["pcc-client-names", salonId, ids.join(",")],
    queryFn: async () => {
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("clients_staff").select("id, name, phone").in("id", ids);
      if (error) throw error;
      const m: Record<string, ClientHit> = {};
      (data ?? []).forEach((c: ClientHit) => { m[c.id] = c; });
      return m;
    },
    enabled: !!salonId && canEdit && ids.length > 0,
  });

  // Busca para adicionar
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data: hits = [], isFetching: searching } = useQuery({
    queryKey: ["pcc-client-search", salonId, debounced],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients_staff")
        .select("id, name, phone")
        .eq("salon_id", salonId)
        .ilike("name", `%${debounced}%`)
        .order("name")
        .limit(8);
      if (error) throw error;
      return (data ?? []) as ClientHit[];
    },
    enabled: !!salonId && canEdit && debounced.length >= 2,
  });

  const [picked, setPicked] = useState<ClientHit | null>(null);
  const [newPct, setNewPct] = useState("");
  const [newObs, setNewObs] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  if (loadingPerms || !canEdit) return null;

  const already = new Set(rows.map(r => r.client_id));
  const newPctValue = parsePct(newPct);

  const handleAdd = async () => {
    if (!picked || newPctValue === null) return;
    await addRule({ professional_id: professionalId, client_id: picked.id, commission_percent: newPctValue, observacao: newObs.trim() || null });
    setPicked(null); setSearch(""); setNewPct(""); setNewObs("");
  };

  const handleSavePct = async (id: string, current: number) => {
    const draft = drafts[id];
    if (draft === undefined) return;
    const v = parsePct(draft);
    setDrafts(d => { const n = { ...d }; delete n[id]; return n; });
    if (v === null || v === Number(current)) return;
    await updateRule({ id, commission_percent: v });
  };

  return (
    <section className="space-y-4 border-t border-border pt-6 mt-6" aria-labelledby="pcc-title">
      <div className="space-y-1">
        <h3 id="pcc-title" className="font-semibold text-sm">Clientes com comissão diferenciada</h3>
        <p className="text-xs text-muted-foreground">
          Vale para qualquer serviço desta profissional com a cliente, acima do percentual por serviço.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <EmptyState icon="users" title="Nenhuma cliente com comissão diferenciada" />
      ) : (
        <ul className="space-y-2">
          {rows.map(r => {
            const c = names[r.client_id];
            return (
              <li key={r.id} className="border border-border rounded-xl p-3 bg-muted/30 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{c?.name ?? "Cliente"}</p>
                  {(r.observacao || c?.phone) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[finalFone(c?.phone ?? null), r.observacao].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-24">
                    <Input
                      aria-label={`Comissão de ${c?.name ?? "cliente"} em %`}
                      inputMode="decimal"
                      value={drafts[r.id] ?? String(Number(r.commission_percent))}
                      onChange={e => setDrafts(d => ({ ...d, [r.id]: e.target.value }))}
                      onBlur={() => handleSavePct(r.id, r.commission_percent)}
                      onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      trailing={<span className="text-sm text-muted-foreground pr-2">%</span>}
                      className="text-center tabular-nums"
                      disabled={isSaving}
                    />
                  </div>
                  {confirmRemove === r.id ? (
                    <Button variant="danger" onClick={async () => { setConfirmRemove(null); await removeRule(r.id); }} loading={isSaving}>
                      Confirmar
                    </Button>
                  ) : (
                    <Button variant="ghost" icon={Trash2} aria-label={`Remover ${c?.name ?? "cliente"}`} onClick={() => setConfirmRemove(r.id)} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border border-border rounded-xl p-3 space-y-3">
        <p className="text-sm font-medium">Adicionar cliente</p>
        {picked ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <span className="text-sm font-medium truncate">{picked.name}</span>
            <Button variant="ghost" onClick={() => setPicked(null)}>Trocar</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              icon={Search}
              placeholder="Buscar cliente pelo nome"
              aria-label="Buscar cliente pelo nome"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {debounced.length >= 2 && (
              <ul className="max-h-64 overflow-y-auto space-y-1" aria-live="polite">
                {hits.length === 0 && !searching && <li className="text-xs text-muted-foreground px-1">Nenhuma cliente encontrada</li>}
                {hits.map(h => (
                  <li key={h.id}>
                    <button
                      type="button"
                      disabled={already.has(h.id)}
                      onClick={() => setPicked(h)}
                      className="w-full min-h-[44px] text-left rounded-lg px-3 py-2 hover:bg-muted/50 disabled:opacity-45 flex items-center justify-between gap-2"
                    >
                      <span className="text-sm truncate">{h.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{already.has(h.id) ? "já na lista" : finalFone(h.phone)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="grid grid-cols-[6rem_1fr] gap-2">
          <Input
            aria-label="Comissão em %"
            inputMode="decimal"
            value={newPct}
            onChange={e => setNewPct(e.target.value)}
            trailing={<span className="text-sm text-muted-foreground pr-2">%</span>}
            className="text-center tabular-nums"
            error={newPct && newPctValue === null ? "0 a 100" : undefined}
          />
          <Input
            aria-label="Observação"
            placeholder="Observação (opcional)"
            value={newObs}
            onChange={e => setNewObs(e.target.value)}
          />
        </div>
        <Button icon={UserPlus} block onClick={handleAdd} disabled={!picked || newPctValue === null} loading={isSaving}>
          Adicionar cliente
        </Button>
      </div>
    </section>
  );
}
