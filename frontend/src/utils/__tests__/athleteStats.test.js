import { describe, it, expect } from 'vitest';
import { processPersonAnalyses } from '../athleteStats';

describe('athleteStats', () => {
  describe('processPersonAnalyses', () => {
    it('deve retornar dados padrão quando não há análises', () => {
      const person = { cardio: 70 };
      const result = processPersonAnalyses([], person);

      expect(result).toHaveProperty('radarData');
      expect(result).toHaveProperty('attacksData');
      expect(result).toHaveProperty('stats');
      expect(result.radarData).toHaveLength(5);
      expect(result.radarData[0]).toEqual({ name: 'Condicionamento', value: 70 });
      expect(result.strongAttacksText).toBe('Aguardando análises');
    });

    it('deve retornar dados padrão quando analyses é null', () => {
      const person = { cardio: 50 };
      const result = processPersonAnalyses(null, person);

      expect(result.radarData[0]).toEqual({ name: 'Condicionamento', value: 50 });
    });

    it('deve processar análises válidas corretamente', () => {
      const person = { cardio: 80, name: 'João Silva' };
      const analyses = [
        {
          technical_stats: {
            sweeps: { quantidade: 5, concluidas: 3 },
            submissions: { tentativas: 4 },
            back_takes: { quantidade: 2 },
          },
        },
        {
          technical_stats: {
            sweeps: { quantidade: 3, concluidas: 2 },
            submissions: { tentativas: 2 },
          },
        },
      ];

      const result = processPersonAnalyses(analyses, person);

      expect(result).toHaveProperty('radarData');
      expect(result).toHaveProperty('attacksData');
      expect(result).toHaveProperty('stats');
      expect(result.radarData).toBeInstanceOf(Array);
      expect(result.attacksData).toBeInstanceOf(Array);
    });

    it('deve lidar com análises sem technical_stats', () => {
      const person = { cardio: 60 };
      const analyses = [
        { id: '1', date: '2024-01-01' },
        { id: '2', date: '2024-01-02' },
      ];

      const result = processPersonAnalyses(analyses, person);

      expect(result).toHaveProperty('radarData');
      expect(result).toHaveProperty('attacksData');
    });

    it('deve calcular valores do radar corretamente', () => {
      const person = { cardio: 85, name: 'Maria' };
      const analyses = [
        {
          technical_stats: {
            sweeps: { quantidade: 10, concluidas: 8 },
            submissions: { tentativas: 6 },
            back_takes: { quantidade: 4 },
          },
        },
      ];

      const result = processPersonAnalyses(analyses, person);

      expect(result.radarData).toBeInstanceOf(Array);
      expect(result.radarData.length).toBeGreaterThan(0);
      result.radarData.forEach((item) => {
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('value');
        expect(typeof item.value).toBe('number');
        expect(item.value).toBeGreaterThanOrEqual(0);
        expect(item.value).toBeLessThanOrEqual(100);
      });
    });

    it('deve gerar attacksData quando há dados', () => {
      const person = { name: 'Pedro' };
      const analyses = [
        {
          technical_stats: {
            sweeps: { quantidade: 5, concluidas: 3 },
            submissions: { tentativas: 4 },
          },
        },
      ];

      const result = processPersonAnalyses(analyses, person);

      expect(result.attacksData).toBeInstanceOf(Array);
      if (result.attacksData[0]?.name !== 'Sem dados') {
        result.attacksData.forEach((attack) => {
          expect(attack).toHaveProperty('name');
          expect(attack).toHaveProperty('value');
          expect(typeof attack.value).toBe('number');
        });
      }
    });

    it('deve gerar textos de insights', () => {
      const person = { name: 'Ana' };
      const analyses = [
        {
          technical_stats: {
            sweeps: { quantidade: 5, concluidas: 4 },
          },
        },
      ];

      const result = processPersonAnalyses(analyses, person);

      expect(result).toHaveProperty('strongAttacksText');
      expect(result).toHaveProperty('weaknessesText');
      expect(typeof result.strongAttacksText).toBe('string');
      expect(typeof result.weaknessesText).toBe('string');
    });
  });
});
