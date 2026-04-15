import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "manager" | "receptionist" | "financial" | "professional";

interface UserRoleData {
  role: AppRole | null;
  isAdmin: boolean;
  isMaster: boolean;
  canDelete: boolean;
  isLoading: boolean;
}

export function useUserRole(): UserRoleData {
  const { user, salonId } = useAuth();

  // Fetch master email from system config
  const masterEmailQuery = useQuery({
    queryKey: ["master-email"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", "master_user_email")
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching master email:", error);
        return "vanieri_2006@hotmail.com"; // Fallback
      }
      
      return data?.value || "vanieri_2006@hotmail.com";
    },
  });

  const roleQuery = useQuery({
    queryKey: ["user-role", user?.id, salonId],
    queryFn: async () => {
      if (!user?.id || !salonId) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("salon_id", salonId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AppRole | null;
    },
    enabled: !!user?.id && !!salonId,
  });

  const masterEmail = masterEmailQuery.data || "vanieri_2006@hotmail.com";
  const isMaster = user?.email === masterEmail;
  const isAdmin = roleQuery.data === "admin";
  
  // Only the master user can delete
  const canDelete = isMaster;

  return {
    role: roleQuery.data ?? null,
    isAdmin,
    isMaster,
    canDelete,
    isLoading: roleQuery.isLoading || masterEmailQuery.isLoading,
  };
}
