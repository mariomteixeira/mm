/**
 * JSON Schema for OpenAI Structured Outputs.
 * Must follow OpenAI's strict subset: all properties required, additionalProperties: false.
 * The Zod schema in order-parser-schema.js remains as a safety net for type coercion.
 */
export const parsedOrderJsonSchema = {
  name: 'parsed_order',
  strict: true,
  schema: {
    type: 'object',
    required: [
      'intent',
      'confidence',
      'summary',
      'items',
      'customerMessage',
      'delivery',
      'paymentIntent',
      'observations',
      'ambiguities',
    ],
    additionalProperties: false,
    properties: {
      intent: {
        type: 'string',
        enum: ['ORDER', 'NOT_ORDER', 'UNCLEAR'],
      },
      confidence: {
        type: 'number',
      },
      summary: {
        type: 'string',
      },
      items: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name', 'quantity', 'unit', 'notes'],
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            quantity: { type: ['number', 'null'] },
            unit: { type: ['string', 'null'] },
            notes: { type: ['string', 'null'] },
          },
        },
      },
      customerMessage: {
        type: 'string',
      },
      delivery: {
        anyOf: [
          {
            type: 'object',
            required: ['address', 'neighborhood', 'reference'],
            additionalProperties: false,
            properties: {
              address: { type: ['string', 'null'] },
              neighborhood: { type: ['string', 'null'] },
              reference: { type: ['string', 'null'] },
            },
          },
          { type: 'null' },
        ],
      },
      paymentIntent: {
        type: ['string', 'null'],
      },
      observations: {
        type: 'array',
        items: { type: 'string' },
      },
      ambiguities: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};
