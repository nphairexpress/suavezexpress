import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes?: number;
  category?: string | null;
  is_active?: boolean;
}

interface ServiceSearchSelectProps {
  services: Service[];
  value: string | null;
  onSelect: (serviceId: string | null, service?: Service) => void;
  placeholder?: string;
  disabled?: boolean;
  showPrice?: boolean;
}

export function ServiceSearchSelect({
  services,
  value,
  onSelect,
  placeholder = "Buscar serviço...",
  disabled = false,
  showPrice = true,
}: ServiceSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Only show active services
  const activeServices = services.filter((s) => s.is_active !== false);
  const selectedService = activeServices.find((s) => s.id === value);

  // Filter services based on search
  const filteredServices = activeServices.filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase()) ||
    (service.category && service.category.toLowerCase().includes(search.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
  };

  const handleSelect = (serviceId: string) => {
    const service = activeServices.find((s) => s.id === serviceId);
    onSelect(serviceId, service);
    setSearch("");
    setOpen(false);
  };

  // Reset search when value changes externally
  useEffect(() => {
    if (selectedService) {
      setSearch("");
    }
  }, [value]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={open ? search : (selectedService?.name || "")}
            onChange={(e) => {
              e.stopPropagation();
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!open) setOpen(true);
            }}
            onFocus={() => {
              if (!open) setOpen(true);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            disabled={disabled}
            className="pl-9 pr-10"
          />
          {selectedService && !open && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
                setSearch("");
              }}
            >
              ×
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {filteredServices.length === 0 ? (
              <CommandEmpty>
                <div className="py-4 text-center">
                  <p className="text-muted-foreground">Nenhum serviço encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cadastre serviços em Configurações → Serviços
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredServices.slice(0, 15).map((service) => (
                  <CommandItem
                    key={service.id}
                    value={service.id}
                    onSelect={() => handleSelect(service.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{service.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {service.category && <span>{service.category}</span>}
                        {service.duration_minutes && (
                          <span>• {service.duration_minutes} min</span>
                        )}
                      </div>
                    </div>
                    {showPrice && (
                      <span className="font-medium text-primary">
                        {formatCurrency(service.price)}
                      </span>
                    )}
                    {value === service.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
