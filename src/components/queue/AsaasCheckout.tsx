import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Copy, CheckCircle, QrCode, CreditCard, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createAsaasPayment, createAsaasCardPayment, getAsaasPaymentStatus } from "@/lib/asaas";
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

type PaymentMethod = "choose" | "pix" | "card";

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
  const [method, setMethod] = useState<PaymentMethod>("choose");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<AsaasPaymentResponse | null>(null);
  const [cardPaymentId, setCardPaymentId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardCep, setCardCep] = useState("");
  const [cardAddressNumber, setCardAddressNumber] = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);

  const fmt = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleSelectPix = async () => {
    setMethod("pix");
    if (!payment) {
      setLoading(true);
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
  };

  const handleCardSubmit = async () => {
    if (!cardNumber || !cardHolder || !cardExpiry || !cardCcv || !cardCep || !cardAddressNumber) {
      toast({ title: "Preencha todos os campos do cartão", variant: "destructive" });
      return;
    }

    const expiryParts = cardExpiry.replace(/\D/g, "");
    if (expiryParts.length < 4) {
      toast({ title: "Validade inválida (MM/AA)", variant: "destructive" });
      return;
    }

    const month = expiryParts.slice(0, 2);
    const year = "20" + expiryParts.slice(2, 4);

    setCardProcessing(true);
    try {
      const result = await createAsaasCardPayment(salonId, {
        customerName,
        customerCpfCnpj: customerCpf.replace(/\D/g, ""),
        customerPhone,
        customerEmail,
        value: servicePrice,
        description: `NP Hair Express - ${serviceName}`,
        externalReference: queueEntryId,
        cardHolderName: cardHolder,
        cardNumber: cardNumber.replace(/\D/g, ""),
        cardExpiryMonth: month,
        cardExpiryYear: year,
        cardCcv,
        holderPostalCode: cardCep.replace(/\D/g, ""),
        holderAddressNumber: cardAddressNumber,
      });

      setCardPaymentId(result.id);

      if (result.status === "CONFIRMED" || result.status === "RECEIVED") {
        setConfirmed(true);
        onPaymentConfirmed(result.id);
      }
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Erro no pagamento com cartão", variant: "destructive" });
    } finally {
      setCardProcessing(false);
    }
  };

  // Poll for payment confirmation (PIX or card)
  const activePaymentId = payment?.id || cardPaymentId;
  useEffect(() => {
    if (!activePaymentId || confirmed) return;
    const interval = setInterval(async () => {
      try {
        const status = await getAsaasPaymentStatus(salonId, activePaymentId);
        if (status === "RECEIVED" || status === "CONFIRMED") {
          setConfirmed(true);
          onPaymentConfirmed(activePaymentId);
          clearInterval(interval);
        }
      } catch { /* silently retry */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [activePaymentId, confirmed]);

  const handleCopyPix = () => {
    if (payment?.pixQrCode?.payload) {
      navigator.clipboard.writeText(payment.pixQrCode.payload);
      setCopied(true);
      toast({ title: "Código PIX copiado!" });
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <p className="text-lg font-semibold">Pagamento confirmado!</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Gerando pagamento...</p>
      </div>
    );
  }

  // Step 1: Choose payment method
  if (method === "choose") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6">
          <p className="text-lg font-semibold">{fmt(servicePrice)}</p>
          <p className="text-sm text-muted-foreground">Como deseja pagar?</p>

          <Button className="w-full h-14 text-base" onClick={handleSelectPix}>
            <QrCode className="h-5 w-5 mr-3" />
            PIX
          </Button>

          <Button variant="outline" className="w-full h-14 text-base" onClick={() => setMethod("card")}>
            <CreditCard className="h-5 w-5 mr-3" />
            Cartão de Crédito
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Step 2a: PIX payment
  if (method === "pix") {
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
          <p className="text-lg font-semibold">{fmt(servicePrice)}</p>
          <p className="text-sm text-muted-foreground">Escaneie o QR Code ou copie o código PIX</p>
          <img
            src={`data:image/png;base64,${payment.pixQrCode.encodedImage}`}
            alt="QR Code PIX"
            className="w-56 h-56"
          />
          <Button variant="outline" onClick={handleCopyPix} className="w-full">
            {copied ? <CheckCircle className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? "Copiado!" : "Copiar código PIX"}
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando pagamento...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2b: Card payment form
  if (method === "card") {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => setMethod("choose")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <p className="text-lg font-semibold">{fmt(servicePrice)}</p>
          </div>

          <div>
            <Label>Número do cartão</Label>
            <Input
              placeholder="0000 0000 0000 0000"
              inputMode="numeric"
              autoComplete="cc-number"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            />
          </div>

          <div>
            <Label>Nome no cartão</Label>
            <Input
              placeholder="Como está no cartão"
              autoComplete="cc-name"
              value={cardHolder}
              onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Validade</Label>
              <Input
                placeholder="MM/AA"
                inputMode="numeric"
                autoComplete="cc-exp"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
              />
            </div>
            <div>
              <Label>CVV</Label>
              <Input
                placeholder="123"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={cardCcv}
                onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>CEP</Label>
              <Input
                placeholder="00000-000"
                inputMode="numeric"
                autoComplete="postal-code"
                value={cardCep}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                  setCardCep(v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v);
                }}
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                placeholder="Nº endereço"
                inputMode="numeric"
                value={cardAddressNumber}
                onChange={(e) => setCardAddressNumber(e.target.value)}
              />
            </div>
          </div>

          <Button className="w-full h-12" onClick={handleCardSubmit} disabled={cardProcessing}>
            {cardProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Pagar {fmt(servicePrice)}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Pagamento processado com segurança via Asaas
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
