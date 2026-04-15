import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ClientBalanceEntry {
  id: string;
  salon_id: string;
  client_id: string;
  type: "credit" | "debt";
  amount: number;
  description: string | null;
  comanda_id: string | null;
  created_by: string | null;
  created_at: string;
  creator?: {
    full_name: string;
  } | null;
}

export interface ClientBalanceSummary {
  totalCredits: number;
  totalDebts: number;
  netBalance: number;
}

export function useClientBalance(clientId: string | null) {
  const { salonId, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["client_balance", clientId, salonId],
    queryFn: async () => {
      if (!clientId || !salonId) return [];
      const { data, error } = await supabase
        .from("client_balance")
        .select("*")
        .eq("salon_id", salonId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientBalanceEntry[];
    },
    enabled: !!clientId && !!salonId,
  });

  const entries = query.data ?? [];

  const summary: ClientBalanceSummary = entries.reduce(
    (acc, entry) => {
      const amount = Number(entry.amount);
      if (entry.type === "credit") {
        acc.totalCredits += amount;
      } else {
        acc.totalDebts += amount;
      }
      acc.netBalance = acc.totalCredits - acc.totalDebts;
      return acc;
    },
    { totalCredits: 0, totalDebts: 0, netBalance: 0 } as ClientBalanceSummary
  );

  const addCreditMutation = useMutation({
    mutationFn: async ({ amount, description, comandaId }: { amount: number; description?: string; comandaId?: string }) => {
      if (!salonId || !clientId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase
        .from("client_balance")
        .insert({
          salon_id: salonId,
          client_id: clientId,
          type: "credit",
          amount,
          description: description || "Crédito manual",
          comanda_id: comandaId || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_balance", clientId, salonId] });
      toast({ title: "Crédito adicionado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar crédito", description: error.message, variant: "destructive" });
    },
  });

  const addDebtMutation = useMutation({
    mutationFn: async ({ amount, description, comandaId }: { amount: number; description?: string; comandaId?: string }) => {
      if (!salonId || !clientId) throw new Error("Dados insuficientes");
      const { data, error } = await supabase
        .from("client_balance")
        .insert({
          salon_id: salonId,
          client_id: clientId,
          type: "debt",
          amount,
          description: description || "Dívida registrada",
          comanda_id: comandaId || null,
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client_balance", clientId, salonId] });
      toast({ title: "Dívida registrada com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar dívida", description: error.message, variant: "destructive" });
    },
  });

  return {
    entries,
    summary,
    isLoading: query.isLoading,
    error: query.error,
    addCredit: addCreditMutation.mutate,
    addDebt: addDebtMutation.mutate,
    isAddingCredit: addCreditMutation.isPending,
    isAddingDebt: addDebtMutation.isPending,
  };
}

/**
 * Lightweight hook to just get the net balance for a client (used in ComandaModal).
 */
export function useClientNetBalance(clientId: string | null) {
  const { salonId } = useAuth();

  const query = useQuery({
    queryKey: ["client_balance", clientId, salonId],
    queryFn: async () => {
      if (!clientId || !salonId) return [];
      const { data, error } = await supabase
        .from("client_balance")
        .select("type, amount")
        .eq("salon_id", salonId)
        .eq("client_id", clientId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId && !!salonId,
  });

  const entries = query.data ?? [];
  let netBalance = 0;
  for (const entry of entries) {
    if (entry.type === "credit") {
      netBalance += Number(entry.amount);
    } else {
      netBalance -= Number(entry.amount);
    }
  }

  return { netBalance, isLoading: query.isLoading };
}
