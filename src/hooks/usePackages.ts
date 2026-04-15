import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PackageItem {
  id: string;
  package_id: string;
  service_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  service?: {
    id: string;
    name: string;
    price: number;
  };
}

export interface Package {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  package_items?: PackageItem[];
}

export interface PackageInput {
  name: string;
  description?: string;
  price: number;
  original_price: number;
  discount_percent: number;
  is_active?: boolean;
  items: {
    service_id: string;
    quantity: number;
    unit_price: number;
  }[];
}

export interface ClientPackage {
  id: string;
  salon_id: string;
  client_id: string;
  package_id: string;
  purchase_date: string;
  total_paid: number;
  status: string;
  notes: string | null;
  created_at: string;
  package?: Package;
  usage?: ClientPackageUsage[];
}

export interface ClientPackageUsage {
  id: string;
  client_package_id: string;
  service_id: string;
  used_at: string;
  professional_id: string | null;
  comanda_id: string | null;
  notes: string | null;
}

export function usePackages() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["packages", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("packages")
        .select("*, package_items(*, service:services(id, name, price))")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data as Package[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: PackageInput) => {
      if (!salonId) throw new Error("Salao nao encontrado");
      const { items, ...packageData } = input;
      const { data: pkg, error: pkgError } = await supabase
        .from("packages")
        .insert({ ...packageData, salon_id: salonId })
        .select()
        .single();
      if (pkgError) throw pkgError;

      if (items.length > 0) {
        const itemRows = items.map((item) => ({
          package_id: pkg.id,
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));
        const { error: itemsError } = await supabase
          .from("package_items")
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }

      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", salonId] });
      toast({ title: "Pacote criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar pacote", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: PackageInput & { id: string }) => {
      const { items, ...packageData } = input;

      const { data: pkg, error: pkgError } = await supabase
        .from("packages")
        .update(packageData)
        .eq("id", id)
        .select()
        .single();
      if (pkgError) throw pkgError;

      // Delete existing items and re-insert
      const { error: delError } = await supabase
        .from("package_items")
        .delete()
        .eq("package_id", id);
      if (delError) throw delError;

      if (items.length > 0) {
        const itemRows = items.map((item) => ({
          package_id: id,
          service_id: item.service_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }));
        const { error: itemsError } = await supabase
          .from("package_items")
          .insert(itemRows);
        if (itemsError) throw itemsError;
      }

      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", salonId] });
      toast({ title: "Pacote atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar pacote", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packages", salonId] });
      toast({ title: "Pacote removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover pacote", description: error.message, variant: "destructive" });
    },
  });

  return {
    packages: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createPackage: createMutation.mutate,
    updatePackage: updateMutation.mutate,
    deletePackage: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useClientPackages(clientId?: string) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["client-packages", salonId, clientId],
    queryFn: async () => {
      if (!salonId || !clientId) return [];
      const { data, error } = await supabase
        .from("client_packages")
        .select("*, package:packages(*, package_items(*, service:services(id, name, price))), usage:client_package_usage(*)")
        .eq("salon_id", salonId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientPackage[];
    },
    enabled: !!salonId && !!clientId,
  });

  const purchaseMutation = useMutation({
    mutationFn: async (input: {
      client_id: string;
      package_id: string;
      total_paid: number;
      notes?: string;
    }) => {
      if (!salonId) throw new Error("Salao nao encontrado");
      const { data, error } = await supabase
        .from("client_packages")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-packages", salonId, clientId] });
      toast({ title: "Pacote adquirido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adquirir pacote", description: error.message, variant: "destructive" });
    },
  });

  const usageMutation = useMutation({
    mutationFn: async (input: {
      client_package_id: string;
      service_id: string;
      professional_id?: string;
      comanda_id?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from("client_package_usage")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-packages", salonId, clientId] });
      toast({ title: "Uso registrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar uso", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("client_packages")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-packages", salonId, clientId] });
      toast({ title: "Pacote cancelado!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao cancelar pacote", description: error.message, variant: "destructive" });
    },
  });

  return {
    clientPackages: query.data ?? [],
    isLoading: query.isLoading,
    purchasePackage: purchaseMutation.mutate,
    registerUsage: usageMutation.mutate,
    cancelPackage: cancelMutation.mutate,
    isPurchasing: purchaseMutation.isPending,
    isRegistering: usageMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
