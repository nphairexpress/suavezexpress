import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function parseUrl(url: string) {
  const u = new URL(url);
  // Path: /api-gateway/clients/uuid or /api-gateway/clients?page=1
  const parts = u.pathname.replace(/^\/api-gateway\/?/, "").split("/").filter(Boolean);
  // Also handle /functions/v1/api-gateway/...
  const idx = parts.indexOf("api-gateway");
  const relevant = idx >= 0 ? parts.slice(idx + 1) : parts;
  const resource = relevant[0] || "";
  const id = relevant[1] || null;
  const params = Object.fromEntries(u.searchParams.entries());
  return { resource, id, params };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth via x-api-key header
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return json({ error: "Missing x-api-key header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate API key
    const { data: configData } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "api_gateway_key")
      .maybeSingle();

    if (!configData?.value || configData.value !== apiKey) {
      return json({ error: "Invalid API key" }, 403);
    }

    // Get salon_id
    const { data: salon } = await supabase
      .from("salons")
      .select("id")
      .limit(1)
      .single();

    if (!salon) return json({ error: "No salon found" }, 404);
    const salonId = salon.id;

    const { resource, id, params } = parseUrl(req.url);
    const method = req.method;
    let body: any = {};
    if (["POST", "PUT", "PATCH"].includes(method)) {
      try { body = await req.json(); } catch { body = {}; }
    }

    const page = parseInt(params.page || "1");
    const limit = Math.min(parseInt(params.limit || "50"), 100);
    const offset = (page - 1) * limit;

    switch (resource) {
      // ========== CLIENTS ==========
      case "clients": {
        if (method === "GET" && !id) {
          let query = supabase.from("clients").select("*", { count: "exact" }).eq("salon_id", salonId);
          if (params.phone) query = query.eq("phone", params.phone);
          if (params.email) query = query.eq("email", params.email);
          if (params.name) query = query.ilike("name", `%${params.name}%`);
          if (params.tag) query = query.contains("tags", [params.tag]);
          const { data, error, count } = await query.order("name").range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("clients").select("*").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "POST") {
          const { data, error } = await supabase.from("clients").insert({ ...body, salon_id: salonId }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        if (method === "PUT" || method === "PATCH") {
          if (!id) return json({ error: "ID required" }, 400);
          const { salon_id: _, id: __, ...updateData } = body;
          const { data, error } = await supabase.from("clients").update(updateData).eq("id", id).eq("salon_id", salonId).select().single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "DELETE") {
          if (!id) return json({ error: "ID required" }, 400);
          const { error } = await supabase.from("clients").delete().eq("id", id).eq("salon_id", salonId);
          if (error) throw error;
          return json({ success: true });
        }
        break;
      }

      // ========== SERVICES ==========
      case "services": {
        if (method === "GET" && !id) {
          let query = supabase.from("services").select("*", { count: "exact" }).eq("salon_id", salonId);
          if (params.active === "true") query = query.eq("is_active", true);
          if (params.category) query = query.eq("category", params.category);
          const { data, error, count } = await query.order("name").range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("services").select("*").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "POST") {
          const { data, error } = await supabase.from("services").insert({ ...body, salon_id: salonId }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        if (method === "PUT" || method === "PATCH") {
          if (!id) return json({ error: "ID required" }, 400);
          const { salon_id: _, id: __, ...updateData } = body;
          const { data, error } = await supabase.from("services").update(updateData).eq("id", id).eq("salon_id", salonId).select().single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "DELETE") {
          if (!id) return json({ error: "ID required" }, 400);
          const { error } = await supabase.from("services").delete().eq("id", id).eq("salon_id", salonId);
          if (error) throw error;
          return json({ success: true });
        }
        break;
      }

      // ========== APPOINTMENTS ==========
      case "appointments": {
        if (method === "GET" && !id) {
          let query = supabase.from("appointments").select("*, clients(name, phone), professionals(name, nickname), services(name, price)", { count: "exact" }).eq("salon_id", salonId);
          if (params.status) query = query.eq("status", params.status);
          if (params.professional_id) query = query.eq("professional_id", params.professional_id);
          if (params.date) {
            query = query.gte("scheduled_at", `${params.date}T00:00:00`).lte("scheduled_at", `${params.date}T23:59:59`);
          }
          if (params.from) query = query.gte("scheduled_at", params.from);
          if (params.to) query = query.lte("scheduled_at", params.to);
          const { data, error, count } = await query.order("scheduled_at", { ascending: true }).range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("appointments").select("*, clients(name, phone), professionals(name, nickname), services(name, price)").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "POST") {
          // Auto-fill from service if needed
          let finalDuration = body.duration_minutes || 30;
          let finalPrice = body.price;
          if (body.service_id && (!body.duration_minutes || body.price === undefined)) {
            const { data: svc } = await supabase.from("services").select("duration_minutes, price").eq("id", body.service_id).single();
            if (svc) {
              if (!body.duration_minutes) finalDuration = svc.duration_minutes;
              if (body.price === undefined) finalPrice = svc.price;
            }
          }
          const { data, error } = await supabase.from("appointments").insert({
            ...body, salon_id: salonId, duration_minutes: finalDuration, price: finalPrice ?? null, status: body.status || "scheduled",
          }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        if (method === "PUT" || method === "PATCH") {
          if (!id) return json({ error: "ID required" }, 400);
          const { salon_id: _, id: __, ...updateData } = body;
          const { data, error } = await supabase.from("appointments").update(updateData).eq("id", id).eq("salon_id", salonId).select().single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "DELETE") {
          if (!id) return json({ error: "ID required" }, 400);
          const { error } = await supabase.from("appointments").delete().eq("id", id).eq("salon_id", salonId);
          if (error) throw error;
          return json({ success: true });
        }
        break;
      }

      // ========== PROFESSIONALS ==========
      case "professionals": {
        if (method === "GET" && !id) {
          let query = supabase.from("professionals").select("*", { count: "exact" }).eq("salon_id", salonId);
          if (params.active === "true") query = query.eq("is_active", true);
          const { data, error, count } = await query.order("name").range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("professionals").select("*").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        // No POST/PUT/DELETE for professionals via API (security)
        return json({ error: "Method not allowed for professionals" }, 405);
      }

      // ========== PRODUCTS ==========
      case "products": {
        if (method === "GET" && !id) {
          let query = supabase.from("products").select("*", { count: "exact" }).eq("salon_id", salonId);
          if (params.active === "true") query = query.eq("is_active", true);
          if (params.category) query = query.eq("category", params.category);
          if (params.for_resale === "true") query = query.eq("is_for_resale", true);
          const { data, error, count } = await query.order("name").range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("products").select("*").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "POST") {
          const { data, error } = await supabase.from("products").insert({ ...body, salon_id: salonId }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        if (method === "PUT" || method === "PATCH") {
          if (!id) return json({ error: "ID required" }, 400);
          const { salon_id: _, id: __, ...updateData } = body;
          const { data, error } = await supabase.from("products").update(updateData).eq("id", id).eq("salon_id", salonId).select().single();
          if (error) throw error;
          return json({ data });
        }
        if (method === "DELETE") {
          if (!id) return json({ error: "ID required" }, 400);
          const { error } = await supabase.from("products").delete().eq("id", id).eq("salon_id", salonId);
          if (error) throw error;
          return json({ success: true });
        }
        break;
      }

      // ========== COMANDAS ==========
      case "comandas": {
        if (method === "GET" && !id) {
          let query = supabase.from("comandas").select("*, clients(name), professionals(name)", { count: "exact" }).eq("salon_id", salonId);
          if (params.paid === "true") query = query.eq("is_paid", true);
          if (params.paid === "false") query = query.eq("is_paid", false);
          if (params.from) query = query.gte("created_at", params.from);
          if (params.to) query = query.lte("created_at", params.to);
          const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "GET" && id) {
          const { data, error } = await supabase.from("comandas").select("*, clients(name), professionals(name), comanda_items(*), payments(*)").eq("id", id).eq("salon_id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        // Read-only for comandas via API
        return json({ error: "Method not allowed for comandas via API" }, 405);
      }

      // ========== FINANCIAL ==========
      case "financial": {
        if (method === "GET") {
          let query = supabase.from("financial_transactions").select("*", { count: "exact" }).eq("salon_id", salonId);
          if (params.type) query = query.eq("transaction_type", params.type);
          if (params.from) query = query.gte("transaction_date", params.from);
          if (params.to) query = query.lte("transaction_date", params.to);
          if (params.category) query = query.eq("category", params.category);
          const { data, error, count } = await query.order("transaction_date", { ascending: false }).range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "POST") {
          const { data, error } = await supabase.from("financial_transactions").insert({ ...body, salon_id: salonId }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        return json({ error: "Method not allowed" }, 405);
      }

      // ========== CREDITS ==========
      case "credits": {
        if (method === "GET") {
          let query = supabase.from("client_credits").select("*, clients(name)", { count: "exact" }).eq("salon_id", salonId);
          if (params.client_id) query = query.eq("client_id", params.client_id);
          if (params.used === "false") query = query.eq("is_used", false).eq("is_expired", false);
          const { data, error, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
          if (error) throw error;
          return json({ data, total: count, page, limit });
        }
        if (method === "POST") {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + (body.expires_in_days || 90));
          const { data, error } = await supabase.from("client_credits").insert({
            salon_id: salonId, client_id: body.client_id, credit_amount: body.credit_amount || 0,
            min_purchase_amount: body.min_purchase_amount || 0, expires_at: expiresAt.toISOString(),
          }).select().single();
          if (error) throw error;
          return json({ data }, 201);
        }
        return json({ error: "Method not allowed" }, 405);
      }

      // ========== SLOTS ==========
      case "slots": {
        if (method !== "GET") return json({ error: "Only GET allowed" }, 405);
        const { professional_id, date } = params;
        if (!professional_id || !date) return json({ error: "professional_id and date query params required" }, 400);

        const { data: settings } = await supabase.from("scheduling_settings").select("*").eq("salon_id", salonId).single();
        if (!settings) return json({ error: "Scheduling settings not configured" }, 400);

        const { data: appointments } = await supabase.from("appointments")
          .select("scheduled_at, duration_minutes")
          .eq("salon_id", salonId).eq("professional_id", professional_id)
          .in("status", ["scheduled", "confirmed", "in_progress"])
          .gte("scheduled_at", `${date}T00:00:00`).lte("scheduled_at", `${date}T23:59:59`);

        const [openH, openM] = settings.opening_time.slice(0, 5).split(":").map(Number);
        const [closeH, closeM] = settings.closing_time.slice(0, 5).split(":").map(Number);
        const openMin = openH * 60 + openM;
        const closeMin = closeH * 60 + closeM;
        const interval = settings.slot_interval_minutes;

        const busy = (appointments || []).map(a => {
          const s = new Date(a.scheduled_at);
          const startM = s.getHours() * 60 + s.getMinutes();
          return { startM, endM: startM + a.duration_minutes };
        });

        const available: string[] = [];
        for (let m = openMin; m < closeMin; m += interval) {
          if (!busy.some(b => m >= b.startM && m < b.endM)) {
            available.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
          }
        }
        return json({ date, professional_id, available_slots: available });
      }

      // ========== SALON INFO ==========
      case "salon": {
        if (method === "GET") {
          const { data, error } = await supabase.from("salons").select("id, name, phone, email, address, logo_url, trade_name, cnpj").eq("id", salonId).single();
          if (error) throw error;
          return json({ data });
        }
        return json({ error: "Method not allowed" }, 405);
      }

      default:
        return json({
          error: `Unknown resource: ${resource}`,
          available_resources: ["clients", "services", "appointments", "professionals", "products", "comandas", "financial", "credits", "slots", "salon"],
        }, 404);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error("API Gateway error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});
