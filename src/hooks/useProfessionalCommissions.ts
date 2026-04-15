import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ProfessionalServiceCommission {
  id: string;
  professional_id: string;
  service_id: string;
  commission_percent: number;
  assistant_commission_percent: number;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface CommissionInput {
  professional_id: string;
  service_id: string;
  commission_percent: number;
  assistant_commission_percent?: number;
  duration_minutes?: number;
}

export function useProfessionalCommissions(professionalId?: string) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["professional-commissions", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .select("*")
        .eq("professional_id", professionalId);
      if (error) throw error;
      return data as ProfessionalServiceCommission[];
    },
    enabled: !!professionalId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: CommissionInput) => {
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .upsert(input, { onConflict: "professional_id,service_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-commissions", professionalId] });
      toast({ title: "Comissão salva com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar comissão", description: error.message, variant: "destructive" });
    },
  });

  const bulkUpsertMutation = useMutation({
    mutationFn: async (inputs: CommissionInput[]) => {
      if (inputs.length === 0) return [];
      const { data, error } = await supabase
        .from("professional_service_commissions")
        .upsert(inputs, { onConflict: "professional_id,service_id" })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professional-commissions", professionalId] });
      toast({ title: "Comissões salvas com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar comissões", description: error.message, variant: "destructive" });
    },
  });

  return {
    commissions: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    upsertCommission: upsertMutation.mutate,
    bulkUpsertCommissions: bulkUpsertMutation.mutate,
    isUpserting: upsertMutation.isPending || bulkUpsertMutation.isPending,
  };
}
