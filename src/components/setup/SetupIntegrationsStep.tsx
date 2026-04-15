import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, ArrowRight, ArrowLeft, ExternalLink } from "lucide-react";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function SetupIntegrationsStep({ data, updateData, onNext, onBack }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Integrações
        </CardTitle>
        <CardDescription>Configure as integrações de e-mail (opcional — pode fazer depois)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 rounded-lg border p-4">
          <h3 className="font-semibold flex items-center gap-2">📧 Resend (E-mails automáticos)</h3>
          <div className="space-y-2">
            <Label>API Key do Resend</Label>
            <Input
              type="password"
              value={data.resendKey}
              onChange={(e) => updateData({ resendKey: e.target.value })}
              placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">📋 Passo a passo:</p>
            <p>
              1. Acesse{" "}
              <a href="https://resend.com/signup" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">
                resend.com <ExternalLink className="h-3 w-3" />
              </a>{" "}
              e crie uma conta gratuita
            </p>
            <p>2. No painel, vá em <strong>API Keys</strong> → <strong>Create API Key</strong></p>
            <p>3. Copie a chave gerada e cole acima</p>
          </div>
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={onNext} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
