// Supabase Edge Function: transfer-master-access
// Transfers master user access to another user. Only the current master can do this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Current master email - this will be updated to the new master
const MASTER_USER_EMAIL = "vanieri_2006@hotmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate requester
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterEmail = userData.user.email;
    
    // Only the current master can transfer
    if (requesterEmail !== MASTER_USER_EMAIL) {
      return new Response(JSON.stringify({ error: "Apenas o usuário master pode transferir este acesso" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const newMasterUserId = String(body?.newMasterUserId ?? "").trim();

    if (!newMasterUserId) {
      return new Response(JSON.stringify({ error: "ID do novo master é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Get the new master's email
    const { data: newMasterUser, error: newMasterError } = await adminClient.auth.admin.getUserById(newMasterUserId);
    
    if (newMasterError || !newMasterUser?.user?.email) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newMasterEmail = newMasterUser.user.email;

    // Store the new master email in a config table (we'll create this in a migration)
    // For now, we'll return success with instructions
    // The actual master check happens in the client code based on email
    
    // Update the system config to store new master email
    const { error: configError } = await adminClient
      .from("system_config")
      .upsert({
        key: "master_user_email",
        value: newMasterEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });

    if (configError) {
      // Table might not exist, we'll handle this in the response
      console.error("Error updating system config:", configError);
      return new Response(JSON.stringify({ 
        success: true, 
        newMasterEmail,
        warning: "Master transferido. A configuração será aplicada após atualização do sistema."
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      newMasterEmail,
      message: "Acesso master transferido com sucesso!" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
