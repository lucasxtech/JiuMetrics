// Mock Supabase antes de importar qualquer módulo
jest.mock('../../config/supabase', () => ({
  __esModule: true,
  default: {
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }))
  }
}));

const { extractTechnicalProfile } = require('../../utils/profileUtils');

describe('videoController.extractTechnicalProfile', () => {
  it('organiza dados do gráfico nas chaves corretas', () => {
    const charts = [
      {
        title: 'Personalidade Geral',
        data: [
          { label: 'Agressivo/Ofensivo', value: 70 },
          { label: 'Calmo/Controlador', value: 30 },
        ],
      },
      {
        title: 'Jogo de Guarda',
        data: [
          { label: 'Guarda Fechada', value: 60 },
        ],
      },
    ];

    const profile = extractTechnicalProfile(charts);

    expect(profile.personality).toEqual({
      'Agressivo/Ofensivo': 70,
      'Calmo/Controlador': 30,
    });
    expect(profile.guardGame).toEqual({ 'Guarda Fechada': 60 });
  });

  it('retorna objeto vazio quando não há gráficos', () => {
    expect(extractTechnicalProfile()).toEqual({});
  });
});
