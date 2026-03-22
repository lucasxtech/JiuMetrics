const StrategyAgentBase = require('./StrategyAgentBase');

/**
 * Agente Gameplan — analisa exclusivamente o atleta.
 * Cataloga: melhores armas, guarda ideal, passagem, finalizações, sequência de poder, fases de força.
 */
class GameplanAgent extends StrategyAgentBase {
  constructor() {
    super(
      'Agente Gameplan',
      'strategy-gameplan',
      ['best_weapons', 'optimal_guard', 'optimal_passing', 'high_pct_finishes', 'phase_strengths']
    );
  }

  buildPrompt(context) {
    const { getPrompt } = require('../../prompts');
    const { athlete } = context;
    return getPrompt('strategy-gameplan', {
      ATHLETE_NAME: athlete.name || 'Atleta',
      ATHLETE_BELT: athlete.belt || 'Não especificada',
      ATHLETE_STATS: athlete.statsText || 'Sem dados quantitativos disponíveis',
      ATHLETE_RESUMO: athlete.resumo || 'Sem resumo técnico disponível',
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
          best_weapons: data.best_weapons || [],
          optimal_guard: data.optimal_guard || null,
          optimal_passing: data.optimal_passing || null,
          high_pct_finishes: data.high_pct_finishes || [],
          power_sequence: data.power_sequence || null,
          phase_strengths: data.phase_strengths || {},
          gaps_to_avoid: data.gaps_to_avoid || [],
          gameplan_summary: data.gameplan_summary || '',
        },
        usage: this.extractUsage(result),
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao parsear resultado:`, error.message);
      return {
        agentName: this.name,
        confidence: 0.3,
        data: {
          best_weapons: [],
          optimal_guard: null,
          optimal_passing: null,
          high_pct_finishes: [],
          power_sequence: null,
          phase_strengths: {},
          gaps_to_avoid: [],
          gameplan_summary: '',
        },
        usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        error: error.message,
      };
    }
  }
}

module.exports = GameplanAgent;
