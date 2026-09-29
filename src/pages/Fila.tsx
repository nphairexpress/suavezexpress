import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Clock, UserCheck, Bell, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueue } from "@/hooks/useQueue";
import { useQueueLeads } from "@/hooks/useQueueLeads";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQueueRealtime } from "@/hooks/useQueueRealtime";
import { useCaixas } from "@/hooks/useCaixas";
import { useToast } from "@/hooks/use-toast";
import { QueueCard } from "@/components/queue/QueueCard";
import { AddWalkInModal } from "@/components/queue/AddWalkInModal";
import { VenderClubeModal } from "@/components/clube/VenderClubeModal";
import { AssignProfessionalModal } from "@/components/queue/AssignProfessionalModal";
import { notifyQueueEntry, notifyLead } from "@/lib/queueNotifications";
import type { QueueEntry } from "@/types/queue";

const SITE_URL = window.location.origin;

export default function Fila() {
  const navigate = useNavigate();
  const { salonId } = useAuth();
  const { toast } = useToast();
  const { entries, stats, addToQueue, checkIn, assignProfessional, skip, remove, markNoShow, reorder, complete, archiveStaleEntries } = useQueue();
  const { pendingLeads, notifiedLeads, markNotified } = useQueueLeads();
  const { getSalonOpenCaixa } = useCaixas();
  useQueueRealtime();
  // Aviso de "vez chegando" agora é server-side (edge queue-cron, pg_cron 1/min)
  // — não depende mais desta tela estar aberta.

  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [venderClubeOpen, setVenderClubeOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);

  // Arquiva zumbis de dias anteriores uma vez ao abrir a Fila
  useEffect(() => {
    archiveStaleEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId]);

  const [prevCount, setPrevCount] = useState(entries.length);
  useEffect(() => {
    if (entries.length > prevCount) {
      try { new Audio("/notification.mp3").play(); } catch {}
    }
    setPrevCount(entries.length);
  }, [entries.length]);

  // Regra da casa: comanda aberta NA CHEGADA da cliente; cobrança só na saída.
  // Abre (ou reaproveita, se já houver aberta) a comanda da cliente com os
  // serviços da fila como itens, via rpc_iniciar_atendimento (etapa 5): comanda
  // + itens + fila in_service + pagamento Asaas numa transação, SEM caixa.
  // Retorna ids pra quem chamou.
  const abrirComandaDaChegada = async (
    entry: QueueEntry,
    professionalId?: string | null
  ): Promise<{ comandaId: string | null; clientId: string | null }> => {
    if (!salonId) return { comandaId: null, clientId: null };
    // Regra Cleiton 08/07: só abre comanda automática pra quem veio da FILA DIGITAL (online/pago).
    // Walk-in/presencial NÃO abre comanda sozinho — a recepção usa o botão "Abrir Comanda".
    // (Também evita a comanda/atendimento duplicado do fluxo presencial.)
    if (entry.source !== "online") return { comandaId: null, clientId: null };

    // 1. Find or create client by phone
    let clientId = entry.customer_id;
    if (!clientId && entry.customer_phone) {
      const cleanPhone = entry.customer_phone.replace(/\D/g, "");
      const { data: existingClient } = await supabase
        .from("clients_staff")
        .select("id")
        .eq("salon_id", salonId)
        .or(`phone.eq.${cleanPhone},phone.eq.${entry.customer_phone}`)
        .limit(1)
        .maybeSingle();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            salon_id: salonId,
            name: entry.customer_name,
            phone: cleanPhone,
            email: entry.customer_email || null,
          })
          .select("id")
          .single();
        clientId = newClient?.id || null;
      }

      // Update queue entry with client_id
      if (clientId) {
        await supabase.from("queue_entries").update({ customer_id: clientId }).eq("id", entry.id);
      }
    }
    if (!clientId) return { comandaId: null, clientId: null };

    // 2. A RPC exige a profissional. No check-in a entrada online ainda não tem
    // profissional → a comanda abre no "Atender" (que reaproveita se já houver).
    const profId = professionalId || entry.assigned_professional_id || null;
    if (!profId) return { comandaId: null, clientId };

    // 3. Caixa NÃO abre mais sozinho: a comanda nasce sem caixa e só precisa
    // dele na hora de fechar. Aqui só avisa.
    const caixaAberto = await getSalonOpenCaixa();
    if (!caixaAberto) {
      toast({
        title: "Nenhum caixa aberto",
        description: "A comanda pode ser aberta; abra o caixa antes de fechá-la.",
      });
    }

    // 4. Comanda (ou reaproveita a aberta) + itens dos serviços da fila + fila
    // in_service + pagamento Asaas (uma vez) — tudo na RPC.
    const { data, error } = await supabase.rpc("rpc_iniciar_atendimento", {
      p_client_id: clientId,
      p_professional_id: profId,
      p_service_id: entry.service_id || null,
      p_queue_entry_id: entry.id,
      p_source: "fila_online",
    });
    if (error) throw error;

    return { comandaId: (data?.comanda_id as string) || null, clientId };
  };

  const handleAddWalkIn = async (data: { customer_name: string; customer_phone: string; service_id: string }) => {
    try {
      await addToQueue({ customer_name: data.customer_name, customer_phone: data.customer_phone, service_id: data.service_id, source: "walk_in" });
      // Walk-in já entra como checked_in (chegou) → comanda abre na hora
      const { data: novaEntry } = await supabase
        .from("queue_entries")
        .select(`*, service:services(id, name, price, duration_minutes)`)
        .eq("salon_id", salonId)
        .eq("customer_phone", data.customer_phone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (novaEntry) await abrirComandaDaChegada(novaEntry as QueueEntry);
      toast({ title: "Cliente na fila e comanda aberta!" });
    } catch { toast({ title: "Erro ao adicionar", variant: "destructive" }); }
  };

  // Check-in = a cliente CHEGOU → marca na fila e abre a comanda dela
  const handleCheckIn = async (entry: QueueEntry) => {
    checkIn(entry.id);
    const { comandaId } = await abrirComandaDaChegada(entry);
    if (comandaId) toast({ title: "Check-in feito e comanda aberta!" });
  };

  const handleAssignProfessional = async (professionalId: string) => {
    if (!selectedEntry || !salonId) return;
    try {
      // 1. Garante a comanda (reaproveita se já houver aberta); a RPC já vincula
      // a profissional à comanda/itens e registra o pagamento Asaas.
      const { comandaId, clientId } = await abrirComandaDaChegada(selectedEntry, professionalId);

      // 2. Assign professional in queue (moves to in_service) — a RPC já faz
      // isso pra entrada online; aqui continua valendo pra presencial/walk-in.
      const { error: assignError } = await supabase
        .from("queue_entries")
        .update({
          assigned_professional_id: professionalId,
          status: "in_service",
          checked_in_at: selectedEntry.checked_in_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedEntry.id);
      if (assignError) console.error("Assign error:", assignError);

      if (comandaId) {
        // 3. Pagamento online (Asaas) confirmado: a RPC já registrou UMA vez na
        // comanda (valor pago, não o do catálogo). A comanda FICA ABERTA até a
        // saída; o caixa recebe no fechamento dela. Aqui só a agenda visual.
        if (selectedEntry.source === "online" && selectedEntry.payment_status === "confirmed") {
          const svcIds = (selectedEntry.service_ids && selectedEntry.service_ids.length > 0)
            ? selectedEntry.service_ids
            : (selectedEntry.service_id ? [selectedEntry.service_id] : []);
          const { data: svcs } = await supabase.from("services").select("id, name, price, duration_minutes").in("id", svcIds);
          type SvcRow = { id: string; name: string; price: number; duration_minutes: number | null };
          const svcRows = (svcs || []) as SvcRow[];

          // Agenda for visual tracking (um por serviço)
          if (svcRows.length > 0) {
            await supabase.from("appointments").insert(svcRows.map((s) => ({
              salon_id: salonId,
              client_id: clientId,
              professional_id: professionalId,
              service_id: s.id,
              scheduled_at: new Date().toISOString(),
              duration_minutes: s.duration_minutes || 45,
              status: "in_progress",
              notes: `Fila online - Pagamento online`,
              price: s.price,
            })));
          }
        }
      }

      toast({ title: "Atendimento iniciado!" });

      if (comandaId) {
        navigate(`/comandas?comanda=${comandaId}&edit=true`);
      }
    } catch (err) {
      toast({
        title: "Erro ao atribuir",
        description: (err as { message?: string })?.message,
        variant: "destructive",
      });
    }
  };

  const handleSkip = (entry: QueueEntry) => {
    skip(entry.id);
    if (entry.source === "online" && entry.customer_phone && salonId) {
      notifyQueueEntry(salonId, entry, "skipped");
    }
  };

  const handleRemove = (entry: QueueEntry) => {
    remove(entry.id);
    if (entry.source === "online" && entry.payment_status === "confirmed" && salonId) {
      notifyQueueEntry(salonId, entry, "credit", { creditAmount: entry.service?.price });
    }
  };

  const handleNotifyLead = async (lead: { id: string; phone: string; name: string }) => {
    if (!salonId) return;
    const sent = await notifyLead(salonId, lead, stats.totalInQueue, `${SITE_URL}/fila`);
    if (sent) {
      markNotified(lead.id);
      toast({ title: "WhatsApp enviado!" });
    } else {
      // Z-API não configurada neste salão → não assusta a recepção com erro vermelho.
      toast({ title: "Notificação por WhatsApp não está ativa aqui." });
    }
  };

  const inServiceEntries = entries.filter((e) => e.status === "in_service");
  const waitingEntries = entries.filter((e) => ["waiting", "checked_in"].includes(e.status));

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const ids = waitingEntries.map((e) => e.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    reorder(ids);
  };

  const handleMoveDown = (index: number) => {
    if (index >= waitingEntries.length - 1) return;
    const ids = waitingEntries.map((e) => e.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    reorder(ids);
  };

  return (
    <AppLayoutNew>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Fila de Atendimento</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-amber-400 text-amber-600 hover:bg-amber-50"
              onClick={() => setVenderClubeOpen(true)}
            >
              <Crown className="h-4 w-4 mr-2" />Vender Clube
            </Button>
            <Button onClick={() => setWalkInModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Adicionar presencial
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{stats.totalInQueue}</p>
            <p className="text-xs text-muted-foreground">Na fila</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-orange-500 mb-1" />
            <p className="text-2xl font-bold">~{stats.estimatedMinutes} min</p>
            <p className="text-xs text-muted-foreground">Tempo estimado</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <UserCheck className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{inServiceEntries.length}</p>
            <p className="text-xs text-muted-foreground">Em atendimento</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="fila">
          <TabsList>
            <TabsTrigger value="fila">Fila ({waitingEntries.length})</TabsTrigger>
            <TabsTrigger value="atendimento">Em atendimento ({inServiceEntries.length})</TabsTrigger>
            <TabsTrigger value="leads">Leads{pendingLeads.length > 0 && <Badge className="ml-2 bg-red-500">{pendingLeads.length}</Badge>}</TabsTrigger>
          </TabsList>

          <TabsContent value="fila">
            {waitingEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Fila vazia</p>
            ) : waitingEntries.map((entry, index) => (
              <QueueCard key={entry.id} entry={entry}
                isFirst={index === 0}
                isLast={index === waitingEntries.length - 1}
                onCheckIn={() => handleCheckIn(entry)}
                onAssignProfessional={() => { setSelectedEntry(entry); setAssignModalOpen(true); }}
                onSkip={() => handleSkip(entry)}
                onRemove={() => handleRemove(entry)}
                onNoShow={() => markNoShow(entry.id)}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
              />
            ))}
          </TabsContent>

          <TabsContent value="atendimento">
            {inServiceEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum atendimento em andamento</p>
            ) : inServiceEntries.map((entry) => {
              // Fila de verdade: mostra há quanto tempo está "em atendimento"
              // e cutuca a equipe a dar baixa quando passa do razoável.
              const inicio = entry.checked_in_at || entry.created_at;
              const mins = inicio ? Math.max(0, Math.round((Date.now() - new Date(inicio).getTime()) / 60000)) : null;
              return (
                <div key={entry.id} className="space-y-1">
                  {mins !== null && (
                    <p className={`text-xs px-1 ${mins > 90 ? "text-red-600 font-semibold" : "text-muted-foreground"}`}>
                      Em atendimento há {mins} min{mins > 90 ? " — já terminou? Finaliza pra fila ficar de verdade" : ""}
                    </p>
                  )}
                  <QueueCard entry={entry}
                    isFirst={true} isLast={true}
                    onCheckIn={() => {}} onAssignProfessional={() => {}} onSkip={() => {}} onRemove={() => handleRemove(entry)}
                    onMoveUp={() => {}} onMoveDown={() => {}}
                    onComplete={() => {
                      if (confirm(`Finalizar o atendimento de ${entry.customer_name}?`)) {
                        complete(entry.id);
                      }
                    }}
                  />
                </div>
              );
            })}
          </TabsContent>

          <TabsContent value="leads">
            {pendingLeads.length === 0 && notifiedLeads.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lead</p>
            ) : (
              <div className="space-y-2">
                {pendingLeads.map((lead) => (
                  <Card key={lead.id}><CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.phone} · Quer fila &lt; {lead.max_queue_size}</p>
                    </div>
                    <Button size="sm" onClick={() => handleNotifyLead(lead)}><Bell className="h-4 w-4 mr-1" />Notificar</Button>
                  </CardContent></Card>
                ))}
                {notifiedLeads.map((lead) => (
                  <Card key={lead.id} className="opacity-60"><CardContent className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-sm text-muted-foreground">{lead.phone}</p>
                    </div>
                    <Badge variant="outline">Notificada</Badge>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <VenderClubeModal open={venderClubeOpen} onClose={() => setVenderClubeOpen(false)} />
      <AddWalkInModal open={walkInModalOpen} onClose={() => setWalkInModalOpen(false)} onSubmit={handleAddWalkIn} />
      {selectedEntry && (
        <AssignProfessionalModal
          open={assignModalOpen}
          onClose={() => { setAssignModalOpen(false); setSelectedEntry(null); }}
          customerName={selectedEntry.customer_name}
          serviceName={selectedEntry.service?.name || ""}
          onAssign={handleAssignProfessional}
        />
      )}
    </AppLayoutNew>
  );
}
