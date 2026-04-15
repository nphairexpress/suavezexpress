import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Caixa } from "@/hooks/useCaixas";
import { Check } from "lucide-react";

interface CaixaSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (caixaId: string) => void;
  caixas: Caixa[];
  comandaDate: Date;
  selectedCaixaId?: string | null;
}

export function CaixaSelectModal({ 
  open, 
  onClose, 
  onSelect, 
  caixas, 
  comandaDate, 
  selectedCaixaId 
}: CaixaSelectModalProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  // Use caixas as already filtered by parent (ComandaModal handles master vs normal filtering)
  const availableCaixas = caixas.filter(c => !c.closed_at);

  const handleSelect = (caixaId: string) => {
    onSelect(caixaId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Selecionar Caixa para Fechamento</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Caixas abertos em {format(comandaDate, "dd/MM/yyyy", { locale: ptBR })}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-2">
          {availableCaixas.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nenhum caixa aberto nesta data.
                <br />
                <span className="text-sm">
                  Contate um gerente para reabrir um caixa ou criar um novo.
                </span>
              </CardContent>
            </Card>
          ) : (
            availableCaixas.map((caixa) => {
              const displayName = caixa.profile?.full_name || "Usuário";
              const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
              const totalReceived = 
                (caixa.total_cash || 0) + 
                (caixa.total_pix || 0) + 
                (caixa.total_credit_card || 0) + 
                (caixa.total_debit_card || 0) + 
                (caixa.total_other || 0);
              const isSelected = selectedCaixaId === caixa.id;
              const isSameDate = isSameDay(new Date(caixa.opened_at), comandaDate);

              return (
                <Card
                  key={caixa.id}
                  className={`transition-colors ${
                    isSelected ? "border-primary bg-primary/5 cursor-pointer"
                    : isSameDate ? "cursor-pointer hover:border-primary"
                    : "opacity-50 cursor-not-allowed border-dashed"
                  }`}
                  onClick={() => isSameDate && handleSelect(caixa.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={caixa.profile?.avatar_url || undefined} />
                          <AvatarFallback className={isSameDate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium flex items-center gap-2">
                            {displayName}
                            {isSelected && (
                              <Badge variant="default" className="h-5 gap-1">
                                <Check className="h-3 w-3" />
                                Selecionado
                              </Badge>
                            )}
                            {!isSameDate && (
                              <Badge variant="outline" className="h-5 text-xs text-muted-foreground">
                                Data diferente
                              </Badge>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Aberto: {format(new Date(caixa.opened_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total Recebido</p>
                        <p className="font-semibold text-primary">{formatCurrency(totalReceived)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
