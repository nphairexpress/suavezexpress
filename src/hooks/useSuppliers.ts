import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Supplier {
  id: string;
  salon_id: string;
  name: string;
  trade_name: string | null;
  document: string | null;
  responsible: string | null;
  website: string | null;
  phone: string | null;
  mobile: string | null;
  email: string | null;
  cep: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  address_number: string | null;
  neighborhood: string | null;
  address_complement: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierInput {
  name: string;
  trade_name?: string;
  document?: string;
  responsible?: string;
  website?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  cep?: string;
  state?: string;
  city?: string;
  address?: string;
  address_number?: string;
  neighborhood?: string;
  address_complement?: string;
  notes?: string;
  is_active?: boolean;
}

export function useSuppliers() {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["suppliers", salonId],
    queryFn: async () => {
      if (!salonId) return [];

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("salon_id", salonId)
        .order("name");

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!salonId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: SupplierInput) => {
      if (!salonId) throw new Error("Salão não encontrado");

      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...input, salon_id: salonId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", salonId] });
      toast({ title: "Fornecedor cadastrado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao cadastrar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: SupplierInput & { id: string }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update(input)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", salonId] });
      toast({ title: "Fornecedor atualizado com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", salonId] });
      toast({ title: "Fornecedor excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    suppliers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createSupplier: createMutation.mutate,
    updateSupplier: updateMutation.mutate,
    deleteSupplier: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
