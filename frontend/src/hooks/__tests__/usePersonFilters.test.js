import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersonFilters, normalizeText } from '../usePersonFilters';

const PESSOAS = [
  { id: '1', name: 'João Silva', belt: 'Roxa', analysesCount: 2, createdAt: '2026-01-10T00:00:00Z' },
  { id: '2', name: 'Ana Costa', belt: 'Preta', analysesCount: 5, createdAt: '2026-03-01T00:00:00Z' },
  { id: '3', name: 'Bruno Álvares', belt: 'Azul', analysesCount: 0, createdAt: '2026-02-01T00:00:00Z' },
];

describe('normalizeText', () => {
  it('remove acento e caixa', () => {
    expect(normalizeText('João')).toBe('joao');
    expect(normalizeText('ÁLVARES')).toBe('alvares');
    expect(normalizeText(null)).toBe('');
  });
});

describe('usePersonFilters', () => {
  it('ordena por nome por padrão', () => {
    const { result } = renderHook(() => usePersonFilters(PESSOAS));
    expect(result.current.visible.map((p) => p.name)).toEqual([
      'Ana Costa',
      'Bruno Álvares',
      'João Silva',
    ]);
  });

  it('busca sem acento encontra nome com acento', () => {
    const { result } = renderHook(() => usePersonFilters(PESSOAS));
    act(() => result.current.setSearch('joao'));
    expect(result.current.visible.map((p) => p.id)).toEqual(['1']);

    act(() => result.current.setSearch('alvares'));
    expect(result.current.visible.map((p) => p.id)).toEqual(['3']);
  });

  it('busca também pela faixa', () => {
    const { result } = renderHook(() => usePersonFilters(PESSOAS));
    act(() => result.current.setSearch('preta'));
    expect(result.current.visible.map((p) => p.name)).toEqual(['Ana Costa']);
  });

  it('ordena por mais análises e por mais recente', () => {
    const { result } = renderHook(() => usePersonFilters(PESSOAS));

    act(() => result.current.setSort('analyses'));
    expect(result.current.visible.map((p) => p.analysesCount)).toEqual([5, 2, 0]);

    act(() => result.current.setSort('recent'));
    expect(result.current.visible.map((p) => p.id)).toEqual(['2', '3', '1']);
  });

  it('não muta o array recebido — ele vem do cache do React Query', () => {
    const original = [...PESSOAS];
    const { result } = renderHook(() => usePersonFilters(PESSOAS));
    act(() => result.current.setSort('analyses'));
    expect(PESSOAS).toEqual(original);
  });

  it('busca sem resultado devolve lista vazia', () => {
    const { result } = renderHook(() => usePersonFilters(PESSOAS));
    act(() => result.current.setSearch('zzz'));
    expect(result.current.visible).toEqual([]);
  });
});
