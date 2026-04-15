import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentUserPermissions() {
  const { user, salonId, isMaster } = useAuth();

  const query = useQuery({
    queryKey: ["current-user-permissions", user?.id, salonId],
    queryFn: async () => {
      if (!user || !salonId) return { permissions: {} as Record<string, boolean>, professionalId: null as string | null };

      // Master has all permissions
      if (isMaster) {
        return { permissions: {} as Record<string, boolean>, professionalId: null as string | null, isMaster: true };
      }

      // Get user's access_level_id
      const { data: role } = await supabase
        .from("user_roles")
        .select("access_level_id, role")
        .eq("user_id", user.id)
        .eq("salon_id", salonId)
        .maybeSingle();

      // Get user's linked professional
      const { data: professional } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .eq("salon_id", salonId)
        .maybeSingle();

      if (!role?.access_level_id) {
        return { permissions: {} as Record<string, boolean>, professionalId: professional?.id || null, isMaster: false };
      }

      // Get permissions for this access level
      const { data: perms } = await supabase
        .from("access_level_permissions")
        .select("permission_key, enabled")
        .eq("access_level_id", role.access_level_id);

      const permissions: Record<string, boolean> = {};
      perms?.forEach((p) => {
        permissions[p.permission_key] = p.enabled;
      });

      return { permissions, professionalId: professional?.id || null, isMaster: false };
    },
    enabled: !!user && !!salonId,
  });

  const hasPermission = (key: string): boolean => {
    if (isMaster) return true;
    if (query.data?.isMaster) return true;
    return query.data?.permissions[key] ?? false;
  };

  return {
    hasPermission,
    professionalId: query.data?.professionalId || null,
    isLoading: query.isLoading,
    isMaster,
  };
}
