import axios from 'axios';
import { persistOutboundMessageAccepted } from './persistence.js';

export async function sendWhatsAppTextMessage({ to, body, customerName = null }) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const graphBase = process.env.WHATSAPP_GRAPH_API_BASE_URL || 'https://graph.facebook.com';
  const apiVersion = process.env.WHATSAPP_API_VERSION || 'v25.0';

  if (!phoneNumberId) throw new Error('Missing WHATSAPP_PHONE_NUMBER_ID');
  if (!token) throw new Error('Missing WHATSAPP_ACCESS_TOKEN');
  if (!to) throw new Error('Missing destination phone');
  if (!body) throw new Error('Missing message body');

  const url = `${graphBase}/${apiVersion}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: Number(process.env.WHATSAPP_HTTP_TIMEOUT_MS || 30000),
  });

  const providerMessageId = response.data?.messages?.[0]?.id ?? null;

  const persisted = await persistOutboundMessageAccepted({
    toPhone: to,
    providerMessageId,
    messageType: 'TEXT',
    content: payload,
    customerName,
  });

  return {
    api: response.data,
    persisted,
  };
}
