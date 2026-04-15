import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail, Eye, EyeOff, Save, Loader2, CheckCircle2, XCircle,
  ExternalLink, Send, AlertCircle, Info
} from "lucide-react";

export function ResendSettingsSection() {
  const { toast } = useToast();
  const { salonId, user } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchKey();
  }, []);

  const fetchKey = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "resend_api_key")
      .maybeSingle();
    if (data?.value) {
      setSavedKey(data.value);
      setApiKey(data.value);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      // Remove the key
      setSaving(true);
      const { error } = await supabase
        .from("system_config")
        .delete()
        .eq("key", "resend_api_key");
      if (error) {
        toast({ title: "Erro ao remover chave", description: error.message, variant: "destructive" });
      } else {
        setSavedKey(null);
        setApiKey("");
        toast({ title: "Chave removida", description: "A integração de e-mail foi desativada." });
      }
      setSaving(false);
      return;
    }

    if (!trimmed.startsWith("re_")) {
      toast({
        title: "Chave inválida",
        description: "A API Key do Resend deve começar com 're_'.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    // Use service_role key to bypass RLS
    const url = localStorage.getItem("supabase_url") || import.meta.env.VITE_SUPABASE_URL;
    const serviceKey = localStorage.getItem("supabase_service_role_key");

    let error = null;

    if (serviceKey && url) {
      // Direct REST call with service_role bypasses RLS
      try {
        const res = await fetch(`${url}/rest/v1/system_config`, {
          method: "POST",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify({ key: "resend_api_key", value: trimmed })
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          error = { message: errData.message || `Erro HTTP ${res.status}` };
        }
      } catch (e: any) {
        error = { message: e.message };
      }
    } else {
      // Fallback to regular supabase client
      const result = await supabase
        .from("system_config")
        .upsert({ key: "resend_api_key", value: trimmed }, { onConflict: "key" });
      error = result.error;
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setSavedKey(trimmed);
      toast({ title: "API Key salva com sucesso!", description: "Os e-mails automáticos estão ativados." });
    }
    setSaving(false);
  };

  const handleTest = async () => {
    if (!savedKey) {
      toast({ title: "Salve a chave primeiro", variant: "destructive" });
      return;
    }
    if (!user?.email) {
      toast({ title: "Erro", description: "Não foi possível identificar seu e-mail.", variant: "destructive" });
      return;
    }

    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "welcome",
          salon_id: salonId,
          to_email: user.email,
          to_name: user.user_metadata?.full_name || "Teste",
          variables: {},
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "E-mail de teste enviado!",
        description: `Verifique a caixa de entrada de ${user.email}`,
      });
    } catch (err: any) {
      const msg = err?.message || "Erro desconhecido";
      if (msg.includes("RESEND_API_KEY") || msg.includes("não configurada")) {
        toast({
          title: "Chave não detectada pelo servidor",
          description: "A chave foi salva no banco, mas a Edge Function ainda precisa lê-la. Verifique se a função foi atualizada.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Erro ao enviar e-mail de teste", description: msg, variant: "destructive" });
      }
    }
    setTesting(false);
  };

  const isConfigured = !!savedKey;
  const maskedKey = savedKey ? `re_${"•".repeat(20)}${savedKey.slice(-4)}` : "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card className={isConfigured
        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
        : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
      }>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            )}
            <div>
              <h4 className={`font-medium ${isConfigured
                ? "text-green-900 dark:text-green-100"
                : "text-amber-900 dark:text-amber-100"
              }`}>
                {isConfigured ? "E-mails automáticos ativados" : "E-mails automáticos desativados"}
              </h4>
              <p className={`text-sm mt-1 ${isConfigured
                ? "text-green-700 dark:text-green-300"
                : "text-amber-700 dark:text-amber-300"
              }`}>
                {isConfigured
                  ? "O sistema está enviando e-mails automáticos para seus clientes."
                  : "Configure a API Key do Resend abaixo para ativar o envio de e-mails automáticos. Essa configuração é opcional — o sistema funciona normalmente sem ela."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Key Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            API Key do Resend
          </CardTitle>
          <CardDescription>
            Chave de autenticação para o serviço de envio de e-mails transacionais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend-key">API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="resend-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={saving || (apiKey.trim() === (savedKey || ""))}
              className="gap-2"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
            {isConfigured && (
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testing}
                className="gap-2"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar e-mail de teste
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5" />
            Como configurar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full p-0 text-xs">1</Badge>
              <p>
                Crie uma conta gratuita em{" "}
                <a href="https://resend.com/signup" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                  resend.com <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full p-0 text-xs">2</Badge>
              <p>Compre um dominio personalizado (ex: seusalao.com.br) ou use um que ja possui</p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full p-0 text-xs">3</Badge>
              <p>
                No painel do Resend, va em{" "}
                <strong>Domains</strong> e conecte seu dominio (configurar registros DNS: MX, SPF, DKIM)
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full p-0 text-xs">4</Badge>
              <p>
                Va em <strong>API Keys</strong> → <strong>Create API Key</strong> e copie a chave gerada
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="h-6 w-6 shrink-0 flex items-center justify-center rounded-full p-0 text-xs">5</Badge>
              <p>Cole a chave no campo acima e clique em <strong>Salvar</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Emails List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            E-mails automaticos
          </CardTitle>
          <CardDescription>
            Ao configurar o Resend, os seguintes e-mails serao enviados automaticamente:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Boas-vindas ao novo cliente", desc: "Enviado ao cadastrar um novo cliente com e-mail" },
              { label: "Lembrete de retorno ao salao", desc: "Enviado quando o cliente nao retorna ha mais de 30 dias" },
              { label: "Parabens de aniversario", desc: "Enviado no dia do aniversario do cliente" },
              { label: "Aviso de cashback expirando", desc: "Enviado quando o cashback do cliente esta prestes a expirar" },
              { label: "Campanhas de marketing por e-mail", desc: "Envio manual de campanhas criadas pelo salao" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                {isConfigured ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
