/**
 * TestDataBuilder - Builder pattern para dados de teste
 * 
 * Facilita a criação de dados de teste consistentes
 */

export interface AthleteData {
  name: string;
  academy?: string;
  belt?: string;
  weight?: number;
  age?: number;
  style?: string;
}

export interface OpponentData {
  name: string;
  academy?: string;
  belt?: string;
  weight?: number;
  notes?: string;
}

export class TestDataBuilder {
  /**
   * Cria dados de atleta com valores padrão
   */
  static athlete(overrides: Partial<AthleteData> = {}): AthleteData {
    const timestamp = Date.now();
    return {
      name: `Atleta Teste ${timestamp}`,
      academy: 'Academia Teste',
      belt: 'Azul',
      weight: 75,
      age: 25,
      style: 'Guardeiro',
      ...overrides,
    };
  }

  /**
   * Cria dados de oponente com valores padrão
   */
  static opponent(overrides: Partial<OpponentData> = {}): OpponentData {
    const timestamp = Date.now();
    return {
      name: `Oponente Teste ${timestamp}`,
      academy: 'Academia Rival',
      belt: 'Roxa',
      weight: 80,
      notes: 'Notas de teste',
      ...overrides,
    };
  }

  /**
   * Gera nome único para testes
   */
  static uniqueName(prefix: string = 'Test'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * URLs de vídeo para teste
   */
  static readonly VIDEO_URLS = {
    youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    youtubeShort: 'https://youtu.be/dQw4w9WgXcQ',
    invalid: 'url-invalida-123',
  };
}
