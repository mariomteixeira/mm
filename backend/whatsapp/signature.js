import crypto from 'node:crypto';

function safeEqualHex(a, b) {
  const aBuf = Buffer.from(a, 'hex');
  const bBuf = Buffer.from(b, 'hex');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyWhatsAppSignature({ rawBody, appSecret, signatureHeader }) {
  if (!signatureHeader) {
    return { ok: false, reason: 'missing_signature_header' };
  }

  if (!appSecret) {
    return { ok: false, reason: 'missing_app_secret' };
  }

  const [prefix, providedHex] = signatureHeader.split('=');
  if (prefix !== 'sha256' || !providedHex) {
    return { ok: false, reason: 'invalid_signature_format' };
  }

  const expectedHex = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const ok = safeEqualHex(providedHex, expectedHex);

  return {
    ok,
    reason: ok ? 'ok' : 'signature_mismatch',
    providedPrefix: prefix,
  };
}
