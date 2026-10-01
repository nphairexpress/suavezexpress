import { useState } from "react";
import { glassModal, modalTitle } from "@/components/financeiro/glass";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useSalonPermissions } from "@/hooks/useSalonPermissions";

interface OpenCaixaModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (openingBalance: number, notes?: string, openedAt?: Date) => void;
  isLoading?: boolean;
}

export function OpenCaixaModal({ open, onClose, onConfirm, isLoading }: OpenCaixaModalProps) {
  const { pode } = useSalonPermissions();
  const isMaster = pode("caixa.reabrir_editar");
  const [openingBalance, setOpeningBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [openedAtDate, setOpenedAtDate] = useState("");

  const handleConfirm = () => {
    const balance = parseFloat(openingBalance.replace(",", ".")) || 0;
    const openedAt = openedAtDate ? new Date(openedAtDate + "T08:00:00") : undefined;
    onConfirm(balance, notes || undefined, openedAt);
    setOpeningBalance("");
    setNotes("");
    setOpenedAtDate("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-md ${glassModal}`}>
        <DialogHeader>
          <DialogTitle className={modalTitle}>Abrir Caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openingBalance">Valor de Abertura (R$)</Label>
            <Input
              id="openingBalance"
              className="h-12 text-lg font-semibold tabular-nums"
              type="text"
              placeholder="0,00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Informe o valor em dinheiro disponível no caixa ao iniciar
            </p>
          </div>
          {isMaster && (
            <div className="space-y-2">
              <Label htmlFor="openedAtDate">
                Data de Abertura <span className="text-xs text-muted-foreground">(somente master)</span>
              </Label>
              <Input
                id="openedAtDate"
                type="date"
                value={openedAtDate}
                onChange={(e) => setOpenedAtDate(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd")}
                placeholder="Hoje"
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para hoje. Escolha uma data passada para abrir um caixa retroativo (ex: lançar comandas de um dia em que ficaram sem sistema).
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre a abertura do caixa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" className="h-12" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button className="h-12" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Abrindo..." : "Abrir Caixa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
