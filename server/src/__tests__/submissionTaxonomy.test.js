/**
 * Testes da taxonomia de finalizações.
 *
 * Contexto (auditoria 2026-09-02): `submissions.detalhes[].tecnica` é uma
 * string livre no schema — de propósito, porque a IA escreve nomes MAIS
 * específicos que a lista canônica ("triângulo invertido", "chave de pé
 * reta"). O defeito não é a liberdade, é a AGREGAÇÃO: `finalizacoes_mais_usadas`
 * agrupava por string exata, então três variantes de triângulo viravam três
 * técnicas distintas de 1x cada, e a "preferência" que chega na estratégia
 * ficava fragmentada — em 3 das 8 análises do pipeline atual.
 */

const { canonicalizeSubmission, groupSubmissions } = require('../utils/submissionTaxonomy');

describe('canonicalizeSubmission', () => {
  it('mantém um rótulo canônico exato', () => {
    expect(canonicalizeSubmission('triângulo')).toBe('triângulo');
    expect(canonicalizeSubmission('arm lock')).toBe('arm lock');
  });

  it('agrupa variante mais específica na família canônica', () => {
    expect(canonicalizeSubmission('triângulo invertido')).toBe('triângulo');
    expect(canonicalizeSubmission('triângulo voador')).toBe('triângulo');
    expect(canonicalizeSubmission('chave de pé reta')).toBe('chave de pé');
  });

  it('prefere o rótulo canônico MAIS LONGO quando há mais de um contido', () => {
    // "mata leão no pé" e "mata leão" são ambos canônicos: o específico vence.
    expect(canonicalizeSubmission('mata leão no pé')).toBe('mata leão no pé');
    // "estrangulamento com lapela" contém "estrangulamento", mas é canônico.
    expect(canonicalizeSubmission('estrangulamento com lapela')).toBe('estrangulamento com lapela');
  });

  it('NÃO inventa família para técnica que não pertence a nenhuma', () => {
    // Casos reais em produção. "chave de joelho" não é "chave de pé".
    expect(canonicalizeSubmission('chave de joelho')).toBe('chave de joelho');
    expect(canonicalizeSubmission('toe hold')).toBe('toe hold');
  });

  it('é insensível a caixa, acento e espaço em volta', () => {
    expect(canonicalizeSubmission('  TRIÂNGULO Invertido ')).toBe('triângulo');
    expect(canonicalizeSubmission('triangulo')).toBe('triângulo');
  });

  it('devolve null para entrada vazia ou inválida', () => {
    expect(canonicalizeSubmission('')).toBeNull();
    expect(canonicalizeSubmission(null)).toBeNull();
    expect(canonicalizeSubmission(undefined)).toBeNull();
    expect(canonicalizeSubmission(42)).toBeNull();
  });

  it('não casa substring parcial de palavra', () => {
    // "omoplata" é canônico; "baratoplata" não deve virar "omoplata".
    expect(canonicalizeSubmission('baratoplata')).toBe('baratoplata');
  });
});

describe('groupSubmissions', () => {
  it('soma variantes da mesma família em uma entrada só', () => {
    const resultado = groupSubmissions([
      { tecnica: 'triângulo voador', resultado: 'tentada' },
      { tecnica: 'triângulo invertido', resultado: 'ajustada' },
      { tecnica: 'triângulo', resultado: 'concluida' },
    ]);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({ tecnica: 'triângulo', quantidade: 3 });
  });

  it('preserva as variantes observadas, sem repetir a própria família', () => {
    const resultado = groupSubmissions([
      { tecnica: 'triângulo voador', resultado: 'tentada' },
      { tecnica: 'triângulo', resultado: 'concluida' },
    ]);

    expect(resultado[0].variantes).toEqual(['triângulo voador']);
  });

  it('ordena por quantidade decrescente', () => {
    const resultado = groupSubmissions([
      { tecnica: 'arm lock', resultado: 'tentada' },
      { tecnica: 'triângulo voador', resultado: 'tentada' },
      { tecnica: 'triângulo invertido', resultado: 'tentada' },
    ]);

    expect(resultado.map(r => r.tecnica)).toEqual(['triângulo', 'arm lock']);
  });

  it('aceita o formato legado (string solta) sem colapsar em [object Object]', () => {
    const resultado = groupSubmissions(['triângulo voador', 'triângulo']);

    expect(resultado).toHaveLength(1);
    expect(resultado[0].quantidade).toBe(2);
  });

  it('ignora entradas sem técnica em vez de contá-las', () => {
    const resultado = groupSubmissions([
      { resultado: 'tentada' },
      null,
      { tecnica: '', resultado: 'tentada' },
      { tecnica: 'arm lock', resultado: 'tentada' },
    ]);

    expect(resultado).toEqual([{ tecnica: 'arm lock', quantidade: 1, variantes: [] }]);
  });

  it('devolve lista vazia para entrada vazia ou inválida', () => {
    expect(groupSubmissions([])).toEqual([]);
    expect(groupSubmissions(null)).toEqual([]);
    expect(groupSubmissions('nada disso')).toEqual([]);
  });
});
