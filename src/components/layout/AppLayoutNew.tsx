import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AppShell, npAssets, type SidebarItem } from "@design-system";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useNavMenu, isSubItemActive } from "./TopNavigation";
import { IniciarAtendimentoFab } from "@/components/queue/IniciarAtendimentoFab";

/*
 * Fase A do redesign (30/09/2026): moldura do app = AppShell do design system
 * (fundo desfocado + GlassSidebar flutuante recolhível + TopBar; gaveta no celular).
 * O menu é o mesmo da barra antiga (TopNavigation): mesmos itens, URLs, filtro por permissão
 * e regra de item ativo, vindos do hook useNavMenu. Usuário e "Sair" vêm do antigo AppHeaderNew
 * (mesmas consultas de salão e perfil, mesmas queryKeys).
 */

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  financial: "Financeiro",
  manager: "Gerente",
  receptionist: "Recepcionista",
  professional: "Profissional",
};

// Item com submenu ganha id próprio: a URL do pai às vezes é igual à do 1º subitem (Financeiro, Fechamentos).
const GROUP_PREFIX = "group:";
const LOGOUT_ID = "action:sair";

interface AppLayoutNewProps {
  children: React.ReactNode;
}

export function AppLayoutNew({ children }: AppLayoutNewProps) {
  const { user, salonId, signOut, userRole } = useAuth();
  const { location, navigate, visibleNavItems, activeNavItem } = useNavMenu();

  // Mesmas consultas do AppHeaderNew (nome do salão e do usuário).
  const { data: salon } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("id", salonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const items: SidebarItem[] = visibleNavItems.map((item) => ({
    id: item.subItems ? GROUP_PREFIX + item.url : item.url,
    label: item.title,
    icon: item.icon as LucideIcon,
    children: item.subItems?.map((sub) => ({ id: sub.url, label: sub.title })),
  }));

  const activeSub = activeNavItem?.subItems?.find((sub) => isSubItemActive(location, sub));
  const activeId = activeSub
    ? activeSub.url
    : activeNavItem
      ? activeNavItem.subItems
        ? GROUP_PREFIX + activeNavItem.url
        : activeNavItem.url
      : undefined;

  const onSelect = (id: string) => {
    if (id === LOGOUT_ID) {
      void handleSignOut();
      return;
    }
    navigate(id.startsWith(GROUP_PREFIX) ? id.slice(GROUP_PREFIX.length) : id);
  };

  const salonName = (salon as { trade_name?: string } | null | undefined)?.trade_name || salon?.name || "Meu Salão";
  const userName = profile?.full_name || "Usuário";
  const roleLabel = userRole ? ROLE_LABEL[userRole] : undefined;
  const screenTitle = location.pathname === "/" ? "Visão geral" : activeSub?.title ?? activeNavItem?.title ?? salonName;

  return (
    <AppShell
      screenKey={location.pathname}
      sidebar={{
        title: salonName,
        logoSrc: npAssets.logoWordmark,
        onLogoClick: () => navigate("/"),
        user: { name: userName, subtitle: roleLabel, avatar: profile?.avatar_url || undefined },
        sections: [{ title: "Menu", items }],
        footer: [{ id: LOGOUT_ID, label: "Sair", icon: "log-out" }],
        activeId,
        onSelect,
        themeToggle: "switch",
        showSearch: false,
      }}
      topBar={{
        title: salonName,
        subtitle: screenTitle,
        searchPlaceholder: null,
        themeToggle: true,
        user: { name: userName, role: roleLabel, avatar: profile?.avatar_url || undefined },
      }}
    >
      <IniciarAtendimentoFab />
      <div className="np-min0">{children}</div>
    </AppShell>
  );
}
