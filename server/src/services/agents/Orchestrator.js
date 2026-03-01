const OpenAI = require('openai');
const { getPrompt } = require('../prompts');
const { GeminiApiError } = require('../../utils/errors');
const TechnicalAgent = require('./TechnicalAgent');
const TacticalAgent = require('./TacticalAgent');
const RulesAgent = require('./RulesAgent');

// Timeout para chamada GPT (30 segundos)
const GPT_TIMEOUT_MS = 30000;

/**
 * Orquestrador de agentes especializado
 * Coordena execução paralela e consolida resultados com GPT-5
 */
class Orchestrator {
  /**
   * @param {Object} geminiClient - Cliente do Google Generative AI
   * @param {string} openaiApiKey - API key da OpenAI
   * @param {string} model - Modelo do GPT (padrão: gpt-4-turbo-preview)
   */
  constructor(geminiClient, openaiApiKey, model = 'gpt-4-turbo-preview') {
    if (!geminiClient) {
      throw new Error('geminiClient é obrigatório');
    }
    if (!openaiApiKey) {
      throw new Error('openaiApiKey é obrigatória');
    }
    
    // Validação básica do formato da API key
    if (!openaiApiKey.startsWith('sk-')) {
      console.warn('[Orchestrator] AVISO: OpenAI API key não segue o formato esperado (sk-...)');
    }

    this.geminiClient = geminiClient;
    this.openaiClient = new OpenAI({ apiKey: openaiApiKey });
    this.model = model;
    this.timeout = GPT_TIMEOUT_MS;
    
    // Instancia os 3 agentes especializados
    this.agents = [
      new TechnicalAgent(),
      new TacticalAgent(),
      new RulesAgent()
    ];
    
    console.log(`[Orchestrator] Inicializado com modelo ${model} e ${this.agents.length} agentes`);
  }

  /**
   * Orquestra análise de vídeo com múltiplos agentes
   * @param {Object} frameData - Dados do frame (fileUri ou inlineData)
   * @param {Object} context - Contexto (athleteName, giColor, belt, result, beltRules)
   * @returns {Promise<Object>} Análise consolidada
   */
  async orchestrateVideoAnalysis(frameData, context) {
    const startTime = Date.now();
    console.log(`[Orchestrator] 🎬 Iniciando análise multi-agentes para ${context.athleteName}`);
    console.log(`[Orchestrator] 📦 Frame type: ${frameData.fileUri?.startsWith('data:') ? 'Base64 Data URI' : 'File URI'}`);

    try {
      // 1. Executar agentes em paralelo (Gemini Vision)
      console.log('[Orchestrator] 🔄 Executando agentes em paralelo...');
      const agentResults = await Promise.all(
        this.agents.map(agent => {
          console.log(`[Orchestrator] → ${agent.name} iniciado`);
          return agent.analyze(frameData, context, this.geminiClient)
            .then(result => {
              console.log(`[Orchestrator] ✓ ${agent.name} concluído (confidence: ${result.confidence})`);
              return result;
            })
            .catch(error => {
              console.error(`[Orchestrator] ✗ ${agent.name} falhou:`, error.message);
              // Retorna resultado parcial em caso de erro
              return {
                agentName: agent.name,
                confidence: 0,
                data: {},
                insights: [],
                usage: { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 },
                error: error.message
              };
            });
        })
      );

      // Verificar se pelo menos um agente teve sucesso
      const successfulAgents = agentResults.filter(r => r.confidence > 0);
      if (successfulAgents.length === 0) {
        throw new GeminiApiError('Todos os agentes falharam na análise');
      }

      console.log(`[Orchestrator] Agentes concluídos: ${successfulAgents.length}/${agentResults.length}`);

      // 2. Consolidar com GPT-5
      console.log('[Orchestrator] Consolidando resultados com GPT-5...');
      const consolidatedData = await this.consolidateWithGPT5(agentResults, context);

      // 3. Agregar usage
      const totalUsage = this.aggregateUsage(agentResults, consolidatedData);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`[Orchestrator] Análise concluída em ${elapsedTime}s`);
      console.log(`[Orchestrator] Custo estimado: $${totalUsage.estimatedCost.toFixed(4)}`);

      return {
        charts: consolidatedData.charts,
        technical_stats: consolidatedData.technical_stats,
        summary: consolidatedData.summary,
        metadata: {
          agentsUsed: this.agents.map(a => a.name),
          agentCount: this.agents.length,
          successfulAgents: successfulAgents.length,
          orchestrator: this.model,
          timestamp: new Date().toISOString(),
          elapsedTime: parseFloat(elapsedTime)
        },
        totalUsage,
        agentResults // Debug: resultados brutos dos agentes
      };
    } catch (error) {
      console.error('[Orchestrator] Erro fatal:', error);
      throw new GeminiApiError(`Falha na orquestração: ${error.message}`, error);
    }
  }

  /**
   * Consolida resultados dos agentes usando GPT-5
   * @param {Array} agentResults - Resultados dos agentes
   * @param {Object} context - Contexto da análise
   * @returns {Promise<Object>} Dados consolidados
   */
  async consolidateWithGPT5(agentResults, context) {
    try {
      const prompt = getPrompt('agent-orchestrator-video', {
        AGENT_RESULTS: JSON.stringify(agentResults, null, 2),
        ATHLETE_NAME: context.athleteName || 'Atleta',
        GI_COLOR: context.giColor || 'azul',
        BELT: context.belt || 'Não especificada',
        RESULT: context.result || 'Não especificado'
      });

      const response = await this.openaiClient.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Você é um analista chefe de Jiu-Jitsu consolidando análises de scouts especializados. Responda APENAS em JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Determinístico
        response_format: { type: 'json_object' },
        timeout: this.timeout // Timeout de 30 segundos
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(content);

      return {
        charts: result.charts || [],
        technical_stats: result.technical_stats || {},
        summary: result.summary || 'Análise não disponível.',
        gptUsage: response.usage // { prompt_tokens, completion_tokens, total_tokens }
      };
    } catch (error) {
      console.error('[Orchestrator] Erro na consolidação GPT-5:', error.message);
      
      // Fallback: consolidação simples sem GPT
      console.warn('[Orchestrator] Usando consolidação fallback (sem GPT)');
      return this.fallbackConsolidation(agentResults);
    }
  }

  /**
   * Consolidação fallback sem GPT (caso GPT falhe)
   * @param {Array} agentResults - Resultados dos agentes
   * @returns {Object} Dados consolidados básicos
   */
  fallbackConsolidation(agentResults) {
    const technicalAgent = agentResults.find(r => r.agentName === 'Agente Técnico');
    const tacticalAgent = agentResults.find(r => r.agentName === 'Agente Tático');
    const rulesAgent = agentResults.find(r => r.agentName === 'Agente de Regras IBJJF');

    return {
      charts: [], // Vazio no fallback
      technical_stats: rulesAgent?.data?.scoring || {},
      summary: [
        technicalAgent?.insights?.[0],
        tacticalAgent?.insights?.[0],
        rulesAgent?.insights?.[0]
      ].filter(Boolean).join(' ') || 'Análise parcial disponível.',
      gptUsage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }

  /**
   * Resolve conflitos entre agentes (prioriza maior confidence)
   * @param {Array} agentResults - Resultados dos agentes
   * @returns {Object} Dados resolvidos
   */
  resolveConflicts(agentResults) {
    // Ordena por confidence (maior primeiro)
    return agentResults.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Agrega usage de todos os agentes + GPT
   * @param {Array} agentResults - Resultados dos agentes
   * @param {Object} gptResult - Resultado do GPT
   * @returns {Object} Usage agregado
   */
  aggregateUsage(agentResults, gptResult) {
    const geminiUsage = agentResults.reduce(
      (acc, r) => ({
        promptTokens: acc.promptTokens + (r.usage?.promptTokenCount || 0),
        completionTokens: acc.completionTokens + (r.usage?.candidatesTokenCount || 0)
      }),
      { promptTokens: 0, completionTokens: 0 }
    );

    const gptUsage = gptResult.gptUsage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    const totalTokens =
      geminiUsage.promptTokens +
      geminiUsage.completionTokens +
      gptUsage.total_tokens;

    return {
      gemini: geminiUsage,
      gpt: gptUsage,
      totalTokens,
      estimatedCost: this.calculateCost(geminiUsage, gptUsage)
    };
  }

  /**
   * Calcula custo estimado em USD
   * @param {Object} geminiUsage - Usage do Gemini
   * @param {Object} gptUsage - Usage do GPT
   * @returns {number} Custo em USD
   */
  calculateCost(geminiUsage, gptUsage) {
    // Gemini 2.0 Flash: $0.075/1M input, $0.30/1M output
    const geminiCost =
      (geminiUsage.promptTokens * 0.075) / 1_000_000 +
      (geminiUsage.completionTokens * 0.30) / 1_000_000;

    // GPT-4 Turbo: $10/1M input, $30/1M output
    // GPT-5 (estimativa): similar ou um pouco mais caro
    const gptCost =
      (gptUsage.prompt_tokens * 10) / 1_000_000 +
      (gptUsage.completion_tokens * 30) / 1_000_000;

    return geminiCost + gptCost;
  }
}

module.exports = Orchestrator;
