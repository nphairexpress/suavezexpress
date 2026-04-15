import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gift, Loader2 } from "lucide-react";
import { useClientPackages, ClientPackage } from "@/hooks/usePackages";

interface ClientPackagesTabProps {
  clientId: string;
  clientName: string;
}

export function ClientPackagesTab({ clientId, clientName }: ClientPackagesTabProps) {
  const { clientPackages, isLoading } = useClientPackages(clientId);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-600">Ativo</Badge>;
      case "completed":
        return <Badge variant="secondary">Concluído</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getServiceUsage = (cp: ClientPackage) => {
    const pkg = cp.package;
    if (!pkg?.package_items) return [];

    return pkg.package_items.map((item) => {
      const usedCount = (cp.usage || []).filter((u) => u.service_id === item.service_id).length;
      return {
        service_id: item.service_id,
        service_name: item.service?.name || "Serviço",
        total: item.quantity,
        used: usedCount,
        remaining: item.quantity - usedCount,
      };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pacotes de {clientName}</h3>
        <p className="text-xs text-muted-foreground">Pacotes são vendidos e utilizados pela comanda</p>
      </div>

      {clientPackages.length === 0 ? (
        <Card className="flex items-center justify-center py-8">
          <div className="text-center text-muted-foreground">
            <Gift className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>Nenhum pacote adquirido</p>
            <p className="text-xs mt-1">Para vender um pacote, adicione-o na comanda do cliente</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {clientPackages.map((cp) => {
            const serviceUsage = getServiceUsage(cp);
            const allCompleted = serviceUsage.every((s) => s.remaining <= 0);

            return (
              <Card key={cp.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <CardTitle className="text-base">{cp.package?.name || "Pacote"}</CardTitle>
                      {getStatusBadge(allCompleted && cp.status === "active" ? "completed" : cp.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Pago: {formatCurrency(Number(cp.total_paid))}</span>
                    <span>Compra: {new Date(cp.purchase_date).toLocaleDateString("pt-BR")}</span>
                  </div>
                  {cp.notes && <p className="text-sm text-muted-foreground italic">{cp.notes}</p>}

                  {/* Service usage breakdown */}
                  <div className="space-y-2">
                    {serviceUsage.map((su) => {
                      const percent = su.total > 0 ? (su.used / su.total) * 100 : 0;
                      return (
                        <div key={su.service_id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span>{su.service_name}</span>
                            <span className="text-muted-foreground">
                              {su.used}/{su.total} usados ({su.remaining} restantes)
                            </span>
                          </div>
                          <Progress value={percent} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
