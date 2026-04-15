import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";

export interface CommissionRules {
  id: string;
  professional_id: string;
  contract_type: string;
  contract_start: string | null;
  contract_end: string | null;
  payment_frequency: string;
  card_payment_date: string;
  deduct_anticipation: boolean;
  deduct_card_fee: boolean;
  deduct_admin_fee: boolean;
  deduct_service_cost: boolean;
  deduct_product_cost: boolean;
}

export interface CommissionRulesInput {
  professional_id: string;
  contract_type: string;
  contract_start: string | null;
  contract_end: string | null;
  payment_frequency: string;
  card_payment_date: string;
  deduct_anticipation: boolean;
  deduct_card_fee: boolean;
  deduct_admin_fee: boolean;
  deduct_service_cost: boolean;
  deduct_product_cost: boolean;
}

export function useProfessionalCommissionRules(professionalId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["commission-rules", professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const { data, error } = await supabase
        .from("professional_commission_rules")
        .select("*")
        .eq("professional_id", professionalId)
        .maybeSingle();
      if (error) throw error;
      return data as CommissionRules | null;
    },
    enabled: !!professionalId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CommissionRulesInput) => {
      const { error } = await supabase
        .from("professional_commission_rules")
        .upsert(input, { onConflict: "professional_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commission-rules", professionalId] });
      toast({ title: "Regras de comissão salvas!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar regras", description: e.message, variant: "destructive" });
    },
  });

  return {
    rules: query.data ?? null,
    isLoading: query.isLoading,
    saveRules: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
