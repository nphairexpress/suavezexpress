import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/settings/settingsUi";
import { Button as NpButton } from "@design-system";
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
    const parsedInflation = parseFloat(inflationFactor);
    if (isNaN(parsedInflation) || parsedInflation < 0 || parsedInflation > 5) {
      toast({ title: "Fator de inflacao invalido", description: "Use um numero entre 0 e 5.", variant: "destructive" });
      return;
    }
    const parsedOptions = notifyOptions.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n));
    updateSettings({
      inflation_factor: parsedInflation,
      credit_validity_days: parseInt(creditDays) || 30,
      notify_options: parsedOptions.length > 0 ? parsedOptions : [20, 40, 60, 90],
      reception_email: receptionEmail || null,
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

  if (isLoading) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Fila Digital</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fator de inflacao da fila (para visitantes)</Label>
            <Input type="number" step="0.1" min="1" max="5" value={inflationFactor} onChange={(e) => setInflationFactor(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ex: 1.7 = fila real de 3 mostra 5 para visitantes</p>
          </div>
          <div className="space-y-2">
            <Label>Validade do credito no-show (dias)</Label>
            <Input type="number" min="1" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Opcoes de antecedencia (minutos, separados por virgula)</Label>
            <Input value={notifyOptions} onChange={(e) => setNotifyOptions(e.target.value)} placeholder="20, 40, 60, 90" />
          </div>
          <div className="space-y-2">
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
          <div className="space-y-2">
            <Label>Dias em que a fila abre</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].map((nome, dow) => {
                const ativo = openWeekdays.includes(dow);
                return (
                  <Button key={dow} type="button" size="sm" variant={ativo ? "default" : "outline"} aria-pressed={ativo}
                    className="h-11 min-w-[52px]"
                    onClick={() => setOpenWeekdays((prev) => ativo ? prev.filter((d) => d !== dow) : [...prev, dow].sort())}>
                    {nome}
                  </Button>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Abre as</Label><Input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} /></div>
            <div className="space-y-2"><Label>Fecha as</Label><Input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} /></div>
          </div>
          <div className="space-y-2">
            <Label>Datas fechadas (feriado, emenda)</Label>
            <Input value={closedDates} onChange={(e) => setClosedDates(e.target.value)} placeholder="2026-12-25, 2026-12-31" />
            <p className="text-xs text-muted-foreground">No formato ANO-MES-DIA, separadas por virgula</p>
          </div>
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
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
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label>Cashback ativo</Label>
              <p className="text-xs text-muted-foreground">Quando desligado, a opcao some do fechamento da comanda</p>
            </div>
            <Switch checked={cashbackEnabled} onCheckedChange={setCashbackEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Porcentagem padrao (%)</Label>
            <Input type="number" step="0.5" min="0" max="50" value={cashbackPercent} onChange={(e) => setCashbackPercent(e.target.value)} disabled={!cashbackEnabled} />
            <p className="text-xs text-muted-foreground">Profissional pode sobrescrever no momento do fechamento da comanda</p>
          </div>
          <div className="space-y-2">
            <Label>Validade do credito (dias)</Label>
            <Input type="number" min="1" max="365" value={cashbackValidityDays} onChange={(e) => setCashbackValidityDays(e.target.value)} disabled={!cashbackEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Compra minima para usar o credito (R$)</Label>
            <Input type="number" step="1" min="0" value={cashbackMinPurchase} onChange={(e) => setCashbackMinPurchase(e.target.value)} disabled={!cashbackEnabled} />
            <p className="text-xs text-muted-foreground">Cliente so pode usar o cashback em uma compra futura acima desse valor</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Integracoes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Chaves de integração (Asaas, WhatsApp) são configuradas pelo suporte, não por esta tela.
          </p>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <NpButton onClick={handleSave} disabled={isSaving} loading={isSaving} className="w-full sm:w-auto">{isSaving ? "Salvando..." : "Salvar configuracoes"}</NpButton>
      </div>
    </div>
  );
}
