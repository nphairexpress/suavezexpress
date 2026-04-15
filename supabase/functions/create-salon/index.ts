// Supabase Edge Function: create-salon
// Creates a salon + profile + admin role for the authenticated user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const seedDefaultAccessLevels = async (adminClient: any, salonId: string) => {
  const { data: templateLevels, error: templateLevelsError } = await adminClient
    .from("access_levels")
    .select("id, name, description, system_key, color, created_at")
    .eq("is_system", true)
    .not("system_key", "is", null)
    .order("created_at", { ascending: true });

  if (templateLevelsError) {
    throw new Error(`Failed loading access level templates: ${templateLevelsError.message}`);
  }

  const templateLevelMap = new Map<string, any>();
  for (const level of templateLevels ?? []) {
    if (level.system_key && !templateLevelMap.has(level.system_key)) {
      templateLevelMap.set(level.system_key, level);
    }
  }

  const uniqueTemplateLevels = Array.from(templateLevelMap.values());
  
  // If no templates exist, create default levels directly
  if (uniqueTemplateLevels.length === 0) {
    const defaultLevels = [
      { name: "Administrador", system_key: "admin", is_system: true, color: "#22c55e", description: "Acesso total ao sistema", salon_id: salonId },
      { name: "Gerente", system_key: "manager", is_system: true, color: "#3b82f6", description: "Gestão operacional", salon_id: salonId },
      { name: "Recepcionista", system_key: "receptionist", is_system: true, color: "#f59e0b", description: "Atendimento e agenda", salon_id: salonId },
      { name: "Financeiro", system_key: "financial", is_system: true, color: "#8b5cf6", description: "Acesso financeiro", salon_id: salonId },
      { name: "Profissional", system_key: "professional", is_system: true, color: "#ec4899", description: "Apenas sua agenda", salon_id: salonId },
    ];
    
    const { data: insertedLevels } = await adminClient
      .from("access_levels")
      .insert(defaultLevels)
      .select("id, system_key");
    
    const adminAccessLevelId = insertedLevels?.find((l: any) => l.system_key === "admin")?.id ?? null;
    return { adminAccessLevelId };
  }

  const templateIds = uniqueTemplateLevels.map((level) => level.id);
  const { data: templatePermissions, error: templatePermissionsError } = await adminClient
    .from("access_level_permissions")
    .select("access_level_id, permission_key, enabled")
    .in("access_level_id", templateIds);

  if (templatePermissionsError) {
    throw new Error(`Failed loading access level permissions: ${templatePermissionsError.message}`);
  }

  const { data: insertedLevels, error: insertedLevelsError } = await adminClient
    .from("access_levels")
    .insert(
      uniqueTemplateLevels.map((level) => ({
        salon_id: salonId,
        name: level.name,
        description: level.description,
        is_system: true,
        system_key: level.system_key,
        color: level.color,
      }))
    )
    .select("id, system_key");

  if (insertedLevelsError || !insertedLevels) {
    throw new Error(`Failed creating default access levels: ${insertedLevelsError?.message ?? "unknown error"}`);
  }

  const permissionsByTemplateId = new Map<string, Array<{ permission_key: string; enabled: boolean }>>();
  for (const permission of templatePermissions ?? []) {
    const existing = permissionsByTemplateId.get(permission.access_level_id) ?? [];
    existing.push({ permission_key: permission.permission_key, enabled: permission.enabled });
    permissionsByTemplateId.set(permission.access_level_id, existing);
  }

  const permissionInserts = insertedLevels.flatMap((insertedLevel: any) => {
    const templateLevel = uniqueTemplateLevels.find((level) => level.system_key === insertedLevel.system_key);
    if (!templateLevel) return [];

    return (permissionsByTemplateId.get(templateLevel.id) ?? []).map((permission) => ({
      access_level_id: insertedLevel.id,
      permission_key: permission.permission_key,
      enabled: permission.enabled,
    }));
  });

  if (permissionInserts.length > 0) {
    const { error: permissionInsertError } = await adminClient
      .from("access_level_permissions")
      .insert(permissionInserts);

    if (permissionInsertError) {
      throw new Error(`Failed creating default permissions: ${permissionInsertError.message}`);
    }
  }

  const adminAccessLevelId = insertedLevels.find((level: any) => level.system_key === "admin")?.id ?? null;
  return { adminAccessLevelId };
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

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("create-salon: auth.getUser failed", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const user = userData.user;

    const body = await req.json().catch(() => ({}));
    const fullName = String(body?.fullName ?? "").trim();
    const salonName = String(body?.salonName ?? "").trim();
    const tradeName = String(body?.tradeName ?? "").trim() || salonName;
    const salonPhone = String(body?.salonPhone ?? "").trim() || null;
    const salonEmail = String(body?.salonEmail ?? "").trim() || null;
    const salonCnpj = String(body?.salonCnpj ?? "").trim() || null;

    if (fullName.length < 2 || salonName.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Check if user already has a profile/salon
    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from("profiles")
      .select("salon_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfileError) {
      console.error("create-salon: failed checking existing profile", existingProfileError);
      return new Response(JSON.stringify({ error: "Failed checking existing profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existingProfile?.salon_id) {
      return new Response(JSON.stringify({ salonId: existingProfile.salon_id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create salon
    const { data: salon, error: salonError } = await adminClient
      .from("salons")
      .insert({
        name: salonName,
        trade_name: tradeName,
        phone: salonPhone,
        email: salonEmail,
        cnpj: salonCnpj,
      })
      .select("id")
      .single();

    if (salonError || !salon?.id) {
      console.error("create-salon: failed creating salon", salonError);
      return new Response(JSON.stringify({ error: "Failed creating salon" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create profile
    const { error: profileError } = await adminClient.from("profiles").insert({
      user_id: user.id,
      salon_id: salon.id,
      full_name: fullName,
    });

    if (profileError) {
      console.error("create-salon: failed creating profile", profileError);
      return new Response(JSON.stringify({ error: "Failed creating profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed access levels
    let adminAccessLevelId: string | null = null;
    try {
      const seeded = await seedDefaultAccessLevels(adminClient, salon.id);
      adminAccessLevelId = seeded.adminAccessLevelId;
    } catch (seedError) {
      console.error("create-salon: failed seeding default access levels", seedError);
    }

    // Create admin role
    const rolePayload: Record<string, unknown> = {
      user_id: user.id,
      salon_id: salon.id,
      role: "admin",
    };

    if (adminAccessLevelId) {
      rolePayload.access_level_id = adminAccessLevelId;
    }

    const { error: roleError } = await adminClient.from("user_roles").insert(rolePayload);

    if (roleError) {
      console.error("create-salon: failed creating role", roleError);
      return new Response(JSON.stringify({ error: "Failed creating role" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save system config (master email)
    await adminClient.from("system_config").upsert(
      { key: "master_user_email", value: user.email },
      { onConflict: "key" }
    );

    // Create default scheduling settings
    const { data: existingSched } = await adminClient
      .from("scheduling_settings")
      .select("id")
      .eq("salon_id", salon.id)
      .maybeSingle();
    if (!existingSched) {
      await adminClient.from("scheduling_settings").insert({ salon_id: salon.id });
    }

    // Create default commission settings
    const { data: existingComm } = await adminClient
      .from("commission_settings")
      .select("id")
      .eq("salon_id", salon.id)
      .maybeSingle();
    if (!existingComm) {
      await adminClient.from("commission_settings").insert({ salon_id: salon.id });
    }

    return new Response(JSON.stringify({ salonId: salon.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-salon: unhandled error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
