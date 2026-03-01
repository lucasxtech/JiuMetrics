const AgentBase = require('./AgentBase');

/**
 * Agente especializado em regras IBJJF
 * Analisa: pontuação, vantagens, penalidades, técnicas ilegais, posições
 */
class RulesAgent extends AgentBase {
  constructor() {
    super(
      'Agente de Regras IBJJF',
      'agent-rules',
      [
        'scoring',
        'advantages',
        'penalties',
        'illegalTechniques',
        'positions'
      ],
      'gemini'
    );
  }

  /**
   * Parseia o resultado da análise de regras
   * @param {Object} result - Resultado da API Gemini
   * @param {Object} context - Contexto da análise
   * @returns {Object} Análise de regras estruturada
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
          scoring: data.scoring || {
            sweeps: { count: 0, points: 0 },
            guard_passes: { count: 0, points: 0 },
            mount: { count: 0, points: 0 },
            back_control: { count: 0, points: 0 },
            totalPoints: 0
          },
          advantages: data.advantages || {
            count: 0,
            reasons: []
          },
          penalties: data.penalties || {
            count: 0,
            reasons: []
          },
          illegalTechniques: data.illegalTechniques || {
            detected: false,
            techniques: []
          },
          positions: data.positions || {
            current: 'unknown',
            history: []
          },
          matchOutcome: data.matchOutcome || {
            scoreEstimate: 'unknown',
            warnings: []
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
          scoring: {
            sweeps: { count: 0, points: 0 },
            guard_passes: { count: 0, points: 0 },
            mount: { count: 0, points: 0 },
            back_control: { count: 0, points: 0 },
            totalPoints: 0
          },
          advantages: { count: 0, reasons: [] },
          penalties: { count: 0, reasons: [] },
          illegalTechniques: { detected: false, techniques: [] },
          positions: { current: 'unknown', history: [] },
          matchOutcome: { scoreEstimate: 'unknown', warnings: [] }
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

module.exports = RulesAgent;
