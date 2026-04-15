import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, ArrowRight, ArrowLeft } from "lucide-react";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

export default function SetupSalonStep({ data, updateData, onNext, onBack }: Props) {
  const { toast } = useToast();

  const handleNext = () => {
    if (!data.salonName.trim()) {
      toast({ title: "Preencha o nome do salão", variant: "destructive" });
      return;
    }
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Dados do Salão
        </CardTitle>
        <CardDescription>Preencha as informações do seu estabelecimento</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Razão Social *</Label>
            <Input value={data.salonName} onChange={(e) => updateData({ salonName: e.target.value })} placeholder="Ex: NP Hair Studio LTDA" />
          </div>
          <div className="space-y-2">
            <Label>Nome Fantasia</Label>
            <Input value={data.tradeName} onChange={(e) => updateData({ tradeName: e.target.value })} placeholder="Ex: NP Hair Studio" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={data.salonCnpj} onChange={(e) => updateData({ salonCnpj: e.target.value })} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={data.salonPhone} onChange={(e) => updateData({ salonPhone: e.target.value })} placeholder="(11) 94068-1490" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>E-mail do Salão</Label>
            <Input value={data.salonEmail} onChange={(e) => updateData({ salonEmail: e.target.value })} placeholder="contato@seusalao.com.br" />
          </div>
        </div>
        <div className="flex justify-between">
          {onBack ? (
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          ) : <div />}
          <Button onClick={handleNext} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
