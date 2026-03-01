const AgentBase = require('./AgentBase');

/**
 * Agente especializado em análise técnica
 * Analisa: guarda, passagem, posições dominantes, finalizações, transições, defesa
 */
class TechnicalAgent extends AgentBase {
  constructor() {
    super(
      'Agente Técnico',
      'agent-technical',
      [
        'guardGame',
        'passingGame',
        'dominantPositions',
        'submissions',
        'transitions',
        'defense',
        'sweeps'
      ],
      'gemini'
    );
  }

  /**
   * Parseia o resultado da análise técnica
   * @param {Object} result - Resultado da API Gemini
   * @param {Object} context - Contexto da análise
   * @returns {Object} Análise técnica estruturada
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
          guardGame: data.guardGame || {
            observed: false,
            types: [],
            controls: [],
            attacks: [],
            effectiveness: 0
          },
          passingGame: data.passingGame || {
            observed: false,
            types: [],
            pressure: 0,
            success: 0
          },
          dominantPositions: data.dominantPositions || {
            mount: { achieved: false },
            back: { achieved: false },
            sideControl: { achieved: false }
          },
          submissions: data.submissions || {
            attempts: [],
            diversity: 0,
            from_guard: [],
            from_top: [],
            from_transition: []
          },
          transitions: data.transitions || {
            observed: [],
            fluidity: 0
          },
          defense: data.defense || {
            techniques: [],
            effectiveness: 0
          },
          sweeps: data.sweeps || {
            attempts: [],
            successRate: 0
          }
        },
        insights: data.keyInsights || [],
        limitations: data.limitations || [],
        usage: {
          promptTokenCount: result.response?.usageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: result.response?.usageMetadata?.candidatesTokenCount || 0,
          totalTokenCount: result.response?.usageMetadata?.totalTokenCount || 0
        }
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao parsear resultado:`, error.message);
      
      // Retorna estrutura mínima em caso de erro
      return {
        agentName: this.name,
        confidence: 0.3,
        data: {
          guardGame: { observed: false },
          passingGame: { observed: false },
          dominantPositions: {},
          submissions: { attempts: [] },
          transitions: { observed: [] },
          defense: { techniques: [] },
          sweeps: { attempts: [] }
        },
        insights: [],
        limitations: ['Erro ao processar análise técnica'],
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

module.exports = TechnicalAgent;
