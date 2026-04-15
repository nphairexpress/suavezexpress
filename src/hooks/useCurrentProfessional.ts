import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

export function useCurrentProfessional() {
  const { user, salonId, userRole } = useAuth();

  const { data: professional, isLoading } = useQuery({
    queryKey: ["current-professional", user?.id, salonId],
    queryFn: async () => {
      if (!user?.id || !salonId) return null;

      const { data } = await supabase
        .from("professionals")
        .select("id, name, avatar_url, role, commission_percent")
        .eq("salon_id", salonId)
        .eq("user_id", user.id)
        .maybeSingle();

      return data;
    },
    enabled: !!user?.id && !!salonId && userRole === "professional",
  });

  return {
    professional,
    professionalId: professional?.id ?? null,
    isProfessionalUser: userRole === "professional",
    isLoading,
  };
}
