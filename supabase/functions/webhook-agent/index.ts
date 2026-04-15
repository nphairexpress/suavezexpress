import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth via x-webhook-key header
    const webhookKey = req.headers.get("x-webhook-key");
    if (!webhookKey) {
      return new Response(JSON.stringify({ error: "Missing x-webhook-key header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate webhook key
    const { data: configData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "webhook_api_key")
      .maybeSingle();

    if (!configData?.value || configData.value !== webhookKey) {
      return new Response(JSON.stringify({ error: "Invalid webhook key" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get salon_id (first salon)
    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .limit(1)
      .single();

    if (!salon) {
      return new Response(JSON.stringify({ error: "No salon found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const salonId = salon.id;
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ===== LIST SERVICES =====
      case "list_services": {
        const { data, error } = await supabase
          .from("services")
          .select("id, name, duration_minutes, price, category, is_active")
          .eq("salon_id", salonId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return json({ services: data });
      }

      // ===== LIST PROFESSIONALS =====
      case "list_professionals": {
        const { data, error } = await supabase
          .from("professionals")
          .select("id, name, nickname, specialty, is_active, has_schedule")
          .eq("salon_id", salonId)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return json({ professionals: data });
      }

      // ===== SEARCH CLIENT =====
      case "search_client": {
        const { phone, name, email } = body;
        let query = supabase
          .from("clients")
          .select("id, name, phone, email")
          .eq("salon_id", salonId);

        if (phone) query = query.eq("phone", phone);
        else if (email) query = query.eq("email", email);
        else if (name) query = query.ilike("name", `%${name}%`);
        else return json({ error: "Provide phone, name or email" }, 400);

        const { data, error } = await query;
        if (error) throw error;
        return json({ clients: data });
      }

      // ===== CREATE CLIENT =====
      case "create_client": {
        const { name, phone, email, notes, tags } = body;
        if (!name) return json({ error: "name is required" }, 400);

        const { data, error } = await supabase
          .from("clients")
          .insert({
            salon_id: salonId,
            name,
            phone: phone || null,
            email: email || null,
            notes: notes || null,
            tags: tags || [],
          })
          .select("id, name, phone, email")
          .single();

        if (error) throw error;
        return json({ client: data });
      }

      // ===== CREATE APPOINTMENT =====
      case "create_appointment": {
        const { client_id, professional_id, service_id, scheduled_at, duration_minutes, notes, price } = body;

        if (!professional_id) return json({ error: "professional_id is required" }, 400);
        if (!scheduled_at) return json({ error: "scheduled_at is required (ISO 8601)" }, 400);

        // If service_id provided, fetch defaults
        let finalDuration = duration_minutes || 30;
        let finalPrice = price;
        if (service_id && !duration_minutes) {
          const { data: svc } = await supabase
            .from("services")
            .select("duration_minutes, price")
            .eq("id", service_id)
            .single();
          if (svc) {
            finalDuration = svc.duration_minutes;
            if (finalPrice === undefined) finalPrice = svc.price;
          }
        }

        const { data, error } = await supabase
          .from("appointments")
          .insert({
            salon_id: salonId,
            client_id: client_id || null,
            professional_id,
            service_id: service_id || null,
            scheduled_at,
            duration_minutes: finalDuration,
            notes: notes || null,
            price: finalPrice ?? null,
            status: "scheduled",
          })
          .select("id, scheduled_at, duration_minutes, status, notes, price")
          .single();

        if (error) throw error;

        // Send confirmation email if client has email
        if (data.id && client_id) {
          try {
            const { data: client } = await supabase.from("clients").select("name, email").eq("id", client_id).single();
            if (client?.email) {
              const { data: service } = await supabase.from("services").select("name").eq("id", service_id).single();
              const { data: prof } = await supabase.from("professionals").select("name").eq("id", professional_id).single();
              const scheduledDate = new Date(data.scheduled_at);
              const dateStr = scheduledDate.toLocaleDateString("pt-BR");
              const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

              await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: "appointment_created",
                  salon_id: salonId,
                  to_email: client.email,
                  to_name: client.name || "Cliente",
                  client_id: client_id,
                  variables: {
                    service_name: service?.name || notes || "Não informado",
                    professional_name: prof?.name || "Não informado",
                    date: dateStr,
                    time: timeStr,
                  },
                }),
              });
            }
          } catch (emailError) {
            console.error("Email send error:", emailError);
          }
        }

        return json({ appointment: data });
      }

      // ===== ADD CREDIT =====
      case "add_credit": {
        const { client_id, credit_amount, min_purchase_amount, expires_in_days } = body;
        if (!client_id) return json({ error: "client_id is required" }, 400);
        if (!credit_amount || credit_amount <= 0) return json({ error: "credit_amount must be > 0" }, 400);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (expires_in_days || 90));

        const { data, error } = await supabase
          .from("client_credits")
          .insert({
            salon_id: salonId,
            client_id,
            credit_amount,
            min_purchase_amount: min_purchase_amount || 0,
            expires_at: expiresAt.toISOString(),
          })
          .select("id, credit_amount, expires_at")
          .single();

        if (error) throw error;
        return json({ credit: data });
      }

      // ===== LIST AVAILABLE SLOTS =====
      case "list_available_slots": {
        const { professional_id, date } = body;
        if (!professional_id || !date) return json({ error: "professional_id and date required" }, 400);

        // Get scheduling settings
        const { data: settings } = await supabase
          .from("scheduling_settings")
          .select("*")
          .eq("salon_id", salonId)
          .single();

        if (!settings) return json({ error: "Scheduling settings not configured" }, 400);

        // Get existing appointments for the day
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        const { data: appointments } = await supabase
          .from("appointments")
          .select("scheduled_at, duration_minutes")
          .eq("salon_id", salonId)
          .eq("professional_id", professional_id)
          .in("status", ["scheduled", "confirmed", "in_progress"])
          .gte("scheduled_at", startOfDay)
          .lte("scheduled_at", endOfDay);

        // Generate available slots
        const openTime = settings.opening_time.slice(0, 5);
        const closeTime = settings.closing_time.slice(0, 5);
        const interval = settings.slot_interval_minutes;
        const [openH, openM] = openTime.split(":").map(Number);
        const [closeH, closeM] = closeTime.split(":").map(Number);
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;

        const busySlots = (appointments || []).map(a => {
          const start = new Date(a.scheduled_at);
          return {
            startMin: start.getHours() * 60 + start.getMinutes(),
            endMin: start.getHours() * 60 + start.getMinutes() + a.duration_minutes,
          };
        });

        const availableSlots: string[] = [];
        for (let min = openMinutes; min < closeMinutes; min += interval) {
          const isBusy = busySlots.some(b => min >= b.startMin && min < b.endMin);
          if (!isBusy) {
            const h = String(Math.floor(min / 60)).padStart(2, "0");
            const m = String(min % 60).padStart(2, "0");
            availableSlots.push(`${h}:${m}`);
          }
        }

        return json({ date, professional_id, available_slots: availableSlots });
      }

      // ===== LIST APPOINTMENTS =====
      case "list_appointments": {
        const { date, status: filterStatus } = body;
        if (!date) return json({ error: "date required (YYYY-MM-DD)" }, 400);

        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;

        let query = supabase
          .from("appointments")
          .select(`
            id, scheduled_at, duration_minutes, status, notes, price,
            clients(id, name, phone, email),
            professionals(id, name, nickname),
            services(id, name)
          `)
          .eq("salon_id", salonId)
          .gte("scheduled_at", startOfDay)
          .lte("scheduled_at", endOfDay)
          .order("scheduled_at");

        if (filterStatus) {
          query = query.eq("status", filterStatus);
        }

        const { data, error } = await query;
        if (error) throw error;
        return json({ appointments: data });
      }

      // ===== CONFIRM APPOINTMENT =====
      case "confirm_appointment": {
        const { appointment_id } = body;
        if (!appointment_id) return json({ error: "appointment_id required" }, 400);

        const { data, error } = await supabase
          .from("appointments")
          .update({ status: "confirmed" })
          .eq("id", appointment_id)
          .select("id, scheduled_at, status, clients(name, email), services(name), professionals(name)")
          .single();

        if (error) throw error;

        // Send confirmation email
        if (data.clients?.email) {
          try {
            const scheduledDate = new Date(data.scheduled_at);
            const dateStr = scheduledDate.toLocaleDateString("pt-BR");
            const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "appointment_confirmation",
                salon_id: salonId,
                to_email: data.clients.email,
                to_name: data.clients.name || "Cliente",
                variables: {
                  service_name: data.services?.name || "Não informado",
                  professional_name: data.professionals?.name || "Não informado",
                  date: dateStr,
                  time: timeStr,
                },
              }),
            });
          } catch (e) { console.error("Confirm email error:", e); }
        }

        return json({ appointment: data });
      }

      // ===== CANCEL APPOINTMENT =====
      case "cancel_appointment": {
        const { appointment_id } = body;
        if (!appointment_id) return json({ error: "appointment_id required" }, 400);

        const { data, error } = await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appointment_id)
          .select("id, scheduled_at, status, clients(name, email), services(name), professionals(name)")
          .single();

        if (error) throw error;

        if (data.clients?.email) {
          try {
            const scheduledDate = new Date(data.scheduled_at);
            const dateStr = scheduledDate.toLocaleDateString("pt-BR");
            const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "appointment_cancellation",
                salon_id: salonId,
                to_email: data.clients.email,
                to_name: data.clients.name || "Cliente",
                variables: {
                  service_name: data.services?.name || "Não informado",
                  professional_name: data.professionals?.name || "Não informado",
                  date: dateStr,
                  time: timeStr,
                },
              }),
            });
          } catch (e) { console.error("Cancel email error:", e); }
        }

        return json({ appointment: data });
      }

      // ===== RESCHEDULE APPOINTMENT =====
      case "reschedule_appointment": {
        const { appointment_id, scheduled_at: newScheduledAt } = body;
        if (!appointment_id) return json({ error: "appointment_id required" }, 400);
        if (!newScheduledAt) return json({ error: "scheduled_at required (new date/time)" }, 400);

        const { data, error } = await supabase
          .from("appointments")
          .update({ scheduled_at: newScheduledAt, status: "scheduled" })
          .eq("id", appointment_id)
          .select("id, scheduled_at, status, clients(name, email), services(name), professionals(name)")
          .single();

        if (error) throw error;

        if (data.clients?.email) {
          try {
            const scheduledDate = new Date(data.scheduled_at);
            const dateStr = scheduledDate.toLocaleDateString("pt-BR");
            const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

            await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                type: "appointment_update",
                salon_id: salonId,
                to_email: data.clients.email,
                to_name: data.clients.name || "Cliente",
                variables: {
                  service_name: data.services?.name || "Não informado",
                  professional_name: data.professionals?.name || "Não informado",
                  date: dateStr,
                  time: timeStr,
                },
              }),
            });
          } catch (e) { console.error("Reschedule email error:", e); }
        }

        return json({ appointment: data });
      }

      default:
        return json({ error: `Unknown action: ${action}. Available: list_services, list_professionals, search_client, create_client, create_appointment, list_appointments, confirm_appointment, cancel_appointment, reschedule_appointment, add_credit, list_available_slots` }, 400);
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-key",
      "Content-Type": "application/json",
    },
  });
}
