const ScoutAgent = require('../ScoutAgent');

/**
 * Simula o objeto de resultado do Gemini (result.response.text()) para
 * alimentar parseResult sem chamar a API de verdade.
 */
function fakeGeminiResult(jsonBody) {
  return {
    response: {
      text: () => JSON.stringify(jsonBody),
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 }
    }
  };
}

describe('ScoutAgent.parseResult', () => {
  const agent = new ScoutAgent();

  it('extrai behavioral_pattern do JSON retornado pelo prompt (campo real do strategy-scout.txt)', () => {
    const result = fakeGeminiResult({
      confidence: 0.8,
      behavioral_pattern: {
        rhythm: 'pressão constante',
        when_losing: 'abre o jogo e busca finalização',
        when_winning: 'trava a luta e gerencia tempo'
      }
    });

    const parsed = agent.parseResult(result, {});

    expect(parsed.data.behavioral_pattern).toEqual({
      rhythm: 'pressão constante',
      when_losing: 'abre o jogo e busca finalização',
      when_winning: 'trava a luta e gerencia tempo'
    });
    // Não deve mais existir a chave antiga (que nunca era populada pelo prompt real)
    expect(parsed.data.psychological_profile).toBeUndefined();
  });

  it('usa objeto vazio como fallback quando behavioral_pattern não vem no JSON', () => {
    const result = fakeGeminiResult({ confidence: 0.5 });

    const parsed = agent.parseResult(result, {});

    expect(parsed.data.behavioral_pattern).toEqual({});
  });

  it('em caso de erro de parse, o fallback também usa behavioral_pattern (não psychological_profile)', () => {
    const brokenResult = {
      response: {
        text: () => { throw new Error('falha simulada'); }
      }
    };

    const parsed = agent.parseResult(brokenResult, {});

    expect(parsed.confidence).toBe(0.3);
    expect(parsed.data.behavioral_pattern).toEqual({});
    expect(parsed.data.psychological_profile).toBeUndefined();
  });
});
