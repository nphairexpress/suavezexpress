import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export function useQueueRealtime() {
  const queryClient = useQueryClient();
  const { salonId } = useAuth();

  useEffect(() => {
    if (!salonId) return;

    const channel = supabase
      .channel(`queue_${salonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_entries", filter: `salon_id=eq.${salonId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["queue", salonId] }); }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_leads", filter: `salon_id=eq.${salonId}` },
        () => { queryClient.invalidateQueries({ queryKey: ["queue_leads", salonId] }); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [salonId, queryClient]);
}
