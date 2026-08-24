/**
 * SPEC-009 (R9/R11) — o prompt de consolidação saiu de dentro de
 * `strategyService.js` para `prompts/consolidate-profile.txt`.
 *
 * ⚠️ **Este é o teste mais importante da spec 009.** Mover um prompt é a
 * operação de aparência mais inofensiva e de risco mais alto do projeto:
 * um espaço a mais, uma quebra de linha diferente, e a saída da IA muda —
 * **em silêncio**. Não existe erro, não existe log; só análises piores.
 *
 * O golden (`prompts/__fixtures__/consolidate-profile.golden.txt`) foi
 * capturado do código ANTERIOR à mudança, interceptando o `contents` que
 * chegava a `llm.generateText` com a fixture de `consolidateInput.js`. Nada
 * foi transcrito à mão — é por isso que a comparação vale.
 *
 * Se este teste falhar depois de alguém editar o `.txt`, a pergunta certa é
 * "a mudança de texto foi intencional?". Se foi, o golden precisa ser
 * recapturado deliberadamente, não ajustado até passar.
 */
jest.mock('../../config/supabase', () => ({ supabase: {} }));
jest.mock('../../models/FightAnalysis');
jest.mock('../llm');

const fs = require('fs');
const path = require('path');
const FightAnalysis = require('../../models/FightAnalysis');
const llm = require('../llm');
const StrategyService = require('../strategyService');
const { FIXTURE } = require('../prompts/__fixtures__/consolidateInput');

const GOLDEN = fs.readFileSync(
  path.join(__dirname, '../prompts/__fixtures__/consolidate-profile.golden.txt'),
  'utf-8'
);

async function promptMontado() {
  FightAnalysis.getByPersonId.mockResolvedValue(FIXTURE.analyses);
  llm.generateText.mockResolvedValue({ text: 'consolidado', usage: {} });

  await StrategyService.consolidateAnalyses('person-1', ['user-1'], null);

  return llm.generateText.mock.calls[0][0].contents;
}

describe('SPEC-009 — prompt de consolidação movido para prompts/', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('o prompt montado é BYTE-IDÊNTICO ao de antes da mudança', async () => {
    const atual = await promptMontado();

    expect(atual).toBe(GOLDEN);
    expect(Buffer.byteLength(atual, 'utf-8')).toBe(Buffer.byteLength(GOLDEN, 'utf-8'));
  });

  it('preserva os detalhes que passariam batido numa comparação visual', async () => {
    const atual = await promptMontado();

    // Espaço em branco no fim de "PROIBIDO: " — invisível ao olho, presente
    // no original.
    expect(atual).toContain('PROIBIDO: \n');
    // Backticks literais: no template antigo eram `\\``; num .txt são reais.
    expect(atual).toContain('`code`');
    // Separadores Unicode, com a contagem exata de caracteres
    expect(atual).toContain('━'.repeat(54));
    expect(atual).toContain('\n' + '━'.repeat(27) + '\n');
    // Emojis dos cabeçalhos
    expect(atual).toContain('📋 ANÁLISES INDIVIDUAIS');
    expect(atual).toContain('🎯 INSTRUÇÕES PARA O RESUMO');
    expect(atual).toContain('📦 FORMATO DE SAÍDA');
  });

  it('as interpolações continuam sendo preenchidas, não deixadas como placeholder', async () => {
    const atual = await promptMontado();

    expect(atual).not.toContain('{{');
    expect(atual).toContain('Você recebeu 2 análises técnicas');
    expect(atual).toContain('LUTA 1:');
    expect(atual).toContain('LUTA 2:');
    expect(atual).toContain(FIXTURE.analyses[0].summary);
  });

  it('R10 — resumo degradado é distinguível de um consolidado real', async () => {
    FightAnalysis.getByPersonId.mockResolvedValue(FIXTURE.analyses);
    // A consolidação por IA falha e o fallback concatena os resumos.
    llm.generateText.mockRejectedValue(new Error('503 unavailable'));
    jest.spyOn(console, 'error').mockImplementation();

    const resultado = await StrategyService.consolidateAnalyses('person-1', ['user-1'], null);

    // Antes: o texto colado era gravado em `technical_summary` de forma
    // INDISTINGUÍVEL de um perfil consolidado, e alimentava a estratégia.
    expect(resultado.degraded).toBe(true);
    expect(resultado.resumo).toMatch(/^\[RESUMO NÃO CONSOLIDADO/);
    expect(resultado.model).toBeNull();
    // Os dados quantitativos, que não dependem da IA, continuam lá
    expect(resultado.technical_stats).toBeTruthy();
    expect(resultado.analysesCount).toBe(2);
  });

  it('consolidação bem-sucedida NÃO é marcada como degradada', async () => {
    FightAnalysis.getByPersonId.mockResolvedValue(FIXTURE.analyses);
    llm.generateText.mockResolvedValue({ text: 'perfil consolidado de verdade', usage: {} });

    const resultado = await StrategyService.consolidateAnalyses('person-1', ['user-1'], null);

    expect(resultado.degraded).toBeUndefined();
    expect(resultado.resumo).toBe('perfil consolidado de verdade');
  });

  it('R11 — nenhum prompt de produção sobrou fora de services/prompts/', () => {
    // Marcadores do prompt hardcoded que existia em strategyService.js.
    const fonte = fs.readFileSync(path.join(__dirname, '../strategyService.js'), 'utf-8');

    expect(fonte).not.toContain('Você é um Analista Tático de Jiu-Jitsu de alto nível');
    expect(fonte).not.toContain('📦 FORMATO DE SAÍDA');
  });
});
