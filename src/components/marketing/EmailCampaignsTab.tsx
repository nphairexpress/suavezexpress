import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Mail, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { EmailCampaignModal } from "@/components/marketing/EmailCampaignModal";
import { sendEmail } from "@/lib/sendEmail";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  scheduled: { label: "Agendada", variant: "default" },
  sent: { label: "Enviada", variant: "default" },
};

export function EmailCampaignsTab() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["email_campaigns", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("salon_id", salonId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email_campaigns", salonId] });
      toast({ title: "Campanha removida!" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaign: any) => {
      if (!salonId) throw new Error("Salão não encontrado");
      // Get clients based on target_type
      let query = supabase
        .from("clients")
        .select("id, name, email, tags, allow_email_campaigns")
        .eq("salon_id", salonId)
        .eq("allow_email_campaigns", true)
        .not("email", "is", null);

      if (campaign.target_type === "tag" && campaign.target_tag) {
        query = query.contains("tags", [campaign.target_tag]);
      }

      const { data: clients, error } = await query;
      if (error) throw error;
      if (!clients || clients.length === 0) throw new Error("Nenhum cliente elegível encontrado");

      let sent = 0;
      for (const client of clients) {
        if (!client.email) continue;
        try {
          await sendEmail({
            type: "campaign",
            salon_id: salonId,
            to_email: client.email,
            to_name: client.name,
            client_id: client.id,
            campaign_id: campaign.id,
            subject: campaign.subject,
            body: campaign.body,
          });
          sent++;
        } catch (e) {
          console.error("Failed to send to", client.email, e);
        }
      }

      // Update campaign status
      await supabase.from("email_campaigns").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipients_count: sent,
      }).eq("id", campaign.id);

      return sent;
    },
    onSuccess: (sent) => {
      queryClient.invalidateQueries({ queryKey: ["email_campaigns", salonId] });
      toast({ title: `Campanha enviada para ${sent} clientes!` });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao enviar campanha", description: e.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Crie e gerencie campanhas de e-mail para seus clientes.</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {isLoading ? (
        <Card className="py-12 text-center text-muted-foreground">Carregando...</Card>
      ) : campaigns.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma campanha de e-mail criada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: any) => {
            const st = statusLabels[campaign.status] || statusLabels.draft;
            return (
              <Card key={campaign.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{campaign.name}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Assunto: {campaign.subject}
                      {campaign.sent_at && ` • Enviada em ${format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                      {campaign.recipients_count > 0 && ` • ${campaign.recipients_count} destinatários`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {campaign.status === "draft" && (
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => sendCampaignMutation.mutate(campaign)}
                        disabled={sendCampaignMutation.isPending}
                      >
                        {sendCampaignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
                        Enviar
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(campaign); setModalOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(campaign.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmailCampaignModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        campaign={editing}
      />
    </div>
  );
}
