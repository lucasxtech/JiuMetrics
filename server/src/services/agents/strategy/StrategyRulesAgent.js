const StrategyAgentBase = require('./StrategyAgentBase');

/**
 * Agente de Regras Tático — valida as regras IBJJF para esta competição.
 * Determina técnicas permitidas/proibidas com base na faixa mais restritiva.
 */
class StrategyRulesAgent extends StrategyAgentBase {
  constructor() {
    super(
      'Agente de Regras Tático',
      'strategy-rules',
      ['allowed_leg_locks', 'forbidden_techniques', 'scoring_opportunities', 'dq_risks']
    );
  }

  buildPrompt(context) {
    const { getPrompt } = require('../../prompts');
    const { BELT_RULES } = require('../../../config/ai');

    const restrictiveBeltKey = (context.restrictiveBelt || '').toLowerCase();

    // Mapa de aliases (inglês → português)
    const beltAliases = { white: 'branca', blue: 'azul', purple: 'roxa', brown: 'marrom', black: 'preta' };
    const normalizedKey = beltAliases[restrictiveBeltKey] || restrictiveBeltKey;

    const rules = BELT_RULES[normalizedKey] || { allowed: [], forbidden: [], extraRules: '' };

    return getPrompt('strategy-rules', {
      ATHLETE_BELT: context.athlete.belt || 'Não especificada',
      OPPONENT_BELT: context.opponent.belt || 'Não especificada',
      RESTRICTIVE_BELT: context.restrictiveBelt || 'Não especificada',
      ALLOWED_TECHNIQUES: (rules.allowed || []).join(', ') || 'Conforme regulamento padrão',
      FORBIDDEN_TECHNIQUES: (rules.forbidden || []).join(', ') || 'Nenhuma restrição adicional',
      EXTRA_RULES: rules.extraRules || '',
    });
  }

  parseResult(result, context) {
    try {
      const text = result.response.text();
      const data = this.extractJSON(text);
      const confidence = data.confidence || 0.95;

      return {
        agentName: this.name,
        confidence,
        data: {
          allowed_leg_locks: data.allowed_leg_locks || [],
          forbidden_techniques: data.forbidden_techniques || [],
          scoring_opportunities: data.scoring_opportunities || [],
          dq_risks: data.dq_risks || [],
          belt_warnings: data.belt_warnings || [],
          rules_summary: data.rules_summary || '',
        },
        usage: this.extractUsage(result),
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao parsear resultado:`, error.message);
      return {
        agentName: this.name,
        confidence: 0.3,
        data: {
          allowed_leg_locks: [],
          forbidden_techniques: [],
          scoring_opportunities: [],
          dq_risks: [],
          belt_warnings: [],
          rules_summary: '',
        },
        usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
        error: error.message,
      };
    }
  }
}

module.exports = StrategyRulesAgent;
