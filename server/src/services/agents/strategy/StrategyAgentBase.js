const { GeminiApiError } = require('../../../utils/errors');

/**
 * Classe base abstrata para agentes especializados de estratégia.
 * Diferença central em relação a AgentBase: texto puro — sem frameData, sem imagens.
 */
class StrategyAgentBase {
  constructor(name, promptFile, focusAreas) {
    if (new.target === StrategyAgentBase) {
      throw new TypeError('StrategyAgentBase é uma classe abstrata e não pode ser instanciada diretamente');
    }
    this.name = name;
    this.promptFile = promptFile;
    this.focusAreas = focusAreas;
  }

  /**
   * Ponto de entrada principal do agente
   * @param {Object} context - { athlete, opponent, restrictiveBelt }
   * @param {Object} geminiModel - Instância do modelo Gemini
   * @returns {Promise<Object>} Resultado parseado
   */
  async analyze(context, geminiModel) {
    try {
      const prompt = this.buildPrompt(context);
      const result = await this.callAI(prompt, geminiModel);
      return this.parseResult(result, context);
    } catch (error) {
      console.error(`[${this.name}] Erro na análise:`, error.message);
      throw new GeminiApiError(`Falha no ${this.name}: ${error.message}`, error);
    }
  }

  /**
   * Constrói o prompt. Deve ser implementado pela subclasse.
   * @param {Object} context
   * @returns {string}
   */
  buildPrompt(context) {
    throw new Error('buildPrompt() deve ser implementado pelas subclasses');
  }

  /**
   * Chama o Gemini com texto puro (sem imagens)
   * @param {string} prompt
   * @param {Object} geminiModel
   * @returns {Promise<Object>}
   */
  async callAI(prompt, geminiModel) {
    return this.retryWithBackoff(async () => {
      const result = await geminiModel.generateContent([{ text: prompt }]);
      return result;
    });
  }

  /**
   * Retry com backoff exponencial (mirroring AgentBase)
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (error.message?.includes('INVALID_ARGUMENT')) throw error;
        if (attempt < maxRetries - 1) {
          const delay = Math.min(initialDelay * Math.pow(2, attempt), 10000);
          console.warn(`[${this.name}] Tentativa ${attempt + 1} falhou. Retry em ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Parseia o resultado. Deve ser implementado pela subclasse.
   * @param {Object} result
   * @param {Object} context
   */
  parseResult(result, context) {
    throw new Error('parseResult() deve ser implementado pelas subclasses');
  }

  /**
   * Extrai JSON do texto de resposta da IA
   * @param {string} text
   * @returns {Object}
   */
  extractJSON(text) {
    const { extractJson } = require('../../../utils/chartUtils');
    return extractJson(text);
  }

  /**
   * Extrai metadados de uso de tokens da resposta Gemini
   * @param {Object} result
   * @returns {{ promptTokenCount, candidatesTokenCount, totalTokenCount }}
   */
  extractUsage(result) {
    return {
      promptTokenCount: result.response?.usageMetadata?.promptTokenCount || 0,
      candidatesTokenCount: result.response?.usageMetadata?.candidatesTokenCount || 0,
      totalTokenCount: result.response?.usageMetadata?.totalTokenCount || 0,
    };
  }
}

module.exports = StrategyAgentBase;
