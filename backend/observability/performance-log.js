import { appendNdjsonLog } from '../shared/logger/ndjson-file-logger.js';

export async function logWebhookTiming(payload) {
  return appendNdjsonLog({
    category: 'performance',
    kind: 'webhook',
    event: 'webhook_timing',
    payload,
  });
}

export async function logLLMParserTiming(payload) {
  return appendNdjsonLog({
    category: 'performance',
    kind: 'llm-parser',
    event: 'llm_parser_timing',
    payload,
  });
}

export async function logLLMParserResult(payload) {
  return appendNdjsonLog({
    category: 'llm',
    kind: 'parser',
    event: 'llm_order_parser_result',
    payload,
  });
}
