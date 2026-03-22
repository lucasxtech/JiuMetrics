const StrategyAgentBase = require('./StrategyAgentBase');

/**
 * Agente Scout — analisa exclusivamente o adversário.
 * Mapeia: guarda, entrada em pé, arsenal ofensivo, vulnerabilidades, perfil psicológico.
 */
class ScoutAgent extends StrategyAgentBase {
  constructor() {
    super(
      'Agente Scout',
      'strategy-scout',
      ['preferred_guard', 'standup_entry', 'signature_attacks', 'vulnerabilities', 'psychological_profile']
    );
  }

  buildPrompt(context) {
    const { getPrompt } = require('../../prompts');
    const { opponent } = context;
    return getPrompt('strategy-scout', {
      OPPONENT_NAME: opponent.name || 'Adversário',
      OPPONENT_BELT: opponent.belt || 'Não especificada',
      OPPONENT_STATS: opponent.statsText || 'Sem dados quantitativos disponíveis',
      OPPONENT_RESUMO: opponent.resumo || 'Sem resumo técnico disponível',
    });
  }

  parseResult(result, context) {
    try {
      const text = result.response.text();
      const data = this.extractJSON(text);
      const confidence = data.confidence || 0.7;

      return {
        agentName: this.name,
        confidence,
        data: {
          preferred_guard: data.preferred_guard || null,
          standup_entry: data.standup_entry || null,
          signature_attacks: data.signature_attacks || [],
          dangerous_finishes: data.dangerous_finishes || [],
          power_sequence: data.power_sequence || null,
          vulnerabilities: data.vulnerabilities || {},
          psychological_profile: data.psychological_profile || {},
          counter_attacks: data.counter_attacks || [],
          scout_summary: data.scout_summary || '',
        },
        usage: this.extractUsage(result),
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao parsear resultado:`, error.message);
      return {
        agentName: this.name,
        confidence: 0.3,
        data: {
          preferred_guard: null,
          standup_entry: null,
          signature_attacks: [],
          dangerous_finishes: [],
          power_sequence: null,
          vulnerabilities: {},
          psychological_profile: {},
          counter_attacks: [],
          scout_summary: '',
        },
        usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        error: error.message,
      };
    }
  }
}

module.exports = ScoutAgent;
