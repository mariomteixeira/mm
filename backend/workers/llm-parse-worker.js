import { createInboundTextParseWorker } from '../queues/llm-parse-queue.js';
import { logJson } from '../shared/logger/json-logger.js';

const worker = createInboundTextParseWorker();

logJson('info', 'llm_parse_worker_started', {
  pid: process.pid,
});

const shutdown = async (signal) => {
  logJson('info', 'llm_parse_worker_shutdown', { signal });
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
