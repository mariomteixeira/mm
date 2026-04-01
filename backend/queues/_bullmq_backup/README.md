# BullMQ Backup

Versões dos arquivos que usavam BullMQ + Upstash Redis para processamento assíncrono.

Para restaurar, substitua os arquivos correspondentes e adicione `"bullmq": "^5.69.2"` no package.json.

| Arquivo backup | Destino original |
|---|---|
| llm-parse-queue.bullmq.js | backend/queues/llm-parse-queue.js |
| order-draft-queue.bullmq.js | backend/queues/order-draft-queue.js |
| process-normalized-webhook.bullmq.js | backend/whatsapp/process-normalized-webhook.js |
| instrumentation.bullmq.js | instrumentation.js |

Motivo da remoção: Hostinger shared hosting tem limite de 120 processos. BullMQ workers
consumiam ~40-60 processos e causavam crash loops.
