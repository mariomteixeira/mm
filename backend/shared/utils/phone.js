function digitsOnly(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D+/g, '');
  return digits || null;
}

function normalizeBrazilMobileNinthDigit(digits) {
  if (!digits) return null;

  // +55 + DDD + 8 digits -> insert mobile ninth digit.
  if (digits.startsWith('55') && digits.length === 12) {
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    return `55${ddd}9${local}`;
  }

  // DDD + 8 digits (without country) -> insert ninth digit.
  if (!digits.startsWith('55') && digits.length === 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);
    return `${ddd}9${local}`;
  }

  return digits;
}

export function normalizePhoneDigits(value) {
  let digits = digitsOnly(value);
  if (!digits) return null;
  if (digits.startsWith('00')) digits = digits.slice(2);

  digits = normalizeBrazilMobileNinthDigit(digits);

  // Assume Brazil when country code is missing.
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    digits = `55${digits}`;
  }

  return digits;
}

export function normalizePhoneE164(value) {
  const digits = normalizePhoneDigits(value);
  return digits ? `+${digits}` : null;
}

export function getPhoneLookupVariants(value) {
  const base = digitsOnly(value);
  if (!base) return { digits: [], e164: [] };

  const variants = new Set();
  variants.add(base);
  variants.add(normalizePhoneDigits(base));

  if (base.startsWith('55') && base.length === 12) {
    variants.add(`${base.slice(0, 4)}9${base.slice(4)}`);
  }
  if (base.startsWith('55') && base.length === 13 && base[4] === '9') {
    variants.add(`${base.slice(0, 4)}${base.slice(5)}`);
  }

  const digits = [...variants].filter(Boolean);
  const e164 = digits.map((item) => `+${item}`);
  return { digits, e164 };
}
