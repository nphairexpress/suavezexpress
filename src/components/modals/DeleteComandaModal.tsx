import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Comanda } from "@/hooks/useComandas";

interface DeleteComandaModalProps {
  comanda: Comanda | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting: boolean;
}

export function DeleteComandaModal({ comanda, open, onClose, onConfirm, isDeleting }: DeleteComandaModalProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    await onConfirm(reason);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!comanda) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Excluir Comanda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm">
            <p className="font-medium">Atenção!</p>
            <p>Esta ação é irreversível. A comanda será excluída permanentemente.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Comanda: <span className="font-medium text-foreground">{comanda.comanda_number ? String(comanda.comanda_number).padStart(4, "0") : comanda.id.slice(0, 4).toUpperCase()}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Cliente: <span className="font-medium text-foreground">{comanda.client?.name || "Não definido"}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da exclusão *</Label>
            <Textarea
              id="reason"
              placeholder="Informe o motivo da exclusão desta comanda..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm} 
            disabled={isDeleting || !reason.trim()}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Excluindo...
              </>
            ) : (
              "Confirmar Exclusão"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
