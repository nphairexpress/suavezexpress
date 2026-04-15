import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAsaasPayment, getAsaasPaymentStatus } from "@/lib/asaas";
import type { AsaasPaymentResponse } from "@/lib/asaas";

interface AsaasCheckoutProps {
  salonId: string;
  customerName: string;
  customerCpf: string;
  customerPhone: string;
  customerEmail?: string;
  serviceName: string;
  servicePrice: number;
  queueEntryId: string;
  onPaymentConfirmed: (paymentId: string) => void;
  onError: (error: string) => void;
}

export function AsaasCheckout({
  salonId,
  customerName,
  customerCpf,
  customerPhone,
  customerEmail,
  serviceName,
  servicePrice,
  queueEntryId,
  onPaymentConfirmed,
  onError,
}: AsaasCheckoutProps) {
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<AsaasPaymentResponse | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function initPayment() {
      try {
        const result = await createAsaasPayment(salonId, {
          customerName,
          customerCpfCnpj: customerCpf.replace(/\D/g, ""),
          customerPhone,
          customerEmail,
          value: servicePrice,
          description: `NP Hair Express - ${serviceName}`,
          externalReference: queueEntryId,
        });
        setPayment(result);
      } catch (err) {
        onError(err instanceof Error ? err.message : "Erro ao criar pagamento");
      } finally {
        setLoading(false);
      }
    }
    initPayment();
  }, []);

  useEffect(() => {
    if (!payment?.id || confirmed) return;
    const interval = setInterval(async () => {
      try {
        const status = await getAsaasPaymentStatus(salonId, payment.id);
        if (status === "RECEIVED" || status === "CONFIRMED") {
          setConfirmed(true);
          onPaymentConfirmed(payment.id);
          clearInterval(interval);
        }
      } catch { /* silently retry */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [payment?.id, confirmed]);

  const handleCopyPix = () => {
    if (payment?.pixQrCode?.payload) {
      navigator.clipboard.writeText(payment.pixQrCode.payload);
      setCopied(true);
      toast({ title: "Codigo PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Gerando pagamento...</p>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold">Pagamento confirmado!</p>
      </div>
    );
  }

  if (!payment?.pixQrCode) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erro ao gerar QR Code PIX.</p>
        <p className="text-sm text-muted-foreground mt-2">Tente novamente em alguns instantes.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <p className="text-lg font-semibold">
          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(servicePrice)}
        </p>
        <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o codigo PIX</p>
        <img
          src={`data:image/png;base64,${payment.pixQrCode.encodedImage}`}
          alt="QR Code PIX"
          className="w-56 h-56"
        />
        <Button variant="outline" onClick={handleCopyPix} className="w-full">
          {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copiado!" : "Copiar codigo PIX"}
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Aguardando pagamento...
        </div>
      </CardContent>
    </Card>
  );
}
