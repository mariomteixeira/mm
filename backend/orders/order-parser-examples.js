/**
 * Few-shot examples for the order parser LLM prompt.
 * Each example has an input (customer message) and the expected output (parsed JSON).
 */
export const ORDER_PARSER_EXAMPLES = [
  {
    input: 'Boa tarde, quero 2kg de carne moída, 1 frango inteiro, 3 pães franceses e 1 litro de leite. Entrega na Rua 3 lote 22, Vila Planalto. Vou pagar no pix.',
    output: {
      intent: 'ORDER',
      confidence: 0.95,
      summary: 'Pedido com carnes, padaria e laticínio para Vila Planalto, pagamento pix',
      items: [
        { name: 'carne moída', quantity: 2, unit: 'kg', notes: null },
        { name: 'frango inteiro', quantity: 1, unit: 'un', notes: null },
        { name: 'pão francês', quantity: 3, unit: 'un', notes: null },
        { name: 'leite', quantity: 1, unit: 'litro', notes: null },
      ],
      customerMessage: 'Boa tarde, quero 2kg de carne moída, 1 frango inteiro, 3 pães franceses e 1 litro de leite. Entrega na Rua 3 lote 22, Vila Planalto. Vou pagar no pix.',
      delivery: { address: 'Rua 3 lote 22', neighborhood: 'Vila Planalto', reference: null },
      paymentIntent: 'pix',
      observations: [],
      ambiguities: [],
    },
  },
  {
    input: '5 banana, 1kg tomate, alface, 2 abacate',
    output: {
      intent: 'ORDER',
      confidence: 0.88,
      summary: 'Pedido de hortifruti',
      items: [
        { name: 'banana', quantity: 5, unit: 'un', notes: null },
        { name: 'tomate', quantity: 1, unit: 'kg', notes: null },
        { name: 'alface', quantity: 1, unit: 'un', notes: null },
        { name: 'abacate', quantity: 2, unit: 'un', notes: null },
      ],
      customerMessage: '5 banana, 1kg tomate, alface, 2 abacate',
      delivery: null,
      paymentIntent: null,
      observations: [],
      ambiguities: [],
    },
  },
  {
    input: 'Bom dia! Tudo bem?',
    output: {
      intent: 'NOT_ORDER',
      confidence: 0.98,
      summary: 'Saudação, não é pedido',
      items: [],
      customerMessage: 'Bom dia! Tudo bem?',
      delivery: null,
      paymentIntent: null,
      observations: [],
      ambiguities: [],
    },
  },
  {
    input: 'Vocês tem carne moída hoje? Tá quanto?',
    output: {
      intent: 'UNCLEAR',
      confidence: 0.70,
      summary: 'Pergunta sobre disponibilidade e preço de carne moída',
      items: [],
      customerMessage: 'Vocês tem carne moída hoje? Tá quanto?',
      delivery: null,
      paymentIntent: null,
      observations: ['Cliente perguntando preço, não fez pedido'],
      ambiguities: ['Pode ser intenção de pedir ou apenas consulta de preço'],
    },
  },
  {
    input: 'Me manda 500g de presunto, 300g de mussarela, 1 pct de café pilão 500g, arroz 5kg, 2 feijão carioca e 1 óleo de soja. Pago na entrega com cartão',
    output: {
      intent: 'ORDER',
      confidence: 0.92,
      summary: 'Pedido misto com frios, mercearia e pagamento cartão',
      items: [
        { name: 'presunto', quantity: 500, unit: 'g', notes: null },
        { name: 'mussarela', quantity: 300, unit: 'g', notes: null },
        { name: 'café Pilão', quantity: 1, unit: 'pct', notes: '500g' },
        { name: 'arroz', quantity: 5, unit: 'kg', notes: null },
        { name: 'feijão carioca', quantity: 2, unit: 'un', notes: null },
        { name: 'óleo de soja', quantity: 1, unit: 'un', notes: null },
      ],
      customerMessage: 'Me manda 500g de presunto, 300g de mussarela, 1 pct de café pilão 500g, arroz 5kg, 2 feijão carioca e 1 óleo de soja. Pago na entrega com cartão',
      delivery: null,
      paymentIntent: 'cartao',
      observations: [],
      ambiguities: [],
    },
  },
];
