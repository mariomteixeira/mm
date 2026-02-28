import { getOpenAIClient, getOpenAITextModel } from '../llm/openai-client.js';
import { logLLMParserResult, logLLMParserTiming } from '../observability/performance-log.js';
import { buildParseDecision, parsedOrderSchema } from './order-parser-schema.js';

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

function buildPrompt(messageText) {
  return [
    'Você é um extrator de dados de pedidos de supermercado.',
    'Contexto do negócio: Mercado MM, Vila Planalto - DF, Brasil.',
    'Sua tarefa é analisar a mensagem do cliente e retornar APENAS JSON válido.',
    'Não responda como atendente, não escreva texto fora do JSON.',
    'Interprete o pedido conforme a pessoa envia, sem inventar itens.',
    'Se não for pedido, marque intent=NOT_ORDER. Se estiver ambíguo, intent=UNCLEAR.',
    'Use confidence entre 0 e 1.',
    'Campos esperados: intent, confidence, summary, items[], customerMessage, delivery, paymentIntent, observations[], ambiguities[].',
    'Em items[], cada item deve ter: name, quantity, unit, notes.',
    'Regras de formato obrigatórias:',
    '- Retorne APENAS um objeto JSON (sem markdown).',
    '- Use null quando um campo não existir (NÃO use string vazia "").',
    '- paymentIntent deve ser string ou null (ex.: "pix", "cartao", null).',
    '- delivery deve ser objeto com {address, neighborhood, reference} ou null.',
    '- delivery.address deve ser string simples (nunca objeto).',
    '- ambiguities e observations devem ser arrays de strings (nunca objetos).',
    '- notes de item deve ser string ou null.',
    '- quantity deve ser número ou null.',
    'Se o cliente mencionar endereço parcialmente, coloque em delivery.address como string.',
    '',
    'Exemplo de saída válida (formato):',
    '{"intent":"ORDER","confidence":0.92,"summary":"Pedido com hortifruti e carnes","items":[{"name":"alface americana","quantity":3,"unit":"un","notes":null}],"customerMessage":"texto original","delivery":{"address":"Rua 1 lote 3","neighborhood":"Vila Planalto","reference":null},"paymentIntent":null,"observations":[],"ambiguities":[]}',
    '',
    'Mensagem do cliente:',
    messageText,
  ].join('\n');
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
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'user',
          content: [{ type: 'input_text', text: buildPrompt(String(messageText).trim()) }],
        },
      ],
    });

    const rawText = extractResponseText(response);
    const jsonText = extractJsonString(rawText);
    const parsedJson = JSON.parse(jsonText);
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
