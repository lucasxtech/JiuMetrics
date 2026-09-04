// @ts-check
/**
 * Regras determinísticas de qualidade de uma análise de luta.
 *
 * POR QUE ISTO EXISTE
 *
 * O projeto nunca teve como medir se uma análise de vídeo é boa. Os 357 testes
 * do backend verificam contrato e autorização; nenhum olha uma SAÍDA da IA.
 * Sem medida, toda mudança de prompt ou de modelo é fé — foi o que a auditoria
 * de 2026-07-23 registrou (SPEC-ANALISE-IA.md, item F4) e continuava valendo.
 *
 * Este módulo é o primeiro degrau, e o mais barato: regras que não precisam de
 * gabarito humano, não chamam IA e não custam nada, porque comparam a análise
 * com ELA MESMA e com o vocabulário que o próprio sistema declara. Não dizem
 * se a análise está CERTA — dizem se ela é internamente coerente e se respeita
 * o contrato que o prompt promete.
 *
 * O que NÃO cabe aqui: qualquer coisa que precise saber o que aconteceu no
 * vídeo. Isso exige gabarito ou uma segunda opinião paga, e é outro degrau.
 *
 * MEDIDO EM PRODUÇÃO (2026-09-02, 285 análises, nenhuma editada):
 *   - fatia-única-100%      218 (76,5%) — e 8/8 no pipeline atual
 *   - rótulo fora do vocab   73 (25,6%) — zerado desde o responseSchema
 *   - contagem-disfarçada    50 (17,5%)
 *   - soma ≠ 100             26 ( 9,1%) — zerado desde o responseSchema
 *   - passagem-fantasma       6 ( 2,1%)
 *   - aritmética impossível   1 ( 0,4%)
 * As três regras de coerência aritmética já saem quase limpas: o problema
 * medido não é o modelo se contradizer, é o formato exigir número onde não há.
 */

const { CHART_LABELS, CHART_TITLES } = require('../config/ai');

const CANONICAL_LABELS = {
  [CHART_TITLES.PERSONALITY]: CHART_LABELS.personality,
  [CHART_TITLES.INITIAL_BEHAVIOR]: CHART_LABELS.initialBehavior,
  [CHART_TITLES.GUARD_GAME]: CHART_LABELS.guardGame,
  [CHART_TITLES.PASSING_GAME]: CHART_LABELS.passingGame,
  [CHART_TITLES.SUBMISSIONS]: CHART_LABELS.submissions,
};

/** @typedef {{ severidade: 'erro'|'aviso', regra: string, mensagem: string }} Achado */

const chartsOf = (a) => (Array.isArray(a?.charts) ? a.charts.filter((c) => c && typeof c === 'object') : []);
const dataOf = (c) => (Array.isArray(c?.data) ? c.data : []);
const sumOf = (data) => data.reduce((s, i) => s + (Number(i?.value) || 0), 0);
const statsOf = (a) => a?.technical_stats || a?.technicalStats || null;

/**
 * As regras. Cada uma devolve zero ou mais mensagens.
 *
 * `erro`  = contradição interna: a análise afirma duas coisas incompatíveis.
 * `aviso` = defeito de método: o número existe, mas não significa o que
 *           o formato sugere. Não é o modelo errando — é o contrato pedindo.
 *
 * @type {{regra: string, severidade: 'erro'|'aviso', aplicar: (a: any) => string[]}[]}
 */
const REGRAS = [
  {
    regra: 'passagem-sem-passagem',
    severidade: 'erro',
    aplicar: (a) => {
      const grafico = chartsOf(a).find((c) => c.title === CHART_TITLES.PASSING_GAME);
      const passes = statsOf(a)?.guard_passes?.quantidade;
      if (!grafico || dataOf(grafico).length === 0 || passes !== 0) return [];
      // O prompt é explícito: "SE ELE NÃO ESTEVE POR CIMA, MANTENHA TUDO ZERO".
      return [`"${CHART_TITLES.PASSING_GAME}" tem ${dataOf(grafico).length} rótulo(s) mas guard_passes.quantidade = 0`];
    },
  },
  {
    regra: 'efetividade-sem-raspagem',
    severidade: 'erro',
    aplicar: (a) => {
      const s = statsOf(a)?.sweeps;
      if (!s || s.quantidade !== 0 || (s.efetividade_percentual || 0) <= 0) return [];
      return [`sweeps.efetividade_percentual = ${s.efetividade_percentual}% com quantidade = 0`];
    },
  },
  {
    regra: 'costas-sem-costas',
    severidade: 'erro',
    aplicar: (a) => {
      const b = statsOf(a)?.back_takes;
      if (!b || b.quantidade !== 0 || b.tentou_finalizar !== true) return [];
      return ['back_takes.tentou_finalizar = true com quantidade = 0'];
    },
  },
  {
    regra: 'contagem-de-finalizacoes-inconsistente',
    severidade: 'erro',
    aplicar: (a) => {
      const s = statsOf(a)?.submissions;
      if (!s) return [];
      const out = [];
      if (Array.isArray(s.detalhes) && typeof s.tentativas === 'number' && s.tentativas !== s.detalhes.length) {
        out.push(`submissions.tentativas = ${s.tentativas} mas detalhes tem ${s.detalhes.length} item(ns)`);
      }
      if ((s.concluidas || 0) + (s.ajustadas || 0) > (s.tentativas || 0)) {
        out.push(`concluidas (${s.concluidas || 0}) + ajustadas (${s.ajustadas || 0}) > tentativas (${s.tentativas || 0})`);
      }
      return out;
    },
  },
  {
    regra: 'rotulo-fora-do-vocabulario',
    severidade: 'erro',
    aplicar: (a) => {
      const out = [];
      for (const c of chartsOf(a)) {
        const canon = CANONICAL_LABELS[c.title];
        if (!canon) { out.push(`título fora do enum: "${c.title}"`); continue; }
        for (const item of dataOf(c)) {
          if (!canon.includes(item?.label)) out.push(`"${c.title}": rótulo "${item?.label}" não é canônico`);
        }
      }
      return out;
    },
  },
  {
    regra: 'grafico-nao-soma-100',
    severidade: 'erro',
    aplicar: (a) => chartsOf(a)
      .filter((c) => dataOf(c).length > 0 && sumOf(dataOf(c)) !== 100)
      .map((c) => `"${c.title}" soma ${sumOf(dataOf(c))}, não 100`),
  },
  {
    regra: 'fatia-unica-100',
    severidade: 'aviso',
    aplicar: (a) => chartsOf(a)
      .filter((c) => dataOf(c).length === 1 && Number(dataOf(c)[0]?.value) === 100)
      // Uma "distribuição" de um elemento só não distribui nada: o 100% vem de
      // normalizar um único rótulo observado, não de dominância medida.
      .map((c) => `"${c.title}" tem um único rótulo ("${dataOf(c)[0]?.label}") em 100%`),
  },
  {
    regra: 'contagem-disfarcada-de-percentual',
    severidade: 'aviso',
    aplicar: (a) => chartsOf(a)
      .filter((c) => {
        const vals = dataOf(c).map((i) => Number(i?.value) || 0);
        // 50/50, 33/33/34, 25×4: é uma contagem renormalizada. O percentual
        // não carrega informação que a contagem crua já não tivesse.
        return vals.length >= 2 && Math.max(...vals) - Math.min(...vals) <= 1;
      })
      .map((c) => `"${c.title}" tem valores equidistantes — é contagem, não distribuição`),
  },
  {
    regra: 'sem-dados-quantitativos',
    severidade: 'aviso',
    aplicar: (a) => {
      const s = statsOf(a);
      if (!s) return ['análise sem technical_stats — os KPIs não renderizam e a estratégia não recebe número'];
      const vazio = (s.sweeps?.quantidade || 0) === 0 && (s.guard_passes?.quantidade || 0) === 0
        && (s.submissions?.tentativas || 0) === 0 && (s.back_takes?.quantidade || 0) === 0;
      return vazio ? ['technical_stats inteiramente zerado — nenhum evento pontuável registrado'] : [];
    },
  },
  {
    regra: 'resumo-com-linguagem-proibida',
    severidade: 'aviso',
    aplicar: (a) => {
      // O prompt proíbe explicitamente linguagem figurada e adjetivo sem
      // respaldo visual. Isto verifica se ele está sendo obedecido.
      const PROIBIDO = /\b(impressionante|formid[áa]vel|incr[íi]vel|felina|vulc[âa]nica|m[áa]quina de|cl[íi]nico|parece cansado|estava nervoso)\b/i;
      const m = String(a?.summary || '').match(PROIBIDO);
      return m ? [`resumo usa "${m[0]}", que o prompt proíbe`] : [];
    },
  },
];

/**
 * Aplica todas as regras a uma análise.
 *
 * @param {any} analise - `{ charts, technical_stats, summary }` — aceita
 *   `technicalStats` (camelCase) também, porque a fronteira do banco devolve
 *   as duas formas dependendo do caminho de leitura.
 * @returns {Achado[]}
 */
function inspectAnalysis(analise) {
  /** @type {Achado[]} */
  const achados = [];
  for (const { regra, severidade, aplicar } of REGRAS) {
    let mensagens = [];
    try {
      mensagens = aplicar(analise) || [];
    } catch (_) {
      // Uma regra que quebra em dado malformado não pode derrubar a inspeção
      // inteira — o dado malformado é justamente o que se quer detectar.
      mensagens = [`regra não pôde ser avaliada (dado malformado)`];
    }
    for (const mensagem of mensagens) achados.push({ severidade, regra, mensagem });
  }
  return achados;
}

/**
 * Roda a inspeção sobre um conjunto e resume por regra.
 *
 * @param {any[]} analises
 * @returns {{total: number, comErro: number, comAviso: number, porRegra: Record<string, number>}}
 */
function summarizeQuality(analises) {
  const lista = Array.isArray(analises) ? analises : [];
  /** @type {Record<string, number>} */
  const porRegra = {};
  let comErro = 0;
  let comAviso = 0;

  for (const a of lista) {
    const achados = inspectAnalysis(a);
    const regras = new Set(achados.map((f) => f.regra));
    for (const r of regras) porRegra[r] = (porRegra[r] || 0) + 1;
    if (achados.some((f) => f.severidade === 'erro')) comErro++;
    if (achados.some((f) => f.severidade === 'aviso')) comAviso++;
  }

  return { total: lista.length, comErro, comAviso, porRegra };
}

module.exports = { inspectAnalysis, summarizeQuality, REGRAS };
