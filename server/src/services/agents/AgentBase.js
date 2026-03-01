const { GeminiApiError } = require('../../utils/errors');

/**
 * Classe base abstrata para agentes especializados
 */
class AgentBase {
  /**
   * @param {string} name - Nome do agente
   * @param {string} promptFile - Nome do arquivo de prompt (sem .txt)
   * @param {string[]} focusAreas - Áreas de foco do agente
   * @param {string} aiProvider - 'gemini' ou 'openai'
   */
  constructor(name, promptFile, focusAreas, aiProvider = 'gemini') {
    if (new.target === AgentBase) {
      throw new TypeError('AgentBase é uma classe abstrata e não pode ser instanciada diretamente');
    }
    
    this.name = name;
    this.promptFile = promptFile;
    this.focusAreas = focusAreas;
    this.aiProvider = aiProvider;
  }

  /**
   * Analisa um frame de vídeo
   * @param {Object} frameData - Dados do frame (fileUri ou base64)
   * @param {Object} context - Contexto da análise (athleteName, giColor, belt, result)
   * @param {Object} aiClient - Cliente do Gemini ou OpenAI
   * @returns {Promise<Object>} Resultado da análise
   */
  async analyze(frameData, context, aiClient) {
    try {
      const prompt = await this.buildPrompt(frameData, context);
      const result = await this.callAI(prompt, frameData, aiClient);
      return this.parseResult(result, context);
    } catch (error) {
      console.error(`[${this.name}] Erro na análise:`, error.message);
      throw new GeminiApiError(`Falha no ${this.name}: ${error.message}`, error);
    }
  }

  /**
   * Constrói o prompt para o agente
   * @param {Object} frameData - Dados do frame
   * @param {Object} context - Contexto da análise
   * @returns {Promise<string>} Prompt construído
   */
  async buildPrompt(frameData, context) {
    const { getPrompt } = require('../prompts');
    
    return getPrompt(this.promptFile, {
      ATHLETE_NAME: context.athleteName || 'Atleta',
      GI_COLOR: context.giColor || 'azul',
      BELT: context.belt || 'Não especificada',
      RESULT: context.result || 'Não especificado',
      BELT_RULES: context.beltRules || '',
      FOCUS_AREAS: this.focusAreas.join(', ')
    });
  }

  /**
   * Chama a API de IA com retry logic
   * @param {string} prompt - Prompt construído
   * @param {Object} frameData - Dados do frame
   * @param {Object} aiClient - Cliente da API
   * @returns {Promise<Object>} Resultado da API
   */
  async callAI(prompt, frameData, aiClient) {
    if (this.aiProvider === 'gemini') {
      return this.retryWithBackoff(async () => {
        const parts = [
          { text: prompt }
        ];

        // Se frameData tem fileUri ou inlineData, adiciona a imagem
        if (frameData.fileUri) {
          // Verificar se é Data URI (base64) ou File URI
          if (frameData.fileUri.startsWith('data:')) {
            // É Data URI - converter para inlineData
            const match = frameData.fileUri.match(/^data:(.+?);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1], // Ex: "image/png"
                  data: match[2] // Base64 data
                }
              });
              console.log(`[${this.name}] ✅ Usando inlineData (base64)`);
            } else {
              throw new Error('Data URI inválido: formato não reconhecido');
            }
          } else {
            // É File URI do Gemini File API
            parts.push({
              fileData: {
                fileUri: frameData.fileUri,
                mimeType: frameData.mimeType || 'image/jpeg'
              }
            });
            console.log(`[${this.name}] ✅ Usando fileUri (File API)`);
          }
        } else if (frameData.inlineData) {
          parts.push({
            inlineData: frameData.inlineData
          });
          console.log(`[${this.name}] ✅ Usando inlineData direto`);
        } else {
          throw new Error('frameData deve conter fileUri ou inlineData');
        }

        const result = await aiClient.generateContent(parts);
        return result;
      });
    }
    
    throw new Error(`AI Provider ${this.aiProvider} não suportado em agentes de visão`);
  }

  /**
   * Retry com exponential backoff
   * @param {Function} fn - Função a executar
   * @param {number} maxRetries - Número máximo de tentativas
   * @param {number} initialDelay - Delay inicial em ms
   * @returns {Promise<any>} Resultado da função
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Não retry em erros de validação
        if (error.message?.includes('INVALID_ARGUMENT')) {
          throw error;
        }
        
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          const maxDelay = 10000; // 10 segundos máximo
          const actualDelay = Math.min(delay, maxDelay);
          
          console.warn(`[${this.name}] Tentativa ${attempt + 1} falhou. Retry em ${actualDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, actualDelay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Extrai score de confiança do resultado
   * @param {Object} result - Resultado da API
   * @returns {number} Score de confiança (0-1)
   */
  extractConfidence(result) {
    try {
      const text = result.response?.text() || JSON.stringify(result);
      const match = text.match(/"confidence"\s*:\s*(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : 0.7; // Default 0.7
    } catch (error) {
      console.warn(`[${this.name}] Não foi possível extrair confidence:`, error.message);
      return 0.7;
    }
  }

  /**
   * Parseia o resultado da API (método abstrato)
   * @param {Object} result - Resultado da API
   * @param {Object} context - Contexto da análise
   * @returns {Object} Resultado parseado
   */
  parseResult(result, context) {
    throw new Error('parseResult() deve ser implementado pelas subclasses');
  }

  /**
   * Extrai JSON da resposta (pode vir como markdown)
   * @param {string} text - Texto da resposta
   * @returns {Object} JSON parseado
   */
  extractJSON(text) {
    const { extractJson } = require('../../utils/chartUtils');
    return extractJson(text);
  }
}

module.exports = AgentBase;
