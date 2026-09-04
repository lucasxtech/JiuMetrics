// Seletor de faixa da página de detalhe (spec 012). Era um dropdown
// artesanal de ~70 linhas com overlay próprio; um `<select>` nativo faz o
// mesmo, com teclado e leitor de tela de graça.
import { BELTS, BELT_COLORS } from '../../constants/persons';

export default function BeltSelect({ value, onChange, disabled = false }) {
  const colors = BELT_COLORS[value] || BELT_COLORS.Branca;

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="sr-only">Faixa</span>
      <select
        value={BELTS.includes(value) ? value : ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label="Faixa"
        style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
        className={`cursor-pointer rounded-md border-2 px-3 py-1 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
          disabled ? 'cursor-wait opacity-60' : ''
        }`}
      >
        {!BELTS.includes(value) && <option value="">Faixa não informada</option>}
        {BELTS.map((belt) => (
          <option key={belt} value={belt}>
            Faixa {belt}
          </option>
        ))}
      </select>
      {disabled && <span className="text-xs text-slate-500">salvando…</span>}
    </label>
  );
}
