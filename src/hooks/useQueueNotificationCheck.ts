import { useEffect } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { notifyQueueEntry, notifyLead } from "@/lib/queueNotifications";

const SITE_URL = typeof window !== "undefined" ? window.location.origin : "";

export function useQueueNotificationCheck() {
  const { salonId } = useAuth();

  useEffect(() => {
    if (!salonId) return;

    const check = async () => {
      const { data: entries } = await supabase
        .from("queue_entries")
        .select("*, service:services(duration_minutes)")
        .eq("salon_id", salonId)
        .in("status", ["waiting", "checked_in"])
        .eq("notify_sent", false);

      if (entries) {
        const { count: inServiceCount } = await supabase
          .from("queue_entries")
          .select("id", { count: "exact", head: true })
          .eq("salon_id", salonId)
          .eq("status", "in_service");

        const professionals = Math.max(inServiceCount || 1, 1);

        for (const entry of entries) {
          const { data: ahead } = await supabase
            .from("queue_entries")
            .select("service:services(duration_minutes)")
            .eq("salon_id", salonId)
            .in("status", ["waiting", "checked_in", "in_service"])
            .lt("position", entry.position);

          const totalMinAhead = (ahead || []).reduce((sum: number, e: any) => sum + (e.service?.duration_minutes || 45), 0);
          const estimatedMin = Math.ceil(totalMinAhead / professionals);

          if (estimatedMin <= entry.notify_minutes_before) {
            await notifyQueueEntry(salonId, entry, "advance", { estimatedTime: String(estimatedMin) });
            await supabase.from("queue_entries").update({ notify_sent: true, updated_at: new Date().toISOString() }).eq("id", entry.id);
          }
        }
      }

      const { count: queueSize } = await supabase
        .from("queue_entries")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .in("status", ["waiting", "checked_in"]);

      const { data: leads } = await supabase
        .from("queue_leads")
        .select("*")
        .eq("salon_id", salonId)
        .eq("notified", false);

      if (leads && queueSize !== null) {
        for (const lead of leads) {
          if (queueSize <= lead.max_queue_size) {
            await notifyLead(salonId, lead, queueSize, `${SITE_URL}/fila`);
            await supabase.from("queue_leads").update({ notified: true }).eq("id", lead.id);
          }
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [salonId]);
}
