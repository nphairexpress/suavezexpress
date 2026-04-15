import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface SchedulingSettings {
  id: string;
  salon_id: string;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number;
  default_columns: number;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
  min_advance_hours: number;
  max_advance_days: number;
  allow_simultaneous: boolean;
  auto_confirm: boolean;
}

const DEFAULTS: Omit<SchedulingSettings, "id" | "salon_id"> = {
  opening_time: "08:00",
  closing_time: "20:00",
  slot_interval_minutes: 30,
  default_columns: 6,
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: false,
  min_advance_hours: 0,
  max_advance_days: 90,
  allow_simultaneous: true,
  auto_confirm: false,
};

export function useSchedulingSettings() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["scheduling-settings", salonId],
    queryFn: async () => {
      if (!salonId) return null;

      const { data, error } = await supabase
        .from("scheduling_settings" as any)
        .select("*")
        .eq("salon_id", salonId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return { ...DEFAULTS, id: "", salon_id: salonId } as SchedulingSettings;
      }

      return data as unknown as SchedulingSettings;
    },
    enabled: !!salonId,
  });

  const saveMutation = useMutation({
    mutationFn: async (settings: Omit<SchedulingSettings, "id" | "salon_id">) => {
      if (!salonId) throw new Error("Salão não encontrado");

      // Try update first
      const { data: existing } = await supabase
        .from("scheduling_settings" as any)
        .select("id")
        .eq("salon_id", salonId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("scheduling_settings" as any)
          .update(settings as any)
          .eq("salon_id", salonId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scheduling_settings" as any)
          .insert({ ...settings, salon_id: salonId } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduling-settings", salonId] });
      toast({ title: "Configurações de agendamento salvas!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    settings: query.data ?? ({ ...DEFAULTS, id: "", salon_id: salonId ?? "" } as SchedulingSettings),
    isLoading: query.isLoading,
    error: query.error,
    saveSettings: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
