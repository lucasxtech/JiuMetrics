const { extractJson, normalizeChartData } = require('../chartUtils');

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

describe('chartUtils.normalizeChartData', () => {
  test('deve normalizar valores que somam mais de 100', () => {
    const input = [
      { label: 'A', value: 60 },
      { label: 'B', value: 50 },
      { label: 'C', value: 30 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(100);
  });

  test('deve normalizar valores que somam menos de 100', () => {
    const input = [
      { label: 'A', value: 30 },
      { label: 'B', value: 20 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(100);
  });

  test('deve manter valores que já somam 100', () => {
    const input = [
      { label: 'A', value: 60 },
      { label: 'B', value: 40 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(100);
    expect(result[0].value).toBe(60);
    expect(result[1].value).toBe(40);
  });

  test('deve manter todos zeros quando não há dados', () => {
    const input = [
      { label: 'A', value: 0 },
      { label: 'B', value: 0 },
      { label: 'C', value: 0 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(0);
  });

  test('deve ajustar arredondamento corretamente', () => {
    const input = [
      { label: 'A', value: 33 },
      { label: 'B', value: 33 },
      { label: 'C', value: 33 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(100);
  });

  test('deve lidar com valores decimais', () => {
    const input = [
      { label: 'A', value: 25.5 },
      { label: 'B', value: 30.2 },
      { label: 'C', value: 44.3 }
    ];
    
    const result = normalizeChartData(input);
    const total = result.reduce((sum, item) => sum + item.value, 0);
    
    expect(total).toBe(100);
  });

  test('deve retornar array vazio quando input é vazio', () => {
    const result = normalizeChartData([]);
    expect(result).toEqual([]);
  });
});
