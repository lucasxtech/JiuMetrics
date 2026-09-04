import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from '../../services/api';
import { usePersons, usePerson, usePersonMutations, personListKey, personKey } from '../usePersons';

vi.mock('../../services/api');

/**
 * O bug que estes testes fecham (spec 013): a página de detalhe trocava a
 * faixa e apagava registros sem invalidar `['athletes']`. Com `staleTime` de
 * 5 minutos, o atleta apagado continuava na lista e no Overview.
 */
function wrapperWith(client) {
  return function Wrapper({ children }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } },
  });
}

describe('usePersons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('usa a chave legada da lista, que Overview e Strategy já leem', () => {
    expect(personListKey('athlete')).toEqual(['athletes']);
    expect(personListKey('opponent')).toEqual(['opponents']);
  });

  it('lista e detalhe leem os endpoints certos por tipo', async () => {
    api.get.mockResolvedValueOnce({ data: { success: true, data: [{ id: 'a1', name: 'A' }] } });
    api.get.mockResolvedValueOnce({ data: { success: true, data: { id: 'o1', name: 'O' } } });
    const client = makeClient();

    const list = renderHook(() => usePersons('athlete'), { wrapper: wrapperWith(client) });
    await waitFor(() => expect(list.result.current.data).toEqual([{ id: 'a1', name: 'A' }]));
    expect(api.get).toHaveBeenCalledWith('/athletes');

    const one = renderHook(() => usePerson('opponent', 'o1'), { wrapper: wrapperWith(client) });
    await waitFor(() => expect(one.result.current.data).toEqual({ id: 'o1', name: 'O' }));
    expect(api.get).toHaveBeenCalledWith('/opponents/o1');
  });

  it('update invalida a lista e o registro mesmo com staleTime de 5 minutos', async () => {
    const client = makeClient();
    client.setQueryData(personListKey('athlete'), [{ id: 'a1', belt: 'Azul' }]);
    client.setQueryData(personKey('athlete', 'a1'), { id: 'a1', belt: 'Azul' });
    api.put.mockResolvedValue({ data: { success: true, data: { id: 'a1', belt: 'Roxa' } } });

    const { result } = renderHook(() => usePersonMutations('athlete'), { wrapper: wrapperWith(client) });
    await act(async () => {
      await result.current.update.mutateAsync({ id: 'a1', data: { belt: 'Roxa' } });
    });

    expect(api.put).toHaveBeenCalledWith('/athletes/a1', { belt: 'Roxa' });
    expect(client.getQueryState(personListKey('athlete')).isInvalidated).toBe(true);
    expect(client.getQueryState(personKey('athlete', 'a1')).isInvalidated).toBe(true);
  });

  it('remove invalida a lista e descarta o cache do registro', async () => {
    const client = makeClient();
    client.setQueryData(personListKey('opponent'), [{ id: 'o1' }]);
    client.setQueryData(personKey('opponent', 'o1'), { id: 'o1' });
    api.delete.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => usePersonMutations('opponent'), { wrapper: wrapperWith(client) });
    await act(async () => {
      await result.current.remove.mutateAsync('o1');
    });

    expect(api.delete).toHaveBeenCalledWith('/opponents/o1');
    expect(client.getQueryState(personListKey('opponent')).isInvalidated).toBe(true);
    expect(client.getQueryState(personKey('opponent', 'o1'))).toBeUndefined();
  });

  it('create invalida a lista', async () => {
    const client = makeClient();
    client.setQueryData(personListKey('athlete'), []);
    api.post.mockResolvedValue({ data: { success: true, data: { id: 'novo' } } });

    const { result } = renderHook(() => usePersonMutations('athlete'), { wrapper: wrapperWith(client) });
    await act(async () => {
      await result.current.create.mutateAsync({ name: 'Novo', belt: 'Branca' });
    });

    expect(api.post).toHaveBeenCalledWith('/athletes', { name: 'Novo', belt: 'Branca' });
    expect(client.getQueryState(personListKey('athlete')).isInvalidated).toBe(true);
  });
});
