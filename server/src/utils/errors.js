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
 * Analisa um erro da API Gemini e retorna o erro customizado apropriado
 * @param {Error} error - Erro original
 * @returns {AppError} Erro customizado
 */
const parseGeminiError = (error) => {
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
  GeminiQuotaExceededError,
  GeminiContentBlockedError,
  GeminiApiKeyMissingError,
  GeminiApiError,
  GeminiProcessingError,
  parseGeminiError
};
