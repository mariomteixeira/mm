import { createOrderDraftTimeoutWorker } from '../queues/order-draft-queue.js';
import { logJson } from '../shared/logger/json-logger.js';

const worker = createOrderDraftTimeoutWorker();

logJson('info', 'order_draft_timeout_worker_started', {
  pid: process.pid,
});

const shutdown = async (signal) => {
  logJson('info', 'order_draft_timeout_worker_shutdown', { signal });
  await worker.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

