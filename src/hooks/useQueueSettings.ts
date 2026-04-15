import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { QueueSettings } from "@/types/queue";

export function useQueueSettings() {
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["queue_settings", salonId],
    queryFn: async () => {
      const effectiveSalonId = salonId;
      if (!effectiveSalonId) return null;

      const { data, error } = await supabase
        .from("queue_settings")
        .select("*")
        .eq("salon_id", effectiveSalonId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return {
          id: "",
          salon_id: effectiveSalonId,
          inflation_factor: 1.7,
          credit_validity_days: 30,
          notify_options: [20, 40, 60, 90],
          reception_email: null,
          zapi_instance_id: null,
          zapi_token: null,
          asaas_api_key: null,
        } as QueueSettings;
      }

      return data as QueueSettings;
    },
    enabled: !!salonId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: Partial<QueueSettings>) => {
      if (!salonId) throw new Error("Salon not found");
      const { data, error } = await supabase
        .from("queue_settings")
        .upsert(
          { ...input, salon_id: salonId },
          { onConflict: "salon_id" }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["queue_settings", salonId] });
      toast({ title: "Configurações da fila salvas!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao salvar configurações", description: error.message, variant: "destructive" });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: upsertMutation.mutate,
    isSaving: upsertMutation.isPending,
  };
}
