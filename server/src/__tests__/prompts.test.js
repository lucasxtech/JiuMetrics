/**
 * Testes unitários para o sistema de prompts
 */

const path = require('path');
const fs = require('fs');

jest.mock('fs');

const { loadPrompt, fillPrompt, getPrompt, clearCache, listPrompts } = require('../services/prompts');

describe('Sistema de Prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearCache();
  });

  describe('fillPrompt', () => {
    it('deve substituir placeholders simples', () => {
      const template = 'Olá {{NAME}}, bem-vindo!';
      const result = fillPrompt(template, { NAME: 'João' });
      expect(result).toBe('Olá João, bem-vindo!');
    });

    it('deve substituir múltiplos placeholders', () => {
      const template = '{{ATHLETE}} vs {{OPPONENT}} - {{DATE}}';
      const result = fillPrompt(template, {
        ATHLETE: 'Marcus',
        OPPONENT: 'Felipe',
        DATE: '2026-01-16'
      });
      expect(result).toBe('Marcus vs Felipe - 2026-01-16');
    });

    it('deve substituir placeholder repetido', () => {
      const template = '{{NAME}} é bom. {{NAME}} treina muito.';
      const result = fillPrompt(template, { NAME: 'Carlos' });
      expect(result).toBe('Carlos é bom. Carlos treina muito.');
    });

    it('deve manter placeholders não fornecidos intactos', () => {
      const template = 'Atleta: {{NAME}}, Faixa: {{BELT}}';
      const result = fillPrompt(template, { NAME: 'Ana' });
      expect(result).toBe('Atleta: Ana, Faixa: {{BELT}}');
    });

    it('deve converter valores numéricos para string', () => {
      const template = 'Total de análises: {{COUNT}}';
      const result = fillPrompt(template, { COUNT: 5 });
      expect(result).toBe('Total de análises: 5');
    });

    it('deve lidar com valores null/undefined substituindo por vazio', () => {
      const template = 'Valor: {{VALUE}}';
      expect(fillPrompt(template, { VALUE: null })).toBe('Valor: ');
      expect(fillPrompt(template, { VALUE: undefined })).toBe('Valor: ');
    });

    it('deve retornar template original se sem variáveis', () => {
      const template = 'Texto sem placeholders';
      const result = fillPrompt(template, {});
      expect(result).toBe('Texto sem placeholders');
    });

    it('deve lidar com objetos JSON como valores', () => {
      const template = 'Dados: {{DATA}}';
      const data = { key: 'value' };
      const result = fillPrompt(template, { DATA: JSON.stringify(data) });
      expect(result).toBe('Dados: {"key":"value"}');
    });
  });

  describe('loadPrompt', () => {
    it('deve carregar prompt de arquivo existente', () => {
      const mockContent = 'Conteúdo do prompt de teste';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockContent);

      const result = loadPrompt('test-prompt');
      
      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('test-prompt.txt'),
        'utf-8'
      );
      expect(result).toBe(mockContent);
    });

    it('deve usar cache na segunda chamada', () => {
      const mockContent = 'Conteúdo cacheado';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockContent);

      loadPrompt('cached-prompt');
      loadPrompt('cached-prompt');

      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('deve lançar erro para arquivo inexistente', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => loadPrompt('nao-existe'))
        .toThrow('Prompt "nao-existe" não encontrado');
    });
  });

  describe('getPrompt', () => {
    it('deve carregar e preencher prompt em uma operação', () => {
      const mockTemplate = 'URL DO VÍDEO:\n{{VIDEO_URL}}';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockTemplate);

      const result = getPrompt('video-analysis', { 
        VIDEO_URL: 'https://youtube.com/watch?v=abc123' 
      });

      expect(result).toBe('URL DO VÍDEO:\nhttps://youtube.com/watch?v=abc123');
    });

    it('deve funcionar sem variáveis', () => {
      const mockTemplate = 'Prompt sem variáveis';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(mockTemplate);

      const result = getPrompt('simple-prompt');
      expect(result).toBe('Prompt sem variáveis');
    });
  });

  describe('clearCache', () => {
    it('deve limpar o cache de prompts', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('Conteúdo');

      loadPrompt('to-clear');
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);

      clearCache();

      loadPrompt('to-clear');
      expect(fs.readFileSync).toHaveBeenCalledTimes(2);
    });
  });

  describe('listPrompts', () => {
    it('deve listar prompts disponíveis sem extensão', () => {
      fs.readdirSync.mockReturnValue([
        'video-analysis.txt',
        'chat-analysis.txt',
        'tactical-strategy.txt',
        'README.md'
      ]);

      const result = listPrompts();

      expect(result).toEqual([
        'video-analysis',
        'chat-analysis',
        'tactical-strategy'
      ]);
      expect(result).not.toContain('README');
    });
  });
});

describe('Integração - Arquivos de Prompt Reais', () => {
  beforeAll(() => {
    jest.unmock('fs');
  });

  const realFs = jest.requireActual('fs');
  const promptsDir = path.join(__dirname, '../services/prompts');

  it('deve ter arquivo video-analysis.txt', () => {
    const filePath = path.join(promptsDir, 'video-analysis.txt');
    expect(realFs.existsSync(filePath)).toBe(true);
  });

  it('deve ter placeholder VIDEO_URL em video-analysis.txt', () => {
    const filePath = path.join(promptsDir, 'video-analysis.txt');
    const content = realFs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('{{VIDEO_URL}}');
  });

  it('deve ter todos os arquivos de prompt necessários', () => {
    const requiredPrompts = [
      'video-analysis.txt',
      'consolidate-summaries.txt',
      'tactical-strategy.txt',
      'athlete-summary.txt',
      'chat-analysis.txt',
      'chat-profile.txt',
      'chat-strategy.txt'
    ];

    requiredPrompts.forEach(promptFile => {
      const filePath = path.join(promptsDir, promptFile);
      expect(realFs.existsSync(filePath)).toBe(true);
    });
  });
});
