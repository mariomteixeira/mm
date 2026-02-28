import OpenAI from 'openai';

let cachedClient = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  if (cachedClient) return cachedClient;

  cachedClient = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS || 30000),
  });

  return cachedClient;
}

export function getOpenAITextModel() {
  return process.env.OPENAI_MODEL_TEXT || 'gpt-5-mini';
}
