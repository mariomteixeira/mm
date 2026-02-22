export function getRequestMeta(request) {
  const url = new URL(request.url);
  const ip =
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return {
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    ip,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || null,
    metaSignature: request.headers.get('x-hub-signature-256') || null,
    requestId: request.headers.get('x-request-id') || null,
  };
}

export function maskToken(token) {
  if (!token) return null;
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}
