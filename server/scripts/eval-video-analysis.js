#!/usr/bin/env node
/**
 * Avaliação da análise de vídeo — SEM gabarito humano.
 *
 * POR QUE ISTO EXISTE
 *
 * A auditoria de 2026-07-23 (SPEC-ANALISE-IA.md, F4) concluiu que "sem
 * avaliação, qualquer refactor de prompt é fé", e a de 2026-09-02 confirmou
 * que nada tinha mudado: não há como dizer se trocar de modelo, baixar a
 * resolução de mídia ou reescrever o prompt melhora ou piora.
 *
 * O obstáculo sempre foi supor que avaliar exige alguém assistir lutas e
 * anotar evento por evento. Não exige. Três sinais dispensam gabarito:
 *
 *   1. VARIÂNCIA (--modo variancia)
 *      Roda o MESMO vídeo N vezes com o MESMO modelo. Não é preciso saber a
 *      verdade para detectar instabilidade: se duas execuções discordam sobre
 *      quantas raspagens houve, ao menos uma está errada. Alta variância
 *      derruba qualquer conclusão tirada de uma execução só — inclusive as
 *      deste projeto até hoje.
 *
 *   2. CONCORDÂNCIA ENTRE MODELOS (--modo modelos)
 *      Roda o mesmo vídeo em modelos diferentes. Concordância não prova
 *      acerto; discordância prova que pelo menos um erra, e mostra ONDE.
 *      É assim que se decide 2.5-pro × 3.x sem apostar.
 *
 *   3. PLACAR DO BROADCAST (--modo placar)
 *      Em vídeo de campeonato (IBJJF, ADCC), o placar aparece na tela: pontos,
 *      vantagens, tempo. É verdade de chão gratuita e verificável. Se o modelo
 *      lê "6-2" e conta 3 raspagens (6 pontos) para o lado certo, os números
 *      dele têm lastro; se conta 5, não têm. O placar final ainda pode ser
 *      conferido por qualquer pessoa em 10 segundos, sem entender de BJJ.
 *
 * Todas as três medem SEM ninguém anotar nada. O que elas NÃO fazem: dizer se
 * "guarda de laço" era mesmo guarda de laço. Isso continua exigindo gabarito —
 * mas deixa de ser pré-requisito para começar a medir.
 *
 * ⚠️ ISTO GASTA DINHEIRO. Cada execução é uma inferência de vídeo paga (a
 * operação mais cara do sistema). Por isso: roda sob demanda, nunca no CI,
 * sempre com estimativa de custo e confirmação antes.
 *
 *   node scripts/eval-video-analysis.js --modo variancia --repeticoes 3
 *   node scripts/eval-video-analysis.js --modo modelos --modelos gemini-2.5-pro,gemini-3.1-pro-preview
 *   node scripts/eval-video-analysis.js --modo placar
 *   node scripts/eval-video-analysis.js --modo variancia --dry-run   # só estima o custo
 *
 * Os vídeos vivem em `scripts/eval-fixtures/videos.json`. Saída em JSON
 * (--saida arquivo.json) para comparar execuções ao longo do tempo.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');

const { analyzeFrame } = require('../src/services/geminiService');
const llm = require('../src/services/llm');
const { calculateCost } = require('../src/models/ApiUsage');
const { inspectAnalysis } = require('../src/utils/analysisQuality');
const { canonicalizeSubmission } = require('../src/utils/submissionTaxonomy');
const { TASK_MODELS } = require('../src/config/ai');

const args = process.argv.slice(2);
const flag = (nome, padrao = null) => {
  const i = args.indexOf(nome);
  return i === -1 ? padrao : (args[i + 1] ?? true);
};

const MODO = flag('--modo', 'variancia');
const REPETICOES = Number(flag('--repeticoes', 3));
const MODELOS = String(flag('--modelos', TASK_MODELS.VIDEO_ANALYSIS)).split(',').map((s) => s.trim());
const SAIDA = flag('--saida');
const DRY_RUN = args.includes('--dry-run');
const FIXTURES = path.join(__dirname, 'eval-fixtures', 'videos.json');

// Estimativa grosseira só para avisar antes de gastar: ~300 tokens por segundo
// de vídeo na resolução padrão, mais ~2k de prompt. Não é cobrança, é ordem de
// grandeza — o custo real sai do usage devolvido pela API.
const TOKENS_POR_SEGUNDO = 300;

function carregarVideos() {
  if (!fs.existsSync(FIXTURES)) {
    throw new Error(`Fixtures não encontradas em ${FIXTURES}`);
  }
  const { videos } = JSON.parse(fs.readFileSync(FIXTURES, 'utf8'));
  if (!Array.isArray(videos) || videos.length === 0) {
    throw new Error('videos.json não tem nenhum vídeo');
  }
  return videos;
}

function estimarCusto(videos, execucoesPorVideo, modelos) {
  let total = 0;
  for (const v of videos) {
    const tokens = (v.duracaoSegundos || 300) * TOKENS_POR_SEGUNDO + 2000;
    for (const modelo of modelos) {
      total += calculateCost(modelo, tokens, 800) * execucoesPorVideo;
    }
  }
  return total;
}

/** Extrai os números comparáveis de uma análise. */
function vetor(analise) {
  const s = analise?.technical_stats || {};
  const familias = (s.submissions?.detalhes || [])
    .map((d) => canonicalizeSubmission(typeof d === 'string' ? d : d?.tecnica))
    .filter(Boolean)
    .sort();
  return {
    raspagens: s.sweeps?.quantidade ?? null,
    passagens: s.guard_passes?.quantidade ?? null,
    tentativasFinalizacao: s.submissions?.tentativas ?? null,
    finalizacoesConcluidas: s.submissions?.concluidas ?? null,
    costas: s.back_takes?.quantidade ?? null,
    familiasFinalizacao: familias,
    rotuloDominantePorGrafico: Object.fromEntries(
      (analise?.charts || [])
        .filter((c) => Array.isArray(c.data) && c.data.length > 0)
        .map((c) => [c.title, [...c.data].sort((a, b) => b.value - a.value)[0].label])
    ),
    palavrasResumo: String(analise?.summary || '').split(/\s+/).filter(Boolean).length,
  };
}

/** Discordância entre execuções: 0 = idênticas, 1 = discordam em tudo. */
function divergencia(vetores) {
  if (vetores.length < 2) return null;

  const numericos = ['raspagens', 'passagens', 'tentativasFinalizacao', 'finalizacoesConcluidas', 'costas'];
  const detalhe = {};

  for (const campo of numericos) {
    const vals = vetores.map((v) => v[campo]).filter((v) => v !== null);
    if (vals.length < 2) { detalhe[campo] = null; continue; }
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const media = vals.reduce((a, b) => a + b, 0) / vals.length;
    detalhe[campo] = { min, max, media: Math.round(media * 100) / 100, amplitude: max - min, valores: vals };
  }

  // Rótulo dominante: proporção de gráficos em que TODAS as execuções concordam.
  const titulos = new Set(vetores.flatMap((v) => Object.keys(v.rotuloDominantePorGrafico)));
  let concordam = 0;
  for (const t of titulos) {
    const escolhas = new Set(vetores.map((v) => v.rotuloDominantePorGrafico[t] ?? '(ausente)'));
    if (escolhas.size === 1) concordam++;
  }
  detalhe.concordanciaRotuloDominante = titulos.size === 0 ? null
    : Math.round((concordam / titulos.size) * 100) / 100;

  // Famílias de finalização: Jaccard médio entre pares.
  const jaccards = [];
  for (let i = 0; i < vetores.length; i++) {
    for (let j = i + 1; j < vetores.length; j++) {
      const A = new Set(vetores[i].familiasFinalizacao);
      const B = new Set(vetores[j].familiasFinalizacao);
      const uniao = new Set([...A, ...B]);
      if (uniao.size === 0) { jaccards.push(1); continue; }
      const inter = [...A].filter((x) => B.has(x)).length;
      jaccards.push(inter / uniao.size);
    }
  }
  detalhe.concordanciaFinalizacoes = jaccards.length
    ? Math.round((jaccards.reduce((a, b) => a + b, 0) / jaccards.length) * 100) / 100
    : null;

  return detalhe;
}

async function analisar(video, modelo) {
  const inicio = Date.now();
  const { analysis, usage } = await analyzeFrame(
    video.url,
    { athleteName: video.atleta, giColor: video.giColor, belt: video.faixa, videos: [{ url: video.url, giColor: video.giColor }] },
    modelo
  );
  return {
    analise: analysis,
    usage,
    custoUsd: calculateCost(usage.modelName, usage.promptTokens, usage.completionTokens),
    duracaoMs: Date.now() - inicio,
    achadosQualidade: inspectAnalysis(analysis),
  };
}

async function modoVariancia(videos) {
  const resultados = [];
  for (const video of videos) {
    console.log(`\n▶ ${video.titulo}  (${REPETICOES}× em ${MODELOS[0]})`);
    const execucoes = [];
    for (let i = 1; i <= REPETICOES; i++) {
      process.stdout.write(`  execução ${i}/${REPETICOES}… `);
      try {
        const r = await analisar(video, MODELOS[0]);
        execucoes.push(r);
        console.log(`ok (${(r.duracaoMs / 1000).toFixed(0)}s, ${r.usage.promptTokens} tokens, US$ ${r.custoUsd.toFixed(4)})`);
      } catch (err) {
        console.log(`FALHOU — ${err.message}`);
      }
    }
    const vetores = execucoes.map((e) => vetor(e.analise));
    const div = divergencia(vetores);
    resultados.push({ video: video.titulo, url: video.url, modelo: MODELOS[0], execucoes: execucoes.length, vetores, divergencia: div });

    if (div) {
      console.log('  ── discordância entre execuções ──');
      for (const campo of ['raspagens', 'passagens', 'tentativasFinalizacao', 'finalizacoesConcluidas', 'costas']) {
        const d = div[campo];
        if (d) console.log(`    ${campo.padEnd(24)} ${JSON.stringify(d.valores)}  amplitude ${d.amplitude}`);
      }
      console.log(`    rótulo dominante igual em ${(div.concordanciaRotuloDominante ?? 0) * 100}% dos gráficos`);
      console.log(`    finalizações (Jaccard médio) ${div.concordanciaFinalizacoes}`);
    }
  }
  return resultados;
}

async function modoModelos(videos) {
  const resultados = [];
  for (const video of videos) {
    console.log(`\n▶ ${video.titulo}`);
    const porModelo = {};
    for (const modelo of MODELOS) {
      process.stdout.write(`  ${modelo}… `);
      try {
        const r = await analisar(video, modelo);
        porModelo[modelo] = { vetor: vetor(r.analise), custoUsd: r.custoUsd, duracaoMs: r.duracaoMs, achados: r.achadosQualidade.length, resumo: r.analise.summary };
        console.log(`ok (${(r.duracaoMs / 1000).toFixed(0)}s, US$ ${r.custoUsd.toFixed(4)}, ${r.achadosQualidade.length} achado(s) de qualidade)`);
      } catch (err) {
        console.log(`FALHOU — ${err.message}`);
      }
    }
    const div = divergencia(Object.values(porModelo).map((p) => p.vetor));
    resultados.push({ video: video.titulo, url: video.url, porModelo, divergencia: div });

    if (div) {
      console.log('  ── onde os modelos discordam ──');
      for (const campo of ['raspagens', 'passagens', 'tentativasFinalizacao', 'costas']) {
        const d = div[campo];
        if (d && d.amplitude > 0) console.log(`    ${campo}: ${JSON.stringify(d.valores)} (${MODELOS.join(' × ')})`);
      }
    }
  }
  return resultados;
}

async function modoPlacar(videos) {
  // O placar é lido numa chamada SEPARADA e barata (modelo de texto sobre o
  // mesmo vídeo), de propósito: pedir junto com a análise contaminaria a
  // própria medida que se quer usar como referência.
  const PROMPT = `Este vídeo é uma luta de Jiu-Jitsu de campeonato, com placar exibido na tela.
Leia APENAS o que está escrito no placar do broadcast — não interprete a luta.
Responda em JSON: { "placarFinal": {"esquerda": <pontos>, "direita": <pontos>}, "vantagensFinais": {"esquerda": <n>, "direita": <n>}, "nomesNaTela": {"esquerda": "<nome>", "direita": "<nome>"}, "resultado": "<como a luta terminou, conforme a tela>", "placarVisivel": <true|false> }
Se o placar não estiver visível, devolva placarVisivel: false e zeros.`;

  const SCHEMA = {
    type: 'OBJECT',
    properties: {
      placarFinal: { type: 'OBJECT', properties: { esquerda: { type: 'INTEGER' }, direita: { type: 'INTEGER' } }, required: ['esquerda', 'direita'] },
      vantagensFinais: { type: 'OBJECT', properties: { esquerda: { type: 'INTEGER' }, direita: { type: 'INTEGER' } }, required: ['esquerda', 'direita'] },
      nomesNaTela: { type: 'OBJECT', properties: { esquerda: { type: 'STRING' }, direita: { type: 'STRING' } }, required: ['esquerda', 'direita'] },
      resultado: { type: 'STRING' },
      placarVisivel: { type: 'BOOLEAN' },
    },
    required: ['placarFinal', 'vantagensFinais', 'nomesNaTela', 'resultado', 'placarVisivel'],
  };

  const resultados = [];
  for (const video of videos) {
    console.log(`\n▶ ${video.titulo}`);
    try {
      const { data, usage } = await llm.generateJson({
        task: 'VIDEO_ANALYSIS',
        model: MODELOS[0],
        contents: [{ text: PROMPT }, { fileData: { fileUri: video.url } }],
        schema: SCHEMA,
        temperature: 0,
      });
      const custo = calculateCost(usage.modelName, usage.promptTokens, usage.completionTokens);
      console.log(`  placar lido: ${data.placarFinal.esquerda}-${data.placarFinal.direita} (vantagens ${data.vantagensFinais.esquerda}-${data.vantagensFinais.direita})`);
      console.log(`  nomes na tela: ${data.nomesNaTela.esquerda} × ${data.nomesNaTela.direita}`);
      console.log(`  resultado: ${data.resultado}`);
      console.log(`  US$ ${custo.toFixed(4)}`);

      if (video.placarEsperado) {
        const bate = data.placarFinal.esquerda === video.placarEsperado.esquerda
          && data.placarFinal.direita === video.placarEsperado.direita;
        console.log(`  ${bate ? '✅' : '❌'} confere com o esperado (${video.placarEsperado.esquerda}-${video.placarEsperado.direita})`);
      } else {
        console.log('  (sem placar esperado nas fixtures — confira na tela e preencha `placarEsperado`)');
      }
      resultados.push({ video: video.titulo, url: video.url, lido: data, esperado: video.placarEsperado ?? null, custoUsd: custo });
    } catch (err) {
      console.log(`  FALHOU — ${err.message}`);
      resultados.push({ video: video.titulo, url: video.url, erro: err.message });
    }
  }
  return resultados;
}

(async () => {
  const videos = carregarVideos();
  const execucoesPorVideo = MODO === 'variancia' ? REPETICOES : 1;
  const modelosUsados = MODO === 'modelos' ? MODELOS : [MODELOS[0]];
  const estimativa = estimarCusto(videos, execucoesPorVideo, modelosUsados);

  console.log('='.repeat(72));
  console.log(`AVALIAÇÃO DA ANÁLISE DE VÍDEO — modo "${MODO}"`);
  console.log('='.repeat(72));
  console.log(`Vídeos: ${videos.length} · execuções por vídeo: ${execucoesPorVideo} · modelo(s): ${modelosUsados.join(', ')}`);
  console.log(`Custo ESTIMADO: US$ ${estimativa.toFixed(2)}  (ordem de grandeza — o real sai do usage)`);

  if (DRY_RUN) {
    console.log('\n--dry-run: nada foi executado.\n');
    return;
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY não configurada — nada a executar.');
  }

  console.log('\n⚠️  Isto vai gastar de verdade. Ctrl+C em 5s para abortar.');
  await new Promise((r) => setTimeout(r, 5000));

  const inicio = Date.now();
  let resultados;
  if (MODO === 'variancia') resultados = await modoVariancia(videos);
  else if (MODO === 'modelos') resultados = await modoModelos(videos);
  else if (MODO === 'placar') resultados = await modoPlacar(videos);
  else throw new Error(`Modo desconhecido: "${MODO}" (use variancia, modelos ou placar)`);

  const relatorio = {
    modo: MODO,
    executadoEm: new Date().toISOString(),
    duracaoTotalMs: Date.now() - inicio,
    modelos: modelosUsados,
    repeticoes: execucoesPorVideo,
    resultados,
  };

  if (SAIDA) {
    fs.writeFileSync(SAIDA, JSON.stringify(relatorio, null, 2));
    console.log(`\n📄 Relatório salvo em ${SAIDA}`);
  }

  console.log('\nComo ler: amplitude alta em raspagens/passagens entre execuções do');
  console.log('MESMO vídeo e MESMO modelo significa que uma execução isolada não');
  console.log('sustenta conclusão — nem a favor nem contra o pipeline atual.\n');
})().catch((err) => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
