import { prisma } from '../backend/db/prisma-client.js';
import { normalizePhoneDigits, normalizePhoneE164 } from '../backend/shared/utils/phone.js';

function toCustomerPhoneBr(value) {
  const digits = normalizePhoneDigits(value);
  if (!digits) return null;
  const br = digits.startsWith('55') ? digits.slice(2) : digits;
  return br || null;
}

async function main() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      phone: true,
      phoneE164: true,
    },
  });

  let scanned = 0;
  let updated = 0;

  for (const customer of customers) {
    scanned += 1;
    const normalizedBr = toCustomerPhoneBr(customer.phoneE164 ?? customer.phone);
    const normalizedE164 = normalizePhoneE164(customer.phoneE164 ?? customer.phone);
    if (!normalizedBr || !normalizedE164) continue;

    const needsUpdate = customer.phone !== normalizedBr || customer.phoneE164 !== normalizedE164;
    if (!needsUpdate) continue;

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        phone: normalizedBr,
        phoneE164: normalizedE164,
      },
    });

    updated += 1;
    console.log(`[normalize-phones] updated customer=${customer.id} ${customer.phone || '-'} -> ${normalizedBr}`);
  }

  console.log(`[normalize-phones] done scanned=${scanned} updated=${updated}`);
}

main()
  .catch((error) => {
    console.error('[normalize-phones] failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
