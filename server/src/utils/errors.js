// @ts-check
/**
 * Classes de erro customizadas para a aplicação
 */

/**
 * Erro base da aplicação
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erro de recurso não encontrado
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 404);
  }
}

/**
 * Erro de validação
 */
class ValidationError extends AppError {
  constructor(message = 'Dados inválidos') {
    super(message, 400);
  }
}

/**
 * Erro de autenticação
 */
class AuthenticationError extends AppError {
  constructor(message = 'Não autenticado') {
    super(message, 401);
  }
}

/**
 * Erro de autorização
 */
class AuthorizationError extends AppError {
  constructor(message = 'Sem permissão para esta ação') {
    super(message, 403);
  }
}

/**
 * Erro de CONTRATO INTERNO: um método de model que exige escopo de posse foi
 * chamado sem ele (spec 006). Não é falha do usuário — é bug de programação,
 * e por isso 500 e não 403.
 *
 * Existe para que a próxima omissão de escopo seja um erro visível em vez de
 * um vazamento silencioso: `null` ou lista vazia seriam indistinguíveis de
 * "não encontrado" e morreriam no primeiro `catch` que só loga.
 */
class MissingScopeError extends AppError {
  constructor(context = 'chamada de model') {
    super(`Escopo de posse obrigatório ausente em ${context}`, 500);
  }
}

/**
 * Orçamento de IA do grupo esgotado no período (spec 009, R3).
 *
 * 429 e não 403: não é "você não tem permissão", é "tente mais tarde / o
 * limite do grupo foi atingido" — a mesma família semântica da quota do
 * provedor.
 */
class BudgetExceededError extends AppError {
  constructor(message = 'Orçamento de IA do grupo esgotado neste período.') {
    super(message, 429);
  }
}

// ====================================
// ERROS ESPECÍFICOS DA API GEMINI
// ====================================

/**
 * Erro quando a cota da API Gemini é excedida
 */
class GeminiQuotaExceededError extends AppError {
  constructor() {
    super('Cota da API Gemini excedida. Tente novamente mais tarde.', 429);
  }
}

/**
 * Erro quando o conteúdo é bloqueado pela política de segurança
 */
class GeminiContentBlockedError extends AppError {
  constructor() {
    super('Conteúdo bloqueado pela política de segurança do Gemini.', 400);
  }
}

/**
 * Erro quando a API key não está configurada
 */
class GeminiApiKeyMissingError extends AppError {
  constructor() {
    super('GEMINI_API_KEY não configurada no servidor.', 500);
  }
}

/**
 * Erro genérico da API Gemini
 */
class GeminiApiError extends AppError {
  constructor(message = 'Erro na comunicação com a API Gemini') {
    super(message, 502);
  }
}

/**
 * Erro quando o modelo Gemini não consegue processar a requisição
 */
class GeminiProcessingError extends AppError {
  constructor(message = 'Erro ao processar requisição com Gemini') {
    super(message, 500);
  }
}

/**
 * Erro quando a resposta da IA não contém JSON válido/parseável.
 * Nunca deve ser mascarado com dados sintéticos — precisa propagar
 * para que a análise falhe explicitamente em vez de salvar dados inventados.
 */
class GeminiParseError extends AppError {
  constructor(message = 'Resposta da IA não pôde ser interpretada como JSON válido') {
    super(message, 502);
  }
}

// ====================================
// ERROS DE DOWNLOAD DE VÍDEO
// ====================================

/**
 * Erro de download de vídeo com mensagens separadas para usuário e debug
 */
class VideoDownloadError extends AppError {
  /**
   * @param {string} userMessage - Mensagem amigável para o usuário
   * @param {object} [debugInfo] - Informações técnicas para debug
   * @param {string} [debugInfo.method] - Método usado (yt-dlp, ytdl-core, ambos)
   * @param {string} [debugInfo.url] - URL do vídeo
   * @param {string} [debugInfo.technicalError] - Mensagem técnica do erro
   * @param {string} [debugInfo.phase] - Fase onde falhou (download, validation, upload)
   * @param {number} [statusCode=502] - HTTP status code
   */
  constructor(userMessage, debugInfo = {}, statusCode = 502) {
    super(userMessage, statusCode);
    this.debugInfo = {
      method: debugInfo.method || 'desconhecido',
      url: debugInfo.url ? debugInfo.url.substring(0, 80) : 'N/A',
      technicalError: debugInfo.technicalError || userMessage,
      phase: debugInfo.phase || 'download',
      timestamp: new Date().toISOString(),
    };
  }

  /** Log estruturado para o console do servidor */
  logDebug() {
    console.error('\n🎬 ========================================');
    console.error('🎬 ERRO DE DOWNLOAD DE VÍDEO');
    console.error('🎬 ========================================');
    console.error(`🎬 Fase: ${this.debugInfo.phase}`);
    console.error(`🎬 Método: ${this.debugInfo.method}`);
    console.error(`🎬 URL: ${this.debugInfo.url}`);
    console.error(`🎬 Erro técnico: ${this.debugInfo.technicalError}`);
    console.error(`🎬 Mensagem ao usuário: ${this.message}`);
    console.error(`🎬 Timestamp: ${this.debugInfo.timestamp}`);
    console.error('🎬 ========================================\n');
  }
}

/**
 * O erro tem chance real de sumir numa nova tentativa? (spec 009, R5)
 *
 * A distinção existe porque **retry custa dinheiro**: repetir uma inferência
 * de vídeo em `gemini-2.5-pro` é outra inferência completa. Repetir o que não
 * vai melhorar é queimar o dobro por nada.
 *
 * NÃO é transitório, e por isso nunca é repetido:
 * - **quota estourada** — a próxima tentativa também estoura;
 * - **conteúdo bloqueado** pela política de segurança — a resposta é
 *   determinística para o mesmo input;
 * - **API key ausente** — configuração, não sorte;
 * - **JSON malformado** — repetir é uma inferência inteira nova apostando no
 *   não determinismo do modelo. Se acontecer com frequência, o problema é o
 *   schema ou o prompt, não a rede.
 *
 * @param {Error} error
 * @returns {boolean}
 */
function isTransientError(error) {
  if (
    error instanceof GeminiQuotaExceededError ||
    error instanceof GeminiContentBlockedError ||
    error instanceof GeminiApiKeyMissingError ||
    error instanceof GeminiParseError ||
    error instanceof VideoDownloadError
  ) {
    return false;
  }

  // Falha de rede/timeout já classificada por parseGeminiError
  if (error instanceof GeminiApiError) return true;

  // 5xx e indisponibilidade do provedor chegam como erro genérico
  const message = error?.message?.toLowerCase() || '';
  return /\b(500|502|503|504)\b|unavailable|overloaded|internal error|try again|temporarily/.test(message);
}

/**
 * Analisa um erro da API Gemini e retorna o erro customizado apropriado
 * @param {Error} error - Erro original
 * @returns {AppError} Erro customizado
 */
const parseGeminiError = (error) => {
  // IDEMPOTENTE: um erro já classificado passa direto.
  //
  // Sem isto, classificar duas vezes DEGRADA o erro — e a segunda passagem
  // acontece de verdade, porque `llm.js` classifica dentro do retry e o
  // `catch` externo classifica de novo. O caso concreto: um
  // GeminiQuotaExceededError reclassificado não casa nenhum padrão, porque a
  // mensagem dele está em português ("Cota…") e a checagem procura "quota" —
  // e a quota estourada virava GeminiProcessingError genérico, perdendo o
  // status 429 e a informação de que não se deve repetir.
  if (error instanceof AppError) {
    return error;
  }

  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
    return new GeminiQuotaExceededError();
  }
  
  if (message.includes('safety') || message.includes('blocked') || message.includes('harmful')) {
    return new GeminiContentBlockedError();
  }
  
  if (message.includes('api key') || message.includes('api_key') || message.includes('unauthorized')) {
    return new GeminiApiKeyMissingError();
  }
  
  if (message.includes('timeout') || message.includes('network')) {
    return new GeminiApiError('Erro de conexão com a API Gemini. Tente novamente.');
  }
  
  // Erro genérico
  return new GeminiProcessingError(error.message);
};

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  MissingScopeError,
  BudgetExceededError,
  GeminiQuotaExceededError,
  GeminiContentBlockedError,
  GeminiApiKeyMissingError,
  GeminiApiError,
  GeminiProcessingError,
  GeminiParseError,
  VideoDownloadError,
  parseGeminiError,
  isTransientError
};
