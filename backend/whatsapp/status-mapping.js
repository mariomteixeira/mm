export function mapProviderStatusToDbStatus(providerStatus) {
  switch (providerStatus) {
    case 'sent':
      return 'SENT';
    case 'delivered':
      return 'DELIVERED';
    case 'read':
      return 'READ';
    case 'failed':
      return 'FAILED';
    default:
      return null;
  }
}

export function buildMessageStatusTimestamps(providerStatus, providerTimestampIso) {
  if (!providerTimestampIso) return {};
  const dt = new Date(providerTimestampIso);
  if (Number.isNaN(dt.getTime())) return {};

  switch (providerStatus) {
    case 'sent':
      return { sentAt: dt };
    case 'delivered':
      return { deliveredAt: dt };
    case 'read':
      return { readAt: dt };
    case 'failed':
      return { failedAt: dt };
    default:
      return {};
  }
}
