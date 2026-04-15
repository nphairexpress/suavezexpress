import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function SetupDoneStep() {
  const handleLogin = () => {
    window.location.href = "/auth";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-6 w-6" />
          Instalação Concluída!
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-lg">🎉 Seu sistema está pronto para uso!</p>
        <p className="text-muted-foreground text-sm">
          O banco de dados foi configurado com sucesso. Clique no botão abaixo para acessar o sistema com as credenciais do usuário master que você acabou de criar.
        </p>
        <Button onClick={handleLogin} size="lg" className="gap-2 mt-4">
          Acessar o Sistema
        </Button>
      </CardContent>
    </Card>
  );
}
