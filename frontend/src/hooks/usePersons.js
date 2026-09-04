/**
 * Leitura e escrita de atletas/adversários via React Query (spec 013).
 *
 * O motivo de existir: a página de detalhe fazia `useEffect` cru e nunca
 * invalidava as queries das listas. Com `staleTime` de 5 minutos, um atleta
 * apagado continuava na lista e na contagem do Overview por até 5 minutos.
 * Toda mutação aqui invalida a lista e o registro; nenhuma tela precisa
 * lembrar de fazer isso.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { personService } from '../services/personService';
import { personLabels } from '../constants/persons';

export const personListKey = (type) => [personLabels(type).queryKey];
export const personKey = (type, id) => ['person', type, id];
export const personAnalysesKey = (id) => ['person-analyses', id];

export function usePersons(type) {
  return useQuery({
    queryKey: personListKey(type),
    queryFn: async () => (await personService(type).getAll())?.data || [],
  });
}

export function usePerson(type, id) {
  return useQuery({
    queryKey: personKey(type, id),
    queryFn: async () => (await personService(type).getById(id))?.data ?? null,
    enabled: Boolean(id),
  });
}

export function usePersonMutations(type) {
  const queryClient = useQueryClient();
  const svc = personService(type);

  const invalidate = (id) => {
    queryClient.invalidateQueries({ queryKey: personListKey(type) });
    if (id) queryClient.invalidateQueries({ queryKey: personKey(type, id) });
  };

  const create = useMutation({
    mutationFn: (data) => svc.create(data),
    onSuccess: () => invalidate(),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => svc.update(id, data),
    onSuccess: (_result, { id }) => invalidate(id),
  });

  const remove = useMutation({
    mutationFn: (id) => svc.remove(id),
    onSuccess: (_result, id) => {
      invalidate();
      queryClient.removeQueries({ queryKey: personKey(type, id) });
    },
  });

  return { create, update, remove, invalidate };
}
