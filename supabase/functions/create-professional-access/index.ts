// Supabase Edge Function: create-professional-access
// Creates a new user for a professional and links them to the salon.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Validate requester via anon client + provided JWT
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("create-professional-access: auth.getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim();
    const password = String(body?.password ?? "");
    const fullName = String(body?.fullName ?? "").trim();
    const salonId = String(body?.salonId ?? "").trim();
    const professionalId = String(body?.professionalId ?? "").trim();
    const accessLevel = String(body?.accessLevel ?? "professional").trim();
    const accessLevelId = body?.accessLevelId ? String(body.accessLevelId).trim() : null;

    if (!email || !password || !fullName || !salonId || !professionalId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Ensure requester is admin in this salon
    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (roleError) {
      console.error("create-professional-access: failed reading user_roles", roleError);
      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleRow || roleRow.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create auth user
    const { data: created, error: createUserError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createUserError || !created.user) {
      console.error("create-professional-access: createUser failed", createUserError);
      return new Response(JSON.stringify({ error: createUserError?.message ?? "Failed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newUserId = created.user.id;

    // Create profile
    const { error: profileError } = await adminClient
      .from("profiles")
      .insert({ user_id: newUserId, salon_id: salonId, full_name: fullName });

    if (profileError) {
      console.error("create-professional-access: profile insert failed", profileError);
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign role based on accessLevel
    const validRoles = ["admin", "manager", "receptionist", "financial", "professional"];
    const roleToAssign = validRoles.includes(accessLevel) ? accessLevel : "professional";
    
    const roleInsertData: Record<string, unknown> = { user_id: newUserId, salon_id: salonId, role: roleToAssign };
    if (accessLevelId) {
      roleInsertData.access_level_id = accessLevelId;
    }
    
    const { error: roleInsertError } = await adminClient
      .from("user_roles")
      .insert(roleInsertData);

    if (roleInsertError) {
      console.error("create-professional-access: user_roles insert failed", roleInsertError);
      return new Response(JSON.stringify({ error: roleInsertError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link professional record to auth user
    const { error: professionalUpdateError } = await adminClient
      .from("professionals")
      .update({ user_id: newUserId, create_access: true })
      .eq("id", professionalId)
      .eq("salon_id", salonId);

    if (professionalUpdateError) {
      console.error("create-professional-access: professionals update failed", professionalUpdateError);
      return new Response(JSON.stringify({ error: professionalUpdateError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ user_id: newUserId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-professional-access: unhandled error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

