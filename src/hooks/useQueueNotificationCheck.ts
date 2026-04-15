import { useEffect, useRef } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export function useQueueNotificationCheck() {
  const { salonId } = useAuth();
  const notifiedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!salonId) return;

    const check = async () => {
      // Get entries that haven't been advance-notified yet
      const { data: entries } = await supabase
        .from("queue_entries")
        .select("id, customer_name, customer_phone, customer_email, position, notify_minutes_before, notify_sent, service:services(duration_minutes)")
        .eq("salon_id", salonId)
        .in("status", ["waiting", "checked_in"])
        .eq("notify_sent", false);

      if (!entries || entries.length === 0) return;

      // Skip entries we already tried to notify in this session
      const toNotify = entries.filter((e) => !notifiedIdsRef.current.has(e.id));
      if (toNotify.length === 0) return;

      // Get professional count for time estimate
      const { count: profCount } = await supabase
        .from("professionals")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .eq("is_active", true);

      const professionals = Math.max(profCount || 1, 1);

      for (const entry of toNotify) {
        // Calculate estimated minutes
        const { data: ahead } = await supabase
          .from("queue_entries")
          .select("service:services(duration_minutes)")
          .eq("salon_id", salonId)
          .in("status", ["waiting", "checked_in", "in_service"])
          .lt("position", entry.position);

        const totalMinAhead = (ahead || []).reduce((sum: number, e: any) => sum + (e.service?.duration_minutes || 45), 0);
        const estimatedMin = Math.ceil(totalMinAhead / professionals);

        if (estimatedMin <= entry.notify_minutes_before) {
          // Mark as notified in local memory first to prevent spam
          notifiedIdsRef.current.add(entry.id);

          // Choose message based on estimated time
          let message: string;
          if (estimatedMin <= 5) {
            message = `${entry.customer_name}, seu atendimento e agora! Se nao vai conseguir comparecer, avise-nos para que possamos deixar seu credito no seu cadastro.`;
          } else {
            message = `${entry.customer_name}, faltam aproximadamente ${estimatedMin} minutos pro seu atendimento no NP Hair. Venha se preparando!`;
          }

          // Send via Edge Function (reliable, server-side)
          try {
            await supabase.functions.invoke("zapi-proxy", {
              body: {
                salonId,
                phone: entry.customer_phone,
                message,
              },
            });
          } catch (err) {
            console.error("Failed to send advance notification:", err);
          }

          // Mark as sent in database via direct update
          await supabase
            .from("queue_entries")
            .update({ notify_sent: true, updated_at: new Date().toISOString() })
            .eq("id", entry.id);
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [salonId]);
}
