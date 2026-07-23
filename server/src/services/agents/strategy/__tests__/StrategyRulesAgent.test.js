const StrategyRulesAgent = require('../StrategyRulesAgent');

/**
 * Trava a unificação da resolução de alias de faixa: antes deste fix,
 * StrategyRulesAgent tinha seu próprio mapa `beltAliases` independente de
 * BELT_RULES/resolveBeltRules (config/ai.js), arriscando divergir
 * silenciosamente se uma correção de regras fosse aplicada só na fonte
 * única. Agora ele delega para resolveBeltRules.
 */
describe('StrategyRulesAgent.buildPrompt — resolução de alias via fonte única', () => {
  const agent = new StrategyRulesAgent();

  function buildContext(restrictiveBelt) {
    return {
      athlete: { belt: 'roxa' },
      opponent: { belt: 'roxa' },
      restrictiveBelt,
    };
  }

  it('produz o mesmo texto de regras para o alias em inglês ("purple") e o nome em português ("roxa")', () => {
    const promptForPurple = agent.buildPrompt(buildContext('purple'));
    const promptForRoxa = agent.buildPrompt(buildContext('roxa'));

    // Extrai apenas as linhas de ALLOWED_TECHNIQUES/FORBIDDEN_TECHNIQUES
    // (o RESTRICTIVE_BELT em si aparece diferente: "purple" vs "roxa")
    const extractTechniqueLines = (text) =>
      text.split('\n').filter(line => line.includes('Técnicas de perna PERMITIDAS') || line.includes('Técnicas PROIBIDAS'));

    expect(extractTechniqueLines(promptForPurple)).toEqual(extractTechniqueLines(promptForRoxa));
  });

  it('reflete corretamente que faixa roxa NÃO permite toe hold (regra corrigida na fonte única)', () => {
    const prompt = agent.buildPrompt(buildContext('roxa'));
    const forbiddenLine = prompt.split('\n').find(line => line.includes('Técnicas PROIBIDAS'));

    expect(forbiddenLine.toLowerCase()).toContain('toe hold');
  });

  it('reflete corretamente que faixa marrom permite toe hold', () => {
    const prompt = agent.buildPrompt(buildContext('marrom'));
    const allowedLine = prompt.split('\n').find(line => line.includes('Técnicas de perna PERMITIDAS'));

    expect(allowedLine.toLowerCase()).toContain('toe hold');
  });

  it('usa fallback seguro (arrays vazios) quando restrictiveBelt não é reconhecida', () => {
    const prompt = agent.buildPrompt(buildContext('faixa-inexistente'));
    // Não deve lançar erro, e deve conter os placeholders de fallback definidos no prompt
    expect(prompt).toContain('Conforme regulamento padrão');
    expect(prompt).toContain('Nenhuma restrição adicional');
  });
});
