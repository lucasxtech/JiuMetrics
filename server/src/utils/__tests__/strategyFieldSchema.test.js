const { validateStrategyField } = require('../strategyFieldSchema');

describe('validateStrategyField', () => {
  it('aceita quando nenhum campo é informado (não há o que validar)', () => {
    expect(validateStrategyField(undefined, {})).toEqual({ valid: true });
  });

  it('aceita campos não reconhecidos sem bloquear (fora do escopo desta validação)', () => {
    expect(validateStrategyField('campo_desconhecido', {})).toEqual({ valid: true });
  });

  describe('como_vencer', () => {
    it('aceita quando resumo_rapido.como_vencer é uma string não vazia', () => {
      const result = validateStrategyField('como_vencer', {
        resumo_rapido: { como_vencer: 'Pressionar e buscar raspagem' }
      });
      expect(result.valid).toBe(true);
    });

    it('rejeita quando como_vencer está ausente', () => {
      const result = validateStrategyField('como_vencer', { resumo_rapido: {} });
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/como_vencer/);
    });

    it('aceita o alias "tese_da_vitoria"', () => {
      const result = validateStrategyField('tese_da_vitoria', {
        resumo_rapido: { como_vencer: 'Pressionar e buscar raspagem' }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('plano_tatico_faseado', () => {
    it('rejeita o formato antigo/errado com fase_inicial/meio_da_luta/final_da_luta', () => {
      const result = validateStrategyField('plano_tatico_faseado', {
        plano_tatico_faseado: {
          fase_inicial: 'texto',
          meio_da_luta: 'texto',
          final_da_luta: 'texto'
        }
      });
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/em_pe_standup/);
    });

    it('aceita o schema real com em_pe_standup/jogo_de_passagem_top/jogo_de_guarda_bottom', () => {
      const result = validateStrategyField('plano_tatico_faseado', {
        plano_tatico_faseado: {
          em_pe_standup: { acao_recomendada: 'x' },
          jogo_de_passagem_top: { estilo_recomendado: 'y' },
          jogo_de_guarda_bottom: { guarda_ideal: 'z' }
        }
      });
      expect(result.valid).toBe(true);
    });

    it('aceita o alias "plano_tatico"', () => {
      const result = validateStrategyField('plano_tatico', {
        plano_tatico_faseado: {
          em_pe_standup: {}, jogo_de_passagem_top: {}, jogo_de_guarda_bottom: {}
        }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('checklist_tatico', () => {
    it('rejeita o formato antigo/errado com ofensiva/defensiva/mental', () => {
      const result = validateStrategyField('checklist_tatico', {
        checklist_tatico: { ofensiva: [], defensiva: [], mental: [] }
      });
      expect(result.valid).toBe(false);
      expect(result.message).toMatch(/oportunidades_de_pontos/);
    });

    it('aceita o schema real com oportunidades_de_pontos/armadilhas_dele/protocolo_de_emergencia', () => {
      const result = validateStrategyField('checklist_tatico', {
        checklist_tatico: {
          oportunidades_de_pontos: [],
          armadilhas_dele: [],
          protocolo_de_emergencia: { posicao_perigosa: 'x', como_escapar: 'y' }
        }
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('analise_de_matchup e cronologia_inteligente', () => {
    it('valida analise_de_matchup exigindo vantagem_critica/risco_oculto/fator_chave', () => {
      expect(validateStrategyField('analise_de_matchup', {
        analise_de_matchup: { vantagem_critica: 'a', risco_oculto: 'b' }
      }).valid).toBe(false);

      expect(validateStrategyField('analise_de_matchup', {
        analise_de_matchup: { vantagem_critica: 'a', risco_oculto: 'b', fator_chave: 'c' }
      }).valid).toBe(true);
    });

    it('valida cronologia_inteligente exigindo primeiro_minuto/minutos_2_a_4/minutos_finais', () => {
      expect(validateStrategyField('cronologia_inteligente', {
        cronologia_inteligente: { primeiro_minuto: 'a' }
      }).valid).toBe(false);

      expect(validateStrategyField('cronologia_inteligente', {
        cronologia_inteligente: { primeiro_minuto: 'a', minutos_2_a_4: 'b', minutos_finais: 'c' }
      }).valid).toBe(true);
    });
  });

  it('resolve o objeto de estratégia tanto na raiz quanto aninhado em .strategy', () => {
    const nested = {
      strategy: { resumo_rapido: { como_vencer: 'texto válido' } }
    };
    expect(validateStrategyField('como_vencer', nested).valid).toBe(true);
  });
});
