import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Product {
  id: string;
  salon_id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string | null;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  current_stock_fractional: number;
  min_stock: number;
  is_active: boolean;
  supplier_id: string | null;
  unit_of_measure: string;
  unit_quantity: number;
  is_for_resale: boolean;
  is_for_consumption: boolean;
  brand: string | null;
  product_line: string | null;
  commission_percent: number;
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  cost_price?: number;
  sale_price?: number;
  current_stock?: number;
  current_stock_fractional?: number;
  min_stock?: number;
  is_active?: boolean;
  supplier_id?: string | null;
  unit_of_measure?: string;
  unit_quantity?: number;
  is_for_resale?: boolean;
  is_for_consumption?: boolean;
  brand?: string;
  product_line?: string;
  commission_percent?: number;
}

export function useProducts() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["products", salonId],
    queryFn: async () => {
      if (!salonId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProductInput) => {
      if (!salonId) throw new Error("Salão não encontrado");
      const { data, error } = await supabase
        .from("products")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", salonId] });
      toast({ title: "Produto criado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar produto", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ProductInput & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update(input)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", salonId] });
      toast({ title: "Produto atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar produto", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products", salonId] });
      toast({ title: "Produto removido com sucesso!" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao remover produto", description: error.message, variant: "destructive" });
    },
  });

  return {
    products: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProduct: createMutation.mutate,
    updateProduct: updateMutation.mutate,
    deleteProduct: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
