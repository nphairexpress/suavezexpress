import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServices } from "@/hooks/useServices";
import { useToast } from "@/hooks/use-toast";

interface AddWalkInModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { customer_name: string; customer_phone: string; service_id: string }) => void;
}

export function AddWalkInModal({ open, onClose, onSubmit }: AddWalkInModalProps) {
  const { services } = useServices();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");

  const activeServices = (services || []).filter((s: any) => s.is_active);

  const handleSubmit = () => {
    if (!name.trim() || !serviceId) {
      toast({ title: "Preencha nome e servico", variant: "destructive" });
      return;
    }
    onSubmit({ customer_name: name.trim(), customer_phone: phone.trim(), service_id: serviceId });
    setName("");
    setPhone("");
    setServiceId("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Adicionar cliente presencial</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cliente" /></div>
          <div><Label>WhatsApp (opcional)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
          <div>
            <Label>Servico</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {activeServices.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit}>Adicionar na fila</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
