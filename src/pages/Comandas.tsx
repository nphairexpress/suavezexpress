import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard, NavTabs, RecordsTable, Tag, IconButton, CountBadge, EmptyState, Button as NpButton } from "@design-system";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Pencil, Trash2, Printer, FileSpreadsheet, FileText, AlertTriangle, Search } from "lucide-react";
import { ComandaModal } from "@/components/modals/ComandaModal";
import { DeleteComandaModal } from "@/components/modals/DeleteComandaModal";
import { ClientModal } from "@/components/modals/ClientModal";
import { ClientSearchSelect } from "@/components/shared/ClientSearchSelect";
import { useComandas, Comanda, ComandaInput } from "@/hooks/useComandas";
import { useSensitive } from "@/components/common/SensitiveData";
import { useClients } from "@/hooks/useClients";
import { useProfessionals } from "@/hooks/useProfessionals";
import { useServices } from "@/hooks/useServices";
import { useCaixas } from "@/hooks/useCaixas";
import { useAuth } from "@/contexts/AuthContext";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { format, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePendingCaixaCheck } from "@/hooks/usePendingCaixaCheck";
import type { Database } from "@/integrations/supabase/types";

interface AppointmentData {
  id: string;
  client_id: string | null;
  professional_id: string;
  service_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price: number | null;
  notes: string | null;
  status: Database["public"]["Enums"]["appointment_status"];
  clients?: { id: string; name: string; phone: string | null } | null;
  professionals?: { id: string; name: string } | null;
  services?: { id: string; name: string; price: number } | null;
}

export default function Comandas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("abertas");
  const [formData, setFormData] = useState<ComandaInput>({
    client_id: null,
    professional_id: null,
  });
  const [comandaDate, setComandaDate] = useState("");
  const [selectedComanda, setSelectedComanda] = useState<Comanda | null>(null);
  const [comandaModalOpen, setComandaModalOpen] = useState(false);
  const [isProcessingAppointment, setIsProcessingAppointment] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [comandaToDelete, setComandaToDelete] = useState<Comanda | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingClosedComanda, setEditingClosedComanda] = useState(false);
  const [userOpenCaixaId, setUserOpenCaixaId] = useState<string | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [viewClientId, setViewClientId] = useState<string | null>(null);
  // Mês exibido na lista (yyyy-MM). Default = mês corrente; sem isso o hook
  // só traz o mês atual e as comandas do mês anterior somem no dia 1º.
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  const { user, salonId, isMaster } = useAuth();
  const { pode } = useSalonPermissions();
  const canDelete = pode("comanda.excluir");
  const queryClient = useQueryClient();
  const comandaTargetDate = comandaDate ? new Date(comandaDate + "T12:00:00") : undefined;
  const { hasPendingCaixa, message: pendingCaixaMessage } = usePendingCaixaCheck(comandaTargetDate);
  const [mesAno, mesNum] = mes.split("-").map(Number);
  const { comandas, isLoading, createComanda, findOrCreateTodayComanda, isCreating } = useComandas({
    from: new Date(mesAno, mesNum - 1, 1),
    to: new Date(mesAno, mesNum, 0, 23, 59, 59, 999),
  });
  const { clients, createClient, updateClient } = useClients();
  const { professionals } = useProfessionals();
  const { services } = useServices();
  const { openCaixas, caixas } = useCaixas();

  // Check for user's open caixa (derivado do array já carregado — caixas vem
  // ordenado por opened_at desc, então o find pega o mais recente)
  useEffect(() => {
    const caixa = user ? openCaixas.find(c => c.user_id === user.id) : null;
    setUserOpenCaixaId(caixa?.id || null);
  }, [openCaixas, user]);

  // Open comanda from URL param (e.g. from caixa card)
  useEffect(() => {
    const comandaId = searchParams.get("comanda");
    if (comandaId && comandas.length > 0 && !comandaModalOpen) {
      const comanda = comandas.find(c => c.id === comandaId);
      if (comanda) {
        const isEdit = searchParams.get("edit") === "true";
        handleOpenComanda(comanda, isEdit);
        searchParams.delete("comanda");
        searchParams.delete("edit");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, comandas]);

  // Process appointment parameter from URL
  useEffect(() => {
    const appointmentId = searchParams.get("appointment");
    if (appointmentId && !isProcessingAppointment) {
      processAppointment(appointmentId);
    }
  }, [searchParams]);

  const processAppointment = async (appointmentId: string) => {
    setIsProcessingAppointment(true);
    
    try {
      // Fetch appointment data first
      const { data: appointment, error } = await supabase
        .from("appointments")
        .select(`
          id,
          client_id,
          professional_id,
          service_id,
          scheduled_at,
          duration_minutes,
          price,
          notes,
          status,
          clients(id, name, phone),
          professionals(id, name),
          services(id, name, price)
        `)
        .eq("id", appointmentId)
        .single();

      if (error) throw error;
      if (!appointment) {
        toast({ title: "Agendamento não encontrado", variant: "destructive" });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      const appointmentData = appointment as unknown as AppointmentData;
      const appointmentDate = new Date(appointmentData.scheduled_at);
      const today = new Date();
      const isToday = isSameDay(appointmentDate, today);
      const isFutureDate = appointmentDate > today && !isToday;

      // Cannot open comanda for future dates
      if (isFutureDate) {
        toast({
          title: "Não é possível abrir comanda",
          description: "Não é possível abrir comandas para agendamentos futuros.",
          variant: "destructive"
        });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      // Cannot open comanda for already paid appointments
      if (appointmentData.status === "paid") {
        toast({
          title: "Agendamento já pago",
          description: "Este agendamento já foi finalizado e pago. Não é possível abrir nova comanda.",
          variant: "destructive"
        });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      // Check if client exists
      if (!appointmentData.client_id) {
        toast({
          title: "Cliente não definido",
          description: "O agendamento precisa ter um cliente para abrir uma comanda.",
          variant: "destructive"
        });
        searchParams.delete("appointment");
        setSearchParams(searchParams);
        return;
      }

      // Find or create comanda for this client on the appointment date
      const comanda = await findOrCreateTodayComanda(
        appointmentData.client_id,
        appointmentData.professional_id,
        appointmentData.id,
        appointmentDate
      );

      // Check if service already exists in comanda items by source_appointment_id first, then by service_id as fallback
      if (appointmentData.service_id && comanda.id) {
        // First check by source_appointment_id (new robust way)
        const { data: existingByAppointment } = await supabase
          .from("comanda_items")
          .select("*")
          .eq("comanda_id", comanda.id)
          .eq("source_appointment_id", appointmentData.id);

        // Fallback: check by service_id (for legacy comandas)
        const { data: existingByService } = await supabase
          .from("comanda_items")
          .select("*")
          .eq("comanda_id", comanda.id)
          .eq("service_id", appointmentData.service_id);

        // Only add service if it doesn't exist by either method
        if ((!existingByAppointment || existingByAppointment.length === 0) && 
            (!existingByService || existingByService.length === 0)) {
          const servicePrice = appointmentData.price ?? appointmentData.services?.price ?? 0;
          
          await supabase.from("comanda_items").insert({
            comanda_id: comanda.id,
            service_id: appointmentData.service_id,
            professional_id: appointmentData.professional_id,
            source_appointment_id: appointmentData.id,
            description: appointmentData.services?.name || "Serviço",
            item_type: "service",
            quantity: 1,
            unit_price: servicePrice,
            total_price: servicePrice,
          });

          // Update comanda totals
          await supabase
            .from("comandas")
            .update({
              subtotal: (comanda.subtotal || 0) + Number(servicePrice),
              total: (comanda.total || 0) + Number(servicePrice),
            })
            .eq("id", comanda.id);
        } else if (existingByService && existingByService.length > 0 && 
                   (!existingByAppointment || existingByAppointment.length === 0)) {
          // Legacy item exists without source_appointment_id - update it to prevent future duplicates
          await supabase
            .from("comanda_items")
            .update({ 
              source_appointment_id: appointmentData.id,
              professional_id: appointmentData.professional_id,
            })
            .eq("id", existingByService[0].id);
        }
      }

      // Set as selected comanda and open modal
      setSelectedComanda(comanda);
      setComandaModalOpen(true);
      
      // Clear URL parameter
      searchParams.delete("appointment");
      setSearchParams(searchParams);

      toast({ title: "Comanda aberta", description: `Cliente: ${appointmentData.clients?.name}` });
      
    } catch (error: any) {
      console.error("Error processing appointment:", error);
      toast({ title: "Erro ao processar agendamento", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessingAppointment(false);
    }
  };

  const filteredComandas = comandas.filter((comanda) => {
    const clientName = comanda.client?.name?.toLowerCase() || "";
    const professionalName = comanda.professional?.name?.toLowerCase() || "";
    return (
      clientName.includes(searchQuery.toLowerCase()) ||
      professionalName.includes(searchQuery.toLowerCase())
    );
  });

  const today = startOfDay(new Date());
  
  // Open comandas from today
  const openComandas = filteredComandas.filter((c) => !c.closed_at);
  
  // Closed comandas
  const closedComandas = filteredComandas.filter((c) => c.closed_at);
  
  // Pending comandas - open but not from today
  const pendingComandas = filteredComandas.filter((c) => {
    if (c.closed_at) return false;
    const createdDate = startOfDay(new Date(c.created_at));
    return createdDate.getTime() < today.getTime();
  });
  
  // Today's open comandas only
  const todayOpenComandas = openComandas.filter((c) => {
    const createdDate = startOfDay(new Date(c.created_at));
    return createdDate.getTime() === today.getTime();
  });

  const handleCreate = async () => {
    if (!userOpenCaixaId) {
      toast({
        title: "Nenhum caixa aberto",
        description: "Abra um caixa antes de criar a comanda. Para registrar comandas de um dia passado, abra o caixa retroativo daquele dia.",
        variant: "destructive",
      });
      return;
    }

    if (hasPendingCaixa) {
      toast({ title: "Caixa pendente", description: pendingCaixaMessage || "Finalize o caixa anterior antes de criar uma comanda.", variant: "destructive" });
      return;
    }

    // Determine target date (master can pick a date)
    const targetDate = comandaDate ? new Date(comandaDate + "T12:00:00") : new Date();

    // Sanity check: data inválida (ex: ano 0006 por digitação errada "23/05" → "0006-05-23")
    // ou data muito no passado/futuro. O trigger validate_comanda_insert no banco
    // também protege, mas avisa antes de bater no servidor.
    const now = new Date();
    const minDate = new Date(now); minDate.setDate(minDate.getDate() - 60);
    const maxDate = new Date(now); maxDate.setDate(maxDate.getDate() + 1);
    if (Number.isNaN(targetDate.getTime()) || targetDate < minDate || targetDate > maxDate) {
      toast({
        title: "Data inválida",
        description: "A data da comanda precisa estar entre 60 dias atrás e amanhã. Verifique o campo 'Data da Comanda'.",
        variant: "destructive",
      });
      return;
    }

    const isToday = isSameDay(targetDate, new Date());

    // Create comanda without caixa — caixa is linked only when closing
    const insertData: any = { ...formData };
    if (!isToday) {
      insertData.created_at = targetDate.toISOString();
    }

    createComanda(insertData);
    setModalOpen(false);
    setFormData({ client_id: null, professional_id: null });
    setComandaDate("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const getComandaNumber = (comanda: Comanda) => {
    const date = new Date(comanda.created_at);
    const dateStr = format(date, "dd/MM/yyyy");
    const num = comanda.comanda_number ? String(comanda.comanda_number).padStart(4, "0") : comanda.id.slice(0, 4).toUpperCase();
    return `Nº${num} (${dateStr})`;
  };

  // EDITAR comanda exige a mesma senha da visualização de comissões
  const { active: senhaAtiva, locked: senhaTravada, requestUnlock } = useSensitive();
  const pendingEditRef = useRef<Comanda | null>(null);

  const handleOpenComanda = (comanda: Comanda, isEditing = false) => {
    if (isEditing && senhaAtiva && senhaTravada) {
      pendingEditRef.current = comanda;
      requestUnlock();
      return;
    }
    setEditingClosedComanda(isEditing && !!comanda.closed_at);
    setSelectedComanda(comanda);
    setComandaModalOpen(true);
  };

  // Destravou a senha com uma edição pendente? Abre direto (sem 2º clique).
  useEffect(() => {
    if (!senhaTravada && pendingEditRef.current) {
      const c = pendingEditRef.current;
      pendingEditRef.current = null;
      handleOpenComanda(c, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [senhaTravada]);

  const handleCloseComandaModal = () => {
    setSelectedComanda(null);
    setComandaModalOpen(false);
    setEditingClosedComanda(false);
  };

  const handleViewClientFromComanda = (clientId: string) => {
    setViewClientId(clientId);
    setClientModalOpen(true);
  };

  const handleDeleteClick = (comanda: Comanda) => {
    setComandaToDelete(comanda);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (reason: string) => {
    if (!comandaToDelete || !user?.id || !salonId) return;

    setIsDeleting(true);
    try {
      // Exclusão via RPC (etapa 5): só financeiro; snapshot em comanda_deletions,
      // pagamentos anulados, estorno no caixa por método, créditos do Clube/pacote
      // devolvidos pelos triggers e a linha apagada — tudo numa transação.
      // Se recusar (caixa já fechado, sem motivo, sem permissão), a mensagem explica.
      const { error: deleteError } = await supabase.rpc("rpc_excluir_comanda", {
        p_comanda: comandaToDelete.id,
        p_reason: reason,
      });

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: ["comandas", salonId] });
      queryClient.invalidateQueries({ queryKey: ["caixas", salonId] });
      toast({ title: "Comanda excluída com sucesso" });
      setDeleteModalOpen(false);
      setComandaToDelete(null);
    } catch (error: any) {
      console.error("Error deleting comanda:", error);
      toast({
        title: "Erro ao excluir comanda",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getDisplayComandas = () => {
    switch (activeTab) {
      case "abertas":
        return todayOpenComandas;
      case "fechadas":
        return closedComandas;
      case "pendentes":
        return pendingComandas;
      default:
        return todayOpenComandas;
    }
  };

  if (isLoading || isProcessingAppointment) {
    return (
      <AppLayoutNew>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          {isProcessingAppointment && (
            <span className="ml-2 text-muted-foreground">Processando agendamento...</span>
          )}
        </div>
      </AppLayoutNew>
    );
  }

  return (
    <AppLayoutNew>
      <div className="space-y-5 pt-2">
        {/* Caixa pendente de dia anterior */}
        {hasPendingCaixa && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-[var(--np-danger-border)] bg-[var(--np-danger-soft)] p-4 text-[var(--np-danger-text)]">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold">Caixa pendente de dia anterior</p>
              <p className="text-foreground/80">{pendingCaixaMessage} Vá em Financeiro para finalizar.</p>
            </div>
          </div>
        )}

        {/* Aviso de caixa fechado + atalho para pendentes. O botão "Abrir Comanda" fica na faixa global
            do topo (Cleiton 08/07); aqui o aviso ganha respiro e vira um cartão, não uma pílula colada na faixa. */}
        {(!userOpenCaixaId || pendingComandas.length > 0) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {!userOpenCaixaId && (
              <div role="status" className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-[var(--np-danger-border)] bg-[var(--np-danger-soft)] px-4 py-2.5 text-sm font-medium text-[var(--np-danger-text)]">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Abra um caixa para criar comandas
              </div>
            )}
            {pendingComandas.length > 0 && (
              <button
                type="button"
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--np-accent-border)] bg-[var(--np-accent-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--np-accent-text)] transition-transform active:scale-[.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--np-accent)]"
                onClick={() => setActiveTab("pendentes")}
              >
                Comandas Pendentes
                <CountBadge count={pendingComandas.length} />
              </button>
            )}
          </div>
        )}

        {/* Abas */}
        <div className="max-w-full overflow-x-auto">
          <NavTabs
            aria-label="Situação das comandas"
            value={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: "abertas", label: "Abertas", count: todayOpenComandas.length },
              { id: "fechadas", label: "Fechadas", count: closedComandas.length },
              ...(pendingComandas.length > 0 ? [{ id: "pendentes", label: "Pendentes", count: pendingComandas.length, dot: true }] : []),
            ]}
          />
        </div>

        {/* Controles da tabela */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <Select defaultValue="10">
              <SelectTrigger className="h-11 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">por página</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <NpButton variant="secondary" size="sm" icon={Printer}>Print</NpButton>
              <NpButton variant="secondary" size="sm" icon={FileSpreadsheet}>Excel</NpButton>
              <NpButton variant="secondary" size="sm" icon={FileText}>PDF</NpButton>
            </div>
            <label className="flex flex-1 items-center gap-2 sm:flex-none">
              <span className="text-sm text-muted-foreground">Mês:</span>
              <Input
                type="month"
                className="h-11 w-full sm:w-44"
                value={mes}
                max={format(new Date(), "yyyy-MM")}
                onChange={(e) => { if (e.target.value) setMes(e.target.value); }}
              />
            </label>
            <label className="relative flex w-full items-center sm:w-56">
              <span className="sr-only">Buscar:</span>
              <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou profissional"
                className="h-11 w-full pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
          </div>
        </div>

        {/* Lista — CELULAR: cartões de vidro */}
        <div className="space-y-3 md:hidden">
          {getDisplayComandas().length === 0 ? (
            <GlassCard padding={0}>
              <EmptyState icon="ticket" title="Nenhuma comanda encontrada" />
            </GlassCard>
          ) : (
            getDisplayComandas().map((comanda) => (
              <GlassCard
                key={comanda.id}
                padding={16}
                role="button"
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => handleOpenComanda(comanda)}
                onKeyDown={(e) => { if (e.key === "Enter") handleOpenComanda(comanda); }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold uppercase text-foreground">{comanda.client?.name || "Cliente não definido"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {getComandaNumber(comanda)} · {format(new Date(comanda.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="np-num whitespace-nowrap text-lg text-foreground">{formatCurrency(comanda.total)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {activeTab === "pendentes" && <Tag label="Pendente" tone="accent" />}
                  {comanda.items && comanda.items.length > 0 ? (
                    <>
                      {comanda.items.slice(0, 2).map((item, idx) => <Tag key={idx} label={item.description} />)}
                      {comanda.items.length > 2 && <Tag label={`+${comanda.items.length - 2}`} />}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem itens</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="eye" label="Ver comanda" onClick={() => handleOpenComanda(comanda)} />
                  {activeTab === "fechadas" && (
                    <IconButton icon={Pencil} label="Editar comanda" onClick={() => handleOpenComanda(comanda, true)} />
                  )}
                  {canDelete && (
                    <IconButton icon={Trash2} label="Excluir comanda" className="text-[var(--np-danger-text)]" onClick={() => handleDeleteClick(comanda)} />
                  )}
                </div>
              </GlassCard>
            ))
          )}
        </div>

        {/* Lista — DESKTOP: tabela de registros */}
        {/* Contorno local: o CSS da biblioteca põe display:flex no <td> da coluna fixa (a célula não acompanha a altura
            da linha) . Classes Tailwind ficam em @layer e perdem para o CSS sem camada,
            por isso o ajuste vai num <style> escopado nesta tabela. Correção definitiva: design-system/styles/acervo.css. */}
        <style>{`.np-comandas-table td.np-records__primary{display:table-cell;vertical-align:middle}`}</style>
        <RecordsTable<Comanda>
          className="np-comandas-table hidden md:block"
          aria-label="Comandas"
          rows={getDisplayComandas()}
          getRowId={(c) => c.id}
          selectable={false}
          onRowClick={(c) => handleOpenComanda(c)}
          emptyTitle="Nenhuma comanda encontrada"
          primary={{
            header: "Comanda",
            render: (c) => (
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold text-foreground">{getComandaNumber(c).split(" ")[0]}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                {activeTab === "pendentes" && <Tag label="Pendente" tone="accent" />}
              </span>
            ),
          }}
          columns={[
            {
              key: "cliente",
              header: "Cliente",
              sortValue: (c) => c.client?.name || "",
              render: (c) => <span className="block max-w-[220px] whitespace-normal uppercase">{c.client?.name || "Cliente não definido"}</span>,
            },
            {
              key: "servicos",
              header: "Serviços",
              render: (c) => (
                <div className="flex max-w-[240px] flex-wrap gap-1">
                  {c.items && c.items.length > 0 ? (
                    <>
                      {c.items.slice(0, 2).map((item, idx) => <Tag key={idx} label={item.description.length > 30 ? item.description.slice(0, 29) + "…" : item.description} />)}
                      {c.items.length > 2 && <Tag label={`+${c.items.length - 2}`} />}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Sem itens</span>
                  )}
                </div>
              ),
            },
            {
              key: "data",
              header: "Data de abertura",
              sortValue: (c) => new Date(c.created_at).getTime(),
              render: (c) => <span className="whitespace-nowrap tabular-nums">{format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>,
            },
            {
              key: "valor",
              header: "Valor",
              align: "right",
              sortValue: (c) => Number(c.total) || 0,
              render: (c) => <span className="np-num whitespace-nowrap text-foreground">{formatCurrency(c.total)}</span>,
            },
            {
              key: "acoes",
              header: "Ações",
              align: "right",
              render: (c) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon="eye" label="Ver comanda" size="sm" variant="ghost" onClick={() => handleOpenComanda(c)} />
                  {activeTab === "fechadas" && (
                    <IconButton icon={Pencil} label="Editar comanda" size="sm" variant="ghost" onClick={() => handleOpenComanda(c, true)} />
                  )}
                  {canDelete && (
                    <IconButton icon={Trash2} label="Excluir comanda" size="sm" variant="ghost" className="text-[var(--np-danger-text)]" onClick={() => handleDeleteClick(c)} />
                  )}
                  <IconButton icon={Printer} label="Imprimir" size="sm" variant="ghost" className="text-[var(--np-accent-text)]" />
                </div>
              ),
            },
          ]}
        />

        {/* Paginação */}
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Mostrando 1 até {Math.min(10, getDisplayComandas().length)} de {getDisplayComandas().length} registros</span>
          <div className="flex items-center gap-1">
            <NpButton variant="ghost" size="sm" disabled>← Anterior</NpButton>
            <NpButton variant="primary" size="sm">1</NpButton>
            <NpButton variant="ghost" size="sm">Próximo →</NpButton>
          </div>
        </div>
      </div>

      {/* Modal Nova Comanda */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="np-display">Nova Comanda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <ClientSearchSelect
                clients={clients}
                value={formData.client_id || null}
                onSelect={(clientId) => setFormData({ ...formData, client_id: clientId })}
                onCreateNew={(name) => {
                  setNewClientName(name);
                  setClientModalOpen(true);
                }}
                placeholder="Digite para buscar cliente..."
              />
            </div>
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select
                value={formData.professional_id || ""}
                onValueChange={(value) => setFormData({ ...formData, professional_id: value || null })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.filter(p => p.is_active).map((prof) => (
                    <SelectItem key={prof.id} value={prof.id}>
                      {prof.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isMaster && (
              <div className="space-y-2">
                <Label>Data da Comanda <span className="text-xs text-muted-foreground">(somente master)</span></Label>
                <Input
                  type="date"
                  value={comandaDate}
                  onChange={(e) => setComandaDate(e.target.value)}
                  min={format(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
                  max={format(new Date(), "yyyy-MM-dd")}
                  placeholder="Hoje"
                />
                <p className="text-xs text-muted-foreground">Deixe vazio para usar a data de hoje. O caixa do dia selecionado precisa estar aberto.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !formData.client_id}>
              {isCreating ? "Criando..." : "Criar Comanda"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comanda Modal */}
      <ComandaModal
        comanda={selectedComanda}
        open={comandaModalOpen}
        onClose={handleCloseComandaModal}
        professionals={professionals}
        services={services}
        isEditingClosed={editingClosedComanda}
        userCaixaId={userOpenCaixaId}
        openCaixas={openCaixas}
        onDelete={(comanda) => {
          setComandaModalOpen(false);
          handleDeleteClick(comanda);
        }}
        onViewClient={handleViewClientFromComanda}
      />

      {/* Client Modal — rendered AFTER ComandaModal so it appears on top */}
      <ClientModal
        open={clientModalOpen}
        onOpenChange={(open) => {
          setClientModalOpen(open);
          if (!open) { setNewClientName(""); setViewClientId(null); }
        }}
        client={viewClientId ? clients.find(c => c.id === viewClientId) || undefined : undefined}
        initialName={newClientName}
        onSubmit={(data) => {
          if (viewClientId) {
            updateClient({ ...data, id: viewClientId }, {
              onSuccess: () => {
                setClientModalOpen(false);
                setViewClientId(null);
              }
            } as any);
          } else {
            createClient(data, {
              onSuccess: (newClient: any) => {
                if (newClient?.id) {
                  setFormData({ ...formData, client_id: newClient.id });
                }
                setClientModalOpen(false);
                setNewClientName("");
              }
            } as any);
          }
        }}
      />

      {/* Delete Comanda Modal */}
      <DeleteComandaModal
        comanda={comandaToDelete}
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setComandaToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </AppLayoutNew>
  );
}
