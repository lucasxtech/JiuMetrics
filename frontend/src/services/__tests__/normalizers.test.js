/**
 * SPEC-010 (R3) — normalização na fronteira.
 *
 * O defeito que isto corrige: **o produto escondia dado que possuía.** As
 * estatísticas técnicas apareciam na tela logo depois de analisar o vídeo e
 * **nunca** apareciam no histórico, porque as duas origens entregavam o mesmo
 * dado com nomes diferentes:
 *
 * - `POST /api/ai/analyze-link` → `technical_stats` (snake, da consolidação da IA)
 * - `GET /api/fight-analysis/...` → `technicalStats` (camel, do `parseAnalysisFromDB`)
 *
 * ...e `VideoAnalysisCard` lia `technical_stats`.
 *
 * Por isso o teste central aqui compara as DUAS origens: com fixtures reais de
 * cada uma, o shape resultante tem de ser o mesmo. Verificar só uma delas não
 * provaria nada — o bug era justamente a divergência.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeAnalysis,
  normalizeAnalyses,
  normalizeAnalysisResponse,
} from '../normalizers';

const STATS = {
  sweeps: { quantidade: 3, efetividade_percentual: 66 },
  submissions: { tentativas: 2, ajustadas: 1, concluidas: 1, detalhes: ['triângulo'] },
  back_takes: { quantidade: 1, tentou_finalizar: true },
};

/** Como o banco devolve (parseAnalysisFromDB → camelCase). */
const doBanco = {
  id: 'analysis-1',
  summary: 'resumo',
  charts: [],
  videoUrl: 'https://youtube.com/watch?v=abc',
  framesAnalyzed: 1,
  createdAt: '2026-08-18T10:00:00.000Z',
  technicalStats: STATS,
};

/** Como a resposta imediata do analyze-link devolve (snake, da IA). */
const daIa = {
  summary: 'resumo',
  charts: [],
  videosAnalyzed: 1,
  technical_stats: STATS,
};

describe('normalizeAnalysis', () => {
  it('as DUAS origens produzem o mesmo acesso a technicalStats', () => {
    // Este é o teste que importa: era exatamente aqui que elas divergiam.
    expect(normalizeAnalysis(doBanco).technicalStats).toEqual(STATS);
    expect(normalizeAnalysis(daIa).technicalStats).toEqual(STATS);
  });

  it('preserva os demais campos de cada origem', () => {
    const banco = normalizeAnalysis(doBanco);
    expect(banco.id).toBe('analysis-1');
    expect(banco.videoUrl).toBe('https://youtube.com/watch?v=abc');
    expect(banco.framesAnalyzed).toBe(1);

    expect(normalizeAnalysis(daIa).videosAnalyzed).toBe(1);
  });

  it('mantém o nome antigo preenchido, para não quebrar tela ainda não migrada', () => {
    // Remover o campo trocaria "dado invisível" por "tela quebrada".
    expect(normalizeAnalysis(doBanco).technical_stats).toEqual(STATS);
  });

  it('análise sem estatística nenhuma vira null explícito, não undefined', () => {
    const semStats = normalizeAnalysis({ id: 'x', summary: 'y' });

    expect(semStats.technicalStats).toBeNull();
    expect('technicalStats' in semStats).toBe(true);
  });

  it('camelCase vence quando as duas chaves vêm juntas', () => {
    const conflito = normalizeAnalysis({ technicalStats: STATS, technical_stats: { sweeps: {} } });

    expect(conflito.technicalStats).toEqual(STATS);
  });

  it('não quebra com entrada inválida', () => {
    expect(normalizeAnalysis(null)).toBeNull();
    expect(normalizeAnalysis(undefined)).toBeUndefined();
    expect(normalizeAnalysis('texto')).toBe('texto');
  });
});

describe('normalizeAnalyses', () => {
  it('normaliza a lista inteira', () => {
    const lista = normalizeAnalyses([doBanco, daIa]);

    expect(lista).toHaveLength(2);
    expect(lista.every((a) => a.technicalStats !== undefined)).toBe(true);
  });

  it('devolve array vazio para entrada não-array', () => {
    expect(normalizeAnalyses(null)).toEqual([]);
    expect(normalizeAnalyses({})).toEqual([]);
  });
});

describe('normalizeAnalysisResponse', () => {
  it('normaliza `data` quando é lista (listagem do histórico)', () => {
    const res = normalizeAnalysisResponse({ success: true, data: [doBanco] });

    expect(res.success).toBe(true);
    expect(res.data[0].technicalStats).toEqual(STATS);
  });

  it('normaliza `data` quando é objeto (resposta imediata da IA)', () => {
    const res = normalizeAnalysisResponse({ success: true, data: daIa });

    expect(res.data.technicalStats).toEqual(STATS);
  });

  it('passa adiante resposta sem `data`', () => {
    expect(normalizeAnalysisResponse({ success: false, error: 'x' })).toEqual({
      success: false,
      error: 'x',
    });
  });
});
