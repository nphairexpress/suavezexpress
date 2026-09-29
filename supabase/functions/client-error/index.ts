// Supabase Edge Function: client-error
// 29/09/2026 (auditoria R-09/D9): recebe erro do navegador (ErrorBoundary / window.onerror)
// e grava em client_errors. Só staff logado (requireStaff); a tabela não tem policy de INSERT —
// só o service role daqui escreve. Responde 204 sempre que aceitar.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireStaff } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const staff = await requireStaff(req, supabase);
    if (!staff.ok) {
      return new Response(
        JSON.stringify({ error: staff.error }),
        { status: staff.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const message = clip(body?.message, 2000);
    if (!message) {
      return new Response(
        JSON.stringify({ error: "message required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error } = await supabase.from("client_errors").insert({
      user_id: staff.userId === "service_role" ? null : staff.userId,
      message,
      stack: clip(body?.stack, 8000),
      url: clip(body?.url, 2000),
      user_agent: clip(body?.user_agent, 500),
    });
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
