import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";

export interface BankDetails {
  id: string;
  professional_id: string;
  person_type: string;
  account_holder: string | null;
  holder_cpf: string | null;
  bank_name: string | null;
  account_type: string;
  agency: string | null;
  account_number: string | null;
  account_digit: string | null;
  transfer_type: string;
  pix_key: string | null;
}

export interface BankDetailsInput {
  professional_id: string;
  person_type: string;
  account_holder: string;
  holder_cpf: string;
  bank_name: string;
  account_type: string;
  agency: string;
  account_number: string;
  account_digit: string;
  transfer_type: string;
  pix_key: string;
}

export function useProfessionalBankDetails(professionalId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["bank-details", professionalId],
    queryFn: async () => {
      if (!professionalId) return null;
      const { data, error } = await supabase
        .from("professional_bank_details")
        .select("*")
        .eq("professional_id", professionalId)
        .maybeSingle();
      if (error) throw error;
      return data as BankDetails | null;
    },
    enabled: !!professionalId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: BankDetailsInput) => {
      const { error } = await supabase
        .from("professional_bank_details")
        .upsert(input, { onConflict: "professional_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details", professionalId] });
      toast({ title: "Dados bancários salvos!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar dados bancários", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!professionalId) return;
      const { error } = await supabase
        .from("professional_bank_details")
        .delete()
        .eq("professional_id", professionalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-details", professionalId] });
      toast({ title: "Dados bancários removidos!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao remover dados bancários", description: e.message, variant: "destructive" });
    },
  });

  return {
    bankDetails: query.data ?? null,
    isLoading: query.isLoading,
    saveBankDetails: upsertMutation.mutate,
    deleteBankDetails: deleteMutation.mutate,
    isSaving: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
