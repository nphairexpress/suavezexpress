import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    const { type, data } = payload;

    if (!data?.email_id) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendId = data.email_id;
    const now = new Date().toISOString();

    const columnMap: Record<string, string> = {
      "email.delivered": "delivered_at",
      "email.opened": "opened_at",
      "email.clicked": "clicked_at",
      "email.bounced": "bounced_at",
      "email.complained": "complained_at",
    };

    const column = columnMap[type];
    if (!column) {
      return new Response(JSON.stringify({ ok: true, skipped: true, type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updateData: Record<string, string> = { [column]: now };

    // Update status for bounced/complained
    if (type === "email.bounced") updateData.status = "bounced";
    if (type === "email.complained") updateData.status = "complained";

    const { error } = await supabase
      .from("email_logs")
      .update(updateData)
      .eq("resend_id", resendId);

    if (error) {
      console.error("Webhook update error:", error);
    }

    return new Response(JSON.stringify({ ok: true, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("resend-webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
