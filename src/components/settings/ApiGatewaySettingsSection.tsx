import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Copy, RefreshCw, Eye, EyeOff, Check, Loader2, Globe, Download, ShieldCheck } from "lucide-react";

export function ApiGatewaySettingsSection() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-gateway`;

  useEffect(() => {
    fetchKey();
  }, []);

  const fetchKey = async () => {
    setLoading(true);
    const { data } = await supabase.from("system_config").select("value").eq("key", "api_gateway_key").maybeSingle();
    setApiKey(data?.value || null);
    setLoading(false);
  };

  const generateKey = async () => {
    setGenerating(true);
    const newKey = `api_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase.from("system_config").upsert({ key: "api_gateway_key", value: newKey }, { onConflict: "key" });
    if (error) {
      toast({ title: "Erro ao gerar chave", description: error.message, variant: "destructive" });
    } else {
      setApiKey(newKey);
      toast({ title: "Chave da API gerada com sucesso!" });
    }
    setGenerating(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: `${label} copiado!` });
    setTimeout(() => setCopied(null), 2000);
  };

  const generateDocumentation = () => {
    const doc = `# API REST Gateway - Sistema NP (Salão de Beleza)

## Visão Geral
API REST completa para integração com ERPs, agentes de IA, apps mobile e dashboards de BI.

## Autenticação
Todas as requisições devem incluir o header:
- **x-api-key:** ${apiKey || "<SUA_CHAVE_AQUI>"}
- **Content-Type:** application/json

## URL Base
${baseUrl}

## Paginação
Todos os endpoints de listagem suportam:
- \`?page=1\` (padrão: 1)
- \`?limit=50\` (padrão: 50, máximo: 100)

Resposta inclui: \`{ data: [...], total: 123, page: 1, limit: 50 }\`

---

## Endpoints

### 1. Clientes (/clients)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /clients | Lista clientes (filtros: ?name, ?phone, ?email, ?tag) |
| GET | /clients/:id | Detalhe de um cliente |
| POST | /clients | Criar cliente (obrigatório: name) |
| PUT/PATCH | /clients/:id | Atualizar cliente |
| DELETE | /clients/:id | Excluir cliente |

**Exemplo POST:**
\`\`\`json
{
  "name": "Maria Silva",
  "phone": "11999999999",
  "email": "maria@email.com",
  "tags": ["vip"]
}
\`\`\`

---

### 2. Serviços (/services)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /services | Lista serviços (?active=true, ?category=Cabelo) |
| GET | /services/:id | Detalhe |
| POST | /services | Criar serviço (obrigatório: name, price, duration_minutes) |
| PUT/PATCH | /services/:id | Atualizar |
| DELETE | /services/:id | Excluir |

---

### 3. Agendamentos (/appointments)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /appointments | Lista (?status, ?professional_id, ?date, ?from, ?to) |
| GET | /appointments/:id | Detalhe com dados do cliente, profissional e serviço |
| POST | /appointments | Criar (obrigatório: professional_id, scheduled_at) |
| PUT/PATCH | /appointments/:id | Atualizar (ex: mudar status) |
| DELETE | /appointments/:id | Excluir |

**Exemplo POST:**
\`\`\`json
{
  "client_id": "uuid",
  "professional_id": "uuid",
  "service_id": "uuid",
  "scheduled_at": "2026-03-20T14:00:00Z",
  "notes": "Observação"
}
\`\`\`
Se service_id for informado, duration_minutes e price são preenchidos automaticamente.

---

### 4. Profissionais (/professionals) — Somente leitura

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /professionals | Lista (?active=true) |
| GET | /professionals/:id | Detalhe |

---

### 5. Produtos (/products)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /products | Lista (?active=true, ?category, ?for_resale=true) |
| GET | /products/:id | Detalhe |
| POST | /products | Criar (obrigatório: name) |
| PUT/PATCH | /products/:id | Atualizar |
| DELETE | /products/:id | Excluir |

---

### 6. Comandas (/comandas) — Somente leitura

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /comandas | Lista (?paid=true/false, ?from, ?to) |
| GET | /comandas/:id | Detalhe com itens e pagamentos |

---

### 7. Financeiro (/financial)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /financial | Lista (?type=income/expense, ?from, ?to, ?category) |
| POST | /financial | Criar transação (obrigatório: description, amount, transaction_type) |

---

### 8. Créditos (/credits)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /credits | Lista (?client_id, ?used=false) |
| POST | /credits | Criar crédito (obrigatório: client_id, credit_amount) |

---

### 9. Horários Disponíveis (/slots) — Somente GET

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /slots?professional_id=uuid&date=2026-03-20 | Horários livres |

---

### 10. Info do Salão (/salon) — Somente GET

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /salon | Dados do salão |

---

## Códigos de Erro

| Status | Significado |
|--------|------------|
| 200 | Sucesso |
| 201 | Criado com sucesso |
| 400 | Parâmetros inválidos |
| 401 | Chave de API ausente |
| 403 | Chave de API inválida |
| 404 | Recurso não encontrado |
| 405 | Método não permitido |
| 500 | Erro interno |

## Exemplo cURL

\`\`\`bash
curl -X GET "${baseUrl}/clients?page=1&limit=10" \\
  -H "x-api-key: ${apiKey || "<SUA_CHAVE>"}" \\
  -H "Content-Type: application/json"
\`\`\`

\`\`\`bash
curl -X POST "${baseUrl}/clients" \\
  -H "x-api-key: ${apiKey || "<SUA_CHAVE>"}" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Maria Silva", "phone": "11999999999"}'
\`\`\`
`;

    const blob = new Blob([doc], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "api-rest-documentacao.md";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Documentação da API baixada com sucesso!" });
  };

  const resources = [
    { name: "clients", methods: "GET, POST, PUT, DELETE", desc: "CRUD completo de clientes" },
    { name: "services", methods: "GET, POST, PUT, DELETE", desc: "CRUD completo de serviços" },
    { name: "appointments", methods: "GET, POST, PUT, DELETE", desc: "CRUD completo de agendamentos" },
    { name: "professionals", methods: "GET", desc: "Consulta de profissionais (somente leitura)" },
    { name: "products", methods: "GET, POST, PUT, DELETE", desc: "CRUD completo de produtos" },
    { name: "comandas", methods: "GET", desc: "Consulta de comandas (somente leitura)" },
    { name: "financial", methods: "GET, POST", desc: "Consulta e criação de transações" },
    { name: "credits", methods: "GET, POST", desc: "Consulta e criação de créditos" },
    { name: "slots", methods: "GET", desc: "Horários disponíveis" },
    { name: "salon", methods: "GET", desc: "Informações do salão" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configuração da API REST</CardTitle>
          </div>
          <CardDescription>
            API REST completa para integração com ERPs, apps mobile, dashboards de BI e agentes de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL Base da API</Label>
            <div className="flex gap-2">
              <Input value={baseUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(baseUrl, "URL")}>
                {copied === "URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chave da API (x-api-key)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={apiKey ? (showKey ? apiKey : "•".repeat(40)) : "Nenhuma chave gerada"}
                  readOnly
                  className="font-mono text-xs pr-10"
                />
                {apiKey && (
                  <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {apiKey && (
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey, "Chave")}>
                  {copied === "Chave" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
              <Button onClick={generateKey} disabled={generating} variant={apiKey ? "outline" : "default"} className="gap-2 whitespace-nowrap">
                <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                {apiKey ? "Regenerar" : "Gerar Chave"}
              </Button>
            </div>
            {apiKey && (
              <p className="text-xs text-muted-foreground">⚠️ Regenerar invalidará integrações existentes.</p>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Headers obrigatórios</p>
            </div>
            <div className="font-mono text-xs space-y-1 text-muted-foreground">
              <p>Content-Type: application/json</p>
              <p>x-api-key: {"<sua_chave_aqui>"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recursos Disponíveis</CardTitle>
          <CardDescription>Endpoints REST com suporte a paginação (?page=1&limit=50)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {resources.map((r) => (
            <div key={r.name} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono text-xs">/{r.name}</Badge>
                <span className="text-sm text-muted-foreground">{r.desc}</span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {r.methods.split(", ").map((m) => (
                  <Badge key={m} variant="outline" className="text-[10px] font-mono">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Globe className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Documentação Completa</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                Baixe a documentação com todos os endpoints, exemplos de requisição e respostas para integrar com qualquer sistema.
              </p>
              <Button onClick={generateDocumentation} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Documentação da API REST
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
