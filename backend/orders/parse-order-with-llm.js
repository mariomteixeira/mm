import { getOpenAIClient, getOpenAITextModel } from '../llm/openai-client.js';
import { logLLMParserResult, logLLMParserTiming } from '../observability/performance-log.js';
import { buildParseDecision, parsedOrderSchema } from './order-parser-schema.js';
import { parsedOrderJsonSchema } from './order-parser-json-schema.js';
import { ORDER_PARSER_EXAMPLES } from './order-parser-examples.js';

function extractResponseText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === 'output_text' && content?.text) {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join('\n').trim();
}

function extractJsonString(text) {
  if (!text) throw new Error('LLM returned empty response');
  const trimmed = text.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error('Could not locate JSON object in LLM response');
}

const SYSTEM_PROMPT = [
  'Você é um extrator de dados de pedidos de supermercado.',
  'Contexto do negócio: Mercado MM, Vila Planalto - DF, Brasil.',
  'Sua tarefa é analisar a mensagem do cliente e retornar APENAS JSON válido no formato especificado.',
  'Não responda como atendente, não escreva texto fora do JSON.',
  'Interprete o pedido conforme a pessoa envia, sem inventar itens.',
  '',
  'Regras de classificação:',
  '- Se for um pedido claro, marque intent=ORDER com confidence alta (0.85-0.99).',
  '- Se NÃO for pedido (saudação, agradecimento, pergunta geral), marque intent=NOT_ORDER.',
  '- Se estiver ambíguo (pode ser pedido ou pergunta), marque intent=UNCLEAR.',
  '',
  'Regras de formato:',
  '- Use null quando um campo não existir (NÃO use string vazia "").',
  '- paymentIntent: "pix", "dinheiro", "debito", "credito", "cartao", "transferencia" ou null.',
  '- delivery: objeto com {address, neighborhood, reference} ou null.',
  '- Em items[], cada item deve ter: name, quantity (número ou null), unit (string ou null), notes (string ou null).',
  '- Em items[].name, preserve o nome completo do produto como o cliente escreveu (ex: "pao frances" → "pão francês", não apenas "pão").',
  '- Corrija a grafia dos nomes silenciosamente, sem mencionar correções em observations.',
  '- observations: use [] (vazio) na maioria dos casos. Só inclua se o cliente pedir algo especial (ex: "entrega urgente", "cortar a carne em bifes"). NUNCA inclua comentários sobre: grafia, formatação, interpretação, contexto de pedido anterior, ou falta de itens.',
  '- ambiguities: use [] (vazio) na maioria dos casos. Só inclua se realmente houver ambiguidade no pedido.',
  '- Se o cliente mencionar endereço parcialmente, coloque em delivery.address como string.',
].join('\n');

function buildMessages(messageText) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  for (const example of ORDER_PARSER_EXAMPLES) {
    messages.push({ role: 'user', content: example.input });
    messages.push({ role: 'assistant', content: JSON.stringify(example.output) });
  }

  messages.push({ role: 'user', content: messageText });

  return messages;
}

export async function parseOrderTextWithLLM({ messageText }) {
  if (!messageText || !String(messageText).trim()) {
    return {
      ok: false,
      errorType: 'validation',
      errorMessage: 'Empty message text',
    };
  }

  const client = getOpenAIClient();
  const model = getOpenAITextModel();
  const startedAt = Date.now();

  try {
    const messages = buildMessages(String(messageText).trim());

    const response = await client.responses.create({
      model,
      input: messages.map((msg) => ({
        role: msg.role === 'system' ? 'developer' : msg.role,
        content: msg.content,
      })),
      text: {
        format: {
          type: 'json_schema',
          ...parsedOrderJsonSchema,
        },
      },
    });

    const rawText = extractResponseText(response);
    let parsedJson;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      const jsonText = extractJsonString(rawText);
      parsedJson = JSON.parse(jsonText);
    }

    const parsed = parsedOrderSchema.parse(parsedJson);
    const decision = buildParseDecision(parsed);
    const durationMs = Date.now() - startedAt;

    const result = {
      ok: true,
      model,
      parsed,
      decision,
      rawText,
      responseId: response?.id ?? null,
      durationMs,
    };

    await logLLMParserTiming({
      ok: true,
      model,
      durationMs,
      responseId: result.responseId,
      intent: parsed.intent,
      confidence: parsed.confidence,
      itemsCount: parsed.items.length,
    }).catch(() => {});

    await logLLMParserResult({
      ok: true,
      model,
      responseId: result.responseId,
      durationMs,
      inputPreview: String(messageText).slice(0, 500),
      parsed,
      decision,
    }).catch(() => {});

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    error.durationMs = durationMs;

    await logLLMParserTiming({
      ok: false,
      model,
      durationMs,
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 800),
    }).catch(() => {});

    await logLLMParserResult({
      ok: false,
      model,
      durationMs,
      inputPreview: String(messageText).slice(0, 500),
      errorName: error?.name ?? 'Error',
      errorCode: error?.code ?? null,
      errorMessage: String(error?.message ?? 'Unknown error').slice(0, 2000),
    }).catch(() => {});

    throw error;
  }
}
