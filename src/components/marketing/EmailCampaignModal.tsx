import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  campaign?: any;
}

export function EmailCampaignModal({ open, onClose, campaign }: Props) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    target_type: "all",
    target_tag: "",
    status: "draft",
    scheduled_at: "",
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name || "",
        subject: campaign.subject || "",
        body: campaign.body || "",
        target_type: campaign.target_type || "all",
        target_tag: campaign.target_tag || "",
        status: campaign.status || "draft",
        scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : "",
      });
    } else {
      setForm({ name: "", subject: "", body: "", target_type: "all", target_tag: "", status: "draft", scheduled_at: "" });
    }
  }, [campaign, open]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!salonId) throw new Error("Salão não encontrado");
      const payload = {
        salon_id: salonId,
        name: form.name,
        subject: form.subject,
        body: form.body,
        target_type: form.target_type,
        target_tag: form.target_tag || null,
        status: form.status,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };
      if (campaign?.id) {
        const { error } = await supabase.from("email_campaigns").update(payload).eq("id", campaign.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("email_campaigns").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_campaigns", salonId] });
      toast({ title: campaign ? "Campanha atualizada!" : "Campanha criada!" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Editar Campanha de E-mail" : "Nova Campanha de E-mail"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome da Campanha *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>Assunto do E-mail *</Label>
            <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Conteúdo</Label>
            <Textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Escreva o conteúdo do e-mail..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Destinatários</Label>
              <Select value={form.target_type} onValueChange={(v) => setForm({ ...form, target_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Clientes</SelectItem>
                  <SelectItem value="tag">Por Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.target_type === "tag" && (
              <div>
                <Label>Tag</Label>
                <Input value={form.target_tag} onChange={(e) => setForm({ ...form, target_tag: e.target.value })} placeholder="Ex: VIP" />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="scheduled">Agendar Envio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.status === "scheduled" && (
              <div>
                <Label>Data/Hora de Envio</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.name || !form.subject || mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
