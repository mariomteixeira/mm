import { appendNdjsonLog } from './ndjson-file-logger.js';

export async function writeWebhookReceivedFileLog({ event, requestMeta, payload }) {
  return appendNdjsonLog({
    category: 'webhook',
    kind: 'received',
    level: 'info',
    event,
    payload: {
      request: requestMeta || null,
      payload,
    },
  });
}

export async function writeWebhookErrorFileLog({ event, requestMeta, payload }) {
  return appendNdjsonLog({
    category: 'webhook',
    kind: 'errors',
    level: 'error',
    event,
    payload: {
      request: requestMeta || null,
      payload,
    },
  });
}
