import path from 'node:path';
import pino from 'pino';

const loggerCache = new Map();

function pad(value) {
  return String(value).padStart(2, '0');
}

function currentDateKey(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function localTimestampReadable(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function sanitize(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'log';
}

function getBaseDir() {
  return process.env.APP_LOG_DIR || 'logs';
}

export function getNdjsonLogFilePath(category, kind, dateKey = currentDateKey()) {
  const safeCategory = sanitize(category);
  const safeKind = sanitize(kind);
  const file = `${safeCategory}-${safeKind}-${dateKey}.ndjson`;
  return path.join(process.cwd(), getBaseDir(), safeCategory, file);
}

function getOrCreatePinoFileLogger(category, kind) {
  const now = new Date();
  const dateKey = currentDateKey(now);
  const cacheKey = `${sanitize(category)}:${sanitize(kind)}:${dateKey}`;
  if (loggerCache.has(cacheKey)) return loggerCache.get(cacheKey);

  const destination = pino.destination({
    dest: getNdjsonLogFilePath(category, kind, dateKey),
    append: true,
    mkdir: true,
    sync: false,
  });

  const logger = pino(
    {
      level: 'info',
      timestamp: pino.stdTimeFunctions.isoTime,
      base: undefined,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
    },
    destination,
  );

  loggerCache.set(cacheKey, logger);
  return logger;
}

export async function appendNdjsonLog({ category, kind, level = 'info', event, payload = {} }) {
  const logger = getOrCreatePinoFileLogger(category, kind);
  const now = new Date();
  const method = typeof logger[level] === 'function' ? level : 'info';

  logger[method]({
    event,
    computerTimeLocal: localTimestampReadable(now),
    category: sanitize(category),
    kind: sanitize(kind),
    ...payload,
  });

  return getNdjsonLogFilePath(category, kind, currentDateKey(now));
}
