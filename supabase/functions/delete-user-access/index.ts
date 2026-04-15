// Supabase Edge Function: delete-user-access
// Removes a user's access to the salon. Only master/admin can do this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const requesterId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? "").trim();
    const salonId = String(body?.salonId ?? "").trim();

    if (!userId || !salonId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Check if requester is admin
    const { data: requesterRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requesterId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (!requesterRole || requesterRole.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden - Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent self-deletion
    if (userId === requesterId) {
      return new Response(JSON.stringify({ error: "Cannot remove your own access" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check target user role - cannot delete admin
    const { data: targetRole } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("salon_id", salonId)
      .maybeSingle();

    if (targetRole?.role === "admin") {
      return new Response(JSON.stringify({ error: "Cannot remove admin access" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete user role
    const { error: roleDeleteError } = await adminClient
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("salon_id", salonId);

    if (roleDeleteError) {
      return new Response(JSON.stringify({ error: roleDeleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Delete profile
    const { error: profileDeleteError } = await adminClient
      .from("profiles")
      .delete()
      .eq("user_id", userId)
      .eq("salon_id", salonId);

    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError);
    }

    // Unlink professional if any
    await adminClient
      .from("professionals")
      .update({ user_id: null, create_access: false })
      .eq("user_id", userId)
      .eq("salon_id", salonId);

    // Optionally disable the auth user (soft delete)
    // Not deleting auth user to preserve audit trail

    return new Response(JSON.stringify({ success: true }), {
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
