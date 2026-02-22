export function normalizePhoneDigits(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  return digits || null;
}

export function normalizePhoneE164(value) {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : null;
}
