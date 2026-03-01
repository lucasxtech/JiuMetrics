const AgentBase = require('./AgentBase');

/**
 * Agente especializado em análise tática
 * Analisa: gameplan, timing, posicionamento, controle de pressão, adaptabilidade
 */
class TacticalAgent extends AgentBase {
  constructor() {
    super(
      'Agente Tático',
      'agent-tactical',
      [
        'gameplan',
        'timing',
        'positioning',
        'pressureControl',
        'adaptability'
      ],
      'gemini'
    );
  }

  /**
   * Parseia o resultado da análise tática
   * @param {Object} result - Resultado da API Gemini
   * @param {Object} context - Contexto da análise
   * @returns {Object} Análise tática estruturada
   */
  parseResult(result, context) {
    try {
      const text = result.response.text();
      const data = this.extractJSON(text);
      const confidence = data.confidence || this.extractConfidence(result);

      return {
        agentName: this.name,
        confidence,
        data: {
          gameplan: data.gameplan || {
            identified: 'unknown',
            consistency: 0,
            clarity: 0
          },
          timing: data.timing || {
            reactive: 50,
            proactive: 50,
            examples: []
          },
          positioning: data.positioning || {
            dominanceOriented: false,
            riskTolerance: 5,
            examples: []
          },
          pressureControl: data.pressureControl || {
            applies: false,
            seeks: false,
            intensity: 0
          },
          adaptability: data.adaptability || {
            observed: false,
            examples: []
          }
        },
        insights: data.keyInsights || [],
        usage: {
          promptTokenCount: result.response?.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: result.response?.usageMetadata?.candidatesTokenCount || 0,
          totalTokenCount: result.response?.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao parsear resultado:`, error.message);
      
      return {
        agentName: this.name,
        confidence: 0.3,
        data: {
          gameplan: { identified: 'unknown', consistency: 0 },
          timing: { reactive: 50, proactive: 50, examples: [] },
          positioning: { dominanceOriented: false, riskTolerance: 5 },
          pressureControl: { applies: false, seeks: false, intensity: 0 },
          adaptability: { observed: false, examples: [] }
        },
        insights: [],
        usage: {
          promptTokenCount: 0,
          candidatesTokenCount: 0,
          totalTokenCount: 0
        },
        error: error.message
      };
    }
  }
}

module.exports = TacticalAgent;
