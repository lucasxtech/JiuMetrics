// Atributos declarados da pessoa (spec 013).
//
// Existe porque agora o formulário os coleta. Antes, `age`, `weight`, `style`
// e `cardio` eram fabricados pelo backend, exibidos na tela de estratégia como
// fato, e não havia lugar nenhum onde o usuário pudesse vê-los ou corrigi-los.
//
// Campo não informado NÃO vira "N/A": ele simplesmente não aparece. Uma tela
// cheia de "N/A" é ruído; o painel some inteiro quando nada foi informado.
const CAMPOS = [
  { key: 'age', label: 'Idade', format: (v) => `${v} anos` },
  { key: 'weight', label: 'Peso', format: (v) => `${v} kg` },
  { key: 'height', label: 'Altura', format: (v) => `${v} cm` },
  { key: 'cardio', label: 'Condicionamento', format: (v) => `${v}%` },
  { key: 'style', label: 'Estilo', format: (v) => v },
];

const TEXTOS = [
  { key: 'strongAttacks', label: 'Pontos fortes' },
  { key: 'weaknesses', label: 'Pontos fracos' },
];

const informado = (v) => v !== null && v !== undefined && v !== '';

export default function PersonAttributes({ person, onEdit }) {
  const numeros = CAMPOS.filter((c) => informado(person[c.key]));
  const textos = TEXTOS.filter((t) => informado(person[t.key]));

  if (numeros.length === 0 && textos.length === 0) {
    return (
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Ficha</p>
            <h3 className="panel__title">Dados do lutador</h3>
            <p className="mt-1 text-sm text-slate-600">
              Nenhum dado informado além de nome e faixa.
            </p>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Preencher
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Ficha</p>
          <h3 className="panel__title">Dados do lutador</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Editar
        </button>
      </div>

      {numeros.length > 0 && (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {numeros.map(({ key, label, format }) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">{format(person[key])}</dd>
            </div>
          ))}
        </dl>
      )}

      {textos.length > 0 && (
        <dl className={`grid gap-4 sm:grid-cols-2 ${numeros.length > 0 ? 'mt-4' : ''}`}>
          {textos.map(({ key, label }) => (
            <div key={key}>
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{person[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
