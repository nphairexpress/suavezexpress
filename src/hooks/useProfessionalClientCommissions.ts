import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { buildProfClientPercentMap, isMissingTableError } from "@/lib/commissionPercent";

// Comissão por par (profissional, cliente). Tabela public.professional_client_commissions
// (migration 20261005130000). Se a tabela ainda não existir, as leituras devolvem lista vazia e o
// cálculo segue a regra profissional/serviço de antes, sem quebrar a tela.

export interface ProfessionalClientCommission {
  id: string;
  salon_id: string;
  professional_id: string;
  client_id: string;
  commission_percent: number;
  observacao: string | null;
  created_at: string;
}

const TABLE = "professional_client_commissions";
export const PROF_CLIENT_COMMISSIONS_KEY = "professional-client-commissions";

async function fetchRows(professionalId?: string): Promise<ProfessionalClientCommission[]> {
  let q = supabase.from(TABLE).select("id, salon_id, professional_id, client_id, commission_percent, observacao, created_at");
  if (professionalId) q = q.eq("professional_id", professionalId);
  const { data, error } = await q;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as ProfessionalClientCommission[];
}

/** Mapa (profissional:cliente) → percentual para o cálculo. Sem professionalId = todas que o usuário pode ler. */
export function useProfClientCommissionMap(professionalId?: string, enabled = true) {
  const { salonId } = useAuth();
  const query = useQuery({
    queryKey: [PROF_CLIENT_COMMISSIONS_KEY, salonId, professionalId ?? "all"],
    queryFn: () => fetchRows(professionalId),
    enabled: !!salonId && enabled,
    retry: false,
  });
  const map = useMemo(() => buildProfClientPercentMap(query.data), [query.data]);
  return { map, rows: query.data ?? [], isLoading: query.isLoading };
}

export interface ProfClientCommissionInput {
  professional_id: string;
  client_id: string;
  commission_percent: number;
  observacao?: string | null;
}

/** Lista e edição das clientes com comissão diferenciada de uma profissional. */
export function useProfessionalClientCommissions(professionalId: string) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { rows, isLoading } = useProfClientCommissionMap(professionalId);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [PROF_CLIENT_COMMISSIONS_KEY] });
  const onError = (title: string) => (error: Error) =>
    toast({ title, description: error.message, variant: "destructive" });

  const add = useMutation({
    mutationFn: async (input: ProfClientCommissionInput) => {
      const { error } = await supabase.from(TABLE).insert({ ...input, salon_id: salonId });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Cliente adicionada" }); },
    onError: onError("Erro ao adicionar cliente"),
  });

  const update = useMutation({
    mutationFn: async ({ id, commission_percent, observacao }: { id: string; commission_percent: number; observacao?: string | null }) => {
      const { error } = await supabase.from(TABLE).update({ commission_percent, observacao }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Comissão salva" }); },
    onError: onError("Erro ao salvar comissão"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: "Cliente removida" }); },
    onError: onError("Erro ao remover cliente"),
  });

  return {
    rows,
    isLoading,
    addRule: add.mutateAsync,
    updateRule: update.mutateAsync,
    removeRule: remove.mutateAsync,
    isSaving: add.isPending || update.isPending || remove.isPending,
  };
}
