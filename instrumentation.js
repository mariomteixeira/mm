let workersStarted = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !workersStarted) {
    workersStarted = true;

    try {
      const { createInboundTextParseWorker } = await import('./backend/queues/llm-parse-queue.js');
      const { createOrderDraftTimeoutWorker } = await import('./backend/queues/order-draft-queue.js');

      const llmWorker = createInboundTextParseWorker();
      const draftWorker = createOrderDraftTimeoutWorker();

      console.log(`[MM] Workers started (pid: ${process.pid})`);

      const shutdown = async () => {
        try { await llmWorker.close(); } catch {}
        try { await draftWorker.close(); } catch {}
      };

      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
    } catch (error) {
      console.error(`[MM] Failed to start workers: ${error?.message ?? error}`);
      // Don't crash the app - orders page still works, just workers won't process
    }
  }
}
