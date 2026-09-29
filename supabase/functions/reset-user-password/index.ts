// Supabase Edge Function: reset-user-password (29/09/2026, auditoria S-07)
// Admin do salão define uma senha nova para um usuário do mesmo salão que não seja admin.
// Caminho sem e-mail: a recuperação por e-mail não funcionava para a equipe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "Missing Authorization header" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const requesterId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const userId = String(body?.userId ?? "").trim();
    const newPassword = String(body?.newPassword ?? "");
    if (!userId || newPassword.length < 8) return json({ error: "userId e senha com no mínimo 8 caracteres são obrigatórios" }, 400);
    if (userId === requesterId) return json({ error: "Use 'Esqueci minha senha' para a própria conta" }, 400);

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: requesterRole } = await adminClient
      .from("user_roles").select("role, salon_id").eq("user_id", requesterId).maybeSingle();
    if (!requesterRole || requesterRole.role !== "admin") return json({ error: "Forbidden - Admin only" }, 403);

    const { data: targetRole } = await adminClient
      .from("user_roles").select("role, salon_id").eq("user_id", userId).maybeSingle();
    if (!targetRole || targetRole.salon_id !== requesterRole.salon_id) return json({ error: "Usuário não pertence ao salão" }, 403);
    if (targetRole.role === "admin") return json({ error: "Senha de administrador só pelo próprio usuário" }, 403);

    const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
    if (updErr) return json({ error: updErr.message }, 400);

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
