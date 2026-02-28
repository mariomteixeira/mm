import { getOrderDraftConfig } from './order-draft-config.js';
import { ORDER_DRAFT_CLOSE_SIGNALS } from './order-draft-close-signals.js';

function normalizeTextForMatch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function detectClosingSignals(messageText, config = getOrderDraftConfig()) {
  const normalized = normalizeTextForMatch(messageText);
  if (!normalized) return [];

  return ORDER_DRAFT_CLOSE_SIGNALS.filter((signal) =>
    normalized.includes(normalizeTextForMatch(signal)),
  );
}

export function detectAddressLikeMessage(messageText) {
  const raw = String(messageText ?? '').trim();
  const normalized = normalizeTextForMatch(raw);
  if (!normalized) return false;
  if (raw.length > 160) return false;
  if (raw.includes('\n')) return false;

  const addressHints = [
    'entrega na',
    'rua ',
    'rua.',
    'av ',
    'avenida',
    'quadra',
    'qd ',
    'lote',
    'lt ',
    'casa',
    'apartamento',
    'apto',
    'bloco',
    'condominio',
    'condomínio',
    'cep',
    'setor',
    'vila ',
  ];

  const hasHint = addressHints.some((hint) => normalized.includes(hint));
  if (!hasHint) return false;

  const hasStreetNumber = /\b\d{1,4}\b/.test(normalized) || normalized.includes('lote');
  return hasStreetNumber;
}

export function detectQuestionLikeMessage(messageText) {
  const raw = String(messageText ?? '');
  const normalized = normalizeTextForMatch(raw);
  if (!normalized) return false;

  if (raw.includes('?')) return true;

  const questionHints = [
    'tem ',
    'tem?',
    'quanto',
    'qual o valor',
    'qual valor',
    'aceita ',
    'pode ',
    'consegue ',
    'tem como',
  ];

  return questionHints.some((hint) => normalized.includes(hint));
}

function normalizePaymentIntentFromText(messageText) {
  const normalized = normalizeTextForMatch(messageText);
  if (!normalized) return null;

  const explicitMethod = /\b(pix|dinheiro|cartao|cartão)\b/.test(normalized);
  const paymentContext = /\b(pagamento|pagar|forma de pagamento|aceita|pode ser)\b/.test(normalized);
  if (!explicitMethod && !paymentContext) return null;

  const map = [
    [/\bpix\b/, 'pix'],
    [/\bdinheiro\b/, 'dinheiro'],
    [/\bcartao\b|\bcartão\b/, 'cartao'],
  ];

  for (const [pattern, value] of map) {
    if (pattern.test(normalized)) return value;
  }

  return null;
}

function cleanString(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeItem(item) {
  return {
    name: cleanString(item?.name),
    quantity: typeof item?.quantity === 'number' ? item.quantity : null,
    unit: cleanString(item?.unit),
    notes: cleanString(item?.notes),
  };
}

export function buildDraftContribution({ parsed, normalizedMessage, messageText, config }) {
  const closingSignals = detectClosingSignals(messageText, config);
  const addressLike = detectAddressLikeMessage(messageText);
  const questionLike = detectQuestionLikeMessage(messageText);
  const delivery = parsed?.delivery ?? {};
  const fallbackAddress = addressLike ? cleanString(messageText) : null;
  const deliveryAddress = cleanString(delivery.address) ?? fallbackAddress;
  const deliveryNeighborhood = cleanString(delivery.neighborhood);
  const deliveryReference = cleanString(delivery.reference);
  const paymentIntent = normalizePaymentIntentFromText(messageText);
  const items = Array.isArray(parsed?.items) ? parsed.items.map(normalizeItem).filter((i) => i.name) : [];
  const intent = parsed?.intent ?? 'UNCLEAR';

  return {
    providerMessageId: normalizedMessage?.messageId ?? null,
    messageText: cleanString(messageText),
    providerTimestampIso: normalizedMessage?.providerTimestampIso ?? null,
    intent,
    confidence: typeof parsed?.confidence === 'number' ? parsed.confidence : null,
    summary: cleanString(parsed?.summary),
    items,
    delivery: {
      address: deliveryAddress,
      neighborhood: deliveryNeighborhood,
      reference: deliveryReference,
    },
    paymentIntent,
    observations: Array.isArray(parsed?.observations) ? parsed.observations : [],
    ambiguities: Array.isArray(parsed?.ambiguities) ? parsed.ambiguities : [],
    closingSignals,
    flags: {
      hasItems: items.length > 0,
      hasDeliveryAddress: Boolean(deliveryAddress),
      hasPaymentIntent: Boolean(paymentIntent),
      hasClosingSignal: closingSignals.length > 0,
      hasQuestionSignal: Boolean(questionLike),
      addressLike,
      unclassifiedContextMessage:
        intent === 'NOT_ORDER' &&
        items.length === 0 &&
        !deliveryAddress &&
        !paymentIntent &&
        closingSignals.length === 0 &&
        !questionLike,
    },
  };
}

export function mergeDraftAggregate(currentAggregate, contribution) {
  const prev = currentAggregate && typeof currentAggregate === 'object' ? currentAggregate : {};
  const prevItems = Array.isArray(prev.items) ? prev.items : [];
  const prevObservations = Array.isArray(prev.observations) ? prev.observations : [];
  const prevAmbiguities = Array.isArray(prev.ambiguities) ? prev.ambiguities : [];
  const prevMessages = Array.isArray(prev.messages) ? prev.messages : [];
  const prevClosingSignals = Array.isArray(prev.closingSignals) ? prev.closingSignals : [];
  const prevReviewFlags = safeFlags(prev.reviewFlags);
  const prevControl = safeFlags(prev.control);

  const mergedMessages = [
    ...prevMessages,
    {
      providerMessageId: contribution.providerMessageId,
      text: contribution.messageText,
      providerTimestampIso: contribution.providerTimestampIso,
      intent: contribution.intent,
      confidence: contribution.confidence,
      summary: contribution.summary,
    },
  ];

  const uniqueStrings = (list) => [...new Set(list.filter((x) => typeof x === 'string' && x.trim()))];

  const delivery = {
    address: contribution.delivery?.address ?? prev.delivery?.address ?? null,
    neighborhood: contribution.delivery?.neighborhood ?? prev.delivery?.neighborhood ?? null,
    reference: contribution.delivery?.reference ?? prev.delivery?.reference ?? null,
  };

  const paymentIntent = contribution.paymentIntent ?? prev.paymentIntent ?? null;
  const closingSignals = uniqueStrings([...prevClosingSignals, ...(contribution.closingSignals ?? [])]);

  const flags = {
    hasItems: prev.flags?.hasItems || contribution.flags?.hasItems || prevItems.length > 0,
    hasDeliveryAddress:
      Boolean(delivery.address) || prev.flags?.hasDeliveryAddress || contribution.flags?.hasDeliveryAddress,
    hasPaymentIntent:
      Boolean(paymentIntent) || prev.flags?.hasPaymentIntent || contribution.flags?.hasPaymentIntent,
    hasClosingSignal:
      closingSignals.length > 0 || prev.flags?.hasClosingSignal || contribution.flags?.hasClosingSignal,
    hasQuestionSignal:
      Boolean(prev.flags?.hasQuestionSignal) || Boolean(contribution.flags?.hasQuestionSignal),
  };

  const hasUsefulUpdate =
    contribution.flags.hasItems ||
    contribution.flags.hasDeliveryAddress ||
    contribution.flags.hasPaymentIntent ||
    contribution.flags.hasClosingSignal;

  const pauseForClarification = hasUsefulUpdate
    ? false
    : contribution.flags.hasQuestionSignal
      ? true
      : Boolean(prev.control?.pauseForClarification);

  const awaitingReplyType =
    typeof prevControl.awaitingReplyType === 'string' ? prevControl.awaitingReplyType : null;
  const awaitingCustomerReply = Boolean(prevControl.awaitingCustomerReply);
  const isAwaitingReplySatisfied =
    awaitingCustomerReply &&
    (
      (awaitingReplyType === 'address' && contribution.flags.hasDeliveryAddress) ||
      (awaitingReplyType === 'payment' && contribution.flags.hasPaymentIntent) ||
      contribution.flags.hasItems ||
      contribution.flags.hasClosingSignal
    );

  const reviewFlags = {
    hasUnclassifiedContextMessage:
      Boolean(prevReviewFlags.hasUnclassifiedContextMessage) ||
      Boolean(contribution.flags.unclassifiedContextMessage),
  };

  return {
    version: 1,
    items: [...prevItems, ...(contribution.items ?? [])],
    delivery,
    paymentIntent,
    observations: uniqueStrings([...prevObservations, ...(contribution.observations ?? [])]),
    ambiguities: uniqueStrings([...prevAmbiguities, ...(contribution.ambiguities ?? [])]),
    closingSignals,
    flags,
    control: {
      pauseForClarification,
      awaitingCustomerReply: awaitingCustomerReply && !isAwaitingReplySatisfied,
      awaitingReplyType: awaitingCustomerReply && !isAwaitingReplySatisfied ? awaitingReplyType : null,
      awaitingReplySince:
        awaitingCustomerReply && !isAwaitingReplySatisfied ? prevControl.awaitingReplySince ?? null : null,
      awaitingReplyUntil:
        awaitingCustomerReply && !isAwaitingReplySatisfied ? prevControl.awaitingReplyUntil ?? null : null,
    },
    reviewFlags,
    lastMessageFlags: contribution.flags,
    messages: mergedMessages,
    stats: {
      messageCount: mergedMessages.length,
      itemCount: [...prevItems, ...(contribution.items ?? [])].length,
    },
    lastProviderMessageId: contribution.providerMessageId ?? prev.lastProviderMessageId ?? null,
    lastMessageText: contribution.messageText ?? prev.lastMessageText ?? null,
    lastProviderTimestampIso: contribution.providerTimestampIso ?? prev.lastProviderTimestampIso ?? null,
  };
}

function safeFlags(value) {
  return value && typeof value === 'object' ? value : {};
}

export function shouldCloseDraftEarly(aggregate) {
  // Simplified workflow: do not auto-close early based on address/payment/close signals.
  // Draft should become an Order only after the aggregation timeout window expires.
  void aggregate;
  return false;
}

export function shouldCreateOrderOnTimeout(aggregate, config = getOrderDraftConfig()) {
  const flags = aggregate?.flags ?? {};
  if (!config?.autoCreateOrderOnTimeout) return false;
  if (!flags.hasItems) return false;
  // Timeout is the only automatic commit trigger. Context flags are kept for UI/manual review.
  void config;
  return true;
}

export function buildDraftReviewReason(aggregate) {
  const flags = aggregate?.flags ?? {};
  if (aggregate?.control?.pauseForClarification) return 'paused_for_customer_question';
  if (aggregate?.reviewFlags?.hasUnclassifiedContextMessage) return 'unclassified_context_message';
  if (!flags.hasItems) return 'no_items_detected';
  if (!flags.hasDeliveryAddress && !flags.hasPaymentIntent && !flags.hasClosingSignal) {
    return 'awaiting_address_payment_or_close_signal';
  }
  return 'manual_review_required';
}
