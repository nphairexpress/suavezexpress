import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";

export interface WorkSchedule {
  id: string;
  professional_id: string;
  start_time: string;
  end_time: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface WorkScheduleInput {
  professional_id: string;
  start_time: string;
  end_time: string;
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export function useProfessionalWorkSchedules(professionalId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["work-schedules", professionalId],
    queryFn: async () => {
      if (!professionalId) return [];
      const { data, error } = await supabase
        .from("professional_work_schedules")
        .select("*")
        .eq("professional_id", professionalId)
        .order("created_at");
      if (error) throw error;
      return data as WorkSchedule[];
    },
    enabled: !!professionalId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (input: WorkScheduleInput & { id?: string }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase
          .from("professional_work_schedules")
          .update(rest)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("professional_work_schedules")
          .insert(input);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules", professionalId] });
      toast({ title: "Horário salvo!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao salvar horário", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("professional_work_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-schedules", professionalId] });
      toast({ title: "Horário removido!" });
    },
    onError: (e: Error) => {
      toast({ title: "Erro ao remover horário", description: e.message, variant: "destructive" });
    },
  });

  return {
    schedules: query.data ?? [],
    isLoading: query.isLoading,
    upsertSchedule: upsertMutation.mutate,
    deleteSchedule: deleteMutation.mutate,
    isSaving: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
