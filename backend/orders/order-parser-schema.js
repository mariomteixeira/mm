import { z } from 'zod';

function emptyStringToNull(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

const nullableTrimmedString = z.preprocess(
  emptyStringToNull,
  z.string().min(1).nullable().default(null),
);

const quantitySchema = z.preprocess((value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}, z.number().positive().nullable().default(null));

function objectOrPrimitiveToString(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const candidates = [
      value.value,
      value.text,
      value.name,
      value.label,
      value.type,
      value.method,
      value.description,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

const flexibleStringOrNull = z.preprocess(
  (value) => emptyStringToNull(objectOrPrimitiveToString(value)),
  z.string().min(1).nullable().default(null),
);

const stringArrayFromMixedSchema = z.preprocess((value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => objectOrPrimitiveToString(item))
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => typeof item === 'string' && item.length > 0);
}, z.array(z.string()).default([]));

const deliverySchema = z
  .preprocess((value) => {
    if (value == null) return null;
    if (typeof value === 'string') {
      return { address: value, neighborhood: null, reference: null };
    }
    if (typeof value === 'object') {
      const address =
        objectOrPrimitiveToString(value.address) ??
        objectOrPrimitiveToString(value.fullAddress) ??
        objectOrPrimitiveToString(value.street);
      const neighborhood =
        objectOrPrimitiveToString(value.neighborhood) ??
        objectOrPrimitiveToString(value.bairro);
      const reference =
        objectOrPrimitiveToString(value.reference) ??
        objectOrPrimitiveToString(value.complement) ??
        objectOrPrimitiveToString(value.obs);
      return { address, neighborhood, reference };
    }
    return null;
  }, z.object({
    address: flexibleStringOrNull,
    neighborhood: flexibleStringOrNull,
    reference: flexibleStringOrNull,
  }).nullable())
  .transform((value) => value ?? { address: null, neighborhood: null, reference: null })
  .default({ address: null, neighborhood: null, reference: null });

export const parsedOrderItemSchema = z.object({
  name: z.preprocess((value) => objectOrPrimitiveToString(value) ?? '', z.string().min(1)),
  quantity: quantitySchema,
  unit: nullableTrimmedString,
  notes: nullableTrimmedString,
});

export const parsedOrderSchema = z.object({
  intent: z.enum(['ORDER', 'NOT_ORDER', 'UNCLEAR']),
  confidence: z.preprocess((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.').trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, z.number().min(0).max(1)),
  summary: z.preprocess((value) => objectOrPrimitiveToString(value) ?? '', z.string().default('')),
  items: z.array(parsedOrderItemSchema).default([]),
  customerMessage: z.preprocess((value) => objectOrPrimitiveToString(value) ?? '', z.string().default('')),
  delivery: deliverySchema,
  paymentIntent: flexibleStringOrNull,
  observations: stringArrayFromMixedSchema,
  ambiguities: stringArrayFromMixedSchema,
});

export function buildParseDecision(parsed) {
  const needsConfirmation =
    parsed.intent !== 'ORDER' ||
    parsed.confidence < 0.75 ||
    parsed.ambiguities.length > 0 ||
    parsed.items.length === 0;

  return {
    needsConfirmation,
    confidenceBand:
      parsed.confidence >= 0.9 ? 'HIGH' : parsed.confidence >= 0.75 ? 'MEDIUM' : 'LOW',
    shouldCreateOrderAutomatically: false,
    reason: needsConfirmation ? 'human_review_or_confirmation' : 'ready_for_manual_review',
  };
}
