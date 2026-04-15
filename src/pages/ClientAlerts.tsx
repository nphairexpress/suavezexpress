import { useState } from "react";
import { AppLayoutNew } from "@/components/layout/AppLayoutNew";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Bell, Trash2, Edit, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { ClientSearchSelect } from "@/components/shared/ClientSearchSelect";

interface AlertForm {
  title: string;
  description: string;
  alert_event: string;
  target_type: string;
  target_client_id: string | null;
  target_tag: string | null;
  is_active: boolean;
}

const emptyForm: AlertForm = {
  title: "",
  description: "",
  alert_event: "agenda_and_comanda",
  target_type: "client",
  target_client_id: null,
  target_tag: null,
  is_active: true,
};

export default function ClientAlerts() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AlertForm>(emptyForm);
  const { clients } = useClients();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ["client-alerts", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("client_alerts")
        .select("*, clients:target_client_id(name)")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!salonId,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: AlertForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase.from("client_alerts").update({
          title: data.title,
          description: data.description,
          alert_event: data.alert_event,
          target_type: data.target_type,
          target_client_id: data.target_client_id,
          target_tag: data.target_tag,
          is_active: data.is_active,
        }).eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("client_alerts").insert({
          salon_id: salonId!,
          title: data.title,
          description: data.description,
          alert_event: data.alert_event,
          target_type: data.target_type,
          target_client_id: data.target_client_id,
          target_tag: data.target_tag,
          is_active: data.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-alerts"] });
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Aviso atualizado" : "Aviso criado" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-alerts"] });
      toast({ title: "Aviso excluído" });
    },
  });

  const handleEdit = (alert: any) => {
    setEditingId(alert.id);
    setForm({
      title: alert.title,
      description: alert.description,
      alert_event: alert.alert_event,
      target_type: alert.target_type,
      target_client_id: alert.target_client_id,
      target_tag: alert.target_tag,
      is_active: alert.is_active,
    });
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const eventLabels: Record<string, string> = {
    agenda: "Ao agendar",
    comanda: "Ao abrir comanda",
    agenda_and_comanda: "Agenda e Comanda",
  };

  if (isLoading) {
    return <AppLayoutNew><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></AppLayoutNew>;
  }

  return (
    <AppLayoutNew>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Avisos de Clientes</h1>
            <p className="text-muted-foreground">Alertas que aparecem ao agendar ou abrir comanda</p>
          </div>
          <Button className="gap-2" onClick={handleNew}><Plus className="h-4 w-4" />Novo Aviso</Button>
        </div>

        {!alerts || alerts.length === 0 ? (
          <Card className="flex items-center justify-center py-12">
            <div className="text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum aviso cadastrado</p>
              <Button variant="link" onClick={handleNew}>Criar primeiro aviso</Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.map((alert: any) => (
              <Card key={alert.id} className={!alert.is_active ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-orange-500" />
                      <h3 className="font-semibold">{alert.title}</h3>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(alert)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(alert.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{eventLabels[alert.alert_event] || alert.alert_event}</Badge>
                    {alert.target_type === "client" && alert.clients && (
                      <Badge variant="secondary">Cliente: {(alert.clients as any)?.name}</Badge>
                    )}
                    {alert.target_type === "tag" && alert.target_tag && (
                      <Badge variant="secondary">Tag: {alert.target_tag}</Badge>
                    )}
                    {!alert.is_active && <Badge variant="destructive">Inativo</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Aviso" : "Novo Aviso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Alergia a produto" />
            </div>
            <div>
              <Label>Descrição do Aviso</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descreva o aviso em detalhes..." />
            </div>
            <div>
              <Label>Quando exibir</Label>
              <Select value={form.alert_event} onValueChange={(v) => setForm({ ...form, alert_event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agenda">Ao agendar</SelectItem>
                  <SelectItem value="comanda">Ao abrir comanda</SelectItem>
                  <SelectItem value="agenda_and_comanda">Agenda e Comanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de alvo</Label>
              <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v, target_client_id: null, target_tag: null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Cliente específico</SelectItem>
                  <SelectItem value="tag">Grupo (tag)</SelectItem>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_type === "client" && (
              <div>
                <Label>Cliente</Label>
                <ClientSearchSelect
                  clients={clients || []}
                  value={form.target_client_id}
                  onSelect={(v) => setForm({ ...form, target_client_id: v })}
                />
              </div>
            )}
            {form.target_type === "tag" && (
              <div>
                <Label>Tag</Label>
                <Input value={form.target_tag || ""} onChange={(e) => setForm({ ...form, target_tag: e.target.value })} placeholder="Ex: VIP" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aviso ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, id: editingId || undefined })} disabled={!form.title || !form.description || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayoutNew>
  );
}
