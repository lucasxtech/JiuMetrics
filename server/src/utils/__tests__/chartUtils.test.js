const { extractJson } = require('../chartUtils');

describe('chartUtils.extractJson', () => {
  it('extrai JSON válido de uma resposta com texto extra', () => {
    const raw = `Algum texto antes {"summary":"ok","charts":[]} texto depois`;
    const parsed = extractJson(raw);

    expect(parsed).toEqual({ summary: 'ok', charts: [] });
  });

  it('retorna estrutura padrão quando não encontra JSON', () => {
    const parsed = extractJson('sem json aqui');
    expect(parsed.charts.length).toBeGreaterThan(0);
    expect(parsed.summary).toBeDefined();
  });
});
