import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis-connection.js';
import { logJson } from '../shared/logger/json-logger.js';
import { finalizeOrderDraftIfDue } from '../orders/order-draft-service.js';

const QUEUE_NAME = 'order-draft-timeout';
let queueInstance;

function getQueue() {
  if (queueInstance) return queueInstance;
  queueInstance = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: 1000,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    },
  });
  return queueInstance;
}

export async function scheduleOrderDraftTimeoutJob({ draftId, commitDeadlineAt }) {
  if (!draftId || !commitDeadlineAt) {
    return { queued: false, reason: 'missing_draft_id_or_deadline' };
  }

  const queue = getQueue();
  const deadline = new Date(commitDeadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return { queued: false, reason: 'invalid_deadline' };
  }

  const jobId = `order-draft-timeout-${draftId}`;
  const existingJob = await queue.getJob(jobId);
  if (existingJob) {
    try {
      await existingJob.remove();
    } catch {
      // If job is already active/completed, we still add a fresh delayed job below.
    }
  }

  const delay = Math.max(0, deadline.getTime() - Date.now());
  const job = await queue.add(
    'order-draft-timeout',
    {
      draftId,
      commitDeadlineAt: deadline.toISOString(),
    },
    {
      jobId,
      delay,
    },
  );

  return {
    queued: true,
    queueName: QUEUE_NAME,
    jobId: job.id,
    delayMs: delay,
    commitDeadlineAt: deadline.toISOString(),
  };
}

export function createOrderDraftTimeoutWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const startedAt = Date.now();
      const result = await finalizeOrderDraftIfDue({
        draftId: job.data?.draftId,
        force: false,
        closeReason: 'TIMEOUT',
      });
      logJson('info', 'order_draft_timeout_job_completed', {
        jobId: job.id,
        draftId: job.data?.draftId ?? null,
        durationMs: Date.now() - startedAt,
        result,
      });
      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: 2,
    },
  );

  worker.on('failed', (job, error) => {
    logJson('error', 'order_draft_timeout_job_failed', {
      jobId: job?.id ?? null,
      draftId: job?.data?.draftId ?? null,
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 800),
    });
  });

  worker.on('error', (error) => {
    logJson('error', 'order_draft_timeout_worker_error', {
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 800),
    });
  });

  return worker;
}

