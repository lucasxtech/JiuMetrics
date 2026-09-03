/**
 * Testes das regras de qualidade de análise.
 *
 * Cada caso abaixo é derivado de dado REAL de produção (auditoria 2026-09-02,
 * 285 análises). As fixtures não são inventadas: são a forma das saídas que o
 * sistema de fato gravou.
 */

jest.mock('../config/supabase', () => ({ supabase: {} }));

const { inspectAnalysis, summarizeQuality } = require('../utils/analysisQuality');

/** Análise mínima e íntegra: passa em todas as regras. */
const analiseLimpa = () => ({
  charts: [
    { title: 'Personalidade Geral', data: [{ label: 'agressivo', value: 60 }, { label: 'ritmo constante', value: 40 }] },
    { title: 'Jogo de Guarda', data: [{ label: 'de la riva', value: 70 }, { label: 'meia guarda', value: 30 }] },
  ],
  technical_stats: {
    sweeps: { quantidade: 2, efetividade_percentual: 50 },
    guard_passes: { quantidade: 1 },
    submissions: { tentativas: 1, ajustadas: 1, concluidas: 0, detalhes: [{ tecnica: 'arm lock', resultado: 'ajustada' }] },
    back_takes: { quantidade: 0, tentou_finalizar: false },
  },
  summary: 'Atleta puxou para a guarda e raspou duas vezes com de la riva.',
});

const regrasDe = (a) => inspectAnalysis(a).map((f) => f.regra);

describe('inspectAnalysis — análise íntegra', () => {
  it('não acusa nada numa análise coerente', () => {
    expect(inspectAnalysis(analiseLimpa())).toEqual([]);
  });

  it('não quebra com entrada malformada, nula ou vazia', () => {
    expect(() => inspectAnalysis(null)).not.toThrow();
    expect(() => inspectAnalysis({})).not.toThrow();
    expect(() => inspectAnalysis({ charts: 'não é array', technical_stats: 7 })).not.toThrow();
  });

  it('aceita technicalStats em camelCase (fronteira do banco devolve as duas formas)', () => {
    const a = analiseLimpa();
    a.technicalStats = a.technical_stats;
    delete a.technical_stats;
    expect(inspectAnalysis(a)).toEqual([]);
  });
});

describe('contradições internas (severidade erro)', () => {
  it('detecta gráfico de passagem sem nenhuma passagem — caso real, 6 em 285', () => {
    const a = analiseLimpa();
    a.charts.push({ title: 'Jogo de Passagem', data: [{ label: 'pressão de quadril', value: 100 }] });
    a.technical_stats.guard_passes.quantidade = 0;
    expect(regrasDe(a)).toContain('passagem-sem-passagem');
  });

  it('detecta efetividade de raspagem sem raspagem', () => {
    const a = analiseLimpa();
    a.technical_stats.sweeps = { quantidade: 0, efetividade_percentual: 80 };
    expect(regrasDe(a)).toContain('efetividade-sem-raspagem');
  });

  it('detecta tentativa de finalizar as costas sem ter pego as costas', () => {
    const a = analiseLimpa();
    a.technical_stats.back_takes = { quantidade: 0, tentou_finalizar: true };
    expect(regrasDe(a)).toContain('costas-sem-costas');
  });

  it('detecta tentativas divergindo do tamanho de detalhes', () => {
    const a = analiseLimpa();
    a.technical_stats.submissions.tentativas = 5;
    expect(regrasDe(a)).toContain('contagem-de-finalizacoes-inconsistente');
  });

  it('detecta aritmética impossível: concluidas + ajustadas > tentativas', () => {
    const a = analiseLimpa();
    a.technical_stats.submissions = {
      tentativas: 1, ajustadas: 1, concluidas: 1,
      detalhes: [{ tecnica: 'arm lock', resultado: 'concluida' }],
    };
    expect(regrasDe(a)).toContain('contagem-de-finalizacoes-inconsistente');
  });

  it('detecta rótulo fora do vocabulário canônico — caso real da era multi-agente', () => {
    const a = analiseLimpa();
    a.charts[0].data = [{ label: 'defensivo', value: 60 }, { label: 'controlador', value: 40 }];
    expect(regrasDe(a)).toContain('rotulo-fora-do-vocabulario');
  });

  it('detecta título de gráfico fora do enum', () => {
    const a = analiseLimpa();
    a.charts.push({ title: 'Gráfico Inventado', data: [{ label: 'x', value: 100 }] });
    expect(regrasDe(a)).toContain('rotulo-fora-do-vocabulario');
  });

  it('detecta gráfico que não soma 100', () => {
    const a = analiseLimpa();
    a.charts[0].data = [{ label: 'agressivo', value: 60 }, { label: 'explosivo', value: 30 }];
    expect(regrasDe(a)).toContain('grafico-nao-soma-100');
  });
});

describe('defeitos de método (severidade aviso)', () => {
  it('sinaliza fatia única em 100% — o padrão dominante: 8 de 8 no pipeline atual', () => {
    const a = analiseLimpa();
    a.charts = [{ title: 'Jogo de Passagem', data: [{ label: 'pressão de quadril', value: 100 }] }];
    a.technical_stats.guard_passes.quantidade = 1; // isola o aviso do erro
    const achados = inspectAnalysis(a);
    expect(achados.map((f) => f.regra)).toContain('fatia-unica-100');
    expect(achados.find((f) => f.regra === 'fatia-unica-100').severidade).toBe('aviso');
  });

  it('sinaliza contagem disfarçada de percentual (33/33/34)', () => {
    const a = analiseLimpa();
    a.charts = [{
      title: 'Tentativas de Finalização',
      data: [{ label: 'triângulo', value: 33 }, { label: 'omoplata', value: 33 }, { label: 'tarikoplata', value: 34 }],
    }];
    expect(regrasDe(a)).toContain('contagem-disfarcada-de-percentual');
  });

  it('sinaliza ausência total de technical_stats — 277 das 285 análises', () => {
    const a = analiseLimpa();
    delete a.technical_stats;
    expect(regrasDe(a)).toContain('sem-dados-quantitativos');
  });

  it('sinaliza technical_stats inteiramente zerado', () => {
    const a = analiseLimpa();
    a.technical_stats = {
      sweeps: { quantidade: 0, efetividade_percentual: 0 },
      guard_passes: { quantidade: 0 },
      submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
      back_takes: { quantidade: 0, tentou_finalizar: false },
    };
    expect(regrasDe(a)).toContain('sem-dados-quantitativos');
  });

  it('sinaliza resumo com linguagem que o prompt proíbe', () => {
    const a = analiseLimpa();
    a.summary = 'Atleta de agilidade impressionante que dominou a luta.';
    expect(regrasDe(a)).toContain('resumo-com-linguagem-proibida');
  });

  it('não confunde texto técnico legítimo com linguagem proibida', () => {
    const a = analiseLimpa();
    a.summary = 'Raspou com de la riva e passou com toreada, buscando as costas.';
    expect(regrasDe(a)).not.toContain('resumo-com-linguagem-proibida');
  });
});

describe('summarizeQuality', () => {
  it('conta cada regra uma vez por análise, não uma vez por ocorrência', () => {
    const a = analiseLimpa();
    // Dois rótulos fora do vocabulário na MESMA análise = 1 análise afetada.
    a.charts[0].data = [{ label: 'defensivo', value: 60 }, { label: 'controlador', value: 40 }];
    const resumo = summarizeQuality([a]);
    expect(resumo.porRegra['rotulo-fora-do-vocabulario']).toBe(1);
    expect(resumo.comErro).toBe(1);
  });

  it('separa erro de aviso', () => {
    const soAviso = analiseLimpa();
    soAviso.charts = [{ title: 'Jogo de Guarda', data: [{ label: 'de la riva', value: 100 }] }];
    const resumo = summarizeQuality([soAviso]);
    expect(resumo.comErro).toBe(0);
    expect(resumo.comAviso).toBe(1);
  });

  it('resume conjunto vazio ou inválido sem quebrar', () => {
    expect(summarizeQuality([])).toEqual({ total: 0, comErro: 0, comAviso: 0, porRegra: {} });
    expect(summarizeQuality(null).total).toBe(0);
  });

  it('conta o total mesmo quando nada é acusado', () => {
    const resumo = summarizeQuality([analiseLimpa(), analiseLimpa()]);
    expect(resumo).toEqual({ total: 2, comErro: 0, comAviso: 0, porRegra: {} });
  });
});
