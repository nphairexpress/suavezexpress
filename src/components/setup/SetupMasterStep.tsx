// @ts-nocheck
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, ArrowRight, ArrowLeft, Loader2, CheckCircle2, Rocket, ExternalLink } from "lucide-react";
import { saveExternalCredentials } from "@/lib/dynamicSupabaseClient";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
  onBack: () => void;
  isInstaller?: boolean;
}

// ── Vercel helpers ──────────────────────────────────────────

async function upsertVercelEnv(token: string, projectId: string, key: string, value: string) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const target = ["production", "preview", "development"];
  const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
    method: "POST",
    headers,
    body: JSON.stringify({ key, value, target, type: "plain" }),
  });
  if (res.ok) return;
  const body = await res.json().catch(() => ({}));
  if (body?.error?.code === "ENV_ALREADY_EXISTS") {
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, { headers });
    const listData = await listRes.json();
    const existing = listData?.envs?.find((e: any) => e.key === key);
    if (existing) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${existing.id}`, {
        method: "PATCH", headers,
        body: JSON.stringify({ value, target, type: "plain" }),
      });
    }
  }
}

async function triggerVercelRedeploy(token: string, projectId: string): Promise<string> {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const listRes = await fetch(`https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&state=READY`, { headers });
  if (!listRes.ok) throw new Error("Não foi possível listar deployments da Vercel.");
  const listData = await listRes.json();
  const latest = listData?.deployments?.[0];
  if (!latest) throw new Error("Nenhum deployment encontrado. Faça um deploy inicial na Vercel primeiro.");
  const redeployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
    method: "POST", headers,
    body: JSON.stringify({ name: latest.name, deploymentId: latest.uid, target: "production" }),
  });
  if (!redeployRes.ok) {
    const err = await redeployRes.json().catch(() => ({}));
    throw new Error(`Redeploy falhou: ${err?.error?.message || redeployRes.status}`);
  }
  const deployData = await redeployRes.json();
  return deployData?.uid || "";
}

async function waitVercelDeploy(token: string, deploymentId: string, onStatus: (s: string) => void): Promise<void> {
  const headers = { Authorization: `Bearer ${token}` };
  const maxAttempts = 60; // 5 min
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, { headers });
    if (!res.ok) continue;
    const data = await res.json();
    const state = data?.status || data?.readyState;
    onStatus(`🚀 Deploy em andamento... (${state})`);
    if (state === "READY") return;
    if (state === "ERROR" || state === "CANCELED") throw new Error(`Deploy falhou com status: ${state}`);
  }
  throw new Error("Timeout aguardando deploy. Verifique o painel da Vercel.");
}

// ── Component ────────────────────────────────────────────────

export default function SetupMasterStep({ data, updateData, onNext, onBack, isInstaller }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  const handleNext = async () => {
    if (!data.masterName.trim() || !data.masterEmail.trim() || !data.masterPassword.trim()) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    if (data.masterPassword.length < 8) {
      toast({ title: "A senha deve ter pelo menos 8 caracteres", variant: "destructive" });
      return;
    }

    if (!isInstaller || !data.supabaseUrl || !data.supabaseServiceRoleKey) {
      onNext();
      return;
    }

    setLoading(true);
    try {
      const extClient = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // ── Criar usuário master ──
      setStatusMsg("👤 Criando usuário master...");
      let userId: string;
      const { data: userList } = await extClient.auth.admin.listUsers();
      const existingUser = userList?.users?.find((u: any) => u.email === data.masterEmail);
      if (existingUser) {
        userId = existingUser.id;
        await extClient.auth.admin.updateUserById(userId, { password: data.masterPassword });
      } else {
        const { data: newUser, error: userError } = await extClient.auth.admin.createUser({
          email: data.masterEmail, password: data.masterPassword,
          email_confirm: true, user_metadata: { full_name: data.masterName },
        });
        if (userError || !newUser?.user) throw userError || new Error("Erro ao criar usuário");
        userId = newUser.user.id;
      }

      // ── Criar salão ──
      setStatusMsg("🏪 Criando salão...");
      let salonId: string;
      const { data: existingSalon } = await extClient.from("salons").select("id").limit(1).maybeSingle();
      if (existingSalon?.id) {
        salonId = existingSalon.id;
        await extClient.from("salons").update({ name: data.salonName, trade_name: data.tradeName || data.salonName, phone: data.salonPhone || null, email: data.salonEmail || null, cnpj: data.salonCnpj || null }).eq("id", salonId);
      } else {
        const { data: newSalon, error: salonError } = await extClient.from("salons").insert({ name: data.salonName, trade_name: data.tradeName || data.salonName, phone: data.salonPhone || null, email: data.salonEmail || null, cnpj: data.salonCnpj || null }).select("id").single();
        if (salonError || !newSalon?.id) throw salonError || new Error("Erro ao criar salão");
        salonId = newSalon.id;
      }

      // ── Perfil e role ──
      setStatusMsg("📋 Configurando perfil...");
      const { data: existingProfile } = await extClient.from("profiles").select("id").eq("user_id", userId).maybeSingle();
      if (!existingProfile) await extClient.from("profiles").insert({ user_id: userId, salon_id: salonId, full_name: data.masterName });
      const { data: existingRole } = await extClient.from("user_roles").select("id").eq("user_id", userId).maybeSingle();
      if (!existingRole) await extClient.from("user_roles").insert({ user_id: userId, salon_id: salonId, role: "admin" });

      // ── System config ──
      setStatusMsg("⚙️ Salvando configurações...");
      await extClient.from("system_config").upsert({ key: "master_user_email", value: data.masterEmail }, { onConflict: "key" });

      // ── Níveis de acesso ──
      setStatusMsg("🔐 Criando níveis de acesso...");
      const levels = [
        { name: "Administrador", system_key: "admin", is_system: true, color: "#22c55e", description: "Acesso total" },
        { name: "Gerente", system_key: "manager", is_system: true, color: "#3b82f6", description: "Gestão operacional" },
        { name: "Recepcionista", system_key: "receptionist", is_system: true, color: "#f59e0b", description: "Atendimento e agenda" },
        { name: "Financeiro", system_key: "financial", is_system: true, color: "#8b5cf6", description: "Acesso financeiro" },
        { name: "Profissional", system_key: "professional", is_system: true, color: "#ec4899", description: "Apenas sua agenda" },
      ];
      for (const level of levels) {
        const { data: existing } = await extClient.from("access_levels").select("id").eq("salon_id", salonId).eq("system_key", level.system_key).maybeSingle();
        if (!existing) await extClient.from("access_levels").insert({ ...level, salon_id: salonId });
      }
      const { data: existingSched } = await extClient.from("scheduling_settings").select("id").eq("salon_id", salonId).maybeSingle();
      if (!existingSched) await extClient.from("scheduling_settings").insert({ salon_id: salonId });
      const { data: existingComm } = await extClient.from("commission_settings").select("id").eq("salon_id", salonId).maybeSingle();
      if (!existingComm) await extClient.from("commission_settings").insert({ salon_id: salonId });

      // ── Salvar credenciais no browser ──
      saveExternalCredentials(data.supabaseUrl.trim(), data.supabaseAnonKey.trim());

      // ── Vercel: configurar env vars + desativar installer + redeploy ──
      if (data.vercelToken?.trim() && data.vercelProjectId?.trim()) {
        const projectRef = new URL(data.supabaseUrl.trim()).hostname.split(".")[0];
        setStatusMsg("⚙️ Configurando variáveis na Vercel...");
        const envVars = [
          { key: "VITE_SUPABASE_URL", value: data.supabaseUrl.trim() },
          { key: "VITE_SUPABASE_PUBLISHABLE_KEY", value: data.supabaseAnonKey.trim() },
          { key: "VITE_SUPABASE_PROJECT_ID", value: projectRef },
          { key: "VITE_INSTALLER_ENABLED", value: "false" },
        ];
        for (const env of envVars) await upsertVercelEnv(data.vercelToken.trim(), data.vercelProjectId.trim(), env.key, env.value);

        setStatusMsg("🚀 Iniciando redeploy na Vercel...");
        const deployId = await triggerVercelRedeploy(data.vercelToken.trim(), data.vercelProjectId.trim());

        if (deployId) {
          setStatusMsg("⏳ Aguardando deploy finalizar...");
          await waitVercelDeploy(data.vercelToken.trim(), deployId, setStatusMsg);
        }
      }

      toast({ title: "🎉 Instalação concluída!" });
      setStatusMsg("");
      onNext();
    } catch (err: any) {
      console.error("Installation error:", err);
      toast({ title: "Erro na instalação", description: err.message, variant: "destructive" });
      setStatusMsg("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Instalação do Sistema</CardTitle>
        <CardDescription>Crie o usuário master e configure a integração com a Vercel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master user */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold">👤 Usuário Master</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Nome Completo *</Label>
              <Input value={data.masterName} onChange={(e) => updateData({ masterName: e.target.value })} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label>E-mail de Login *</Label>
              <Input type="email" value={data.masterEmail} onChange={(e) => updateData({ masterEmail: e.target.value })} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha *</Label>
              <Input type="password" value={data.masterPassword} onChange={(e) => updateData({ masterPassword: e.target.value })} placeholder="Mínimo 8 caracteres" />
            </div>
          </div>
          <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-700 dark:text-amber-400">
            ⚠️ <strong>Este é o único usuário com acesso total (Master).</strong> Não pode ser excluído.
          </div>
        </div>

        {/* Vercel */}
        <div className="space-y-4 rounded-lg border p-4">
          <h3 className="font-semibold flex items-center gap-2"><Rocket className="h-4 w-4" />Vercel — deploy automático <span className="text-xs font-normal text-muted-foreground">(opcional mas recomendado)</span></h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Token da Vercel</Label>
              <Input type="password" value={data.vercelToken} onChange={(e) => updateData({ vercelToken: e.target.value })} placeholder="vcp_xxxxxxxxxxxxxxxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label>Project ID ou Nome</Label>
              <Input value={data.vercelProjectId} onChange={(e) => updateData({ vercelProjectId: e.target.value })} placeholder="prj_xxx ou nome-do-projeto" />
            </div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p>Token: <a href="https://vercel.com/account/tokens" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">vercel.com/account/tokens <ExternalLink className="h-3 w-3" /></a></p>
            <p>Project ID: Painel Vercel → seu projeto → <strong>Settings → General</strong></p>
            <p className="text-foreground font-medium">O que acontece ao instalar com Vercel configurada:</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>Variáveis de ambiente configuradas automaticamente</li>
              <li>Wizard desativado permanentemente após o redeploy</li>
              <li>Sistema pronto para uso</li>
            </ol>
          </div>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {statusMsg}
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack} disabled={loading} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button onClick={handleNext} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {loading ? "Instalando..." : isInstaller ? "Instalar Sistema" : "Próximo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
