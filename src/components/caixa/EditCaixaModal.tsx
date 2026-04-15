import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Caixa } from "@/hooks/useCaixas";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface EditCaixaModalProps {
  open: boolean;
  onClose: () => void;
  caixa: Caixa | null;
}

export function EditCaixaModal({ open, onClose, caixa }: EditCaixaModalProps) {
  const { toast } = useToast();
  const { salonId } = useAuth();
  const queryClient = useQueryClient();
  
  const [openingBalance, setOpeningBalance] = useState("");
  const [closingBalance, setClosingBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (caixa) {
      setOpeningBalance(caixa.opening_balance.toString());
      setClosingBalance(caixa.closing_balance?.toString() || "");
      setNotes(caixa.notes || "");
    }
  }, [caixa]);

  if (!caixa) return null;

  const caixaDate = new Date(caixa.opened_at);
  const today = new Date();
  const isToday = isSameDay(caixaDate, today);
  const isClosed = !!caixa.closed_at;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const totalReceived = 
    (caixa.total_cash || 0) + 
    (caixa.total_pix || 0) + 
    (caixa.total_credit_card || 0) + 
    (caixa.total_debit_card || 0) + 
    (caixa.total_other || 0);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      const updates: Record<string, unknown> = {
        notes,
      };

      // Only allow editing opening balance on today's caixa
      if (isToday) {
        updates.opening_balance = parseFloat(openingBalance.replace(",", ".")) || 0;
      }

      // Allow editing closing balance if caixa is closed
      if (isClosed) {
        updates.closing_balance = parseFloat(closingBalance.replace(",", ".")) || 0;
      }

      const { error } = await supabase
        .from("caixas")
        .update(updates)
        .eq("id", caixa.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["caixas", salonId] });
      toast({ title: "Caixa atualizado com sucesso!" });
      onClose();
    } catch (error: any) {
      toast({ 
        title: "Erro ao atualizar caixa", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Caixa
            <Badge variant={isClosed ? "secondary" : "default"}>
              {isClosed ? "Fechado" : "Aberto"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Date Display - Read Only */}
          <Card className="bg-muted/50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Data de Abertura:</span>
                <span className="font-medium">
                  {format(caixaDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              {caixa.closed_at && (
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-muted-foreground">Data de Fechamento:</span>
                  <span className="font-medium">
                    {format(new Date(caixa.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              )}
              {!isToday && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ Não é possível alterar o valor de abertura de caixas de dias anteriores.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Opening Balance */}
          <div className="space-y-2">
            <Label htmlFor="openingBalance">Valor de Abertura (R$)</Label>
            <Input
              id="openingBalance"
              type="text"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              disabled={!isToday}
            />
          </div>

          {/* Closing Balance (if closed) */}
          {isClosed && (
            <div className="space-y-2">
              <Label htmlFor="closingBalance">Valor de Fechamento (R$)</Label>
              <Input
                id="closingBalance"
                type="text"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
              />
            </div>
          )}

          {/* Summary - Read Only */}
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dinheiro:</span>
                  <span>{formatCurrency(caixa.total_cash || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PIX:</span>
                  <span>{formatCurrency(caixa.total_pix || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Crédito:</span>
                  <span>{formatCurrency(caixa.total_credit_card || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Débito:</span>
                  <span>{formatCurrency(caixa.total_debit_card || 0)}</span>
                </div>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Recebido:</span>
                <span className="text-primary">{formatCurrency(totalReceived)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Observações sobre o caixa..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
