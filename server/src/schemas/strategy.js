/**
 * responseSchema canônico da estratégia tática (formato OpenAPI do Gemini).
 *
 * Fonte única do contrato de saída — o mesmo shape que o frontend renderiza
 * (AiStrategyBox/StrategySummaryModal) e que strategyFieldSchema.js valida
 * nas edições via chat. Se este schema mudar, atualizar os dois juntos.
 */

const { Type } = require('@google/genai');

const STRATEGY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    resumo_rapido: {
      type: Type.OBJECT,
      properties: {
        como_vencer: { type: Type.STRING, description: '1-2 frases explicando COMO vencer (estratégia macro)' },
        tres_prioridades: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Exatamente 3 prioridades táticas específicas e acionáveis',
        },
      },
      required: ['como_vencer', 'tres_prioridades'],
    },
    analise_de_matchup: {
      type: Type.OBJECT,
      properties: {
        vantagem_critica: { type: Type.STRING },
        risco_oculto: { type: Type.STRING },
        fator_chave: { type: Type.STRING },
      },
      required: ['vantagem_critica', 'risco_oculto', 'fator_chave'],
    },
    plano_tatico_faseado: {
      type: Type.OBJECT,
      properties: {
        em_pe_standup: {
          type: Type.OBJECT,
          properties: {
            acao_recomendada: { type: Type.STRING },
            explicacao: { type: Type.STRING },
            como_executar: { type: Type.STRING },
          },
          required: ['acao_recomendada', 'explicacao', 'como_executar'],
        },
        jogo_de_passagem_top: {
          type: Type.OBJECT,
          properties: {
            estilo_recomendado: { type: Type.STRING },
            passo_a_passo: { type: Type.STRING },
            armadilha_a_evitar: { type: Type.STRING },
          },
          required: ['estilo_recomendado', 'passo_a_passo', 'armadilha_a_evitar'],
        },
        jogo_de_guarda_bottom: {
          type: Type.OBJECT,
          properties: {
            guarda_ideal: { type: Type.STRING },
            momento_de_atacar: { type: Type.STRING },
            se_der_errado: { type: Type.STRING },
          },
          required: ['guarda_ideal', 'momento_de_atacar', 'se_der_errado'],
        },
      },
      required: ['em_pe_standup', 'jogo_de_passagem_top', 'jogo_de_guarda_bottom'],
    },
    cronologia_inteligente: {
      type: Type.OBJECT,
      properties: {
        primeiro_minuto: { type: Type.STRING },
        minutos_2_a_4: { type: Type.STRING },
        minutos_finais: { type: Type.STRING },
      },
      required: ['primeiro_minuto', 'minutos_2_a_4', 'minutos_finais'],
    },
    checklist_tatico: {
      type: Type.OBJECT,
      properties: {
        oportunidades_de_pontos: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              tecnica: { type: Type.STRING },
              pontos: { type: Type.INTEGER },
              probabilidade: { type: Type.STRING, enum: ['alta', 'media', 'baixa'] },
              quando: { type: Type.STRING },
              por_que_funciona: { type: Type.STRING },
            },
            required: ['tecnica', 'pontos', 'probabilidade', 'quando', 'por_que_funciona'],
          },
        },
        armadilhas_dele: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              situacao: { type: Type.STRING },
              o_que_ele_faz: { type: Type.STRING },
              como_evitar: { type: Type.STRING },
            },
            required: ['situacao', 'o_que_ele_faz', 'como_evitar'],
          },
        },
        protocolo_de_emergencia: {
          type: Type.OBJECT,
          properties: {
            posicao_perigosa: { type: Type.STRING },
            como_escapar: { type: Type.STRING },
          },
          required: ['posicao_perigosa', 'como_escapar'],
        },
      },
      required: ['oportunidades_de_pontos', 'armadilhas_dele', 'protocolo_de_emergencia'],
    },
  },
  required: [
    'resumo_rapido',
    'analise_de_matchup',
    'plano_tatico_faseado',
    'cronologia_inteligente',
    'checklist_tatico',
  ],
};

module.exports = { STRATEGY_SCHEMA };
