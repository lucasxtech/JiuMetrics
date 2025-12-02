const { extractTechnicalProfile } = require('../videoController');

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
