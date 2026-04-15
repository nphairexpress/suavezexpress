import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Shield } from "lucide-react";

interface TransferMasterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: Array<{ user_id: string; full_name: string; email?: string }>;
  onConfirm: (newMasterUserId: string) => void;
  isLoading?: boolean;
}

export function TransferMasterModal({
  open,
  onOpenChange,
  users,
  onConfirm,
  isLoading,
}: TransferMasterModalProps) {
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");

  const isConfirmValid = confirmText.toLowerCase() === "transferir";
  const canSubmit = selectedUser && isConfirmValid && !isLoading;

  const handleConfirm = () => {
    if (canSubmit) {
      onConfirm(selectedUser);
    }
  };

  const handleClose = () => {
    setSelectedUser("");
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Transferir Acesso Master
          </DialogTitle>
          <DialogDescription>
            Esta ação é irreversível. Você perderá o acesso master e se tornará administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive mb-1">Atenção!</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Seu acesso master será removido permanentemente</li>
                  <li>• Você passará a ser um administrador comum</li>
                  <li>• Apenas o novo master poderá excluir registros</li>
                  <li>• Apenas um usuário pode ser master por vez</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-master">Novo usuário master</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="new-master">
                <SelectValue placeholder="Selecione o novo master" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id}>
                    {user.full_name} {user.email ? `(${user.email})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              Digite <span className="font-bold">TRANSFERIR</span> para confirmar
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="TRANSFERIR"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit}
          >
            {isLoading ? "Transferindo..." : "Confirmar Transferência"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
