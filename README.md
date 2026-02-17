# Supermercado MM - Pedidos via WhatsApp

Projeto para operação de pedidos do Supermercado MM (Vila Planalto - DF) via WhatsApp, com interpretação de mensagens e áudios por GPT, validação de pedido e atualização de status operacional em fluxo interno. O foco é ter backend robusto para integração com WhatsApp Cloud API, filas e banco de dados, com interface simples para o time da loja.

A documentação detalhada de checklist, ENV completo, custos estimados e requisitos operacionais está em `OPERACAO_WHATSAPP_GPT_CUSTOS.md`.

## Comandos

- `npm run dev`: inicia o app em desenvolvimento.
- `npm run build`: gera build de produção.
- `npm run start`: inicia o app em produção.
- `npm run lint`: executa lint.
- `npm run typecheck`: checa tipos TypeScript.
- `npm run test`: executa testes.
- `npm run infra:up`: sobe PostgreSQL e Redis via Docker.
- `npm run infra:down`: derruba PostgreSQL e Redis.
- `npm run infra:logs`: acompanha logs da infraestrutura Docker.
- `npm run infra:wait`: aguarda portas de PostgreSQL/Redis ficarem prontas.
- `npm run db:generate`: gera Prisma Client.
- `npm run db:push`: aplica schema no banco sem migration versionada.
- `npm run db:migrate`: cria/aplica migration local.
- `npm run dev:full`: sobe infra + prepara banco + inicia app.
