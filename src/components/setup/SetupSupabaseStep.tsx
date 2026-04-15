// @ts-nocheck
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, ArrowRight, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SETUP_SCHEMA_SQL } from "@/lib/setupSchemaSQL";
import { waitForExternalSchema } from "@/components/setup/setupSupabaseHelpers";
import type { SetupData } from "@/pages/SetupWizard";

interface Props {
  data: SetupData;
  updateData: (d: Partial<SetupData>) => void;
  onNext: () => void;
}

function extractProjectRef(url: string): string {
  try { return new URL(url).hostname.split(".")[0]; } catch { return ""; }
}

/** Split SQL into individual statements, preserving $$ function blocks */
function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  const lines = sql.split("\n");
  let current: string[] = [];
  let inDollar = false;

  for (const line of lines) {
    const stripped = line.trim();
    if ((stripped.startsWith("--") || stripped === "") && current.length === 0) continue;
    current.push(line);
    const dollarCount = (line.match(/\$\$/g) || []).length;
    if (dollarCount % 2 === 1) inDollar = !inDollar;
    if (!inDollar && stripped.endsWith(";")) {
      const stmtLines = current.filter(l => !l.trim().startsWith("--"));
      const stmt = stmtLines.join("\n").trim();
      if (stmt) statements.push(stmt);
      current = [];
    }
  }
  return statements;
}

/**
 * Create schema via server-side proxy (/api/run-sql)
 * This avoids CORS issues with the Supabase Management API
 */
async function createSchemaViaProxy(
  projectRef: string,
  pat: string,
  onProgress?: (msg: string, current: number, total: number) => void,
): Promise<void> {
  const statements = splitStatements(SETUP_SCHEMA_SQL);
  const total = statements.length;

  // Send in batches of 20 to show progress
  const batchSize = 20;
  let globalOk = 0;
  let globalErrors: string[] = [];

  for (let start = 0; start < total; start += batchSize) {
    const batch = statements.slice(start, start + batchSize);
    const batchEnd = Math.min(start + batchSize, total);
    onProgress?.(`🔧 Criando estrutura... (${batchEnd}/${total})`, batchEnd, total);

    const res = await fetch("/api/run-sql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectRef, pat, statements: batch }),
    });

    if (!res.ok) {
      throw new Error(`Erro no servidor: ${res.status}`);
    }

    const result = await res.json();
    globalOk += result.ok + result.skipped;

    if (result.errors > 0 && result.details) {
      for (const d of result.details) {
        console.error(`[Schema] Erro:`, d.error);
        globalErrors.push(d.error);
      }
    }
  }

  if (globalErrors.length > 5) {
    throw new Error(`${globalErrors.length} erro(s) ao criar o banco. Verifique o console para detalhes.`);
  }
}

export default function SetupSupabaseStep({ data, updateData, onNext }: Props) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [connected, setConnected] = useState(false);

  const handleTestConnection = async () => {
    if (!data.supabaseUrl.trim() || !data.supabaseAnonKey.trim() || !data.supabaseServiceRoleKey.trim()) {
      toast({ title: "Preencha URL, Anon Key e Service Role Key", variant: "destructive" });
      return;
    }
    setTesting(true);
    setConnected(false);
    setProgress(null);
    setStatusMsg("🔌 Testando conexão...");
    try {
      const client = createClient(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: authError } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (authError) throw new Error("Credenciais inválidas: " + authError.message);

      setStatusMsg("🔍 Verificando banco de dados...");
      const { data: schemaData, error: schemaError } = await client.from("salons").select("id").limit(1);
      const schemaMissing = schemaError != null;

      if (schemaMissing) {
        if (!data.supabasePat.trim()) {
          toast({ title: "Banco novo detectado", description: "Adicione o Personal Access Token para criar as tabelas automaticamente.", variant: "destructive" });
          setStatusMsg("⚠️ Banco novo — adicione o PAT para criar as tabelas");
          setTesting(false);
          return;
        }
        await createSchemaViaProxy(
          extractProjectRef(data.supabaseUrl.trim()),
          data.supabasePat.trim(),
          (msg, current, total) => { setStatusMsg(msg); setProgress({ current, total }); }
        );
        setStatusMsg("⏳ Finalizando configuração...");
        setProgress(null);
        const schemaResult = await waitForExternalSchema(data.supabaseUrl.trim(), data.supabaseServiceRoleKey.trim(), 15, 2000);
        if (schemaResult.status !== "success") {
          throw new Error("Tabelas foram criadas mas ainda não estão acessíveis. Aguarde alguns segundos e clique em 'Testar Conexão' novamente.");
        }
        toast({ title: "✅ Tabelas criadas com sucesso!" });
      }

      setConnected(true);
      setProgress(null);
      setStatusMsg("✅ Banco de dados pronto!");
      toast({ title: "✅ Banco de dados configurado!" });
    } catch (err: any) {
      toast({ title: "Erro na conexão", description: err.message, variant: "destructive" });
      setStatusMsg("");
      setProgress(null);
      setConnected(false);
    } finally {
      setTesting(false);
    }
  };

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Configurar Banco de Dados</CardTitle>
        <CardDescription>Conecte ao Supabase. As tabelas são criadas automaticamente se o banco for novo.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Supabase URL *</Label>
            <Input value={data.supabaseUrl} onChange={(e) => { updateData({ supabaseUrl: e.target.value }); setConnected(false); }} placeholder="https://xxxxx.supabase.co" />
          </div>
          <div className="space-y-2">
            <Label>Anon Key *</Label>
            <Input type="password" value={data.supabaseAnonKey} onChange={(e) => { updateData({ supabaseAnonKey: e.target.value }); setConnected(false); }} placeholder="eyJhbGciOiJIUz..." />
          </div>
          <div className="space-y-2">
            <Label>Service Role Key *</Label>
            <Input type="password" value={data.supabaseServiceRoleKey} onChange={(e) => { updateData({ supabaseServiceRoleKey: e.target.value }); setConnected(false); }} placeholder="eyJhbGciOiJIUz..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Personal Access Token — cria tabelas automaticamente em bancos novos</Label>
            <Input type="password" value={data.supabasePat} onChange={(e) => { updateData({ supabasePat: e.target.value }); setConnected(false); }} placeholder="sbp_xxxxxxxxxxxxxxxxxxxx" />
            <p className="text-xs text-muted-foreground">
              Só necessário se o banco for novo.{" "}
              <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">Gerar token <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">📋 Onde encontrar:</p>
          <p>Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-primary underline inline-flex items-center gap-1">supabase.com/dashboard <ExternalLink className="h-3 w-3" /></a> → Seu projeto → <strong>Settings → API</strong></p>
          <p>Copie <strong>Project URL</strong>, <strong>anon public</strong> e <strong>service_role</strong></p>
        </div>

        {/* Progress bar */}
        {progress && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2.5">
              <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground text-center">{progress.current} de {progress.total} — {progressPercent}%</p>
          </div>
        )}

        {statusMsg && (
          <div className={`flex items-center gap-2 text-sm ${connected ? "text-green-600" : "text-muted-foreground"}`}>
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : connected ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {statusMsg}
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {testing ? "Configurando..." : "Testar Conexão"}
          </Button>
          <Button onClick={() => { if (!connected) { toast({ title: "Teste a conexão antes de continuar", variant: "destructive" }); return; } onNext(); }} disabled={!connected} className="gap-2">
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
