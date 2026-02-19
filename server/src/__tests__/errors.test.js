/**
 * Testes unitários para classes de erro customizadas
 */

const {
  AppError,
  NotFoundError,
  ValidationError,
  GeminiApiError,
  GeminiQuotaExceededError,
  GeminiContentBlockedError,
  GeminiApiKeyMissingError,
  GeminiProcessingError,
  parseGeminiError
} = require('../utils/errors');

describe('Classes de Erro', () => {
  describe('AppError', () => {
    it('deve criar erro com mensagem e statusCode padrão', () => {
      const error = new AppError('Erro genérico');
      
      expect(error.message).toBe('Erro genérico');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('AppError');
    });

    it('deve aceitar statusCode customizado', () => {
      const error = new AppError('Não autorizado', 401);
      
      expect(error.statusCode).toBe(401);
    });

    it('deve ser instância de Error', () => {
      const error = new AppError('Teste');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('NotFoundError', () => {
    it('deve ter statusCode 404', () => {
      const error = new NotFoundError('Atleta');
      
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Atleta não encontrado');
      expect(error.name).toBe('NotFoundError');
    });

    it('deve usar mensagem padrão para recurso', () => {
      const error = new NotFoundError();
      expect(error.message).toBe('Recurso não encontrado');
    });

    it('deve ser instância de AppError', () => {
      const error = new NotFoundError('Teste');
      expect(error instanceof AppError).toBe(true);
    });
  });

  describe('ValidationError', () => {
    it('deve ter statusCode 400', () => {
      const error = new ValidationError('Campo obrigatório');
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Campo obrigatório');
      expect(error.name).toBe('ValidationError');
    });

    it('deve usar mensagem padrão', () => {
      const error = new ValidationError();
      expect(error.message).toBe('Dados inválidos');
    });
  });

  describe('GeminiApiError', () => {
    it('deve ter statusCode 502 por padrão', () => {
      const error = new GeminiApiError('Erro na API Gemini');
      
      expect(error.statusCode).toBe(502);
      expect(error.name).toBe('GeminiApiError');
    });

    it('deve usar mensagem padrão', () => {
      const error = new GeminiApiError();
      expect(error.message).toBe('Erro na comunicação com a API Gemini');
    });
  });

  describe('GeminiQuotaExceededError', () => {
    it('deve ter statusCode 429 e mensagem específica', () => {
      const error = new GeminiQuotaExceededError();
      
      expect(error.statusCode).toBe(429);
      expect(error.message).toContain('Cota da API Gemini excedida');
      expect(error.name).toBe('GeminiQuotaExceededError');
    });
  });

  describe('GeminiContentBlockedError', () => {
    it('deve ter statusCode 400 e mensagem específica', () => {
      const error = new GeminiContentBlockedError();
      
      expect(error.statusCode).toBe(400);
      expect(error.message).toContain('bloqueado');
      expect(error.name).toBe('GeminiContentBlockedError');
    });
  });

  describe('GeminiApiKeyMissingError', () => {
    it('deve ter statusCode 500 e mensagem específica', () => {
      const error = new GeminiApiKeyMissingError();
      
      expect(error.statusCode).toBe(500);
      expect(error.message).toContain('GEMINI_API_KEY');
      expect(error.name).toBe('GeminiApiKeyMissingError');
    });
  });

  describe('GeminiProcessingError', () => {
    it('deve ter statusCode 500', () => {
      const error = new GeminiProcessingError('Erro de processamento');
      
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('GeminiProcessingError');
    });
  });
});

describe('parseGeminiError', () => {
  it('deve retornar GeminiQuotaExceededError para erro de quota', () => {
    const originalError = new Error('Quota exceeded');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiQuotaExceededError).toBe(true);
    expect(parsed.statusCode).toBe(429);
  });

  it('deve detectar rate limit pela mensagem', () => {
    const originalError = new Error('Rate limit exceeded');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiQuotaExceededError).toBe(true);
  });

  it('deve detectar 429 na mensagem', () => {
    const originalError = new Error('Error 429: Too many requests');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiQuotaExceededError).toBe(true);
  });

  it('deve retornar GeminiContentBlockedError para conteúdo bloqueado', () => {
    const originalError = new Error('Content was blocked due to safety');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiContentBlockedError).toBe(true);
    expect(parsed.statusCode).toBe(400);
  });

  it('deve detectar safety settings blocking', () => {
    const originalError = new Error('SAFETY: blocked by safety settings');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiContentBlockedError).toBe(true);
  });

  it('deve detectar harmful content', () => {
    const originalError = new Error('harmful content detected');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiContentBlockedError).toBe(true);
  });

  it('deve retornar GeminiApiKeyMissingError para API key inválida', () => {
    const originalError = new Error('API key not valid');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiApiKeyMissingError).toBe(true);
    expect(parsed.statusCode).toBe(500);
  });

  it('deve detectar API_KEY_INVALID', () => {
    const originalError = new Error('API_KEY_INVALID or missing');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiApiKeyMissingError).toBe(true);
  });

  it('deve detectar unauthorized', () => {
    const originalError = new Error('Unauthorized request');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiApiKeyMissingError).toBe(true);
  });

  it('deve retornar GeminiApiError para erro de timeout', () => {
    const originalError = new Error('Request timeout');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiApiError).toBe(true);
    expect(parsed.message).toContain('conexão');
  });

  it('deve retornar GeminiApiError para erro de network', () => {
    const originalError = new Error('Network error');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiApiError).toBe(true);
  });

  it('deve retornar GeminiProcessingError para erros desconhecidos', () => {
    const originalError = new Error('Unknown error happened');
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiProcessingError).toBe(true);
    expect(parsed.message).toBe('Unknown error happened');
  });

  it('deve lidar com erro sem mensagem', () => {
    const originalError = new Error();
    const parsed = parseGeminiError(originalError);
    
    expect(parsed instanceof GeminiProcessingError).toBe(true);
  });
});
