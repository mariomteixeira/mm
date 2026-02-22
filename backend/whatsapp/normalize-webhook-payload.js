function toIsoFromUnixSeconds(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function normalizePhoneE164(raw) {
  if (!raw) return null;
  return raw.startsWith('+') ? raw : `+${raw}`;
}

function buildAssetFromMessage(message) {
  const assetTypes = ['audio', 'image', 'video', 'document', 'sticker'];
  for (const type of assetTypes) {
    if (!message?.[type]) continue;

    const media = message[type];
    return {
      source: 'whatsapp',
      kind: type,
      messageId: message.id ?? null,
      mediaId: media.id ?? null,
      mimeType: media.mime_type ?? null,
      sha256: media.sha256 ?? null,
      url: media.url ?? null,
      isVoice: Boolean(media.voice),
      caption: media.caption ?? null,
      filename: media.filename ?? null,
    };
  }

  return null;
}

function normalizeInboundMessage(changeValue, message, contact) {
  const asset = buildAssetFromMessage(message);

  return {
    kind: 'inbound_message',
    field: 'messages',
    messageId: message?.id ?? null,
    messageType: message?.type ?? null,
    providerTimestamp: message?.timestamp ?? null,
    providerTimestampIso: toIsoFromUnixSeconds(message?.timestamp),
    fromWaId: message?.from ?? contact?.wa_id ?? null,
    fromPhoneE164: normalizePhoneE164(message?.from ?? contact?.wa_id ?? null),
    customerName: contact?.profile?.name ?? null,
    toBusinessPhone: changeValue?.metadata?.display_phone_number ?? null,
    toBusinessPhoneE164: normalizePhoneE164(changeValue?.metadata?.display_phone_number ?? null),
    phoneNumberId: changeValue?.metadata?.phone_number_id ?? null,
    textBody: message?.text?.body ?? null,
    interactive: message?.interactive ?? null,
    referral: message?.referral ?? null,
    context: message?.context ?? null,
    asset,
    raw: message,
  };
}

function normalizeStatus(changeValue, status, contact) {
  return {
    kind: 'message_status',
    field: 'messages',
    messageId: status?.id ?? null,
    status: status?.status ?? null,
    providerTimestamp: status?.timestamp ?? null,
    providerTimestampIso: toIsoFromUnixSeconds(status?.timestamp),
    recipientWaId: status?.recipient_id ?? contact?.wa_id ?? null,
    recipientPhoneE164: normalizePhoneE164(status?.recipient_id ?? contact?.wa_id ?? null),
    recipientUserId: status?.recipient_user_id ?? null,
    conversationId: status?.conversation?.id ?? null,
    conversationOriginType: status?.conversation?.origin?.type ?? null,
    conversationExpirationTimestamp: status?.conversation?.expiration_timestamp ?? null,
    conversationExpirationIso: toIsoFromUnixSeconds(
      status?.conversation?.expiration_timestamp,
    ),
    pricing: status?.pricing ?? null,
    phoneNumberId: changeValue?.metadata?.phone_number_id ?? null,
    raw: status,
  };
}

export function normalizeWhatsAppWebhookPayload(payload) {
  const normalized = {
    object: payload?.object ?? null,
    messages: [],
    assets: [],
    statuses: [],
    historyEvents: [],
    unknownChanges: [],
    stats: {
      entries: 0,
      changes: 0,
      messages: 0,
      assets: 0,
      statuses: 0,
      historyEvents: 0,
      unknownChanges: 0,
    },
  };

  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  normalized.stats.entries = entries.length;

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const change of changes) {
      normalized.stats.changes += 1;
      const field = change?.field ?? null;
      const value = change?.value ?? {};
      const contact = Array.isArray(value.contacts) ? value.contacts[0] : null;

      if (field === 'messages') {
        const messages = Array.isArray(value.messages) ? value.messages : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];

        for (const message of messages) {
          const item = normalizeInboundMessage(value, message, contact);
          normalized.messages.push(item);
          normalized.stats.messages += 1;
          if (item.asset) {
            normalized.assets.push(item.asset);
            normalized.stats.assets += 1;
          }
        }

        for (const status of statuses) {
          normalized.statuses.push(normalizeStatus(value, status, contact));
          normalized.stats.statuses += 1;
        }

        continue;
      }

      if (field === 'history') {
        normalized.historyEvents.push({ entryId: entry?.id ?? null, raw: change });
        normalized.stats.historyEvents += 1;
        continue;
      }

      normalized.unknownChanges.push({ entryId: entry?.id ?? null, field, raw: change });
      normalized.stats.unknownChanges += 1;
    }
  }

  return normalized;
}
