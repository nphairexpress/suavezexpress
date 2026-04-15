import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { Webhook, Copy, RefreshCw, Eye, EyeOff, Check, ExternalLink, Loader2, Bot, Download } from "lucide-react";

export function WebhookSettingsSection() {
  const { toast } = useToast();
  const [webhookKey, setWebhookKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-agent`;

  useEffect(() => {
    fetchKey();
  }, []);

  const fetchKey = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "webhook_api_key")
      .maybeSingle();
    setWebhookKey(data?.value || null);
    setLoading(false);
  };

  const generateKey = async () => {
    setGenerating(true);
    const newKey = `whk_${crypto.randomUUID().replace(/-/g, "")}`;
    const { error } = await supabase
      .from("system_config")
      .upsert({ key: "webhook_api_key", value: newKey }, { onConflict: "key" });

    if (error) {
      toast({ title: "Erro ao gerar chave", description: error.message, variant: "destructive" });
    } else {
      setWebhookKey(newKey);
      toast({ title: "Chave do webhook gerada com sucesso!" });
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
    const doc = `# Documentação da API Webhook - Sistema NP (Salão de Beleza)

## Visão Geral
Esta API permite que agentes de IA (como GPT Maker) interajam com o sistema de gestão do salão via webhook HTTP.

## Configuração

- **Método:** POST
- **URL:** ${webhookUrl}
- **Headers obrigatórios:**
  - Content-Type: application/json
  - x-webhook-key: ${webhookKey || "<SUA_CHAVE_AQUI>"}

## Ações Disponíveis

Todas as requisições devem ser enviadas como JSON no body com o campo "action" indicando a ação desejada.

---

### 1. list_services
Lista todos os serviços ativos do salão.

**Request:**
\`\`\`json
{ "action": "list_services" }
\`\`\`

**Response:**
\`\`\`json
{
  "services": [
    { "id": "uuid", "name": "Corte Feminino", "duration_minutes": 60, "price": 80.00, "category": "Cabelo", "is_active": true }
  ]
}
\`\`\`

---

### 2. list_professionals
Lista todos os profissionais ativos do salão.

**Request:**
\`\`\`json
{ "action": "list_professionals" }
\`\`\`

**Response:**
\`\`\`json
{
  "professionals": [
    { "id": "uuid", "name": "Maria Silva", "nickname": "Mari", "specialty": "Colorista", "is_active": true, "has_schedule": true }
  ]
}
\`\`\`

---

### 3. search_client
Busca cliente por telefone, nome ou email. Envie apenas UM dos campos de busca.

**Request (por telefone):**
\`\`\`json
{ "action": "search_client", "phone": "11999999999" }
\`\`\`

**Request (por nome):**
\`\`\`json
{ "action": "search_client", "name": "Maria" }
\`\`\`

**Request (por email):**
\`\`\`json
{ "action": "search_client", "email": "maria@email.com" }
\`\`\`

**Response:**
\`\`\`json
{
  "clients": [
    { "id": "uuid", "name": "Maria Silva", "phone": "11999999999", "email": "maria@email.com" }
  ]
}
\`\`\`

---

### 4. create_client
Cadastra um novo cliente no sistema.

**Campos obrigatórios:** name
**Campos opcionais:** phone, email, notes, tags

**Request:**
\`\`\`json
{
  "action": "create_client",
  "name": "Maria Silva",
  "phone": "11999999999",
  "email": "maria@email.com",
  "notes": "Cliente VIP",
  "tags": ["vip", "indicação"]
}
\`\`\`

**Response:**
\`\`\`json
{
  "client": { "id": "uuid", "name": "Maria Silva", "phone": "11999999999", "email": "maria@email.com" }
}
\`\`\`

---

### 5. create_appointment
Cria um agendamento na agenda do salão.

**Campos obrigatórios:** professional_id, scheduled_at (formato ISO 8601)
**Campos opcionais:** client_id, service_id, duration_minutes, notes, price

Se service_id for informado, duration_minutes e price serão preenchidos automaticamente com os valores do serviço (caso não sejam enviados manualmente).

**Request:**
\`\`\`json
{
  "action": "create_appointment",
  "client_id": "uuid-do-cliente",
  "professional_id": "uuid-do-profissional",
  "service_id": "uuid-do-servico",
  "scheduled_at": "2026-03-20T14:00:00Z",
  "notes": "Cliente pediu para não usar secador"
}
\`\`\`

**Response:**
\`\`\`json
{
  "appointment": {
    "id": "uuid",
    "scheduled_at": "2026-03-20T14:00:00Z",
    "duration_minutes": 60,
    "status": "scheduled",
    "notes": "Cliente pediu para não usar secador",
    "price": 80.00
  }
}
\`\`\`

---

### 6. add_credit
Adiciona crédito para um cliente (ex: cashback, cortesia).

**Campos obrigatórios:** client_id, credit_amount (valor > 0)
**Campos opcionais:** min_purchase_amount (padrão: 0), expires_in_days (padrão: 90)

**Request:**
\`\`\`json
{
  "action": "add_credit",
  "client_id": "uuid-do-cliente",
  "credit_amount": 50.00,
  "expires_in_days": 90
}
\`\`\`

**Response:**
\`\`\`json
{
  "credit": { "id": "uuid", "credit_amount": 50.00, "expires_at": "2026-06-18T..." }
}
\`\`\`

---

### 7. list_available_slots
Lista horários disponíveis de um profissional em uma data específica.

**Campos obrigatórios:** professional_id, date (formato YYYY-MM-DD)

**Request:**
\`\`\`json
{
  "action": "list_available_slots",
  "professional_id": "uuid-do-profissional",
  "date": "2026-03-20"
}
\`\`\`

**Response:**
\`\`\`json
{
  "date": "2026-03-20",
  "professional_id": "uuid",
  "available_slots": ["08:00", "08:30", "09:00", "09:30", "10:00", "14:00", "14:30", "15:00"]
}
\`\`\`

---

## Fluxo Recomendado para Agendamento via WhatsApp

1. Cliente envia mensagem → Agente cumprimenta
2. Agente chama \`search_client\` com o telefone do cliente
3. Se não encontrar, chama \`create_client\` para cadastrar
4. Agente chama \`list_services\` e apresenta as opções
5. Cliente escolhe o serviço
6. Agente chama \`list_professionals\` e apresenta os profissionais
7. Cliente escolhe o profissional
8. Agente chama \`list_available_slots\` com o profissional e data desejada
9. Cliente escolhe o horário
10. Agente chama \`create_appointment\` com todos os dados, incluindo observações se houver
11. Confirmação enviada ao cliente

## Códigos de Erro

| Status | Significado |
|--------|------------|
| 401 | Header x-webhook-key ausente |
| 403 | Chave de webhook inválida |
| 400 | Parâmetros faltando ou ação desconhecida |
| 404 | Salão não encontrado |
| 500 | Erro interno do servidor |

## Dicas para Configuração no GPT Maker

1. Crie uma "API Action" com método POST
2. Use a URL: ${webhookUrl}
3. Adicione o header: x-webhook-key: ${webhookKey || "<SUA_CHAVE>"}
4. Configure o Content-Type: application/json
5. O agente deve enviar o JSON no body da requisição
`;

    const blob = new Blob([doc], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webhook-api-documentacao.md";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Documentação baixada com sucesso!" });
  };

  const actions = [
    {
      name: "list_services",
      desc: "Lista todos os serviços ativos",
      example: `{ "action": "list_services" }`,
    },
    {
      name: "list_professionals",
      desc: "Lista todos os profissionais ativos",
      example: `{ "action": "list_professionals" }`,
    },
    {
      name: "search_client",
      desc: "Busca cliente por telefone, nome ou email",
      example: `{ "action": "search_client", "phone": "11999999999" }`,
    },
    {
      name: "create_client",
      desc: "Cadastra um novo cliente",
      example: `{ "action": "create_client", "name": "Maria Silva", "phone": "11999999999" }`,
    },
    {
      name: "create_appointment",
      desc: "Cria um agendamento na agenda",
      example: `{ "action": "create_appointment", "client_id": "uuid", "professional_id": "uuid", "service_id": "uuid", "scheduled_at": "2026-03-20T14:00:00Z", "notes": "Observação do agente" }`,
    },
    {
      name: "add_credit",
      desc: "Adiciona crédito para um cliente",
      example: `{ "action": "add_credit", "client_id": "uuid", "credit_amount": 50, "expires_in_days": 90 }`,
    },
    {
      name: "list_available_slots",
      desc: "Lista horários disponíveis de um profissional",
      example: `{ "action": "list_available_slots", "professional_id": "uuid", "date": "2026-03-20" }`,
    },
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
      {/* Main Config */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configuração do Webhook</CardTitle>
          </div>
          <CardDescription>
            Use esta URL e chave para conectar seu agente de IA (GPT Maker, n8n, etc.) ao sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl, "URL")}
              >
                {copied === "URL" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label>Chave de Autenticação (x-webhook-key)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={webhookKey ? (showKey ? webhookKey : "•".repeat(40)) : "Nenhuma chave gerada"}
                  readOnly
                  className="font-mono text-xs pr-10"
                />
                {webhookKey && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {webhookKey && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookKey, "Chave")}
                >
                  {copied === "Chave" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
              <Button
                onClick={generateKey}
                disabled={generating}
                variant={webhookKey ? "outline" : "default"}
                className="gap-2 whitespace-nowrap"
              >
                <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
                {webhookKey ? "Regenerar" : "Gerar Chave"}
              </Button>
            </div>
            {webhookKey && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Regenerar a chave invalidará integrações existentes.
              </p>
            )}
          </div>

          {/* HTTP Headers */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">Headers obrigatórios:</p>
            <div className="font-mono text-xs space-y-1 text-muted-foreground">
              <p>Content-Type: application/json</p>
              <p>x-webhook-key: {"<sua_chave_aqui>"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Disponíveis</CardTitle>
          <CardDescription>
            Envie um POST com o JSON contendo o campo "action" e os parâmetros necessários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((a) => (
            <div key={a.name} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">{a.name}</Badge>
                  <span className="text-sm text-muted-foreground">{a.desc}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(a.example, a.name)}
                  className="gap-1 text-xs"
                >
                  {copied === a.name ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  Copiar
                </Button>
              </div>
              <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                {a.example}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Download Documentation */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-foreground">Dica: Integrando com GPT Maker</h4>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                No GPT Maker, configure uma "API Action" com o método POST para a URL acima.
                Adicione o header <code className="text-xs bg-muted px-1 rounded">x-webhook-key</code> com sua chave.
                Baixe a documentação completa abaixo e envie para a IA configurar automaticamente.
              </p>
              <Button onClick={generateDocumentation} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Documentação Completa
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
