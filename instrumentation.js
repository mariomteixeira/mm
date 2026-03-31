let workersStarted = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !workersStarted) {
    workersStarted = true;

    const { createInboundTextParseWorker } = await import('./backend/queues/llm-parse-queue.js');
    const { createOrderDraftTimeoutWorker } = await import('./backend/queues/order-draft-queue.js');
    const { logJson } = await import('./backend/shared/logger/json-logger.js');

    const llmWorker = createInboundTextParseWorker();
    const draftWorker = createOrderDraftTimeoutWorker();

    logJson('info', 'instrumentation_workers_started', {
      pid: process.pid,
      llmWorker: 'running',
      draftWorker: 'running',
    });

    const shutdown = async () => {
      await llmWorker.close();
      await draftWorker.close();
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}
