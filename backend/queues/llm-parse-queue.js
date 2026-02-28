import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './redis-connection.js';
import { logJson } from '../shared/logger/json-logger.js';
import { processInboundTextMessageWithLLM } from '../orders/process-inbound-text-message.js';

const QUEUE_NAME = 'llm-inbound-text-parse';
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

export async function enqueueInboundTextParseJob({ normalizedMessage, persistedMessageId }) {
  if (!normalizedMessage?.messageId || !persistedMessageId) {
    return { queued: false, reason: 'missing_message_id_or_persisted_id' };
  }

  const jobId = `inbound-text-parse-${persistedMessageId}`;
  const queue = getQueue();
  const job = await queue.add(
    'parse-inbound-text',
    {
      persistedMessageId,
      normalizedMessage: {
        messageId: normalizedMessage.messageId,
        messageType: normalizedMessage.messageType,
        textBody: normalizedMessage.textBody,
        fromPhoneE164: normalizedMessage.fromPhoneE164,
        toBusinessPhoneE164: normalizedMessage.toBusinessPhoneE164,
        phoneNumberId: normalizedMessage.phoneNumberId,
        providerTimestampIso: normalizedMessage.providerTimestampIso,
      },
    },
    { jobId },
  );

  return { queued: true, jobId: job.id, queueName: QUEUE_NAME };
}

export function createInboundTextParseWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const startedAt = Date.now();
      const result = await processInboundTextMessageWithLLM({
        normalizedMessage: job.data.normalizedMessage,
        persistedMessageId: job.data.persistedMessageId,
      });
      logJson('info', 'llm_inbound_text_parse_job_completed', {
        jobId: job.id,
        providerMessageId: job.data?.normalizedMessage?.messageId ?? null,
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
    logJson('error', 'llm_inbound_text_parse_job_failed', {
      jobId: job?.id ?? null,
      providerMessageId: job?.data?.normalizedMessage?.messageId ?? null,
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 800),
    });
  });

  worker.on('error', (error) => {
    logJson('error', 'llm_inbound_text_parse_worker_error', {
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 800),
    });
  });

  return worker;
}
