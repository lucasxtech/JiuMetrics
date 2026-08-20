/**
 * Testes da camada llm.js (único ponto de contato com o @google/genai).
 * Mockam o SDK para verificar o contrato: config aplicada (temperature,
 * responseMimeType, responseSchema), parse do JSON e mapeamento de usage.
 */

// A API key precisa existir ANTES do require, pois llm.js decide no
// carregamento do módulo se cria o client.
process.env.GEMINI_API_KEY = 'test-key-nao-usada';

const mockGenerateContent = jest.fn();
const mockChatsCreate = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: { generateContent: (...args) => mockGenerateContent(...args) },
    chats: { create: (...args) => mockChatsCreate(...args) },
    files: { upload: jest.fn(), get: jest.fn(), delete: jest.fn() },
  })),
  Type: {
    OBJECT: 'OBJECT', ARRAY: 'ARRAY', STRING: 'STRING',
    INTEGER: 'INTEGER', NUMBER: 'NUMBER', BOOLEAN: 'BOOLEAN',
  },
}));

const llm = require('../llm');
const {
  GeminiParseError,
  GeminiQuotaExceededError,
  GeminiContentBlockedError,
  GeminiApiError,
  isTransientError
} = require('../../utils/errors');
const { AI_POLICIES } = require('../../config/ai');

function fakeResponse(text) {
  return {
    text,
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
  };
}

describe('llm.generateJson', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('envia responseMimeType/responseSchema/temperature na config e parseia o JSON', async () => {
    mockGenerateContent.mockResolvedValue(fakeResponse('{"resultado": "ok"}'));
    const schema = { type: 'OBJECT', properties: { resultado: { type: 'STRING' } } };

    const { data, usage } = await llm.generateJson({
      model: 'gemini-2.5-pro',
      contents: 'prompt de teste',
      schema,
      temperature: 0.2,
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-pro',
      contents: 'prompt de teste',
      config: expect.objectContaining({
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: schema,
      }),
    }));
    expect(data).toEqual({ resultado: 'ok' });
    expect(usage).toEqual({
      modelName: 'gemini-2.5-pro',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
  });

  it('lança GeminiParseError quando a resposta não é JSON válido (nunca retorna dados inventados)', async () => {
    mockGenerateContent.mockResolvedValue(fakeResponse('não é json'));

    await expect(llm.generateJson({
      model: 'gemini-2.5-flash',
      contents: 'x',
      schema: {},
    })).rejects.toThrow(GeminiParseError);
  });

  it('lança GeminiParseError quando a resposta vem vazia', async () => {
    mockGenerateContent.mockResolvedValue(fakeResponse(''));

    await expect(llm.generateJson({
      model: 'gemini-2.5-flash',
      contents: 'x',
      schema: {},
    })).rejects.toThrow(GeminiParseError);
  });
});

describe('llm.generateText', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it('retorna o texto trimado e o usage, sem forçar responseMimeType', async () => {
    mockGenerateContent.mockResolvedValue(fakeResponse('  resumo gerado  '));

    const { text, usage } = await llm.generateText({
      model: 'gemini-2.5-flash',
      contents: 'prompt',
      temperature: 0.4,
    });

    const callConfig = mockGenerateContent.mock.calls[0][0].config;
    expect(callConfig.responseMimeType).toBeUndefined();
    expect(callConfig.temperature).toBe(0.4);
    expect(text).toBe('resumo gerado');
    expect(usage.modelName).toBe('gemini-2.5-flash');
  });
});

describe('llm.sendChatMessage', () => {
  beforeEach(() => {
    mockChatsCreate.mockReset();
  });

  it('cria o chat com systemInstruction nativa e histórico, e envia a mensagem', async () => {
    const mockSendMessage = jest.fn().mockResolvedValue(fakeResponse('resposta do chat'));
    mockChatsCreate.mockReturnValue({ sendMessage: mockSendMessage });

    const history = [{ role: 'user', parts: [{ text: 'oi' }] }];
    const { text, usage } = await llm.sendChatMessage({
      model: 'gemini-2.5-flash',
      systemInstruction: 'você é um assistente de jiu-jitsu',
      history,
      message: 'me ajuda com a guarda',
      temperature: 0.7,
    });

    expect(mockChatsCreate).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-2.5-flash',
      history,
      config: expect.objectContaining({
        temperature: 0.7,
        systemInstruction: 'você é um assistente de jiu-jitsu',
      }),
    }));
    expect(mockSendMessage).toHaveBeenCalledWith({ message: 'me ajuda com a guarda' });
    expect(text).toBe('resposta do chat');
    expect(usage.totalTokens).toBe(150);
  });
});


describe('SPEC-009 (R5–R7) — retry e timeout por fluxo', () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('classificação do erro (isTransientError)', () => {
    it('NÃO repete o que não melhora com nova tentativa', () => {
      // Cada retry aqui seria outra inferência completa, paga, sem chance de
      // resultado diferente.
      expect(isTransientError(new GeminiQuotaExceededError())).toBe(false);
      expect(isTransientError(new GeminiContentBlockedError())).toBe(false);
      expect(isTransientError(new GeminiParseError())).toBe(false);
    });

    it('repete falha de rede e indisponibilidade do provedor', () => {
      expect(isTransientError(new GeminiApiError('Erro de conexão'))).toBe(true);
      expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true);
      expect(isTransientError(new Error('The model is overloaded'))).toBe(true);
    });
  });

  it('repete falha transitória e devolve o resultado da tentativa seguinte', async () => {
    mockGenerateContent
      .mockRejectedValueOnce(new Error('503 Service Unavailable'))
      .mockResolvedValueOnce(fakeResponse('resumo consolidado'));

    const { text } = await llm.generateText({
      model: 'gemini-2.5-flash',
      task: 'TEXT',
      contents: 'consolide',
    });

    expect(text).toBe('resumo consolidado');
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it('NÃO repete quota estourada — falha na primeira tentativa', async () => {
    mockGenerateContent.mockRejectedValue(new Error('quota exceeded for this project'));

    await expect(
      llm.generateText({ model: 'gemini-2.5-flash', task: 'TEXT', contents: 'x' })
    ).rejects.toBeInstanceOf(GeminiQuotaExceededError);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('NÃO repete conteúdo bloqueado', async () => {
    mockGenerateContent.mockRejectedValue(new Error('blocked by safety settings'));

    await expect(
      llm.generateText({ model: 'gemini-2.5-flash', task: 'TEXT', contents: 'x' })
    ).rejects.toBeInstanceOf(GeminiContentBlockedError);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('respeita o teto de tentativas da política do fluxo', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 unavailable'));

    await expect(
      llm.generateText({ model: 'gemini-2.5-flash', task: 'TEXT', contents: 'x' })
    ).rejects.toThrow();

    // TEXT permite 3; não pode virar retry infinito
    expect(mockGenerateContent).toHaveBeenCalledTimes(AI_POLICIES.TEXT.maxAttempts);
  });

  it('análise de vídeo repete MENOS que texto — a política é por fluxo', async () => {
    // Não é detalhe de configuração: repetir uma inferência de vídeo em
    // gemini-2.5-pro custa muito mais que repetir uma consolidação de texto.
    expect(AI_POLICIES.VIDEO_ANALYSIS.maxAttempts).toBeLessThan(AI_POLICIES.TEXT.maxAttempts);
    expect(AI_POLICIES.VIDEO_ANALYSIS.timeoutMs).toBeGreaterThan(AI_POLICIES.CHAT.timeoutMs);

    mockGenerateContent.mockRejectedValue(new Error('503 unavailable'));
    await expect(
      llm.generateJson({ model: 'gemini-2.5-pro', task: 'VIDEO_ANALYSIS', contents: 'x', schema: {} })
    ).rejects.toThrow();

    expect(mockGenerateContent).toHaveBeenCalledTimes(AI_POLICIES.VIDEO_ANALYSIS.maxAttempts);
  });

  it('sem `task`, não repete — o chamador que não declara o fluxo mantém o comportamento antigo', async () => {
    mockGenerateContent.mockRejectedValue(new Error('503 unavailable'));

    await expect(
      llm.generateText({ model: 'gemini-2.5-flash', contents: 'x' })
    ).rejects.toThrow();

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it('interrompe a espera quando a chamada passa do timeout', async () => {
    jest.useFakeTimers();
    // Uma promessa que nunca resolve: é o caso "requisição pendurada".
    mockGenerateContent.mockImplementation(() => new Promise(() => {}));

    const promessa = llm.generateText({ model: 'gemini-2.5-flash', task: 'CHAT', contents: 'x' });
    const assercao = expect(promessa).rejects.toThrow(/Timeout de \d+ms/);

    // CHAT tem maxAttempts 2: precisa avançar o timeout de cada tentativa
    // mais o backoff entre elas.
    await jest.advanceTimersByTimeAsync(AI_POLICIES.CHAT.timeoutMs + 1);
    await jest.advanceTimersByTimeAsync(AI_POLICIES.CHAT.baseDelayMs + 1);
    await jest.advanceTimersByTimeAsync(AI_POLICIES.CHAT.timeoutMs + 1);

    await assercao;
    jest.useRealTimers();
  });
});
