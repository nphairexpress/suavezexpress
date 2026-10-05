// Venda presencial do Clube da Escova pela recepção.
// A assinatura nasce no ASAAS (recorrência real) — nunca na maquininha.
// Cliente presente dita/entrega o cartão; nada é salvo aqui: os dados vão
// direto pra edge `clube-vender` e morrem com o submit.
// Se ela já tem escova ativa, a edge devolve um aviso (nada cobrado) e a
// segunda só sai se a recepção confirmar; o reenvio leva o token do aviso.
import { useRef, useState } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button as NpButton } from "@design-system";
import { Crown, Loader2, TriangleAlert } from "lucide-react";

const PLANOS = [
  { id: "4cm", rotulo: "4 escovas/mês · curto/médio", valor: "R$ 197" },
  { id: "4long", rotulo: "4 escovas/mês · longo", valor: "R$ 247" },
  { id: "8cm", rotulo: "8 escovas/mês · curto/médio", valor: "R$ 347" },
  { id: "8long", rotulo: "8 escovas/mês · longo", valor: "R$ 447" },
];

type Encontrada = { nome: string; plano: string; desde: string | null; bateu: string[]; atrasada: boolean };
type Aviso = { confirmacao: string; encontradas: Encontrada[] };

function mesmoDado(bateu: string[]): string {
  if (bateu.length === 0) return "";
  const lista = bateu.length === 1 ? bateu[0] : bateu.slice(0, -1).join(", ") + " e " + bateu[bateu.length - 1];
  return "Mesmo " + lista;
}

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
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const emVoo = useRef(false);

  function limpar() {
    setPlano("4cm"); setNome(""); setCpf(""); setCelular(""); setEmail("");
    setNumero(""); setValidade(""); setCcv(""); setNomeTitular("");
  }

  function fechar() {
    if (enviando) return;
    setAviso(null);
    onClose();
  }

  function cancelarVenda() {
    limpar();
    setAviso(null);
    onClose();
  }

  async function handleVender(e: React.FormEvent) {
    e.preventDefault();
    await enviar();
  }

  async function enviar(confirmacao?: string) {
    if (emVoo.current) return; // duplo clique
    const [mes, ano] = validade.split("/").map((s) => s.trim());
    if (!mes || !ano) {
      toast({ title: "Validade do cartão", description: "Use o formato MM/AA.", variant: "destructive" });
      return;
    }
    emVoo.current = true;
    setEnviando(true);
    try {
      const { data, error } = await supabase.functions.invoke("clube-vender", {
        body: {
          plano, nome, cpf, celular, email,
          cartao: { numero, mesValidade: mes, anoValidade: ano, ccv, nomeTitular: nomeTitular || nome },
          ...(confirmacao ? { confirmar_segundo_pacote: confirmacao } : {}),
        },
      });
      if (error) {
        // o corpo de erro da edge vem no context da FunctionsHttpError
        let msg = "Não foi possível concluir a assinatura.";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.ja_tem_assinatura && typeof body.confirmacao === "string") {
            setAviso({ confirmacao: body.confirmacao, encontradas: Array.isArray(body.encontradas) ? body.encontradas : [] });
            return;
          }
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
        setAviso(null);
        onClose();
      } else {
        toast({ title: "Assinatura não concluída", description: data?.erro ?? "Tente de novo.", variant: "destructive" });
      }
    } finally {
      emVoo.current = false;
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card text-foreground border-border">
        {aviso ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-[family:var(--np-font-display)] font-extrabold tracking-[-0.01em]">
                <TriangleAlert className="h-5 w-5 shrink-0 np-text-danger" aria-hidden />
                Ela já tem assinatura ativa
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Nada foi cobrado. Confira antes de seguir.
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2" aria-label="Assinaturas encontradas">
              {aviso.encontradas.map((a, i) => (
                <li key={i} className="min-w-0 rounded-xl border border-[color:var(--np-border-glass)] bg-[color:var(--np-surface-inset)] p-3 space-y-1 text-sm">
                  <p className="font-semibold break-words">{a.nome || "Sem nome no cadastro"}</p>
                  <p>{a.plano}</p>
                  {a.desde && <p className="text-muted-foreground">Assinante desde {a.desde}</p>}
                  {a.bateu.length > 0 && <p className="text-muted-foreground">{mesmoDado(a.bateu)}</p>}
                  {a.atrasada && <p className="np-text-danger">Pagamento atrasado</p>}
                </li>
              ))}
            </ul>
            <p className="font-semibold">Vender mais um pacote?</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <NpButton variant="secondary" className="w-full sm:w-auto" loading={enviando} onClick={() => enviar(aviso.confirmacao)}>
                Sim, vender mais um pacote
              </NpButton>
              <NpButton variant="primary" className="w-full sm:w-auto" disabled={enviando} onClick={cancelarVenda}>
                Não, cancelar a venda
              </NpButton>
            </div>
          </>
        ) : (
        <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-[family:var(--np-font-display)] font-extrabold tracking-[-0.01em]">
            <Crown className="h-5 w-5 text-primary" aria-hidden />
            Vender Clube da Escova
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
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
                aria-pressed={plano === p.id}
                className={`min-h-[56px] border rounded-lg p-2.5 text-left text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  plano === p.id
                    ? "border-primary bg-[color:var(--np-accent-soft)] ring-1 ring-primary"
                    : "border-border hover:border-[color:var(--np-accent-border)]"
                }`}
              >
                <p className="text-sm font-medium leading-tight">{p.rotulo}</p>
                <p className="text-base font-bold tabular-nums font-[family:var(--np-font-display)] text-[color:var(--np-accent-text)]">{p.valor}/mês</p>
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

          <div className="border-t border-border pt-3 space-y-3">
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
            <Button type="button" variant="outline" onClick={fechar} disabled={enviando} className="min-h-[44px] border-border text-foreground">
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando} className="min-h-[44px] bg-primary text-primary-foreground font-semibold hover:bg-[color:var(--np-accent-hover)]">
              {enviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {enviando ? "Processando…" : "Ativar assinatura"}
            </Button>
          </DialogFooter>
        </form>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
