import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Gerencie promoções e descontos para seus serviços e produtos.</p>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <Card className="py-12 text-center text-muted-foreground">Carregando...</Card>
      ) : promotions.length === 0 ? (
        <Card className="py-12 text-center text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma promoção cadastrada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo: any) => (
            <Card key={promo.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{promo.name}</p>
                    <Badge variant={promo.is_active ? "default" : "secondary"}>
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
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(promo); setModalOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(promo.id)}>
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
