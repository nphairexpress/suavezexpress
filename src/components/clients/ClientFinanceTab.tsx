import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@design-system";
import {
  glassModal,
  modalTitle,
  display,
  txtPositive,
  txtDanger,
  boxPositive,
  boxDanger,
  btnPositiveOutline,
  btnDangerOutline,
  inset,
  tableHead,
} from "@/components/clients/clientsUi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { useClientBalance } from "@/hooks/useClientBalance";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ClientFinanceTabProps {
  clientId: string;
  clientName: string;
}

export function ClientFinanceTab({ clientId, clientName }: ClientFinanceTabProps) {
  const { entries, summary, isLoading, addCredit, addDebt, isAddingCredit, isAddingDebt } = useClientBalance(clientId);

  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleAddCredit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    addCredit(
      { amount: numAmount, description: description || undefined },
      {
        onSuccess: () => {
          setCreditModalOpen(false);
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  const handleAddDebt = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;
    addDebt(
      { amount: numAmount, description: description || undefined },
      {
        onSuccess: () => {
          setDebtModalOpen(false);
          setAmount("");
          setDescription("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const positive = summary.netBalance >= 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className={`${display} text-lg`}>Financeiro de {clientName}</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className={`min-h-[44px] gap-2 ${btnPositiveOutline}`}
            onClick={() => {
              setAmount("");
              setDescription("");
              setCreditModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adicionar Credito
          </Button>
          <Button
            type="button"
            variant="outline"
            className={`min-h-[44px] gap-2 ${btnDangerOutline}`}
            onClick={() => {
              setAmount("");
              setDescription("");
              setDebtModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Registrar Divida
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <div className={`rounded-2xl p-4 ${boxPositive}`}>
          <div className={`flex items-center gap-2 mb-1 ${txtPositive}`}>
            <TrendingUp className="h-4 w-4" />
            <Label className={`text-xs font-medium ${txtPositive}`}>Creditos</Label>
          </div>
          <p className={`np-num text-xl ${txtPositive}`}>{formatCurrency(summary.totalCredits)}</p>
        </div>
        <div className={`rounded-2xl p-4 ${boxDanger}`}>
          <div className={`flex items-center gap-2 mb-1 ${txtDanger}`}>
            <TrendingDown className="h-4 w-4" />
            <Label className={`text-xs font-medium ${txtDanger}`}>Dividas</Label>
          </div>
          <p className={`np-num text-xl ${txtDanger}`}>{formatCurrency(summary.totalDebts)}</p>
        </div>
        <div className={`rounded-2xl p-4 ${positive ? boxPositive : boxDanger}`}>
          <div className={`flex items-center gap-2 mb-1 ${positive ? txtPositive : txtDanger}`}>
            <Wallet className="h-4 w-4" />
            <Label className={`text-xs font-medium ${positive ? txtPositive : txtDanger}`}>Saldo</Label>
          </div>
          <p className={`np-num text-xl ${positive ? txtPositive : txtDanger}`}>
            {formatCurrency(summary.netBalance)}
          </p>
        </div>
      </div>

      {/* History Table */}
      {entries.length === 0 ? (
        <div className={inset}>
          <EmptyState icon={Wallet} title="Nenhum registro financeiro encontrado" className="py-8" />
        </div>
      ) : (
        <div className={`${inset} overflow-hidden`}>
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className={tableHead}>Data</TableHead>
                <TableHead className={tableHead}>Tipo</TableHead>
                <TableHead className={tableHead}>Descricao</TableHead>
                <TableHead className={`${tableHead} text-right`}>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="border-border hover:bg-[var(--np-surface-inset)]">
                  <TableCell className="tabular-nums whitespace-nowrap">
                    {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {entry.type === "credit" ? (
                      <Badge tone="positive">Credito</Badge>
                    ) : (
                      <Badge tone="danger">Divida</Badge>
                    )}
                  </TableCell>
                  <TableCell>{entry.description || "—"}</TableCell>
                  <TableCell className={`text-right font-semibold tabular-nums whitespace-nowrap ${entry.type === "credit" ? txtPositive : txtDanger}`}>
                    {entry.type === "credit" ? "+" : "-"} {formatCurrency(Number(entry.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Credit Modal */}
      <Dialog open={creditModalOpen} onOpenChange={setCreditModalOpen}>
        <DialogContent className={`${glassModal} w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className={modalTitle}>Adicionar Credito</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pagamento adiantado, bonificacao..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreditModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddCredit}
              disabled={!amount || parseFloat(amount) <= 0 || isAddingCredit}
              className="bg-[var(--np-positive)] text-[color:var(--np-text-on-accent)] hover:bg-[var(--np-positive)] hover:brightness-110"
            >
              {isAddingCredit ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar Credito"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Debt Modal */}
      <Dialog open={debtModalOpen} onOpenChange={setDebtModalOpen}>
        <DialogContent className={`${glassModal} w-[calc(100%-1.5rem)] rounded-2xl sm:max-w-md`}>
          <DialogHeader>
            <DialogTitle className={modalTitle}>Registrar Divida</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Servico nao pago, produto fiado..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDebtModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddDebt}
              disabled={!amount || parseFloat(amount) <= 0 || isAddingDebt}
              variant="destructive"
            >
              {isAddingDebt ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                "Confirmar Divida"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
