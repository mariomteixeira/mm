import pino from 'pino';

const levelMap = {
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

function parseSilentPrefixes() {
  const value = process.env.CONSOLE_SILENT_EVENT_PREFIXES;
  if (value == null || value.trim() === '') return ['whatsapp_'];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const silentEventPrefixes = parseSilentPrefixes();

export const appLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export function logJson(level, event, data = {}) {
  if (
    typeof event === 'string' &&
    silentEventPrefixes.some((prefix) => prefix && event.startsWith(prefix))
  ) {
    return;
  }

  const method = levelMap[level] || 'info';
  appLogger[method]({ event, ...data });
}
