import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface CardBrand {
  id: string;
  salon_id: string;
  name: string;
  credit_fee_percent: number;
  debit_fee_percent: number;
  credit_2_6_fee_percent: number;
  credit_7_12_fee_percent: number;
  credit_13_18_fee_percent: number;
  credit_installment_fees: Record<string, number> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Get fee percent for a specific installment count
export function getCardFeePercent(brand: CardBrand, method: 'credit_card' | 'debit_card', installments: number): number {
  if (method === 'debit_card') return brand.debit_fee_percent;

  // Prefer per-installment fees if available
  if (brand.credit_installment_fees && Object.keys(brand.credit_installment_fees).length > 0) {
    if (installments <= 1) return brand.credit_fee_percent;
    const fee = brand.credit_installment_fees[String(installments)];
    if (fee !== undefined) return fee;
  }

  // Fallback to range-based fees
  if (installments <= 1) return brand.credit_fee_percent;
  if (installments <= 6) return brand.credit_2_6_fee_percent || 0;
  if (installments <= 12) return brand.credit_7_12_fee_percent || 0;
  return brand.credit_13_18_fee_percent || 0;
}

export interface CardBrandInput {
  name: string;
  credit_fee_percent: number;
  debit_fee_percent: number;
  credit_2_6_fee_percent: number;
  credit_7_12_fee_percent: number;
  credit_13_18_fee_percent: number;
  credit_installment_fees?: Record<string, number>;
  is_active?: boolean;
}

export function useCardBrands() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["card_brands", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("card_brands")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data as CardBrand[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CardBrandInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      const { data, error } = await supabase
        .from("card_brands")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card_brands", salonId] });
      toast({ title: "Bandeira criada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar bandeira", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<CardBrandInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("card_brands")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card_brands", salonId] });
      toast({ title: "Bandeira atualizada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar bandeira", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("card_brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["card_brands", salonId] });
      toast({ title: "Bandeira removida com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover bandeira", description: error.message, variant: "destructive" });
    },
  });

  return {
    cardBrands: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCardBrand: createMutation.mutate,
    updateCardBrand: updateMutation.mutate,
    deleteCardBrand: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
