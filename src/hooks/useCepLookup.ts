import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface CepData {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface AddressFields {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  address_complement?: string;
}

export function useCepLookup() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const formatCep = (cep: string): string => {
    // Remove tudo que não é número
    return cep.replace(/\D/g, "");
  };

  const lookupCep = useCallback(async (cep: string): Promise<AddressFields | null> => {
    const cleanCep = formatCep(cep);
    
    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      
      if (!response.ok) {
        throw new Error("Erro ao buscar CEP");
      }
      
      const data: CepData = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP informado e tente novamente.",
          variant: "destructive",
        });
        return null;
      }
      
      toast({
        title: "Endereço encontrado!",
        description: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`,
      });
      
      return {
        address: data.logradouro || "",
        neighborhood: data.bairro || "",
        city: data.localidade || "",
        state: data.uf || "",
        address_complement: data.complemento || "",
      };
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Não foi possível buscar o endereço. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    lookupCep,
    isLoading,
    formatCep,
  };
}
