const REQUIRED = [
  'DATABASE_URL',
  'REDIS_URL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL_TEXT',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
];

export function validateEnvironment() {
  const missing = REQUIRED.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    const msg = `Missing required environment variables:\n  ${missing.join('\n  ')}`;
    console.error(`[ENV VALIDATION FAILED] ${msg}`);
    process.exit(1);
  }
}
