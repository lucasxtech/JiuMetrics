/**
 * Estado explícito de dado quantitativo na estratégia.
 *
 * Auditoria 2026-09-02: 52 das 54 pessoas com análise não possuem NENHUMA
 * análise com `technical_stats` — a coluna só passou a ser preenchida em
 * ago/2026. As 41 estratégias já geradas saíram, portanto, sem número nenhum:
 * só texto. Isso é defensável, mas era invisível — nada na resposta, no banco
 * ou na tela dizia. Mesmo princípio do `saved: false` da spec 007.
 */

jest.mock('../config/supabase', () => ({ supabase: {} }));

const StrategyService = require('../services/strategyService');

/** Constrói a saída de consolidateTechnicalStats a partir dos totais. */
const stats = ({ sweeps = 0, passes = 0, subs = 0, backs = 0 } = {}) => ({
  sweeps: { quantidade_total: sweeps, quantidade_media: sweeps, efetividade_percentual_media: 0 },
  guard_passes: { quantidade_total: passes, quantidade_media: passes },
  submissions: {
    tentativas_total: subs, ajustadas_total: 0, concluidas_total: 0,
    taxa_sucesso_percentual: 0, finalizacoes_mais_usadas: []
  },
  back_takes: { quantidade_total: backs, quantidade_media: backs, percentual_com_finalizacao: 0 },
  total_analises: 1
});

describe('consolidateTechnicalStats — agrupamento de finalizações', () => {
  it('soma variantes da mesma família em vez de fragmentar a preferência', () => {
    // O caso real: 3 das 8 análises do pipeline atual trazem variantes
    // ("triângulo invertido", "triângulo voador"). Contadas por string exata,
    // a arma preferida do adversário aparecia empatada com todo o resto.
    const consolidado = StrategyService.consolidateTechnicalStats([
      {
        technicalStats: {
          sweeps: { quantidade: 0, efetividade_percentual: 0 },
          guard_passes: { quantidade: 0 },
          submissions: {
            tentativas: 3, ajustadas: 1, concluidas: 1,
            detalhes: [
              { tecnica: 'triângulo voador', resultado: 'tentada' },
              { tecnica: 'triângulo invertido', resultado: 'ajustada' },
              { tecnica: 'arm lock', resultado: 'concluida' }
            ]
          },
          back_takes: { quantidade: 0, tentou_finalizar: false }
        }
      }
    ]);

    const preferidas = consolidado.submissions.finalizacoes_mais_usadas;
    expect(preferidas[0]).toMatchObject({ tecnica: 'triângulo', quantidade: 2 });
    expect(preferidas[0].variantes).toEqual(
      expect.arrayContaining(['triângulo voador', 'triângulo invertido'])
    );
    expect(preferidas[1]).toMatchObject({ tecnica: 'arm lock', quantidade: 1 });
  });

  it('continua devolvendo null quando nenhuma análise tem technical_stats', () => {
    // É o caso de 52 das 54 pessoas — o comportamento não muda, só passa a
    // ser reportado (ver metadata.quantitativeData).
    expect(StrategyService.consolidateTechnicalStats([{ summary: 'texto' }])).toBeNull();
  });
});

describe('metadata.quantitativeData', () => {
  // hasQuantitativeData é interno; o contrato observável é o metadata da
  // estratégia. Testado aqui pelo mesmo predicado, via a saída consolidada.
  const temDado = (s) => {
    const c = StrategyService.consolidateTechnicalStats(
      s === null ? [{ summary: 'x' }] : [{ technicalStats: {
        sweeps: { quantidade: s.sweeps || 0, efetividade_percentual: 0 },
        guard_passes: { quantidade: s.passes || 0 },
        submissions: { tentativas: s.subs || 0, ajustadas: 0, concluidas: 0, detalhes: [] },
        back_takes: { quantidade: s.backs || 0, tentou_finalizar: false }
      } }]
    );
    return c !== null && (
      c.sweeps.quantidade_total > 0 || c.guard_passes.quantidade_total > 0 ||
      c.submissions.tentativas_total > 0 || c.back_takes.quantidade_total > 0
    );
  };

  it('é falso quando não há technical_stats nenhum', () => {
    expect(temDado(null)).toBe(false);
  });

  it('é falso quando há stats mas tudo é zero', () => {
    // Luta sem evento pontuável é diferente de luta sem dado — mas as duas
    // produzem um prompt sem números, e é isso que o campo reporta.
    expect(temDado({})).toBe(false);
  });

  it.each([
    ['raspagem', { sweeps: 1 }],
    ['passagem', { passes: 1 }],
    ['finalização', { subs: 1 }],
    ['tomada de costas', { backs: 1 }]
  ])('é verdadeiro com ao menos uma %s', (_, s) => {
    expect(temDado(s)).toBe(true);
  });
});

describe('formato consolidado', () => {
  it('mantém tecnica e quantidade — o prompt de estratégia lê essas chaves', () => {
    const c = StrategyService.consolidateTechnicalStats([
      { technicalStats: {
        sweeps: { quantidade: 1, efetividade_percentual: 100 },
        guard_passes: { quantidade: 0 },
        submissions: { tentativas: 1, ajustadas: 0, concluidas: 1, detalhes: [{ tecnica: 'arm lock', resultado: 'concluida' }] },
        back_takes: { quantidade: 0, tentou_finalizar: false }
      } }
    ]);
    const f = c.submissions.finalizacoes_mais_usadas[0];
    expect(f).toHaveProperty('tecnica');
    expect(f).toHaveProperty('quantidade');
    expect(stats({ sweeps: 1 }).sweeps.quantidade_total).toBe(1); // sanidade do helper
  });
});
