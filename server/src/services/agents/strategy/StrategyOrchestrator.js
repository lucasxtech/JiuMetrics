const OpenAI = require('openai');
const { getPrompt } = require('../../prompts');
const { GeminiApiError } = require('../../../utils/errors');
const { DEFAULT_MODEL, PRICING } = require('../../../config/ai');
const ScoutAgent = require('./ScoutAgent');
const GameplanAgent = require('./GameplanAgent');
const StrategyRulesAgent = require('./StrategyRulesAgent');

/**
 * Orquestrador de estratégia com múltiplos agentes.
 *
 * Fluxo:
 *  1. Scout, Gameplan e Rules rodam em paralelo (Gemini, texto puro)
 *  2. GPT-4 recebe os 3 relatórios e sintetiza a estratégia final
 *  3. Output idêntico ao tactical-strategy.txt — zero mudanças no frontend
 */
class StrategyOrchestrator {
  /**
   * @param {Object} geminiClient - Cliente google-generative-ai
   * @param {string} openaiApiKey  - API key da OpenAI
   */
  constructor(geminiClient, openaiApiKey) {
    if (!geminiClient) throw new Error('geminiClient é obrigatório para StrategyOrchestrator');
    if (!openaiApiKey) throw new Error('openaiApiKey é obrigatória para StrategyOrchestrator');

    if (!openaiApiKey.startsWith('sk-')) {
      console.warn('[StrategyOrchestrator] AVISO: OpenAI API key não segue o formato esperado (sk-...)');
    }

    this.geminiClient = geminiClient;
    this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
    this.gptModel = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
    this._lastGptUsage = null;

    this.agents = [
      new ScoutAgent(),
      new GameplanAgent(),
      new StrategyRulesAgent(),
    ];

    console.log(`[StrategyOrchestrator] Inicializado — GPT: ${this.gptModel}, Gemini: ${DEFAULT_MODEL}, Agentes: ${this.agents.length}`);
  }

  /**
   * Orquestra a geração da estratégia completa
   * @param {Object} athleteData  - { name, belt, resumo, statsText, ... }
   * @param {Object} opponentData - { name, belt, resumo, statsText, ... }
   * @param {string} restrictiveBelt - Faixa mais restritiva entre os dois
   * @returns {Promise<{ strategy, totalUsage, metadata }>}
   */
  async orchestrate(athleteData, opponentData, restrictiveBelt) {
    const startTime = Date.now();
    console.log('\n🥋 ============================================');
    console.log(`🥋 MULTI-AGENTES ESTRATÉGIA: ${athleteData.name} vs ${opponentData.name}`);
    console.log('🥋 ============================================');

    const geminiModel = this.geminiClient.getGenerativeModel({ model: DEFAULT_MODEL });

    const context = {
      athlete: athleteData,
      opponent: opponentData,
      restrictiveBelt,
    };

    // Executa os 3 agentes em paralelo
    console.log('[StrategyOrchestrator] 🔄 Executando 3 agentes em paralelo...');
    const agentResults = await Promise.all(
      this.agents.map(agent =>
        agent.analyze(context, geminiModel)
          .then(r => {
            console.log(`[StrategyOrchestrator] ✓ ${agent.name} concluído (confidence: ${r.confidence})`);
            return r;
          })
          .catch(error => {
            console.error(`[StrategyOrchestrator] ✗ ${agent.name} falhou:`, error.message);
            throw error; // Sem fallback — propaga o erro
          })
      )
    );

    const [scoutResult, gameplanResult, rulesResult] = agentResults;

    // Consolida com GPT-4
    console.log('[StrategyOrchestrator] 🧠 Consolidando com GPT-4...');
    const strategy = await this.consolidateWithGPT(
      scoutResult,
      gameplanResult,
      rulesResult,
      athleteData.name,
      opponentData.name
    );

    const elapsed = Date.now() - startTime;
    const totalUsage = this.aggregateUsage(scoutResult, gameplanResult, rulesResult);

    console.log(`[StrategyOrchestrator] ✅ Concluído em ${(elapsed / 1000).toFixed(1)}s`);
    console.log(`[StrategyOrchestrator]    Custo estimado: $${totalUsage.estimatedCost.toFixed(4)}`);
    console.log('🥋 ============================================\n');

    return {
      strategy,
      totalUsage,
      metadata: {
        agentCount: this.agents.length,
        elapsedMs: elapsed,
        orchestrator: this.gptModel,
        geminiModel: DEFAULT_MODEL,
      },
    };
  }

  /**
   * Consolida os 3 relatórios de agentes usando GPT-4
   * @private
   */
  async consolidateWithGPT(scoutResult, gameplanResult, rulesResult, athleteName, opponentName) {
    const prompt = getPrompt('strategy-orchestrator', {
      ATHLETE_NAME: athleteName,
      OPPONENT_NAME: opponentName,
      SCOUT_RESULT: JSON.stringify(scoutResult.data, null, 2),
      GAMEPLAN_RESULT: JSON.stringify(gameplanResult.data, null, 2),
      RULES_RESULT: JSON.stringify(rulesResult.data, null, 2),
    });

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.gptModel,
        messages: [
          {
            role: 'system',
            content: 'Você é um estrategista-chefe de Jiu-Jitsu de competição. Responda APENAS com JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      this._lastGptUsage = response.usage || null;

      const content = response.choices[0]?.message?.content;
      if (!content) throw new GeminiApiError('GPT retornou resposta vazia na consolidação de estratégia');

      return JSON.parse(content);
    } catch (error) {
      console.error('[StrategyOrchestrator] ❌ Falha na consolidação GPT:', error.message);
      throw new GeminiApiError(`Falha na consolidação da estratégia com GPT: ${error.message}`, error);
    }
  }

  /**
   * Agrega tokens e calcula custo dos 3 agentes Gemini + 1 chamada GPT
   * @private
   */
  aggregateUsage(scoutResult, gameplanResult, rulesResult) {
    const geminiTokens = [scoutResult, gameplanResult, rulesResult].reduce(
      (acc, r) => ({
        promptTokens: acc.promptTokens + (r.usage?.promptTokenCount || 0),
        completionTokens: acc.completionTokens + (r.usage?.candidatesTokenCount || 0),
        totalTokens: acc.totalTokens + (r.usage?.totalTokenCount || 0),
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
    );

    const gptUsage = this._lastGptUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const geminiPrice = PRICING?.GEMINI_FLASH_2_0 || { input: 0.075, output: 0.30 };
    const gptPrice = PRICING?.GPT_4_TURBO || { input: 10.0, output: 30.0 };

    const estimatedCost =
      (geminiTokens.promptTokens / 1_000_000) * geminiPrice.input +
      (geminiTokens.completionTokens / 1_000_000) * geminiPrice.output +
      ((gptUsage.prompt_tokens || 0) / 1_000_000) * gptPrice.input +
      ((gptUsage.completion_tokens || 0) / 1_000_000) * gptPrice.output;

    return {
      gemini: geminiTokens,
      gpt: gptUsage,
      totalTokens: geminiTokens.totalTokens + (gptUsage.total_tokens || 0),
      estimatedCost,
    };
  }
}

module.exports = StrategyOrchestrator;
