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
const { GeminiParseError } = require('../../utils/errors');

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
