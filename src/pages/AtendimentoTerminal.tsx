// @ts-nocheck
// Terminal de Atendimento — versão mobile pras profissionais (senhoras).
// Elas SÓ executam: pegam a comanda já aberta pela recepção, veem os serviços
// lançados e editam valor / profissional responsável, ou adicionam um serviço.
// Regra de ouro: TUDO grande e fácil. Fonte graúda, botões altos, alto contraste.
import { useState, useEffect } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { recalcComandaTotals } from "@/lib/comandaTotals";
import { useAuth } from "@/contexts/AuthContext";
import { useServices } from "@/hooks/useServices";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useToast } from "@/hooks/use-toast";
import { Button, IconButton, Input, EmptyState } from "@design-system";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ChevronRight, Plus, Pencil, Trash2, Check, X, RefreshCw, Search, Loader2, UserRound, AlertTriangle, Receipt, Percent } from "lucide-react";

// Tema ESCURO fixo (preto + âmbar) aplicado aqui dentro: a rota ainda vive na lista np-legacy do App.tsx,
// então as variáveis do shadcn estão nos valores antigos. Tudo que é visual usa var(--np-*) ou componentes do DS.
const ROOT = "np-app np-bg np-bg--waves min-h-[100dvh] text-[color:var(--np-text-primary)]";
const HEADER = "sticky top-0 z-10 px-4 py-3 flex items-center gap-3 border-b border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] backdrop-blur-xl";
const MUTED = "text-[color:var(--np-text-secondary)]";
// Conteúdo em portal (Select, AlertDialog) fica fora do wrapper: recebe o tema no próprio elemento.
const PORTAL = "border-[color:var(--np-border-strong)] bg-[color:var(--np-surface-glass-strong)] text-[color:var(--np-text-primary)] backdrop-blur-xl";

const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function AtendimentoTerminal() {
  const navigate = useNavigate();
  const { salonId } = useAuth();
  const { services } = useServices();
  const { professionals } = useProfessionals();
  const { toast } = useToast();
  const profs = professionals.filter((p: any) => p.is_active);
  const activeServices = services.filter((s: any) => s.is_active);

  const [comandas, setComandas] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [sel, setSel] = useState<any | null>(null); // comanda selecionada
  const [items, setItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editProf, setEditProf] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<any | null>(null); // item aguardando confirmação de exclusão

  // 29/09/2026 (auditoria O-01): nenhum erro do banco fica mudo — vira toast com a mensagem.
  // Além do toast, o último erro fica num aviso fixo na tela (some ao tocar no X) — só apresentação.
  const [erro, setErro] = useState<{ title: string; msg: string } | null>(null);
  const showError = (title: string, e: any) => {
    setErro({ title, msg: e?.message || String(e) });
    toast({ title, description: e?.message || String(e), variant: "destructive" });
  };

  const avisoErro = erro && (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[color:var(--np-danger-border)] bg-[color:var(--np-danger-soft)] p-4">
      <AlertTriangle className="h-6 w-6 shrink-0 text-[color:var(--np-danger-text)]" />
      <div className="min-w-0 flex-1">
        <div className="text-lg font-semibold text-[color:var(--np-danger-text)]">{erro.title}</div>
        <div className="text-base break-words">{erro.msg}</div>
      </div>
      <IconButton icon={X} label="Fechar aviso" variant="ghost" size="lg" onClick={() => setErro(null)} />
    </div>
  );

  const loadComandas = async () => {
    if (!salonId) return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from("comandas")
      .select("id, comanda_number, created_at, total, client:clients(name)")
      .eq("salon_id", salonId)
      .is("closed_at", null)
      .order("created_at", { ascending: false });
    if (error) showError("Erro ao carregar comandas", error);
    setComandas(data || []);
    setLoadingList(false);
  };

  const loadItems = async (comandaId: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("comanda_items")
      .select("*")
      .eq("comanda_id", comandaId)
      .order("created_at", { ascending: true });
    if (error) showError("Erro ao carregar serviços", error);
    setItems((data || []).filter((i: any) => i.item_type === "service" || !i.item_type));
    setLoadingItems(false);
  };

  useEffect(() => { loadComandas(); }, [salonId]);

  const openComanda = async (c: any) => { setSel(c); setEditId(null); await loadItems(c.id); };
  const backToList = async () => { setSel(null); setItems([]); setEditId(null); await loadComandas(); };

  // total = subtotal − discount atual do banco (trigger do Clube/pacote mexe no discount)
  const recalcTotals = (comandaId: string) => recalcComandaTotals(comandaId);

  const startEdit = (it: any) => {
    setEditId(it.id);
    setEditPrice(String(it.unit_price ?? ""));
    setEditProf(it.professional_id || sel?.professional_id || "");
  };

  const saveEdit = async (it: any) => {
    setBusy(true);
    try {
      const price = parseFloat(editPrice) || 0;
      const qty = it.quantity || 1;
      const { error } = await supabase.from("comanda_items").update({
        unit_price: price,
        total_price: price * qty,
        professional_id: editProf || null,
      }).eq("id", it.id);
      if (error) throw error;
      await recalcTotals(sel.id);
      setEditId(null);
      await loadItems(sel.id);
      toast({ title: "Serviço atualizado" });
    } catch (e) { showError("Erro ao salvar", e); }
    finally { setBusy(false); }
  };

  const removeItem = async (it: any) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("comanda_items").delete().eq("id", it.id);
      if (error) throw error;
      await recalcTotals(sel.id);
      await loadItems(sel.id);
      toast({ title: "Serviço removido" });
    } catch (e) { showError("Erro ao remover", e); }
    finally { setBusy(false); }
  };

  const addService = async (svc: any) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("comanda_items").insert({
        comanda_id: sel.id,
        service_id: svc.id,
        professional_id: sel?.professional_id || null,
        description: svc.name,
        item_type: "service",
        quantity: 1,
        unit_price: svc.price,
        total_price: svc.price,
      });
      if (error) throw error;
      await recalcTotals(sel.id);
      setAddOpen(false); setAddSearch("");
      await loadItems(sel.id);
      toast({ title: "Serviço adicionado" });
    } catch (e) { showError("Erro ao adicionar", e); }
    finally { setBusy(false); }
  };

  const profName = (id: string) => profs.find((p: any) => p.id === id)?.name || "Sem profissional";

  // ---------- LISTA DE CLIENTES (comandas abertas) ----------
  if (!sel) {
    return (
      <div data-theme="dark" className={ROOT}>
        <header className={HEADER + " justify-between"}>
          <h1 className="np-display text-2xl">Atendimento</h1>
          <div className="flex items-center gap-2">
            {/* 01/10: o terminal não tem menu; este é o caminho da profissional para a própria comissão */}
            <Button variant="secondary" size="lg" icon={Percent} onClick={() => navigate("/financeiro/comissoes")}>Comissão</Button>
            <Button variant="secondary" size="lg" icon={RefreshCw} onClick={loadComandas} loading={loadingList}>Atualizar</Button>
          </div>
        </header>

        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {avisoErro}
          <p className={"text-lg " + MUTED}>Toque no nome da cliente:</p>
          {loadingList ? (
            <div className="py-16 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[color:var(--np-accent-text)]" /></div>
          ) : comandas.length === 0 ? (
            <div className="np-glass-card [&_.np-empty__title]:text-xl [&_.np-empty__desc]:text-base" style={{ padding: 24 }}>
              <EmptyState icon={Receipt} title="Nenhuma comanda aberta agora." description="Quando a recepção abrir uma comanda, ela aparece aqui. Toque em Atualizar." />
            </div>
          ) : (
            comandas.map((c) => (
              <button
                key={c.id}
                onClick={() => openComanda(c)}
                className="np-glass-card np-glass-card--lift w-full min-h-[88px] flex items-center justify-between gap-3 text-left active:scale-[.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--np-focus-ring)]"
                style={{ padding: "18px 20px" }}
              >
                <div className="min-w-0">
                  <div className="np-display text-[28px] leading-tight truncate">{c.client?.name || "Cliente"}</div>
                  <div className={"text-base mt-1 tabular-nums " + MUTED}>Comanda {String(c.comanda_number).padStart(4, "0")}</div>
                </div>
                <span className="grid place-items-center h-12 w-12 shrink-0 rounded-full bg-[color:var(--np-accent)] text-[color:var(--np-text-on-accent)]">
                  <ChevronRight className="h-7 w-7" />
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // ---------- SERVIÇOS DA COMANDA ----------
  return (
    <div data-theme="dark" className={ROOT + " pb-32"}>
      <header className={HEADER}>
        <IconButton icon={ArrowLeft} label="Voltar para a lista" size="lg" onClick={backToList} />
        <div className="min-w-0">
          <div className="np-display text-2xl truncate">{sel.client?.name || "Cliente"}</div>
          <div className={"text-sm tabular-nums " + MUTED}>Comanda {String(sel.comanda_number).padStart(4, "0")}</div>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {avisoErro}
        {loadingItems ? (
          <div className="py-12 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[color:var(--np-accent-text)]" /></div>
        ) : items.length === 0 ? (
          <div className="np-glass-card" style={{ padding: 24 }}>
            <EmptyState icon={Receipt} title="Nenhum serviço lançado ainda." description="Toque em Adicionar serviço lá embaixo." />
          </div>
        ) : (
          items.map((it) => (
            <div key={it.id} className="np-glass-card space-y-4" style={{ padding: 18 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="text-xl font-semibold leading-tight">{it.description}</div>
                <div className="np-display text-2xl whitespace-nowrap tabular-nums">{brl(it.total_price)}</div>
              </div>

              {editId === it.id ? (
                <div className="space-y-3">
                  <Input label="Valor (R$)" type="number" inputMode="decimal" step="0.01" value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    variant="money" className="h-14 text-2xl font-bold text-right tabular-nums" />
                  <div>
                    <label className={"block mb-1.5 text-base " + MUTED}>Profissional</label>
                    <Select value={editProf} onValueChange={setEditProf}>
                      <SelectTrigger className="h-14 text-lg rounded-xl border-[color:var(--np-border-strong)] bg-[color:var(--np-surface-inset)] text-[color:var(--np-text-primary)]">
                        <SelectValue placeholder="Escolher" />
                      </SelectTrigger>
                      <SelectContent data-theme="dark" className={PORTAL}>
                        {profs.map((p: any) => (
                          <SelectItem key={p.id} value={p.id} className="text-lg py-3 min-h-[48px] focus:bg-[color:var(--np-accent-soft)] focus:text-[color:var(--np-text-primary)]">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-3">
                    <Button size="xl" block icon={Check} loading={busy} onClick={() => saveEdit(it)} className="flex-1">Salvar</Button>
                    <Button size="xl" variant="secondary" onClick={() => setEditId(null)} aria-label="Cancelar edição" title="Cancelar edição">
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={"flex items-center gap-2 text-lg " + MUTED}>
                    <UserRound className="h-5 w-5" />
                    {it.professional_id ? profName(it.professional_id) : (sel.professional_id ? profName(sel.professional_id) : "Sem profissional")}
                  </div>
                  <div className="flex gap-3">
                    <Button size="lg" variant="secondary" block icon={Pencil} onClick={() => startEdit(it)} className="flex-1 !min-h-[56px] text-xl">Editar</Button>
                    <Button size="lg" variant="danger" disabled={busy} onClick={() => setConfirmDel(it)} aria-label="Remover serviço" title="Remover serviço" className="!min-h-[56px] px-5">
                      <Trash2 className="h-6 w-6" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Botão grande fixo: adicionar serviço */}
      <div className="fixed bottom-0 inset-x-0 p-4 border-t border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-glass-strong)] backdrop-blur-xl">
        <div className="max-w-2xl mx-auto">
          <Button size="xl" block icon={Plus} onClick={() => { setAddOpen(true); setAddSearch(""); }} className="text-xl">
            Adicionar serviço
          </Button>
        </div>
      </div>

      {/* Seletor de serviço — tela cheia, lista grande */}
      {addOpen && (
        <div data-theme="dark" className={ROOT + " fixed inset-0 z-50 flex flex-col"}>
          <header className={HEADER}>
            <IconButton icon={ArrowLeft} label="Voltar" size="lg" onClick={() => setAddOpen(false)} />
            <h2 className="np-display text-2xl">Escolher serviço</h2>
          </header>
          <div className="p-4 max-w-2xl w-full mx-auto">
            <Input autoFocus placeholder="Buscar serviço..." value={addSearch} icon={Search}
              onChange={(e) => setAddSearch(e.target.value)}
              className="h-14 text-xl" />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 max-w-2xl w-full mx-auto">
            {activeServices
              .filter((s: any) => s.name.toLowerCase().includes(addSearch.toLowerCase()))
              .map((s: any) => (
                <button key={s.id} onClick={() => addService(s)} disabled={busy}
                  className="np-glass-card w-full min-h-[64px] flex items-center justify-between gap-3 text-left active:scale-[.98] transition-transform disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--np-focus-ring)]"
                  style={{ padding: "14px 20px" }}>
                  <span className="text-xl font-semibold">{s.name}</span>
                  <span className="np-display text-xl whitespace-nowrap tabular-nums text-[color:var(--np-accent-text)]">{brl(s.price)}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Confirmação antes de remover serviço (O-01): lixeira não apaga mais no primeiro toque */}
      <AlertDialog open={!!confirmDel} onOpenChange={(o) => { if (!o) setConfirmDel(null); }}>
        <AlertDialogContent data-theme="dark" className={PORTAL + " np-app rounded-2xl"}>
          <AlertDialogHeader>
            <AlertDialogTitle className="np-display text-2xl">Remover serviço?</AlertDialogTitle>
            <AlertDialogDescription className={"text-lg " + MUTED}>
              {confirmDel?.description} ({brl(confirmDel?.total_price)}) sai da comanda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-14 text-lg rounded-xl border-[color:var(--np-border-strong)] bg-[color:var(--np-surface-inset)] text-[color:var(--np-text-primary)] hover:bg-[color:var(--np-surface-inset-hover)] hover:text-[color:var(--np-text-primary)]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-14 text-lg rounded-xl bg-[color:var(--np-danger-solid)] text-[color:var(--np-text-on-danger)] hover:bg-[color:var(--np-danger-solid-hover)]"
              onClick={() => { const it = confirmDel; setConfirmDel(null); if (it) removeItem(it); }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
