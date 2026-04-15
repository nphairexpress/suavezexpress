import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export interface WorkScheduleMap {
  [professionalId: string]: {
    start_time: string;
    end_time: string;
    days: boolean[]; // [sun, mon, tue, wed, thu, fri, sat]
  }[];
}

export function useAllProfessionalSchedules() {
  const { salonId } = useAuth();

  const query = useQuery({
    queryKey: ["all-work-schedules", salonId],
    queryFn: async () => {
      if (!salonId) return {} as WorkScheduleMap;

      // Get all professionals for this salon
      const { data: professionals } = await supabase
        .from("professionals")
        .select("id")
        .eq("salon_id", salonId)
        .eq("is_active", true);

      if (!professionals || professionals.length === 0) return {} as WorkScheduleMap;

      const profIds = professionals.map((p) => p.id);

      const { data: schedules, error } = await supabase
        .from("professional_work_schedules")
        .select("*")
        .in("professional_id", profIds);

      if (error) throw error;

      const map: WorkScheduleMap = {};
      schedules?.forEach((s) => {
        if (!map[s.professional_id]) map[s.professional_id] = [];
        map[s.professional_id].push({
          start_time: s.start_time,
          end_time: s.end_time,
          days: [s.sunday, s.monday, s.tuesday, s.wednesday, s.thursday, s.friday, s.saturday],
        });
      });

      return map;
    },
    enabled: !!salonId,
  });

  return {
    scheduleMap: query.data ?? ({} as WorkScheduleMap),
    isLoading: query.isLoading,
  };
}
