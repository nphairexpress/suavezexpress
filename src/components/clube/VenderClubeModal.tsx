// Venda presencial do Clube da Escova pela recepção.
// A assinatura nasce no ASAAS (recorrência real) — nunca na maquininha.
// Cliente presente dita/entrega o cartão; nada é salvo aqui: os dados vão
// direto pra edge `clube-vender` e morrem com o submit.
import { useState } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Crown, Loader2 } from "lucide-react";

const PLANOS = [
  { id: "4cm", rotulo: "4 escovas/mês · curto/médio", valor: "R$ 197" },
  { id: "4long", rotulo: "4 escovas/mês · longo", valor: "R$ 247" },
  { id: "8cm", rotulo: "8 escovas/mês · curto/médio", valor: "R$ 347" },
  { id: "8long", rotulo: "8 escovas/mês · longo", valor: "R$ 447" },
];

export function VenderClubeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);
  const [plano, setPlano] = useState("4cm");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [celular, setCelular] = useState("");
  const [email, setEmail] = useState("");
  const [numero, setNumero] = useState("");
  const [validade, setValidade] = useState("");
  const [ccv, setCcv] = useState("");
  const [nomeTitular, setNomeTitular] = useState("");

  function limpar() {
    setPlano("4cm"); setNome(""); setCpf(""); setCelular(""); setEmail("");
    setNumero(""); setValidade(""); setCcv(""); setNomeTitular("");
  }

  async function handleVender(e: React.FormEvent) {
    e.preventDefault();
    const [mes, ano] = validade.split("/").map((s) => s.trim());
    if (!mes || !ano) {
      toast({ title: "Validade do cartão", description: "Use o formato MM/AA.", variant: "destructive" });
      return;
    }
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("clube-vender", {
        body: {
          plano, nome, cpf, celular, email,
          cartao: { numero, mesValidade: mes, anoValidade: ano, ccv, nomeTitular: nomeTitular || nome },
        },
      });
      if (error) {
        // o corpo de erro da edge vem no context da FunctionsHttpError
        let msg = "Não foi possível concluir a assinatura.";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.erro) msg = body.erro;
        } catch (_) { /* mantém msg padrão */ }
        toast({ title: "Assinatura não concluída", description: msg, variant: "destructive" });
        return;
      }
      if (data?.ok) {
        toast({
          title: "Assinatura criada!",
          description:
            "Cobrança no cartão em processamento. Assim que o Asaas confirmar (minutos), a cliente entra como assinante com os créditos do mês — sem precisar fazer mais nada.",
        });
        limpar();
        onClose();
      } else {
        toast({ title: "Assinatura não concluída", description: data?.erro ?? "Tente de novo.", variant: "destructive" });
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !enviando && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Vender Clube da Escova
          </DialogTitle>
          <DialogDescription>
            Assinatura recorrente no cartão de crédito (via Asaas). Não passe na maquininha —
            a maquininha não cria a recorrência.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVender} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PLANOS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlano(p.id)}
                className={`border rounded-lg p-2.5 text-left transition-colors ${
                  plano === p.id ? "border-amber-500 bg-amber-50" : "border-border hover:border-amber-300"
                }`}
              >
                <p className="text-sm font-medium leading-tight">{p.rotulo}</p>
                <p className="text-base font-bold text-amber-600">{p.valor}/mês</p>
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="vc-nome">Nome completo da cliente *</Label>
              <Input id="vc-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vc-cpf">CPF *</Label>
                <Input id="vc-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" required inputMode="numeric" autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="vc-cel">WhatsApp *</Label>
                <Input id="vc-cel" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="(11) 90000-0000" required inputMode="tel" autoComplete="off" />
              </div>
            </div>
            <div>
              <Label htmlFor="vc-email">E-mail *</Label>
              <Input id="vc-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Cartão de crédito da cliente
            </p>
            <div>
              <Label htmlFor="vc-num">Número do cartão *</Label>
              <Input id="vc-num" value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="0000 0000 0000 0000" required inputMode="numeric" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="vc-val">Validade (MM/AA) *</Label>
                <Input id="vc-val" value={validade} onChange={(e) => setValidade(e.target.value)} placeholder="12/28" required autoComplete="off" />
              </div>
              <div>
                <Label htmlFor="vc-ccv">CVV *</Label>
                <Input id="vc-ccv" value={ccv} onChange={(e) => setCcv(e.target.value)} placeholder="123" required inputMode="numeric" autoComplete="off" />
              </div>
            </div>
            <div>
              <Label htmlFor="vc-tit">Nome impresso no cartão</Label>
              <Input id="vc-tit" value={nomeTitular} onChange={(e) => setNomeTitular(e.target.value)} placeholder="Se diferente do nome da cliente" autoComplete="off" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando} className="bg-amber-500 hover:bg-amber-600 text-white">
              {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {enviando ? "Processando…" : "Ativar assinatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
