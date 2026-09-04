/**
 * Fonte única do vocabulário de atletas/adversários no frontend (spec 012).
 *
 * Antes, a lista de faixas estava copiada em 3 arquivos e as cores em 2; e
 * cada tela decidia sozinha rótulo, rota e query key. Tudo o que difere entre
 * "atleta" e "adversário" na UI está aqui — o resto do código recebe `type`.
 */

export const BELTS = ['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'];
export const DEFAULT_BELT = 'Branca';

/** Classes Tailwind do badge de faixa (cards e pílulas do formulário). */
export const BELT_BADGE_CLASSES = {
  Branca: 'bg-slate-50 text-slate-700 border-slate-200',
  Azul: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Roxa: 'bg-purple-50 text-purple-700 border-purple-200',
  Marrom: 'bg-amber-50 text-amber-700 border-amber-200',
  Preta: 'bg-slate-900 text-white border-slate-800',
};

/** Cores sólidas do seletor de faixa na página de detalhe. */
export const BELT_COLORS = {
  Branca: { bg: '#FFFFFF', text: '#374151', border: '#D1D5DB' },
  Azul: { bg: '#2563EB', text: '#FFFFFF', border: '#1D4ED8' },
  Roxa: { bg: '#7C3AED', text: '#FFFFFF', border: '#6D28D9' },
  Marrom: { bg: '#92400E', text: '#FFFFFF', border: '#78350F' },
  Preta: { bg: '#1F2937', text: '#FFFFFF', border: '#111827' },
};

export const PERSON_TYPES = {
  athlete: {
    singular: 'Atleta',
    plural: 'Atletas',
    article: 'do atleta',
    route: '/athletes',
    apiPath: '/athletes',
    // Mantida como `['athletes']`: Overview e Strategy já leem essa chave.
    queryKey: 'athletes',
    eyebrow: 'Gestão',
    title: 'Central de atletas',
    description: 'Cadastre os atletas que você treina e acompanhe as análises de cada um.',
    accent: {
      button: 'bg-indigo-600 hover:bg-indigo-700',
      ring: 'focus:ring-indigo-500 focus:border-indigo-500',
      pill: 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20',
    },
  },
  opponent: {
    singular: 'Adversário',
    plural: 'Adversários',
    article: 'do adversário',
    route: '/opponents',
    apiPath: '/opponents',
    queryKey: 'opponents',
    eyebrow: 'Planejamento',
    title: 'Central de adversários',
    description: 'Cadastre os adversários para analisar vídeos e gerar estratégias contra eles.',
    accent: {
      button: 'bg-orange-600 hover:bg-orange-700',
      ring: 'focus:ring-orange-500 focus:border-orange-500',
      pill: 'border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-500/20',
    },
  },
};

export function personLabels(type) {
  const labels = PERSON_TYPES[type];
  if (!labels) throw new Error(`Tipo de pessoa desconhecido: ${type}`);
  return labels;
}

/**
 * Linha de atributos para selects e previews. Só mostra o que foi informado —
 * o backend deixou de fabricar `75 kg` / `25 anos` para campo omitido, e a UI
 * não deve reintroduzir isso com um "N/A" por atributo.
 */
export function describePerson(person) {
  if (!person) return '';
  const parts = [
    person.belt,
    person.weight != null ? `${person.weight} kg` : null,
    person.style,
    person.cardio != null ? `Condicionamento ${person.cardio}%` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' • ') : 'Sem atributos informados';
}
