import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Professional } from "@/hooks/useProfessionals";

interface TransferAppointmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professional: Professional | null;
  professionals: Professional[];
  onConfirm: (targetProfessionalId: string | null) => void;
  isLoading?: boolean;
}

export function TransferAppointmentsModal({
  open,
  onOpenChange,
  professional,
  professionals,
  onConfirm,
  isLoading = false,
}: TransferAppointmentsModalProps) {
  const { salonId } = useAuth();
  const { toast } = useToast();
  const [targetProfessionalId, setTargetProfessionalId] = useState<string>("");
  const [pendingAppointments, setPendingAppointments] = useState<number>(0);
  const [isChecking, setIsChecking] = useState(false);

  // Filter out the professional being deactivated and only show active ones
  const availableProfessionals = professionals.filter(
    (p) => p.id !== professional?.id && p.is_active
  );

  // Check for pending appointments when modal opens
  useEffect(() => {
    if (open && professional && salonId) {
      checkPendingAppointments();
    }
  }, [open, professional, salonId]);

  const checkPendingAppointments = async () => {
    if (!professional || !salonId) return;

    setIsChecking(true);
    try {
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("salon_id", salonId)
        .eq("professional_id", professional.id)
        .gte("scheduled_at", now)
        .neq("status", "cancelled");

      if (error) throw error;
      setPendingAppointments(count || 0);
    } catch (error) {
      console.error("Error checking appointments:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirm = () => {
    if (pendingAppointments > 0 && !targetProfessionalId) {
      toast({
        title: "Selecione um profissional",
        description: "É necessário transferir os agendamentos antes de desativar.",
        variant: "destructive",
      });
      return;
    }
    onConfirm(targetProfessionalId || null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Desativar Profissional
          </DialogTitle>
          <DialogDescription>
            {professional?.name} será desativado e não aparecerá mais na agenda ou para novos atendimentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isChecking ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Verificando agendamentos...</span>
            </div>
          ) : pendingAppointments > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">
                    {pendingAppointments} agendamento(s) pendente(s)
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    Transfira para outro profissional antes de desativar.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetProfessional">Transferir agendamentos para:</Label>
                <Select value={targetProfessionalId} onValueChange={setTargetProfessionalId}>
                  <SelectTrigger id="targetProfessional">
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProfessionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200">
                Nenhum agendamento pendente. O profissional pode ser desativado diretamente.
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Profissionais desativados podem ser reativados a qualquer momento na lista de inativos.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || isChecking || (pendingAppointments > 0 && !targetProfessionalId)}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Desativar Profissional
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
