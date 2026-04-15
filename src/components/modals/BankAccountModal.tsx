import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BankAccount, BankAccountInput } from "@/hooks/useBankAccounts";

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BankAccountInput) => void;
  bankAccount?: BankAccount | null;
  isLoading?: boolean;
}

export function BankAccountModal({
  isOpen,
  onClose,
  onSave,
  bankAccount,
  isLoading,
}: BankAccountModalProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (bankAccount) {
      setName(bankAccount.name);
      setIsActive(bankAccount.is_active);
    } else {
      setName("");
      setIsActive(true);
    }
  }, [bankAccount, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      is_active: isActive,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {bankAccount ? "Editar Conta Bancária" : "Nova Conta Bancária"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Banco</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Nubank, Itaú, Bradesco..."
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Conta Ativa</Label>
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
