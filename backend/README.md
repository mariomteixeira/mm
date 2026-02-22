# Backend

Estrutura raiz do backend para separar webhook, processamento, filas e regras de negócio.

Pastas iniciais:
- `webhooks/`: entrada HTTP (Meta/WhatsApp)
- `whatsapp/`: cliente API, assinatura, parser e mapeamentos
- `orders/`: regras de pedido e status
- `campaigns/`: segmentação e disparos
- `workers/`: jobs assíncronos
- `queues/`: filas e produtores/consumidores
- `db/`: acesso a dados (Prisma/repositórios)
- `shared/`: config, logger e utilitários
