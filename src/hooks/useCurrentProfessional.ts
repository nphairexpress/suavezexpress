import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";

// anyRole: busca a ficha vinculada ao usuário seja qual for o papel (ex.: recepção que também
// tem ficha). Padrão continua só para o papel "professional" (Visão geral depende disso).
export function useCurrentProfessional({ anyRole = false }: { anyRole?: boolean } = {}) {
  const { user, salonId, userRole } = useAuth();

  const { data: professional, isLoading } = useQuery({
    queryKey: ["current-professional", user?.id, salonId, anyRole],
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
    enabled: !!user?.id && !!salonId && (anyRole || userRole === "professional"),
  });

  return {
    professional,
    professionalId: professional?.id ?? null,
    isProfessionalUser: userRole === "professional",
    isLoading,
  };
}
