/**
 * Testes unitários para o apiUsageLogger
 */

const { logApiUsage, logApiUsageWithType } = require('../utils/apiUsageLogger');

jest.mock('../models/ApiUsage', () => ({
  create: jest.fn(),
  logUsage: jest.fn()
}));

const ApiUsage = require('../models/ApiUsage');

describe('apiUsageLogger', () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('logApiUsage', () => {
    it('deve logar uso de API com dados corretos', async () => {
      ApiUsage.create.mockResolvedValue({ id: '123' });

      const usage = {
        modelName: 'gemini-1.5-flash',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      };

      await logApiUsage({
        userId: 'user-123',
        endpoint: 'video_analysis',
        usage
      });

      expect(ApiUsage.create).toHaveBeenCalledWith({
        userId: 'user-123',
        endpoint: 'video_analysis',
        model: 'gemini-1.5-flash',
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150
      });
    });

    it('deve usar valores padrão para tokens faltantes', async () => {
      ApiUsage.create.mockResolvedValue({ id: '123' });

      await logApiUsage({
        userId: 'user-123',
        endpoint: 'chat',
        usage: { modelName: 'gemini-pro' }
      });

      expect(ApiUsage.create).toHaveBeenCalledWith({
        userId: 'user-123',
        endpoint: 'chat',
        model: 'gemini-pro',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      });
    });

    it('deve usar modelo unknown se não fornecido', async () => {
      ApiUsage.create.mockResolvedValue({ id: '123' });

      await logApiUsage({
        userId: 'user-123',
        endpoint: 'test',
        usage: {}
      });

      expect(ApiUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'unknown' })
      );
    });

    it('deve logar aviso mas não lançar exceção em erro', async () => {
      ApiUsage.create.mockRejectedValue(new Error('DB error'));

      await expect(
        logApiUsage({
          userId: 'user-123',
          endpoint: 'test',
          usage: { modelName: 'test' }
        })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('não deve logar se userId for undefined', async () => {
      await logApiUsage({
        userId: undefined,
        endpoint: 'test',
        usage: { modelName: 'test' }
      });

      expect(ApiUsage.create).not.toHaveBeenCalled();
    });

    it('não deve logar se usage for undefined', async () => {
      await logApiUsage({
        userId: 'user-123',
        endpoint: 'test',
        usage: undefined
      });

      expect(ApiUsage.create).not.toHaveBeenCalled();
    });
  });

  describe('logApiUsageWithType', () => {
    it('deve chamar ApiUsage.logUsage com parâmetros corretos', async () => {
      ApiUsage.logUsage.mockResolvedValue({ id: '123' });

      await logApiUsageWithType({
        userId: 'user-456',
        operationType: 'strategy',
        usage: {
          modelName: 'gemini-1.5-pro',
          promptTokens: 200,
          completionTokens: 100
        }
      });

      expect(ApiUsage.logUsage).toHaveBeenCalledWith({
        userId: 'user-456',
        modelName: 'gemini-1.5-pro',
        operationType: 'strategy',
        promptTokens: 200,
        completionTokens: 100,
        metadata: {}
      });
    });

    it('deve usar valores padrão quando não fornecidos', async () => {
      ApiUsage.logUsage.mockResolvedValue({ id: '123' });

      await logApiUsageWithType({
        userId: 'user-789',
        operationType: 'summary',
        usage: {}
      });

      expect(ApiUsage.logUsage).toHaveBeenCalledWith({
        userId: 'user-789',
        modelName: 'unknown',
        operationType: 'summary',
        promptTokens: 0,
        completionTokens: 0,
        metadata: {}
      });
    });

    it('não deve logar se userId for undefined', async () => {
      await logApiUsageWithType({
        userId: undefined,
        operationType: 'test',
        usage: {}
      });

      expect(ApiUsage.logUsage).not.toHaveBeenCalled();
    });
  });
});

describe('Tipos de operação válidos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ApiUsage.create.mockResolvedValue({ id: '123' });
  });

  const validEndpoints = [
    'video_analysis',
    'consolidate_summaries', 
    'tactical_strategy',
    'athlete_summary',
    'chat_analysis',
    'chat_profile',
    'chat_strategy'
  ];

  validEndpoints.forEach(endpoint => {
    it(`deve aceitar endpoint "${endpoint}"`, async () => {
      await logApiUsage({
        userId: 'user',
        endpoint,
        usage: { modelName: 'test' }
      });
      
      expect(ApiUsage.create).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint })
      );
    });
  });
});
