function truncateText(value, maxChars) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}... [truncated ${text.length - maxChars} chars]`;
}

function trimStack(stack, maxLines = 8, maxChars = 2400) {
  if (!stack) return null;
  const lines = String(stack).split('\n');
  const sliced = lines.slice(0, maxLines).join('\n');
  return truncateText(sliced, maxChars);
}

function compactMessage(message, maxLines = 8, maxChars = 1600) {
  if (!message) return null;
  const lines = String(message).split('\n');
  const nonEmpty = lines.filter((line) => line.trim() !== '');
  const sliced = nonEmpty.slice(0, maxLines).join('\n');
  return truncateText(sliced, maxChars);
}

export function serializeErrorForLog(error, options = {}) {
  return {
    errorName: error?.name ?? 'Error',
    errorCode: error?.code ?? null,
    errorMessage: compactMessage(error?.message ?? 'Unknown error', options.messageLines ?? 8, options.messageChars ?? 1600),
    errorStack: trimStack(error?.stack ?? null, options.stackLines ?? 8, options.stackChars ?? 2400),
  };
}
