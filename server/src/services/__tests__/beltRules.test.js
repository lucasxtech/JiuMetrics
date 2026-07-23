/**
 * Testes de regressão para as regras IBJJF por faixa (BELT_RULES) e para o
 * formatter único que deriva texto de prompt a partir dela.
 *
 * Contexto: antes desta correção, havia 3 fontes divergentes de regras
 * (config/ai.js, geminiService.js hardcoded, agent-rules.txt hardcoded),
 * e pelo menos duas continham erros factuais — ex.: toe hold listado como
 * permitido para faixa roxa (na verdade só é liberado a partir de marrom),
 * e wrist lock listado como proibido para azul (na verdade é permitido
 * desde essa faixa). Esses testes travam o comportamento correto.
 */

const { BELT_RULES } = require('../../config/ai');
const { formatBeltRules, getBeltRulesText, formatBeltRulesForStrategy, buildVideoAnalysisContext } = require('../geminiService');

describe('BELT_RULES (fonte única)', () => {
  it('NÃO permite toe hold para faixa roxa (só é liberado a partir de marrom)', () => {
    expect(BELT_RULES.roxa.allowed).not.toContain('toe hold');
    expect(BELT_RULES.roxa.forbidden).toContain('toe hold');
  });

  it('NÃO permite bicep slicer para faixa roxa', () => {
    expect(BELT_RULES.roxa.allowed).not.toContain('bicep slicer');
    expect(BELT_RULES.roxa.forbidden).toContain('bicep slicer');
  });

  it('permite wrist lock a partir da faixa azul (não é proibido)', () => {
    expect(BELT_RULES.azul.allowed).toContain('wrist lock');
    expect(BELT_RULES.roxa.allowed).toContain('wrist lock');
    expect(BELT_RULES.marrom.allowed).toContain('wrist lock');
  });

  it('permite toe hold, kneebar, calf slicer e bicep slicer a partir da faixa marrom', () => {
    for (const belt of ['marrom', 'preta']) {
      expect(BELT_RULES[belt].allowed).toContain('toe hold');
      expect(BELT_RULES[belt].allowed).toContain('kneebar');
      expect(BELT_RULES[belt].allowed).toContain('calf slicer');
      expect(BELT_RULES[belt].allowed).toContain('bicep slicer');
    }
  });

  it('marca heel hook/knee reaping como restrito a NO-GI para marrom/preta, não liberado geral', () => {
    for (const belt of ['marrom', 'preta']) {
      // Não deve haver um item "heel hook" puro em allowed (gi) — apenas a
      // variante marcada como restrita a no-gi pode estar em forbidden.
      expect(BELT_RULES[belt].allowed).not.toContain('heel hook');
      expect(BELT_RULES[belt].forbidden.some(t => t.includes('heel hook'))).toBe(true);
    }
  });

  it('branca e azul proíbem heel hook, toe hold, kneebar, calf slicer e bicep slicer', () => {
    for (const belt of ['branca', 'azul']) {
      ['toe hold', 'kneebar', 'calf slicer', 'bicep slicer', 'heel hook'].forEach(t => {
        expect(BELT_RULES[belt].forbidden).toContain(t);
      });
    }
  });
});

describe('formatBeltRules (formatter único usado por getBeltRulesText e formatBeltRulesForStrategy)', () => {
  it('para faixa roxa, o texto gerado NÃO lista toe hold como permitido', () => {
    const text = formatBeltRules('roxa');

    expect(text).toContain('PERMITIDO');
    const permittedLine = text.split('\n').find(line => line.includes('PERMITIDO:'));
    expect(permittedLine.toLowerCase()).not.toContain('toe hold');

    const forbiddenLine = text.split('\n').find(line => line.includes('PROIBIDO:'));
    expect(forbiddenLine.toLowerCase()).toContain('toe hold');
  });

  it('resolve aliases em inglês para o mesmo conteúdo de regras da faixa em português', () => {
    // Remove a linha em branco inicial e a linha "🥋 FAIXA: X" antes de
    // comparar, já que o nome da faixa no texto reflete o que foi passado
    // (purple vs roxa).
    const withoutHeader = (text) => text.split('\n').slice(2).join('\n');

    expect(withoutHeader(formatBeltRules('purple'))).toBe(withoutHeader(formatBeltRules('roxa')));
    expect(withoutHeader(formatBeltRules('white'))).toBe(withoutHeader(formatBeltRules('branca')));
    expect(withoutHeader(formatBeltRules('black'))).toBe(withoutHeader(formatBeltRules('preta')));
  });

  it('é case-insensitive e aceita faixa em qualquer capitalização', () => {
    expect(formatBeltRules('Azul')).toContain('wrist lock');
    expect(formatBeltRules('ROXA')).toContain('FAIXA: ROXA');
  });

  it('nunca retorna string vazia para faixa desconhecida ou não informada — cai no fallback mais restritivo (branca)', () => {
    // Antes desta correção, belt vazio fazia o RulesAgent (multi-agente)
    // receber ZERO informação sobre técnicas ilegais, já que a tabela
    // hardcoded do prompt havia sido removida em favor do placeholder
    // {{BELT_RULES}} — que ficava vazio nesse caso. Agora cai no conjunto
    // mais restritivo em vez de silêncio.
    for (const belt of [null, undefined, 'faixa-inexistente']) {
      const text = formatBeltRules(belt);
      expect(text).not.toBe('');
      expect(text).toContain('NÃO ESPECIFICADA');
      expect(text.toLowerCase()).toContain('proibido');
      // O conteúdo do fallback deve ser o mesmo conjunto de regras da branca
      // (a mais restritiva) — só o cabeçalho difere.
      const withoutHeader = (t) => t.split('\n').slice(2).join('\n');
      expect(withoutHeader(text)).toBe(withoutHeader(formatBeltRules('branca')));
    }
  });

  it('não duplica o cabeçalho "FAIXA:" na saída', () => {
    for (const belt of ['branca', 'azul', 'roxa', 'marrom', 'preta', undefined]) {
      const text = formatBeltRules(belt);
      const headerOccurrences = (text.match(/FAIXA:/g) || []).length;
      expect(headerOccurrences).toBe(1);
    }
  });

  it('getBeltRulesText e formatBeltRulesForStrategy usam a mesma fonte (não mais duas tabelas divergentes)', () => {
    expect(getBeltRulesText('roxa')).toBe(formatBeltRulesForStrategy('roxa'));
    expect(getBeltRulesText('azul')).toBe(formatBeltRulesForStrategy('azul'));
    expect(getBeltRulesText('marrom')).toBe(formatBeltRulesForStrategy('marrom'));
  });
});

describe('buildVideoAnalysisContext (contexto do prompt de análise de vídeo)', () => {
  it('não duplica o cabeçalho "FAIXA:" quando a faixa é informada', () => {
    const contextText = buildVideoAnalysisContext({ athleteName: 'Atleta Teste', belt: 'roxa' });
    const headerOccurrences = (contextText.match(/FAIXA:/g) || []).length;
    expect(headerOccurrences).toBe(1);
  });

  it('não inclui nenhum texto de faixa quando belt não é informado', () => {
    const contextText = buildVideoAnalysisContext({ athleteName: 'Atleta Teste' });
    expect(contextText).not.toContain('FAIXA:');
  });
});
