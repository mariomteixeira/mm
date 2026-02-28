import { serializeErrorForLog } from './serialize-error.js';

export function errorToLogPayload(error, extra = {}) {
  return {
    ...extra,
    ...serializeErrorForLog(error, {
      messageLines: 6,
      stackLines: 6,
    }),
  };
}
