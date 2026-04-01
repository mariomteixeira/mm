import { logJson } from '../shared/logger/json-logger.js';
import { finalizeOrderDraftIfDue } from '../orders/order-draft-service.js';

const activeTimers = new Map();

export async function scheduleOrderDraftTimeoutJob({ draftId, commitDeadlineAt }) {
  if (!draftId || !commitDeadlineAt) {
    return { queued: false, reason: 'missing_draft_id_or_deadline' };
  }

  const deadline = new Date(commitDeadlineAt);
  if (Number.isNaN(deadline.getTime())) {
    return { queued: false, reason: 'invalid_deadline' };
  }

  // Cancel existing timer for this draft
  const existing = activeTimers.get(draftId);
  if (existing) clearTimeout(existing);

  const delay = Math.max(0, deadline.getTime() - Date.now());

  const timer = setTimeout(async () => {
    activeTimers.delete(draftId);
    try {
      const result = await finalizeOrderDraftIfDue({
        draftId,
        force: false,
        closeReason: 'TIMEOUT',
      });
      logJson('info', 'order_draft_timeout_completed', { draftId, result });
    } catch (error) {
      logJson('error', 'order_draft_timeout_failed', {
        draftId,
        errorMessage: String(error?.message ?? '').slice(0, 500),
      });
    }
  }, delay);

  activeTimers.set(draftId, timer);

  return {
    queued: true,
    delayMs: delay,
    commitDeadlineAt: deadline.toISOString(),
  };
}
