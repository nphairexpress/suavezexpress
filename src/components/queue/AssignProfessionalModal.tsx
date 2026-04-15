import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useProfessionals } from "@/hooks/useProfessionals";

interface AssignProfessionalModalProps {
  open: boolean;
  onClose: () => void;
  customerName: string;
  serviceName: string;
  onAssign: (professionalId: string) => void;
}

export function AssignProfessionalModal({ open, onClose, customerName, serviceName, onAssign }: AssignProfessionalModalProps) {
  const { professionals } = useProfessionals();
  const [selectedId, setSelectedId] = useState("");

  const activeProfessionals = (professionals || []).filter((p: any) => p.is_active);

  const handleAssign = () => {
    if (!selectedId) return;
    onAssign(selectedId);
    setSelectedId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atribuir profissional</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{customerName} — {serviceName}</p>
        <div>
          <Label>Profissional</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {activeProfessionals.map((p: any) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAssign} disabled={!selectedId}>Atribuir e abrir comanda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
