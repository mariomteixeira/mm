import { persistInboundMessageWebhook, persistOutboundStatusWebhook } from './persistence.js';

export async function processNormalizedWhatsAppWebhook(normalized) {
  const result = {
    inboundMessages: { processed: 0, skipped: 0, items: [] },
    statuses: { processed: 0, skipped: 0, items: [] },
  };

  for (const message of normalized?.messages ?? []) {
    const item = await persistInboundMessageWebhook(message);
    result.inboundMessages.items.push(item);
    if (item.skipped) {
      result.inboundMessages.skipped += 1;
    } else {
      result.inboundMessages.processed += 1;
    }
  }

  for (const status of normalized?.statuses ?? []) {
    const item = await persistOutboundStatusWebhook(status);
    result.statuses.items.push(item);
    if (item.skipped) {
      result.statuses.skipped += 1;
    } else {
      result.statuses.processed += 1;
    }
  }

  return result;
}
