// Troca da senha de autorização de estorno/cancelamento do Clube (só administrador).
// A edge `clube-estorno` confere a senha atual e grava só o hash; nada fica salvo no navegador.
import { useState } from "react";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@/components/settings/settingsUi";
import { Button, PasswordInput } from "@design-system";
import { AlertTriangle, KeyRound } from "lucide-react";

const MINIMO = 8;

export function SenhaEstornoSection() {
  const { toast } = useToast();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const diferentes = confirma.length > 0 && nova !== confirma;
  const pronto = atual.length > 0 && nova.length >= MINIMO && nova === confirma && !enviando;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!pronto) return;
    setEnviando(true);
    setErro(null);
    try {
      const { data, error } = await supabase.functions.invoke("clube-estorno", {
        body: { acao: "trocar_senha", senha_atual: atual, senha_nova: nova },
      });
      if (error) {
        let msg = "Não foi possível trocar a senha.";
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.erro) msg = String(body.erro);
        } catch {
          /* sem corpo */
        }
        throw new Error(msg);
      }
      if (!data?.ok) throw new Error(data?.erro ?? "Não foi possível trocar a senha.");
      toast({ title: "Senha de autorização trocada", description: "Vale a partir de agora para estornos e cancelamentos." });
      setNova("");
      setConfirma("");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível trocar a senha.");
    } finally {
      setAtual("");
      setEnviando(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 shrink-0 text-primary" /> Senha de estorno do Clube
        </CardTitle>
        <CardDescription>
          Pedida em todo estorno de cobrança e cancelamento de assinatura do Clube. Cinco senhas erradas em 15 minutos
          bloqueiam a pessoa por 15 minutos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={salvar} className="grid gap-4 sm:max-w-md" autoComplete="off">
          <PasswordInput
            label="Senha atual"
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            disabled={enviando}
          />
          <PasswordInput
            label="Senha nova"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            autoComplete="new-password"
            hint={`Pelo menos ${MINIMO} caracteres.`}
            data-lpignore="true"
            disabled={enviando}
          />
          <PasswordInput
            label="Confirmar senha nova"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            autoComplete="new-password"
            error={diferentes ? "As duas senhas novas não batem." : undefined}
            data-lpignore="true"
            disabled={enviando}
          />
          {erro && (
            <Notice tone="danger" icon={AlertTriangle} title="Senha não trocada">
              {erro}
            </Notice>
          )}
          <div>
            <Button type="submit" loading={enviando} disabled={!pronto} className="w-full sm:w-auto">
              Trocar senha
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
