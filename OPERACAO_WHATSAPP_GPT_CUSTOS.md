# Operação WhatsApp + GPT (Supermercado MM)

Data de referência: **14/02/2026**
Volume informado: **~1400 pedidos/mês**

## Checklist WhatsApp (o que precisamos)

### Decisão do número atual (pessoal)

- [ ] Confirmar se o número atual será migrado para API ou se será usado um novo número dedicado.
- [ ] Se for migrar o número atual, planejar janela de migração para evitar indisponibilidade no atendimento.
- [ ] Garantir que o número escolhido recebe SMS/ligação para validação OTP.

### Conta e ativos Meta

- [ ] Criar/organizar Business Manager (Meta Business Portfolio).
- [ ] Criar app em Meta for Developers.
- [ ] Criar/associar WABA (WhatsApp Business Account).
- [ ] Adicionar número no WhatsApp Manager e concluir verificação.
- [ ] Gerar token de System User com permissões `whatsapp_business_messaging`, `whatsapp_business_management` e `business_management` (quando necessário).

### Webhook e segurança

- [ ] Subir endpoint HTTPS público para webhook.
- [ ] Configurar verificação `hub.verify_token` + retorno `hub.challenge`.
- [ ] Validar assinatura `x-hub-signature-256` com `WHATSAPP_APP_SECRET`.
- [ ] Definir retries/idempotência para eventos duplicados.

### Mensagens e templates

- [ ] Criar templates utilitários (confirmação, separação, saiu para entrega, finalizado).
- [ ] Submeter templates para aprovação no WhatsApp Manager.
- [ ] Definir política para janela de atendimento de 24h (Customer Service Window).
- [ ] Definir fallback de envio em caso de erro (fila + retry + dead-letter).

### Operação e compliance

- [ ] Definir horário de operação e SLA de resposta.
- [ ] Definir política de retenção de dados (LGPD).
- [ ] Configurar auditoria mínima de mudanças de status.
- [ ] Configurar monitoramento de falhas de webhook e envio.

## Precisa ir para WhatsApp Business?

Sim para usar API: para automação e webhooks, você precisa operar via **WhatsApp Business Platform (Cloud API)** com WABA no Meta.

Resumo prático:
- Número pessoal no app comum não atende ao fluxo de API.
- Você pode usar um número novo dedicado ou planejar migração do número atual para a plataforma de API.

## ENV necessário (base)

Copie:

```bash
cp .env.example .env
```

Variáveis:

```env
# App
NODE_ENV=development
NEXT_PUBLIC_APP_NAME=Supermercado MM
APP_BASE_URL=http://localhost:3000

# Banco
DATABASE_URL="postgresql://mm:mm@localhost:5432/mm?schema=public"
REDIS_URL="redis://localhost:6379"

# WhatsApp Cloud API
WHATSAPP_GRAPH_API_BASE_URL=https://graph.facebook.com
WHATSAPP_API_VERSION=v23.0
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_SYSTEM_USER_ID=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_WEBHOOK_PATH=/api/webhooks/whatsapp
WHATSAPP_TEMPLATE_NAMESPACE=
WHATSAPP_DEFAULT_COUNTRY_CODE=55

# OpenAI
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL_TEXT=gpt-5-mini
OPENAI_MODEL_AUDIO=gpt-realtime-mini
OPENAI_TIMEOUT_MS=30000

# Observabilidade
LOG_LEVEL=info
```

## Custo estimado mensal (faixas)

### WhatsApp API (Meta)

A cobrança depende de país do destinatário, categoria da mensagem, janela de atendimento e tabela oficial vigente.

Fórmula simples para previsão:

```text
custo_whatsapp = mensagens_cobradas_no_mes x tarifa_por_mensagem
```

Exemplo de sensibilidade (referência operacional):
- 1400 pedidos x 2 mensagens cobradas por pedido = 2800 mensagens/mês.
- Se tarifa média efetiva = US$0.005 -> US$14/mês.
- Se tarifa média efetiva = US$0.015 -> US$42/mês.

### OpenAI (interpretação de pedido)

Referência usando `gpt-5-mini` para parsing de texto.

Premissas de cálculo:
- 1400 pedidos/mês.
- Por pedido: 1200 tokens de entrada + 250 tokens de saída.
- Preço de referência: entrada US$0.25/1M tokens, saída US$2.00/1M tokens.

Conta:

```text
Entrada: 1,680,000 tokens -> US$0.42
Saída:     350,000 tokens -> US$0.70
Total texto/mês ~= US$1.12
```

Áudio (transcrição):
- O custo depende do modelo final escolhido e da duração total dos áudios.
- Áudio pode superar texto se houver alto volume de mensagens de voz longas.

### Infraestrutura (faixa recomendada)

Para 1400 pedidos/mês:
- VPS única (app + worker + db + redis): **~US$20 a US$40/mês**.
- Serviços gerenciados (DB + Redis + app): **~US$40 a US$120/mês**.

Faixa total inicial realista:
- Operação enxuta: **~US$25 a US$80/mês**.
- Operação com serviços gerenciados e mais folga: **~US$80 a US$180/mês**.

## Máquina recomendada

### Desenvolvimento local

- CPU: 4 vCPU.
- RAM: 8 GB.
- SSD: 40+ GB.
- Docker Desktop/Engine.

### Produção inicial (1400 pedidos/mês)

Opção 1 (simples):
- 2 vCPU, 4 GB RAM, 80 GB SSD.
- PostgreSQL + Redis na mesma máquina (backup diário obrigatório).

Opção 2 (mais segura):
- App/Worker: 2 vCPU, 4 GB RAM.
- PostgreSQL gerenciado (1-2 GB RAM).
- Redis gerenciado pequeno.

## Fontes

- OpenAI pricing: https://openai.com/api/pricing
- WhatsApp Business Platform pricing: https://business.whatsapp.com/products/platform-pricing
- WhatsApp Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api
- Cloud API webhook example: https://github.com/fbsamples/whatsapp-api-examples/blob/main/send-messages-movie-ticket-app-python/app.py
- DigitalOcean Droplets pricing: https://www.digitalocean.com/pricing/droplets
- DigitalOcean Managed Databases pricing: https://www.digitalocean.com/pricing/managed-databases
