import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, GlassCard, EmptyState } from "@design-system";
import { Plus, Pencil, Trash2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SmsCampaignModal } from "@/components/marketing/SmsCampaignModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusLabels: Record<string, { label: string; tone: "neutral" | "accent" | "positive" }> = {
  draft: { label: "Rascunho", tone: "neutral" },
  scheduled: { label: "Agendada", tone: "accent" },
  sent: { label: "Enviada", tone: "positive" },
};

export function SmsCampaignsTab() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["sms_campaigns", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("sms_campaigns")
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
      const { error } = await supabase.from("sms_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms_campaigns", salonId] });
      toast({ title: "Campanha removida!" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Crie e gerencie campanhas de SMS para seus clientes.</p>
        <Button className="min-h-[48px] w-full shrink-0 sm:min-h-0 sm:w-auto" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Campanha
        </Button>
      </div>

      {isLoading ? (
        <GlassCard className="py-12 text-center text-muted-foreground">Carregando...</GlassCard>
      ) : campaigns.length === 0 ? (
        <GlassCard>
          <EmptyState icon={MessageSquare} title="Nenhuma campanha de SMS criada" className="py-8" />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign: any) => {
            const st = statusLabels[campaign.status] || statusLabels.draft;
            return (
              <Card key={campaign.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{campaign.name}</p>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {campaign.message}
                      {campaign.sent_at && ` • Enviada em ${format(new Date(campaign.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="icon" variant="ghost" aria-label="Editar" className="h-11 w-11 rounded-xl sm:h-9 sm:w-9" onClick={() => { setEditing(campaign); setModalOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" className="h-11 w-11 rounded-xl text-[color:var(--np-danger-text)] hover:bg-[var(--np-danger-soft)] hover:text-[color:var(--np-danger-text)] sm:h-9 sm:w-9" onClick={() => deleteMutation.mutate(campaign.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <SmsCampaignModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        campaign={editing}
      />
    </div>
  );
}
