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

/**
 * Análise estática: garante que todo placeholder {{VAR}} usado em um arquivo
 * de prompt .txt é de fato fornecido pelo(s) call-site(s) que chamam
 * getPrompt('nome-do-prompt', {...}) no código-fonte.
 *
 * Isso pega bugs como o do consolidate-summaries.txt, que declarava
 * {{MAX_WORDS}} mas o call-site nunca passava essa variável — o modelo
 * recebia o placeholder cru no prompt.
 */
describe('Integração - Placeholders vs variáveis fornecidas nos call-sites', () => {
  const realFs = jest.requireActual('fs');
  const srcDir = path.join(__dirname, '..');
  const promptsDir = path.join(srcDir, 'services/prompts');

  /**
   * Varre um diretório recursivamente e retorna os caminhos de todos os
   * arquivos .js, exceto os que ficam em pastas __tests__.
   */
  function listSourceFiles(dir) {
    const entries = realFs.readdirSync(dir, { withFileTypes: true });
    let files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
        files = files.concat(listSourceFiles(fullPath));
      } else if (entry.name.endsWith('.js') && !entry.name.endsWith('.test.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  /**
   * A partir de um índice que aponta para o "{" de abertura de um objeto
   * literal no código-fonte, retorna o índice do "}" de fechamento
   * correspondente, ignorando chaves dentro de strings.
   */
  function findObjectLiteralEnd(text, openBraceIndex) {
    let depth = 0;
    let inString = null; // guarda o caractere de aspas ativo, ou null

    for (let i = openBraceIndex; i < text.length; i++) {
      const char = text[i];

      if (inString) {
        if (char === '\\') { i++; continue; } // pula caractere escapado
        if (char === inString) inString = null;
        continue;
      }

      if (char === '"' || char === "'" || char === '`') {
        inString = char;
        continue;
      }

      if (char === '{') depth++;
      if (char === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }

    return -1;
  }

  /**
   * Extrai as chaves de variável (padrão MAIUSCULO_SNAKE_CASE usado por
   * todos os prompts deste projeto) de um trecho de objeto literal.
   */
  function extractSuppliedKeys(objectLiteralText) {
    const keyPattern = /\b([A-Z][A-Z0-9_]*)\s*:/g;
    const keys = new Set();
    let match;
    while ((match = keyPattern.exec(objectLiteralText)) !== null) {
      keys.add(match[1]);
    }
    return keys;
  }

  /**
   * Mapa: nome do prompt (sem .txt) -> array de { file, keys: Set<string> }
   * representando cada call-site que invoca esse prompt.
   */
  function collectCallSites() {
    const callSites = {};
    const addCallSite = (promptName, file, keys) => {
      if (!callSites[promptName]) callSites[promptName] = [];
      callSites[promptName].push({ file: path.relative(srcDir, file), keys });
    };

    const literalCallPattern = /getPrompt\(\s*['"]([\w-]+)['"]\s*,/g;

    for (const file of listSourceFiles(srcDir)) {
      const content = realFs.readFileSync(file, 'utf-8');

      // Call-sites com nome de prompt literal: getPrompt('nome', {...})
      let match;
      while ((match = literalCallPattern.exec(content)) !== null) {
        const promptName = match[1];
        const openBraceIndex = content.indexOf('{', match.index + match[0].length);
        if (openBraceIndex === -1) {
          addCallSite(promptName, file, new Set());
          continue;
        }
        const closeBraceIndex = findObjectLiteralEnd(content, openBraceIndex);
        const objectLiteralText = content.slice(openBraceIndex, closeBraceIndex + 1);
        addCallSite(promptName, file, extractSuppliedKeys(objectLiteralText));
      }

      // Caso especial: AgentBase.buildPrompt chama getPrompt(this.promptFile, {...})
      // com nome dinâmico — mas o conjunto de chaves fornecidas é fixo e conhecido,
      // e se aplica a qualquer prompt usado pelos agentes que estendem AgentBase
      // (agent-technical, agent-tactical, agent-rules).
      if (file.endsWith(`${path.sep}agents${path.sep}AgentBase.js`)) {
        const dynamicCallMatch = content.match(/getPrompt\(\s*this\.promptFile\s*,/);
        if (dynamicCallMatch) {
          const openBraceIndex = content.indexOf('{', dynamicCallMatch.index + dynamicCallMatch[0].length);
          const closeBraceIndex = findObjectLiteralEnd(content, openBraceIndex);
          const objectLiteralText = content.slice(openBraceIndex, closeBraceIndex + 1);
          const keys = extractSuppliedKeys(objectLiteralText);

          // Descobre quais prompts usam esse buildPrompt genérico: qualquer
          // classe em services/agents/*.js (exceto AgentBase/index/Orchestrator)
          // cujo super() define o promptFile.
          const agentsDir = path.dirname(file);
          for (const agentFile of realFs.readdirSync(agentsDir)) {
            const agentPath = path.join(agentsDir, agentFile);
            if (!realFs.statSync(agentPath).isFile()) continue;
            if (['AgentBase.js', 'Orchestrator.js', 'index.js'].includes(agentFile)) continue;
            const agentContent = realFs.readFileSync(agentPath, 'utf-8');
            const superMatch = agentContent.match(/super\(\s*['"][^'"]*['"]\s*,\s*['"]([\w-]+)['"]/);
            if (superMatch) {
              addCallSite(superMatch[1], file, keys);
            }
          }
        }
      }
    }

    return callSites;
  }

  it('todo placeholder {{VAR}} de cada prompt .txt é fornecido por todos os seus call-sites', () => {
    const callSites = collectCallSites();
    const promptFiles = realFs.readdirSync(promptsDir).filter(f => f.endsWith('.txt'));

    const problems = [];

    for (const promptFileName of promptFiles) {
      const promptName = promptFileName.replace(/\.txt$/, '');
      const content = realFs.readFileSync(path.join(promptsDir, promptFileName), 'utf-8');

      const placeholderPattern = /\{\{([A-Z0-9_]+)\}\}/g;
      const placeholders = new Set();
      let match;
      while ((match = placeholderPattern.exec(content)) !== null) {
        placeholders.add(match[1]);
      }

      if (placeholders.size === 0) continue;

      const sites = callSites[promptName];
      if (!sites || sites.length === 0) {
        // Prompt sem call-site literal detectável (ex.: nome resolvido de
        // forma totalmente dinâmica) — fora do alcance desta checagem estática.
        continue;
      }

      for (const site of sites) {
        const missing = [...placeholders].filter(p => !site.keys.has(p));
        if (missing.length > 0) {
          problems.push(
            `${promptFileName} usa {{${missing.join('}}, {{')}}} mas o call-site em ${site.file} não fornece ${missing.length > 1 ? 'essas variáveis' : 'essa variável'}`
          );
        }
      }
    }

    expect(problems).toEqual([]);
  });
});
