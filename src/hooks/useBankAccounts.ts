import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BankAccount {
  id: string;
  salon_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInput {
  name: string;
  is_active: boolean;
}

export function useBankAccounts() {
  const { salonId } = useAuth();
  const queryClient = useQueryClient();

  const { data: bankAccounts = [], isLoading } = useQuery({
    queryKey: ["bank_accounts", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");

      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!salonId,
  });

  const createBankAccount = useMutation({
    mutationFn: async (input: BankAccountInput) => {
      if (!salonId) throw new Error("Salon ID não encontrado");
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert({
          salon_id: salonId,
          name: input.name,
          is_active: input.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts", salonId] });
      toast.success("Conta bancária criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating bank account:", error);
      toast.error("Erro ao criar conta bancária");
    },
  });

  const updateBankAccount = useMutation({
    mutationFn: async ({ id, ...input }: BankAccountInput & { id: string }) => {
      const { data, error } = await supabase
        .from("bank_accounts")
        .update({
          name: input.name,
          is_active: input.is_active,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts", salonId] });
      toast.success("Conta bancária atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating bank account:", error);
      toast.error("Erro ao atualizar conta bancária");
    },
  });

  const deleteBankAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts", salonId] });
      toast.success("Conta bancária excluída com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting bank account:", error);
      toast.error("Erro ao excluir conta bancária");
    },
  });

  return {
    bankAccounts,
    isLoading,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
  };
}
