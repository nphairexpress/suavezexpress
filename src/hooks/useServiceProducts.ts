import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ServiceProduct {
  id: string;
  service_id: string;
  product_id: string;
  quantity_per_use: number;
  created_at: string;
  updated_at: string;
  // Joined data
  product?: {
    id: string;
    name: string;
    cost_price: number;
    unit_of_measure: string;
    unit_quantity: number;
    current_stock: number;
  };
}

export interface ServiceProductInput {
  service_id: string;
  product_id: string;
  quantity_per_use: number;
}

export function useServiceProducts(serviceId?: string) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["service-products", serviceId],
    queryFn: async () => {
      if (!serviceId) return [];
      const { data, error } = await supabase
        .from("service_products")
        .select(`
          *,
          product:products(id, name, cost_price, unit_of_measure, unit_quantity, current_stock)
        `)
        .eq("service_id", serviceId);
      if (error) throw error;
      return data as ServiceProduct[];
    },
    enabled: !!serviceId,
  });

  const addMutation = useMutation({
    mutationFn: async (input: ServiceProductInput) => {
      const { data, error } = await supabase
        .from("service_products")
        .insert(input)
        .select(`
          *,
          product:products(id, name, cost_price, unit_of_measure, unit_quantity, current_stock)
        `)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-products", serviceId] });
      toast({ title: "Produto adicionado ao serviço!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao adicionar produto", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, quantity_per_use }: { id: string; quantity_per_use: number }) => {
      const { data, error } = await supabase
        .from("service_products")
        .update({ quantity_per_use })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-products", serviceId] });
      toast({ title: "Quantidade atualizada!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar quantidade", description: error.message, variant: "destructive" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-products", serviceId] });
      toast({ title: "Produto removido do serviço!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover produto", description: error.message, variant: "destructive" });
    },
  });

  // Calculate the total cost of products for a service execution
  const calculateProductCost = (serviceProducts: ServiceProduct[]): number => {
    return serviceProducts.reduce((total, sp) => {
      if (!sp.product) return total;
      const unitCost = Number(sp.product.cost_price) / Number(sp.product.unit_quantity);
      const itemCost = unitCost * Number(sp.quantity_per_use);
      return total + itemCost;
    }, 0);
  };

  return {
    serviceProducts: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    addProduct: addMutation.mutate,
    updateQuantity: updateMutation.mutate,
    removeProduct: removeMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    calculateProductCost,
  };
}

// Hook to get products for all services (for comanda calculations)
export function useAllServiceProducts() {
  const { salonId } = useAuth();

  const query = useQuery({
    queryKey: ["all-service-products", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      
      // Get all service products for services in this salon
      const { data, error } = await supabase
        .from("service_products")
        .select(`
          *,
          product:products(id, name, cost_price, unit_of_measure, unit_quantity, current_stock),
          service:services!inner(id, salon_id)
        `)
        .eq("service.salon_id", salonId);
      
      if (error) throw error;
      return data as (ServiceProduct & { service: { id: string; salon_id: string } })[];
    },
    enabled: !!salonId,
  });

  // Get products for a specific service
  const getProductsForService = (serviceId: string): ServiceProduct[] => {
    return (query.data ?? []).filter(sp => sp.service_id === serviceId);
  };

  // Calculate cost for a specific service
  const calculateServiceCost = (serviceId: string): number => {
    const products = getProductsForService(serviceId);
    return products.reduce((total, sp) => {
      if (!sp.product) return total;
      const unitCost = Number(sp.product.cost_price) / Number(sp.product.unit_quantity);
      const itemCost = unitCost * Number(sp.quantity_per_use);
      return total + itemCost;
    }, 0);
  };

  return {
    allServiceProducts: query.data ?? [],
    isLoading: query.isLoading,
    getProductsForService,
    calculateServiceCost,
  };
}
