/**
 * Input fixo usado para provar que o prompt de consolidação continua
 * byte-idêntico depois de sair de dentro de `strategyService.js`
 * (spec 009, R9). Não altere: o golden foi capturado com exatamente isto.
 */
const FIXTURE = {
  analyses: [
    {
      summary: 'Lutador guardeiro, puxa guarda logo após o combate. Ataca triângulo.',
      charts: [
        { title: 'Personalidade Geral', data: [{ label: 'Agressivo/Ofensivo', value: 70 }] },
        { title: 'Jogo de Guarda', data: [{ label: 'Guarda Fechada', value: 60 }] }
      ],
      technicalStats: {
        sweeps: { quantidade: 3, efetividade_percentual: 66 },
        guard_passes: { quantidade: 1 },
        submissions: { tentativas: 2, ajustadas: 1, concluidas: 1, detalhes: ['triângulo'] },
        back_takes: { quantidade: 0, tentou_finalizar: false }
      }
    },
    {
      summary: 'Segunda luta: manteve o jogo de guarda, buscou raspagem de gancho.',
      charts: [
        { title: 'Personalidade Geral', data: [{ label: 'Calmo/Controlador', value: 55 }] }
      ],
      technicalStats: {
        sweeps: { quantidade: 2, efetividade_percentual: 50 },
        guard_passes: { quantidade: 0 },
        submissions: { tentativas: 1, ajustadas: 0, concluidas: 0, detalhes: [] },
        back_takes: { quantidade: 1, tentou_finalizar: true }
      }
    }
  ]
};

module.exports = { FIXTURE };
