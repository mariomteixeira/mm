function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;
  return fallback;
}

export function getOrderDraftConfig() {
  return {
    aggregationGapMs: parsePositiveInt(process.env.ORDER_DRAFT_AGGREGATION_GAP_MS, 3 * 60 * 1000),
    postCommitAmendmentWindowMs: parsePositiveInt(
      process.env.ORDER_DRAFT_POST_COMMIT_AMENDMENT_WINDOW_MS,
      10 * 60 * 1000,
    ),
    askReplyWindowMs: parsePositiveInt(process.env.ORDER_DRAFT_ASK_REPLY_WINDOW_MS, 5 * 60 * 1000),
    autoCreateOrderOnTimeout: parseBoolean(process.env.ORDER_DRAFT_AUTO_CREATE_ORDER_ON_TIMEOUT, true),
    timeoutCreateRequiresAddressOrPayment: parseBoolean(
      process.env.ORDER_DRAFT_TIMEOUT_CREATE_REQUIRES_ADDRESS_OR_PAYMENT,
      false,
    ),
  };
}
