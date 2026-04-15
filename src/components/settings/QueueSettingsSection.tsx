import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useQueueSettings } from "@/hooks/useQueueSettings";

export function QueueSettingsSection() {
  const { settings, isLoading, updateSettings, isSaving } = useQueueSettings();

  const [inflationFactor, setInflationFactor] = useState("1.70");
  const [creditDays, setCreditDays] = useState("30");
  const [notifyOptions, setNotifyOptions] = useState("20, 40, 60, 90");
  const [receptionEmail, setReceptionEmail] = useState("");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [asaasApiKey, setAsaasApiKey] = useState("");

  useEffect(() => {
    if (settings) {
      setInflationFactor(String(settings.inflation_factor));
      setCreditDays(String(settings.credit_validity_days));
      setNotifyOptions(settings.notify_options.join(", "));
      setReceptionEmail(settings.reception_email || "");
      setZapiInstanceId(settings.zapi_instance_id || "");
      setZapiToken(settings.zapi_token || "");
      setAsaasApiKey(settings.asaas_api_key || "");
    }
  }, [settings]);

  const handleSave = () => {
    const parsedOptions = notifyOptions.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    updateSettings({
      inflation_factor: parseFloat(inflationFactor) || 1.7,
      credit_validity_days: parseInt(creditDays) || 30,
      notify_options: parsedOptions.length > 0 ? parsedOptions : [20, 40, 60, 90],
      reception_email: receptionEmail || null,
      zapi_instance_id: zapiInstanceId || null,
      zapi_token: zapiToken || null,
      asaas_api_key: asaasApiKey || null,
    });
  };

  if (isLoading) return <p>Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Fila Digital</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Fator de inflacao da fila (para visitantes)</Label>
            <Input type="number" step="0.1" min="1" max="5" value={inflationFactor} onChange={(e) => setInflationFactor(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Ex: 1.7 = fila real de 3 mostra 5 para visitantes</p>
          </div>
          <div>
            <Label>Validade do credito (dias)</Label>
            <Input type="number" min="1" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} />
          </div>
          <div>
            <Label>Opcoes de antecedencia (minutos, separados por virgula)</Label>
            <Input value={notifyOptions} onChange={(e) => setNotifyOptions(e.target.value)} placeholder="20, 40, 60, 90" />
          </div>
          <div>
            <Label>E-mail da recepcao (para alertas de leads)</Label>
            <Input type="email" value={receptionEmail} onChange={(e) => setReceptionEmail(e.target.value)} placeholder="recepcao@nphairexpress.com" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Integracoes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Asaas API Key</Label><Input type="password" value={asaasApiKey} onChange={(e) => setAsaasApiKey(e.target.value)} placeholder="$aact_..." /></div>
          <div><Label>Z-API Instance ID</Label><Input value={zapiInstanceId} onChange={(e) => setZapiInstanceId(e.target.value)} placeholder="Instance ID" /></div>
          <div><Label>Z-API Token</Label><Input type="password" value={zapiToken} onChange={(e) => setZapiToken(e.target.value)} placeholder="Token" /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar configuracoes da fila"}</Button>
    </div>
  );
}
