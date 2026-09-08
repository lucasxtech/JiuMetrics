import BeltSelect from './BeltSelect';
import { personLabels } from '../../constants/persons';

export default function PersonHeader({ person, type, savingBelt, onBeltChange, onBack, onEdit, onDelete }) {
  const labels = personLabels(type);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <button type="button" onClick={onBack} className="mb-2 flex items-center text-secondary hover:text-blue-700">
          ← Voltar para {labels.plural.toLowerCase()}
        </button>
        <h1 className="text-3xl font-bold text-primary">{person.name}</h1>
        <div className="mt-2 flex items-center gap-3">
          <BeltSelect value={person.belt} onChange={onBeltChange} disabled={savingBelt} />
          {person.creatorName && <span className="text-xs text-slate-500">cadastrado por {person.creatorName}</span>}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow-lg"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-600"
        >
          Excluir
        </button>
      </div>
    </div>
  );
}
