import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Plus, Search, User, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Client {
  id: string;
  name: string;
  phone?: string | null;
}

interface ClientSearchSelectProps {
  clients: Client[];
  value: string | null;
  onSelect: (clientId: string | null) => void;
  onCreateNew?: (name: string) => void;
  onViewClient?: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ClientSearchSelect({
  clients,
  value,
  onSelect,
  onCreateNew,
  onViewClient,
  placeholder = "Buscar cliente...",
  disabled = false,
}: ClientSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedClient = clients.find((c) => c.id === value);

  // Filter clients based on search
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    (client.phone && client.phone.includes(search))
  );

  const showCreateButton = search.trim().length > 0 && 
    !filteredClients.some((c) => c.name.toLowerCase() === search.toLowerCase().trim());

  const handleSelect = (clientId: string) => {
    onSelect(clientId);
    setSearch("");
    setOpen(false);
    // Remove focus from input so cursor disappears and dropdown stays closed
    inputRef.current?.blur();
  };

  const handleCreateNew = () => {
    if (onCreateNew && search.trim()) {
      onCreateNew(search.trim());
      setSearch("");
      setOpen(false);
    }
  };

  // Reset search when value changes externally
  useEffect(() => {
    if (selectedClient) {
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
            value={open ? search : (selectedClient?.name || "")}
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
              // Não abre automaticamente no focus — só ao clicar ou digitar
            }}
            onKeyDown={(e) => {
              // Prevent popover from closing on typing
              e.stopPropagation();
            }}
            disabled={disabled}
            className="pl-9 pr-10"
          />
          {selectedClient && !open && (
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {onViewClient && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Ver cadastro"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewClient(selectedClient.id);
                  }}
                >
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(null);
                  setSearch("");
                }}
              >
                ×
              </Button>
            </div>
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
            {filteredClients.length === 0 && !showCreateButton ? (
              <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredClients.slice(0, 50).map((client) => (
                  <CommandItem
                    key={client.id}
                    value={client.id}
                    onSelect={() => handleSelect(client.id)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">{client.name}</div>
                      {client.phone && (
                        <div className="text-xs text-muted-foreground">{client.phone}</div>
                      )}
                    </div>
                    {value === client.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {showCreateButton && onCreateNew && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNew}
                  className="flex items-center gap-2 cursor-pointer text-primary border-t"
                >
                  <Plus className="h-4 w-4" />
                  <span>Cadastrar "{search.trim()}"</span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
