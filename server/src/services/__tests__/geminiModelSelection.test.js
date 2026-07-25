/**
 * Testes de seleção dinâmica de modelo do geminiService (pós-Fase 1).
 *
 * Mockam a camada llm.js e verificam a regra central de resolução de
 * modelo: a escolha explícita do usuário sempre vence; sem escolha, cada
 * tarefa usa seu default de TASK_MODELS (vídeo/estratégia usam o modelo
 * forte, texto/chat o rápido).
 */

jest.mock('../llm', () => ({
  generateJson: jest.fn(),
  generateText: jest.fn(),
  sendChatMessage: jest.fn(),
  uploadVideo: jest.fn(),
  deleteFile: jest.fn(),
}));

const llm = require('../llm');
const { generateTacticalStrategy, generateAthleteSummary, chat } = require('../geminiService');
const { TASK_MODELS } = require('../../config/ai');

const mockAthleteData = { name: 'João Silva', belt: 'azul', resumo: 'Lutador técnico', technical_stats: null };
const mockOpponentData = { name: 'Pedro Santos', belt: 'azul', resumo: 'Lutador agressivo', technical_stats: null };

const FAKE_STRATEGY = { resumo_rapido: { como_vencer: 'pressionar', tres_prioridades: ['a', 'b', 'c'] } };

function usageFor(model) {
  return { modelName: model, promptTokens: 10, completionTokens: 20, totalTokens: 30 };
}

describe('Seleção Dinâmica de Modelo (via llm.js)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTacticalStrategy', () => {
    it('usa o modelo escolhido pelo usuário quando informado', async () => {
      llm.generateJson.mockResolvedValue({ data: FAKE_STRATEGY, usage: usageFor('gemini-3-pro-preview') });

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData, 'gemini-3-pro-preview');

      expect(llm.generateJson).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-3-pro-preview' }));
      expect(result.strategy).toEqual(FAKE_STRATEGY);
      expect(result.usage.modelName).toBe('gemini-3-pro-preview');
    });

    it('usa o default de STRATEGY quando nenhum modelo é informado', async () => {
      llm.generateJson.mockResolvedValue({ data: FAKE_STRATEGY, usage: usageFor(TASK_MODELS.STRATEGY) });

      await generateTacticalStrategy(mockAthleteData, mockOpponentData);

      expect(llm.generateJson).toHaveBeenCalledWith(expect.objectContaining({ model: TASK_MODELS.STRATEGY }));
    });

    it('usa o default de STRATEGY quando customModel é null', async () => {
      llm.generateJson.mockResolvedValue({ data: FAKE_STRATEGY, usage: usageFor(TASK_MODELS.STRATEGY) });

      await generateTacticalStrategy(mockAthleteData, mockOpponentData, null);

      expect(llm.generateJson).toHaveBeenCalledWith(expect.objectContaining({ model: TASK_MODELS.STRATEGY }));
    });

    it('sempre envia o schema de estratégia (saída estruturada, sem parse manual)', async () => {
      llm.generateJson.mockResolvedValue({ data: FAKE_STRATEGY, usage: usageFor(TASK_MODELS.STRATEGY) });

      await generateTacticalStrategy(mockAthleteData, mockOpponentData);

      const call = llm.generateJson.mock.calls[0][0];
      expect(call.schema).toBeDefined();
      expect(call.schema.required).toContain('resumo_rapido');
      expect(call.temperature).toBeDefined();
    });
  });

  describe('generateAthleteSummary', () => {
    const athleteWithAnalyses = { name: 'João Silva', analyses: [], attributes: null };

    it('usa o modelo escolhido pelo usuário quando informado', async () => {
      llm.generateText.mockResolvedValue({ text: 'Resumo técnico.', usage: usageFor('gemini-2.5-pro') });

      const result = await generateAthleteSummary(athleteWithAnalyses, 'gemini-2.5-pro');

      expect(llm.generateText).toHaveBeenCalledWith(expect.objectContaining({ model: 'gemini-2.5-pro' }));
      expect(result.summary).toBe('Resumo técnico.');
    });

    it('usa o default de TEXT quando nenhum modelo é informado', async () => {
      llm.generateText.mockResolvedValue({ text: 'Resumo técnico.', usage: usageFor(TASK_MODELS.TEXT) });

      await generateAthleteSummary(athleteWithAnalyses);

      expect(llm.generateText).toHaveBeenCalledWith(expect.objectContaining({ model: TASK_MODELS.TEXT }));
    });
  });

  describe('chat', () => {
    it('usa o default de CHAT e envia o contexto como systemInstruction nativa', async () => {
      llm.sendChatMessage.mockResolvedValue({ text: 'resposta', usage: usageFor(TASK_MODELS.CHAT) });

      const result = await chat({
        contextType: 'profile',
        contextData: { personName: 'João', personType: 'athlete', currentSummary: 'resumo atual' },
        history: [{ role: 'user', content: 'oi' }],
        userMessage: 'melhora o resumo',
      });

      const call = llm.sendChatMessage.mock.calls[0][0];
      expect(call.model).toBe(TASK_MODELS.CHAT);
      expect(call.systemInstruction).toContain('João');
      // Histórico não contém mais o par forjado user/model com o contexto
      expect(call.history).toEqual([{ role: 'user', parts: [{ text: 'oi' }] }]);
      expect(result.message).toBe('resposta');
    });
  });

  describe('Contrato de retorno', () => {
    it('generateTacticalStrategy retorna { strategy, usage } com contagem de tokens', async () => {
      llm.generateJson.mockResolvedValue({ data: FAKE_STRATEGY, usage: usageFor(TASK_MODELS.STRATEGY) });

      const result = await generateTacticalStrategy(mockAthleteData, mockOpponentData);

      expect(result).toEqual(expect.objectContaining({
        strategy: expect.any(Object),
        usage: expect.objectContaining({
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30
        })
      }));
    });
  });
});
