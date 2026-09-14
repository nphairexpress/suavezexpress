import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useQueueSettings } from "@/hooks/useQueueSettings";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useToast } from "@/hooks/use-toast";

export function QueueSettingsSection() {
  const { settings, isLoading, updateSettings, isSaving } = useQueueSettings();
  const { toast } = useToast();

  const [inflationFactor, setInflationFactor] = useState("1.70");
  const [creditDays, setCreditDays] = useState("30");
  const [notifyOptions, setNotifyOptions] = useState("20, 40, 60, 90");
  const [receptionEmail, setReceptionEmail] = useState("");
  const [zapiInstanceId, setZapiInstanceId] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiClientToken, setZapiClientToken] = useState("");
  const [asaasApiKey, setAsaasApiKey] = useState("");
  const [cashbackEnabled, setCashbackEnabled] = useState(true);
  const [cashbackPercent, setCashbackPercent] = useState("3");
  const [cashbackValidityDays, setCashbackValidityDays] = useState("15");
  const [cashbackMinPurchase, setCashbackMinPurchase] = useState("100");
  const [openWeekdays, setOpenWeekdays] = useState<number[]>([2, 3, 4, 5, 6]);
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("18:00");
  const [closedDates, setClosedDates] = useState("");
  const [queuePaused, setQueuePaused] = useState(false);

  useEffect(() => {
    if (settings) {
      setInflationFactor(String(settings.inflation_factor));
      setCreditDays(String(settings.credit_validity_days));
      setNotifyOptions(settings.notify_options.join(", "));
      setReceptionEmail(settings.reception_email || "");
      setZapiInstanceId(settings.zapi_instance_id || "");
      setZapiToken(settings.zapi_token || "");
      setZapiClientToken(settings.zapi_client_token || "");
      setAsaasApiKey(settings.asaas_api_key || "");
      setOpenWeekdays(settings.open_weekdays ?? [2, 3, 4, 5, 6]);
      setOpenTime((settings.open_time || "08:00").slice(0, 5));
      setCloseTime((settings.close_time || "18:00").slice(0, 5));
      setClosedDates((settings.closed_dates ?? []).join(", "));
      setQueuePaused(!!settings.queue_paused);
    }

    // Load all cashback configs from system_config
    supabase
      .from("system_config")
      .select("key, value")
      .in("key", ["cashback_enabled", "cashback_percent", "cashback_validity_days", "cashback_min_purchase"])
      .then(({ data }) => {
        if (!data) return;
        for (const row of data) {
          if (row.key === "cashback_enabled") setCashbackEnabled(row.value !== "false");
          else if (row.key === "cashback_percent" && row.value) setCashbackPercent(row.value);
          else if (row.key === "cashback_validity_days" && row.value) setCashbackValidityDays(row.value);
          else if (row.key === "cashback_min_purchase" && row.value) setCashbackMinPurchase(row.value);
        }
      });
  }, [settings]);

  const handleSave = async () => {
    const parsedOptions = notifyOptions.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    updateSettings({
      inflation_factor: parseFloat(inflationFactor) || 1.7,
      credit_validity_days: parseInt(creditDays) || 30,
      notify_options: parsedOptions.length > 0 ? parsedOptions : [20, 40, 60, 90],
      reception_email: receptionEmail || null,
      zapi_instance_id: zapiInstanceId || null,
      zapi_token: zapiToken || null,
      zapi_client_token: zapiClientToken || null,
      asaas_api_key: asaasApiKey || null,
      open_weekdays: openWeekdays,
      open_time: openTime,
      close_time: closeTime,
      closed_dates: closedDates.split(",").map((d) => d.trim()).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
      queue_paused: queuePaused,
    });

    // Save all cashback configs
    await supabase
      .from("system_config")
      .upsert(
        [
          { key: "cashback_enabled", value: cashbackEnabled ? "true" : "false" },
          { key: "cashback_percent", value: cashbackPercent },
          { key: "cashback_validity_days", value: cashbackValidityDays },
          { key: "cashback_min_purchase", value: cashbackMinPurchase },
        ],
        { onConflict: "key" }
      );
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
            <Label>Validade do credito no-show (dias)</Label>
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
        <CardHeader><CardTitle>Horario da fila online</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Fora desse horario a cliente nao consegue pagar a fila. Isso evita venda em dia de porta fechada.
          </p>
          <div>
            <Label>Dias em que a fila abre</Label>
            <div className="flex gap-1 mt-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((nome, dow) => {
                const ativo = openWeekdays.includes(dow);
                return (
                  <Button key={dow} type="button" size="sm" variant={ativo ? "default" : "outline"}
                    onClick={() => setOpenWeekdays((prev) => ativo ? prev.filter((d) => d !== dow) : [...prev, dow].sort())}>
                    {nome}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Abre as</Label><Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} /></div>
            <div><Label>Fecha as</Label><Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} /></div>
          </div>
          <div>
            <Label>Datas fechadas (feriado, emenda)</Label>
            <Input value={closedDates} onChange={(e) => setClosedDates(e.target.value)} placeholder="2026-12-25, 2026-12-31" />
            <p className="text-xs text-muted-foreground mt-1">No formato ANO-MES-DIA, separadas por virgula</p>
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="space-y-0.5">
              <Label>Fechar a fila agora</Label>
              <p className="text-xs text-muted-foreground">Trava imediata, independente do horario. Lembre de desligar depois.</p>
            </div>
            <Switch checked={queuePaused} onCheckedChange={setQueuePaused} />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Cashback</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Cashback ativo</Label>
              <p className="text-xs text-muted-foreground">Quando desligado, a opcao some do fechamento da comanda</p>
            </div>
            <Switch checked={cashbackEnabled} onCheckedChange={setCashbackEnabled} />
          </div>
          <div>
            <Label>Porcentagem padrao (%)</Label>
            <Input type="number" step="0.5" min="0" max="50" value={cashbackPercent} onChange={(e) => setCashbackPercent(e.target.value)} disabled={!cashbackEnabled} />
            <p className="text-xs text-muted-foreground mt-1">Profissional pode sobrescrever no momento do fechamento da comanda</p>
          </div>
          <div>
            <Label>Validade do credito (dias)</Label>
            <Input type="number" min="1" max="365" value={cashbackValidityDays} onChange={(e) => setCashbackValidityDays(e.target.value)} disabled={!cashbackEnabled} />
          </div>
          <div>
            <Label>Compra minima para usar o credito (R$)</Label>
            <Input type="number" step="1" min="0" value={cashbackMinPurchase} onChange={(e) => setCashbackMinPurchase(e.target.value)} disabled={!cashbackEnabled} />
            <p className="text-xs text-muted-foreground mt-1">Cliente so pode usar o cashback em uma compra futura acima desse valor</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Integracoes</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Asaas API Key</Label><Input type="password" value={asaasApiKey} onChange={(e) => setAsaasApiKey(e.target.value)} placeholder="$aact_..." /></div>
          <div><Label>Z-API Instance ID</Label><Input value={zapiInstanceId} onChange={(e) => setZapiInstanceId(e.target.value)} placeholder="Instance ID" /></div>
          <div><Label>Z-API Token</Label><Input type="password" value={zapiToken} onChange={(e) => setZapiToken(e.target.value)} placeholder="Token" /></div>
          <div><Label>Z-API Client Token</Label><Input type="password" value={zapiClientToken} onChange={(e) => setZapiClientToken(e.target.value)} placeholder="Client Token" /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar configuracoes"}</Button>
    </div>
  );
}
