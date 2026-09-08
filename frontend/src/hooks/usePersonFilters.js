/**
 * Busca e ordenação da lista de atletas/adversários (spec 013).
 *
 * Deliberadamente **no cliente**: `GET /api/athletes` já traz todas as linhas
 * do escopo (não há paginação), então filtrar aqui não custa requisição
 * nenhuma e responde a cada tecla. Quando a listagem ganhar paginação de
 * verdade, isto vira parâmetro de query — e este hook é o ponto único a mudar.
 */
import { useMemo, useState } from 'react';

export const SORT_OPTIONS = [
  { value: 'name', label: 'Nome (A–Z)' },
  { value: 'analyses', label: 'Mais análises' },
  { value: 'recent', label: 'Mais recentes' },
];

/** Sem acento e sem caixa — "joao" acha "João". */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const comparators = {
  name: (a, b) => normalizeText(a.name).localeCompare(normalizeText(b.name)),
  analyses: (a, b) => (b.analysesCount || 0) - (a.analysesCount || 0),
  recent: (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
};

export function usePersonFilters(people) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');

  const visible = useMemo(() => {
    const term = normalizeText(search);
    const filtered = term
      ? people.filter(
          (p) => normalizeText(p.name).includes(term) || normalizeText(p.belt).includes(term)
        )
      : people;
    // Cópia antes de ordenar: `people` vem do cache do React Query e ordenar
    // no lugar mutaria o dado compartilhado com Overview e Strategy.
    return [...filtered].sort(comparators[sort] || comparators.name);
  }, [people, search, sort]);

  return { search, setSearch, sort, setSort, visible };
}
