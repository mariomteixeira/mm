export const SECTION_ORDER = ['Açougue', 'Padaria', 'Hortifruti', 'Produtos Gerais'];

const CATEGORY_KEYWORDS = {
  Açougue: [
    'carne',
    'patinho',
    'acem',
    'acem moido',
    'acém',
    'frango',
    'file',
    'filé',
    'bovina',
    'suina',
    'suína',
    'linguica',
    'linguiça',
    'costela',
    'contra file',
    'contrafile',
    'peito de frango',
  ],
  Padaria: [
    'pao',
    'pão',
    'frances',
    'francês',
    'nutrella',
    'queijo',
    'presunto',
    'peito de peru',
    'mussarela',
    'muçarela',
    'mortadela',
    'requeijao',
    'requeijão',
    'cremoso',
    'frios',
    'torrada',
    'biscoito',
    'bolo',
  ],
  Hortifruti: [
    'acelga',
    'alface',
    'brocolis',
    'brócolis',
    'cebolinha',
    'gengibre',
    'pepino',
    'tomate',
    'cebola',
    'alho',
    'beterraba',
    'inhame',
    'cenoura',
    'abobrinha',
    'abobora',
    'abóbora',
    'morango',
    'manga',
    'laranja',
    'mamao',
    'mamão',
    'banana',
    'maca',
    'maçã',
    'abacaxi',
    'melancia',
    'goiaba',
    'uva',
    'pera',
    'batata',
    'mandioca',
    'couve',
    'espinafre',
    'repolho',
    'pimentao',
    'pimentão',
    'papaya',
  ],
};

const CATEGORY_PHRASE_OVERRIDES = [
  {
    section: 'Produtos Gerais',
    phrases: [
      'extrato de tomate',
      'molho de tomate',
      'ketchup',
      'macarrao',
      'macarrão',
      'penne',
      'espaguete',
      'spaghetti',
      'parafuso',
      'flocos de milho',
      'filtro de papel',
      'papel higienico',
      'papel higiênico',
      'papel toalha',
      'guardanapo',
      'detergente',
      'sabao',
      'sabão',
      'amaciante',
      'cafe',
      'café',
      'arroz',
      'feijao',
      'feijão',
      'azeite',
      'quinoa',
      'palmito',
      'creme de leite',
      'leite',
      'requeijao',
      'requeijão',
      'ovos',
    ],
  },
];

function normalizeForMatch(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function categorizeItem(productName) {
  const normalized = normalizeForMatch(productName);

  for (const override of CATEGORY_PHRASE_OVERRIDES) {
    if (override.phrases.some((phrase) => normalized.includes(normalizeForMatch(phrase)))) {
      return override.section;
    }
  }

  for (const section of SECTION_ORDER.slice(0, 3)) {
    if ((CATEGORY_KEYWORDS[section] || []).some((keyword) => normalized.includes(keyword))) {
      return section;
    }
  }

  return 'Produtos Gerais';
}

export function groupItemsBySection(items) {
  const sections = new Map(SECTION_ORDER.map((section) => [section, []]));
  for (const item of items || []) {
    const section = categorizeItem(item.productName);
    sections.get(section).push(item);
  }
  return SECTION_ORDER.map((section) => ({ section, items: sections.get(section) || [] })).filter(
    (entry) => entry.items.length > 0,
  );
}
