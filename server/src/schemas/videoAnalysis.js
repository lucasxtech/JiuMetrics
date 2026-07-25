/**
 * responseSchema canônico da análise de vídeo (formato OpenAPI do Gemini).
 *
 * É a fonte única do contrato de saída da IA para análise de luta —
 * substitui o "JSON de exemplo dentro do prompt + extractJson com regex"
 * que causava os bugs de parse da Fase 0. O shape espelha exatamente o
 * que o frontend e a consolidação já consomem.
 */

const { Type } = require('@google/genai');
const { CHART_TITLES } = require('../config/ai');

const chartDataItem = {
  type: Type.OBJECT,
  properties: {
    label: { type: Type.STRING, description: 'Label canônica observada (use exatamente as listadas no prompt)' },
    value: { type: Type.INTEGER, description: 'Intensidade relativa 0-100. Se não observado, omita o item — não invente.' },
  },
  required: ['label', 'value'],
};

const VIDEO_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    charts: {
      type: Type.ARRAY,
      description: 'Apenas gráficos com pelo menos um comportamento observado. Omita gráficos vazios.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            enum: Object.values(CHART_TITLES),
          },
          data: { type: Type.ARRAY, items: chartDataItem },
        },
        required: ['title', 'data'],
      },
    },
    technical_stats: {
      type: Type.OBJECT,
      properties: {
        sweeps: {
          type: Type.OBJECT,
          properties: {
            quantidade: { type: Type.INTEGER },
            efetividade_percentual: { type: Type.INTEGER },
          },
          required: ['quantidade', 'efetividade_percentual'],
        },
        guard_passes: {
          type: Type.OBJECT,
          properties: {
            quantidade: { type: Type.INTEGER },
          },
          required: ['quantidade'],
        },
        submissions: {
          type: Type.OBJECT,
          properties: {
            tentativas: { type: Type.INTEGER },
            ajustadas: { type: Type.INTEGER },
            concluidas: { type: Type.INTEGER },
            detalhes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  tecnica: { type: Type.STRING },
                  resultado: { type: Type.STRING, enum: ['tentada', 'ajustada', 'concluida'] },
                },
                required: ['tecnica', 'resultado'],
              },
            },
          },
          required: ['tentativas', 'ajustadas', 'concluidas', 'detalhes'],
        },
        back_takes: {
          type: Type.OBJECT,
          properties: {
            quantidade: { type: Type.INTEGER },
            tentou_finalizar: { type: Type.BOOLEAN },
          },
          required: ['quantidade', 'tentou_finalizar'],
        },
      },
      required: ['sweeps', 'guard_passes', 'submissions', 'back_takes'],
    },
    summary: {
      type: Type.STRING,
      description: 'Resumo técnico narrativo em texto corrido, sem markdown, seguindo as regras do prompt.',
    },
  },
  required: ['charts', 'technical_stats', 'summary'],
};

module.exports = { VIDEO_ANALYSIS_SCHEMA };
