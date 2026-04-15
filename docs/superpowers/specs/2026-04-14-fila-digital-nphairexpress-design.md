# Fila Digital — NP Hair Express

**Data:** 2026-04-14
**Projeto:** Fork do sistemanp, exclusivo para o NP Hair Express
**Stack:** React + Supabase + Vercel + Asaas + WhatsApp API

---

## Contexto

O NP Hair Express e um salao express onde a cliente nao precisa agendar. Hoje a fila e gerenciada no olho pela recepcao. O objetivo e criar um sistema de fila digital onde a cliente pode comprar o servico online, entrar na fila remotamente e acompanhar em tempo real quando sera atendida.

## Requisitos Principais

1. Pagina publica (`/fila`) com visualizacao da fila em tempo real
2. Compra de servico online com checkout transparente (Asaas)
3. Entrada automatica na fila apos pagamento confirmado
4. Painel da recepcao com controle total da fila
5. Notificacoes automaticas via WhatsApp (principal) e e-mail (fallback)
6. Captura de leads ("me avisa quando a fila diminuir")
7. Credito de 30 dias para no-show

---

## Modelo de Dados

### Tabela: `queue_entries`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| customer_id | uuid | FK → customers (nullable, para presencial sem cadastro) |
| customer_name | text | Nome da cliente |
| customer_phone | text | WhatsApp |
| customer_email | text | E-mail (fallback) |
| service_id | uuid | FK → services |
| status | enum | `waiting` → `checked_in` → `in_service` → `completed` / `cancelled` / `no_show` |
| source | enum | `online` / `walk_in` (presencial) |
| position | integer | Posicao na fila |
| payment_id | text | ID do pagamento no Asaas (null para presencial) |
| payment_status | enum | `pending` / `confirmed` / `refunded` / `credit` |
| notify_minutes_before | integer | Antecedencia escolhida (20, 40, 60, 90) |
| notify_sent | boolean | Ja disparou o aviso de antecedencia? |
| notify_next_sent | boolean | Ja disparou o "voce e a proxima"? |
| estimated_time | timestamptz | Previsao de quando sera atendida |
| checked_in_at | timestamptz | Quando fez check-in |
| assigned_professional_id | uuid | FK → professionals (preenchido pela recepcao) |
| created_at | timestamptz | Quando entrou na fila |

### Tabela: `queue_leads`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| phone | text | WhatsApp |
| name | text | Nome |
| max_queue_size | integer | "Me avisa quando tiver menos de X na fila" |
| notified | boolean | Ja avisou? |
| created_at | timestamptz | |

### Tabela: `customer_credits`

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| amount | decimal | Valor do credito |
| origin_queue_entry_id | uuid | FK → queue_entries |
| expires_at | timestamptz | created_at + 30 dias |
| used | boolean | Ja usou? |
| used_at | timestamptz | Quando usou |
| created_at | timestamptz | |

### Logica de prioridade na fila

- `walk_in` (presencial) sempre fica acima de `online` com status `waiting` (ainda nao chegou)
- `online` com status `checked_in` (ja chegou) entra na posicao normal da fila
- Recepcao pode reordenar manualmente arrastando

---

## Pagina Publica (`/fila`)

### Tela Inicial

- Logo NP Hair Express no topo
- "X pessoas na fila · Tempo estimado: ~Y minutos" (numero inflado para visitantes, fator configuravel no admin)
- Botao "Quero ser atendida" → fluxo de compra
- Botao secundario "Me avisa quando a fila diminuir" → captura de lead (nome + WhatsApp + tamanho maximo da fila)
- Atualiza em tempo real via Supabase Realtime + botao de atualizar como fallback

### Numero inflado (visitantes)

- Visitante ve um numero multiplicado por fator configuravel (ex: 1.7x)
- Fila real 3 → mostra 5. Fila real 0 → mostra 0
- Cliente que comprou ve a posicao real dela, nunca o numero inflado

### Fluxo de Compra

1. Escolhe o servico — lista com nome e preco
2. Dados pessoais — nome, WhatsApp, e-mail
3. Tempo de antecedencia — "Com quanto tempo antes voce quer ser avisada?" (20min, 40min, 1h, 1h30)
4. Pagamento — checkout transparente Asaas (PIX com QR code + cartao), tudo dentro da pagina
5. Confirmacao — "Voce entrou na fila! Posicao: 4a · Previsao: ~14:30"

### Tela de Acompanhamento (pos-compra)

- Link unico: `/fila/acompanhar/{uuid}`
- Mostra: posicao real, tempo estimado, status (aguardando / voce e a proxima! / em atendimento)
- Botao de atualizar
- Botao "Desistir da fila" (valor vira credito de 30 dias)

---

## Painel da Recepcao (admin)

Nova tela no menu do sistema com 3 areas:

### Fila Ativa (area principal)

Lista ordenada por posicao. Cada card mostra:
- Nome da cliente, servico, origem (online/presencial), tempo na fila
- Status visual: azul (aguardando) → verde (check-in feito) → laranja (em atendimento)
- Profissional atribuido (quando tiver)

Acoes por cliente:
- **Check-in** — marca que a cliente chegou
- **Atribuir profissional** — seleciona profissional e abre comanda automaticamente no sistema
- **Pular** — mantem na fila mas passa a proxima na frente
- **Remover** — tira da fila (se pagou online, vira credito 30 dias)
- **Arrastar para reordenar** — recepcao pode mudar a ordem manualmente

Botao "Adicionar presencial" — nome, servico, insere na fila com prioridade sobre online nao checked-in.

### Lista de Espera / Leads (aba lateral)

- Nome + telefone de quem pediu para ser avisada
- Tamanho da fila desejado (ex: "avisar quando tiver menos de 2")
- Botao "Notificar" manual + indicador se ja foi notificada automaticamente
- Novo lead → aparece aqui + dispara e-mail para a recepcao

### Indicadores no Topo

- Pessoas na fila agora
- Tempo medio de espera
- Profissionais disponiveis / ocupados

---

## Notificacoes e Automacoes

### Disparos para a cliente na fila

| Momento | Mensagem (exemplo) | Canal |
|---------|-------------------|-------|
| Entrou na fila | "Voce entrou na fila! Posicao: 4a. Acompanhe aqui: [link]" | WhatsApp + e-mail |
| Antecedencia escolhida (20/40/60/90min) | "Faltam aproximadamente X minutos pro seu atendimento. Venha se preparando!" | WhatsApp |
| Voce e a proxima (profissional fechou comanda anterior) | "Voce e a proxima! Chegue nos proximos 15 minutos." | WhatsApp + e-mail |
| Foi pulada (nao apareceu) | "Passamos a proxima da fila. Voce ainda esta na lista, avise quando chegar." | WhatsApp |
| Removida por no-show | "Voce recebeu um credito de R$XX valido por 30 dias. Volte quando quiser!" | WhatsApp + e-mail |

### Disparos para leads

| Momento | Mensagem | Canal |
|---------|----------|-------|
| Fila ficou menor que o pedido | "A fila do NP Hair ta rapidinha agora! So X pessoas. Quer entrar? [link]" | WhatsApp |

### Disparos para a recepcao

| Momento | Canal |
|---------|-------|
| Novo lead pediu para ser avisado | E-mail + aparece na aba de leads |
| Cliente online fez pagamento | Notificacao sonora no painel + card aparece na fila |

### Gatilho "voce e a proxima"

O fechamento da comanda no sistema e o gatilho. Quando a recepcionista fecha a comanda:
1. Sistema detecta que o profissional ficou livre
2. Verifica quem e a proxima na fila
3. Dispara notificacao WhatsApp + e-mail

---

## Estimativa de Tempo

- Baseada na duracao cadastrada de cada servico (ja existe no sistema)
- Considera numero de profissionais ativos no momento
- Formula: soma dos tempos dos servicos na frente / numero de profissionais ativos
- Recalcula em tempo real a cada mudanca na fila (entrada, saida, reordenacao)

---

## Integracoes

### Pagamento — Asaas (checkout transparente)

- API do Asaas gera cobranca (PIX com QR code + cartao via tokenizacao)
- Webhook do Asaas notifica pagamento confirmado → sistema insere na fila
- Dados de cartao nunca passam pelo servidor (PCI compliance do Asaas)

### Notificacoes WhatsApp — Z-API (recomendado inicial)

- ~R$65/mes, sem risco de ban, muito usado no Brasil
- Futuro: migrar para API oficial Meta via BSP se escalar
- Fallback: e-mail via Resend (ja integrado no sistema)

### Tempo Real — Supabase Realtime

- Fila atualiza em tempo real na pagina publica e no painel da recepcao
- Subscriptions nas tabelas queue_entries e queue_leads

### Seguranca

- Pagina publica: RLS no Supabase, chave `anon` so le contagem da fila
- Checkout transparente: tokenizacao do Asaas
- Link de acompanhamento: UUID aleatorio, impossivel de adivinhar
- Creditos: so a recepcao pode aplicar no fechamento da comanda

---

## Configuracoes do Modulo de Fila (tela de settings)

- **Fator de inflacao da fila** — multiplicador para visitantes (default: 1.7)
- **Tempo maximo sem check-in** — minutos antes de ser pulada automaticamente (default: desativado, so manual)
- **Validade do credito** — dias (default: 30)
- **Opcoes de antecedencia** — lista editavel (default: 20, 40, 60, 90 minutos)
- **E-mail da recepcao** — para receber alertas de leads

---

## Fora de Escopo (futuro)

- App nativo (PWA resolve)
- SMS como canal
- Fila por profissional especifico
- Programa de fidelidade integrado a fila
- Pesquisa de satisfacao pos-atendimento

---

## Decisoes Tomadas

| Decisao | Motivo |
|---------|--------|
| Fork do sistemanp, repo separado | Exclusivo NP Hair Express, sem generalizar |
| Abordagem A (tudo no mesmo app) | Menos complexidade, compartilha modulos existentes, mais facil de proteger |
| Checkout transparente Asaas | Cliente nao sai da pagina, melhor conversao |
| Z-API para WhatsApp | Custo-beneficio, sem risco de ban, pode migrar depois |
| Numero inflado para visitantes | Sensacao de demanda, configuravel no admin |
| Credito 30 dias para no-show | Pro-cliente, alinhado com CDC |
| Presencial com prioridade | Quem esta fisicamente no salao nao espera por quem nao chegou |
| Gatilho = fechamento de comanda | Fluxo natural que a recepcao ja faz |
