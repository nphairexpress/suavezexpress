import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, GlassCard, EmptyState } from "@design-system";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { PromotionModal } from "@/components/marketing/PromotionModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PromotionsTab() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ["promotions", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("promotions")
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
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promotions", salonId] });
      toast({ title: "Promoção removida!" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Gerencie promoções e descontos para seus serviços e produtos.</p>
        <Button className="min-h-[48px] w-full shrink-0 sm:min-h-0 sm:w-auto" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <GlassCard className="py-12 text-center text-muted-foreground">Carregando...</GlassCard>
      ) : promotions.length === 0 ? (
        <GlassCard>
          <EmptyState icon={Tag} title="Nenhuma promoção cadastrada" className="py-8" />
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo: any) => (
            <Card key={promo.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{promo.name}</p>
                    <Badge tone={promo.is_active ? "positive" : "neutral"} dot={promo.is_active}>
                      {promo.is_active ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  {promo.description && <p className="text-sm text-muted-foreground">{promo.description}</p>}
                  <p className="text-sm text-muted-foreground mt-1">
                    Desconto: {promo.discount_type === "percent" ? `${promo.discount_value}%` : `R$ ${Number(promo.discount_value).toFixed(2)}`}
                    {promo.start_date && ` • De ${format(new Date(promo.start_date), "dd/MM/yyyy", { locale: ptBR })}`}
                    {promo.end_date && ` até ${format(new Date(promo.end_date), "dd/MM/yyyy", { locale: ptBR })}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="icon" variant="ghost" aria-label="Editar" className="h-11 w-11 rounded-xl sm:h-9 sm:w-9" onClick={() => { setEditing(promo); setModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir" className="h-11 w-11 rounded-xl text-[color:var(--np-danger-text)] hover:bg-[var(--np-danger-soft)] hover:text-[color:var(--np-danger-text)] sm:h-9 sm:w-9" onClick={() => deleteMutation.mutate(promo.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <PromotionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        promotion={editing}
      />
    </div>
  );
}
