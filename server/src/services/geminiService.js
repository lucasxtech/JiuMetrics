const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractJson } = require("../utils/chartUtils");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. As análises de vídeo retornarão erro até que a variável esteja definida.');
}

const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = ai ? ai.getGenerativeModel({ model: "gemini-2.0-flash" }) : null;

const BASE_PROMPT = (url) => {
  return `Você é um Analista Sênior de Estatísticas de Jiu-Jitsu (BJJ Performance Scout).
Sua tarefa é assistir cuidadosamente aos vídeos abaixo, identificar padrões técnicos e gerar um perfil estatístico completo do lutador alvo:
${url}

Ignore completamente o oponente — foque apenas no atleta principal.

TAREFA PRINCIPAL

Com base em tudo que vê, somado à inferência lógica sobre o estilo do atleta, gere 5 conjuntos estatísticos, onde cada um deve totalizar exatamente 100%.

A análise deve ser objetiva, técnica e baseada em observação real, evitando qualquer especulação fantasiosa.

CONJUNTOS DE DADOS NECESSÁRIOS

Use somente as informações de cada tópico.
Cada tópico precisa ter o percentual totalizando 100%, e que faça sentido no tópico.
1) Personalidade Geral na Luta
Crie um gráfico de pizza com porcentagens distribuídas entre características como:
 agressivo, explosivo, estratégico, conservador, ritmo constante, cansa no final, acelera no final, pressão contínua, contra-atacador.
(Use apenas o que realmente aparece nos vídeos.)

2) Comportamento Inicial (primeiros ~20 segundos)
Gráfico de pizza com porcentagens representando o que o lutador tende a fazer no início:
 troca de queda, puxa para guarda, tenta quedas explosivas, busca controle em pé, fica esperando, tenta passar direto ao chão.
(Use apenas o que realmente aparece nos vídeos.)

3) Jogo de Guarda (quando ele está por baixo)
Gráfico de pizza com a probabilidade de comportamentos técnicos como:
 laço, guarda fechada, guarda aberta agressiva, triângulo, omoplata, subir para single-leg, guarda borboleta, amarra o jogo, riscadas/botes sucessivos, scramble, de la riva, meia guarda, one leg, guarda usando lapela.
Use apenas opções coerentes com o que ele realmente mostra.

4) Jogo de Passagem de Guarda (quando ele está por cima)
Gráfico de pizza com porcentagens para estilos de passagem como:
 toreada, over/under, emborcada, pressão de quadril, caminhada lateral, passos rápidos por fora, amarração antes de passar, explosão para lateral, pulando.
(Use apenas o que realmente aparece nos vídeos.)

5) Finalizações
Gráfico de pizza com porcentagens para as maiores tentativas de finalizações: arm lock, triângulo, estrangulamento, mata leão, arco e flecha, omoplata, leg lock, chave de pé, mão de vaca, guilhotina, baratoplata, tarikoplata, baseball choke, estrangulamento com lapela, heel hook, mata leão no pé, chave de panturrilha, chave de bíceps, chave de virilha.
(Use apenas o que realmente aparece nos vídeos.)

6) Conte e classifique com rigor:

• Raspagens (Sweeps): Considerar raspagem quando o atleta inverte a posição de baixo para cima, assumindo top control.
  Retornar: Quantidade, Efetividade %

• Passagens de guarda (Guard Passes): Contar somente quando ele chega ao controle lateral ou norte-sul.
  Retornar: Quantidade, Tempo médio para concluir a passagem

• Finalizações (Submissions): Contar tentativas e conexões reais, separando por:
  Finalizações tentadas, Finalizações ajustadas, Finalizações concluídas, Qual técnica (estrangulamento, armlock, americana, etc.)

• Pegadas de costas (Back Takes): Contabilizar somente quando o atleta coloca os dois ganchos ou fechamento de body triangle.
  Retornar: Quantidade, Tempo médio de controle nas costas, Se houve tentativa de finalização
(Use apenas o que realmente aparece nos vídeos.)

🧠 RESUMO FINAL (campo "summary")

Depois de analisar todos os vídeos, gere um texto único e profundo contendo:
- Qual é o estilo geral dele
- Pontos fortes
- Pontos fracos
- Onde ele mais comete erros
- Como um adversário deveria lutar para vencê-lo
- Quais estratégias são mais eficientes contra o estilo dele
- Como o comportamento dele impacta a luta
- Quais posições ele mais domina e quais evita

O resumo deve ser direto, analítico e técnico — como um relatório profissional de scouting.

📦 FORMATO DE SAÍDA (OBRIGATÓRIO)

Retorne somente um JSON puro, sem explicações adicionais e sem texto fora da estrutura.

{
  "charts": [
    {
      "title": "Personalidade Geral",
      "data": [
        { "label": "agressivo", "value": 0 },
        { "label": "explosivo", "value": 0 },
        { "label": "estratégico", "value": 0 },
        { "label": "conservador", "value": 0 },
        { "label": "ritmo constante", "value": 0 },
        { "label": "cansa no final", "value": 0 },
        { "label": "acelera no final", "value": 0 },
        { "label": "pressão contínua", "value": 0 },
        { "label": "contra-atacador", "value": 0 }
      ]
    },
    {
      "title": "Comportamento Inicial",
      "data": [
        { "label": "troca de queda", "value": 0 },
        { "label": "puxa guarda", "value": 0 },
        { "label": "tenta quedas explosivas", "value": 0 },
        { "label": "busca controle em pé", "value": 0 },
        { "label": "fica esperando", "value": 0 },
        { "label": "tenta passar direto ao chão", "value": 0 }
      ]
    },
    {
      "title": "Jogo de Guarda",
      "data": [
        { "label": "laço", "value": 0 },
        { "label": "guarda fechada", "value": 0 },
        { "label": "guarda aberta agressiva", "value": 0 },
        { "label": "triângulo", "value": 0 },
        { "label": "omoplata", "value": 0 },
        { "label": "subir para single-leg", "value": 0 },
        { "label": "guarda borboleta", "value": 0 },
        { "label": "amarra o jogo", "value": 0 },
        { "label": "riscadas/botes sucessivos", "value": 0 },
        { "label": "scramble", "value": 0 },
        { "label": "de la riva", "value": 0 },
        { "label": "meia guarda", "value": 0 },
        { "label": "one leg", "value": 0 },
        { "label": "guarda usando lapela", "value": 0 }
      ]
    },
    {
      "title": "Jogo de Passagem",
      "data": [
        { "label": "toreada", "value": 0 },
        { "label": "over/under", "value": 0 },
        { "label": "emborcada", "value": 0 },
        { "label": "pressão de quadril", "value": 0 },
        { "label": "caminhada lateral", "value": 0 },
        { "label": "passos rápidos por fora", "value": 0 },
        { "label": "amarração antes de passar", "value": 0 },
        { "label": "explosão para lateral", "value": 0 },
        { "label": "pulando", "value": 0 }
      ]
    },
    {
      "title": "Tentativas de Finalização",
      "data": [
        { "label": "arm lock", "value": 0 },
        { "label": "triângulo", "value": 0 },
        { "label": "estrangulamento", "value": 0 },
        { "label": "mata leão", "value": 0 },
        { "label": "arco e flecha", "value": 0 },
        { "label": "omoplata", "value": 0 },
        { "label": "leg lock", "value": 0 },
        { "label": "chave de pé", "value": 0 },
        { "label": "mão de vaca", "value": 0 },
        { "label": "guilhotina", "value": 0 },
        { "label": "baratoplata", "value": 0 },
        { "label": "tarikoplata", "value": 0 },
        { "label": "baseball choke", "value": 0 },
        { "label": "estrangulamento com lapela", "value": 0 },
        { "label": "heel hook", "value": 0 },
        { "label": "mata leão no pé", "value": 0 },
        { "label": "chave de panturrilha", "value": 0 },
        { "label": "chave de bíceps", "value": 0 },
        { "label": "chave de virilha", "value": 0 }
      ]
    }
  ],
  "technical_stats": {
    "sweeps": {
      "quantidade": 0,
      "efetividade_percentual": 0
    },
    "guard_passes": {
      "quantidade": 0,
      "tempo_medio_segundos": 0
    },
    "submissions": {
      "tentativas": 0,
      "ajustadas": 0,
      "concluidas": 0,
      "detalhes": []
    },
    "back_takes": {
      "quantidade": 0,
      "tempo_medio_segundos": 0,
      "tentou_finalizar": false
    }
  },
  "summary": ""
}`;
};

function buildPrompt(url, context = {}) {
  const { athleteName, giColor, videos } = context;
  
  let contextText = '';
  
  if (athleteName) {
    contextText += `\nATLETA ALVO: ${athleteName}`;
  }
  
  if (videos && Array.isArray(videos) && videos.length > 0) {
    contextText += `\n\nVÍDEOS PARA ANÁLISE (${videos.length} vídeo(s)):`;
    videos.forEach((video, index) => {
      contextText += `\nVídeo ${index + 1}: ${video.url} - Kimono ${video.giColor}`;
    });
    contextText += `\n\nFOCO: Analise APENAS o atleta ${athleteName} em TODOS os vídeos. Em cada vídeo, ele está usando kimono ${videos.map((v, i) => `${v.giColor} (vídeo ${i + 1})`).join(', ')}.`;
    contextText += `\nIgnore completamente os oponentes. Consolide o comportamento do atleta através de todos os vídeos fornecidos.`;
  } else if (giColor) {
    contextText += `\nKIMONO: ${giColor}`;
    contextText += `\n\nFOCO: Analise APENAS o atleta que está usando kimono ${giColor}. Ignore o oponente.`;
  }

  return `${BASE_PROMPT(url)}${contextText}`;
}

/**
 * Analisa um frame usando Gemini Vision
 */
async function analyzeFrame(url, context = {}) {
  if (!model) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  const prompt = buildPrompt(url, context);
  console.log("🤖 Enviando prompt para Gemini:", prompt);

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const analysis = extractJson(responseText);
    return analysis;
  } catch (error) {
    console.error("❌ Erro ao analisar frame com Gemini:", error.message);
    throw error;
  }
}

/**
 * Consolida análises de múltiplos frames
 */
function consolidateAnalyses(frameAnalyses) {
  if (!frameAnalyses || frameAnalyses.length === 0) {
    return {
      charts: [],
      technical_stats: null,
      summary: "Nenhuma análise disponível",
      generatedAt: new Date().toISOString(),
    };
  }

  // Inicializar estrutura consolidada com 5 gráficos
  const consolidated = {
    charts: [
      { title: "Personalidade Geral", data: [] },
      { title: "Comportamento Inicial", data: [] },
      { title: "Jogo de Guarda", data: [] },
      { title: "Jogo de Passagem", data: [] },
      { title: "Tentativas de Finalização", data: [] },
    ],
    technical_stats: {
      sweeps: { quantidade: 0, efetividade_percentual: 0 },
      guard_passes: { quantidade: 0, tempo_medio_segundos: 0 },
      submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
      back_takes: { quantidade: 0, tempo_medio_segundos: 0, tentou_finalizar: false }
    },
    summaries: [],
    generatedAt: new Date().toISOString(),
  };

  // Coletar dados de todas as análises
  const allLabels = {}; // { label: [values] }
  const allTechnicalStats = {
    sweeps: [],
    guard_passes: [],
    submissions: [],
    back_takes: []
  };

  frameAnalyses.forEach((analysis) => {
    if (!analysis) return;

    // Coletar summaries
    if (analysis.summary && typeof analysis.summary === 'string') {
      consolidated.summaries.push(analysis.summary.trim());
    }

    // Coletar dados dos gráficos SEPARADAMENTE por título
    if (Array.isArray(analysis.charts)) {
      analysis.charts.forEach((chart) => {
        if (!Array.isArray(chart.data)) return;
        
        const chartTitle = chart.title;
        if (!allLabels[chartTitle]) {
          allLabels[chartTitle] = {};
        }
        
        chart.data.forEach((item) => {
          const label = item.label || item.name;
          const value = Number(item.value) || 0;
          if (!allLabels[chartTitle][label]) {
            allLabels[chartTitle][label] = [];
          }
          allLabels[chartTitle][label].push(value);
        });
      });
    }

    // Coletar technical_stats
    if (analysis.technical_stats) {
      if (analysis.technical_stats.sweeps) allTechnicalStats.sweeps.push(analysis.technical_stats.sweeps);
      if (analysis.technical_stats.guard_passes) allTechnicalStats.guard_passes.push(analysis.technical_stats.guard_passes);
      if (analysis.technical_stats.submissions) allTechnicalStats.submissions.push(analysis.technical_stats.submissions);
      if (analysis.technical_stats.back_takes) allTechnicalStats.back_takes.push(analysis.technical_stats.back_takes);
    }
  });

  // Calcular médias e distribuir corretamente para cada gráfico
  consolidated.charts.forEach((chart) => {
    const chartTitle = chart.title;
    const labelsForThisChart = allLabels[chartTitle] || {};
    
    for (const label in labelsForThisChart) {
      const values = labelsForThisChart[label];
      const avgValue = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
      
      if (avgValue > 0) {
        chart.data.push({ label, value: avgValue });
      }
    }
  });

  // Consolidar technical_stats com médias
  if (allTechnicalStats.sweeps.length > 0) {
    const totalSweeps = allTechnicalStats.sweeps.reduce((sum, s) => sum + (s.quantidade || 0), 0);
    const avgEffectiveness = allTechnicalStats.sweeps.reduce((sum, s) => sum + (s.efetividade_percentual || 0), 0) / allTechnicalStats.sweeps.length;
    consolidated.technical_stats.sweeps = {
      quantidade: Math.round(totalSweeps / allTechnicalStats.sweeps.length),
      efetividade_percentual: Math.round(avgEffectiveness)
    };
  }

  if (allTechnicalStats.guard_passes.length > 0) {
    const totalPasses = allTechnicalStats.guard_passes.reduce((sum, g) => sum + (g.quantidade || 0), 0);
    const avgTime = allTechnicalStats.guard_passes.reduce((sum, g) => sum + (g.tempo_medio_segundos || 0), 0) / allTechnicalStats.guard_passes.length;
    consolidated.technical_stats.guard_passes = {
      quantidade: Math.round(totalPasses / allTechnicalStats.guard_passes.length),
      tempo_medio_segundos: Math.round(avgTime)
    };
  }

  if (allTechnicalStats.submissions.length > 0) {
    const totalTentativas = allTechnicalStats.submissions.reduce((sum, s) => sum + (s.tentativas || 0), 0);
    const totalAjustadas = allTechnicalStats.submissions.reduce((sum, s) => sum + (s.ajustadas || 0), 0);
    const totalConcluidas = allTechnicalStats.submissions.reduce((sum, s) => sum + (s.concluidas || 0), 0);
    const allDetails = allTechnicalStats.submissions.flatMap(s => s.detalhes || []);
    
    consolidated.technical_stats.submissions = {
      tentativas: Math.round(totalTentativas / allTechnicalStats.submissions.length),
      ajustadas: Math.round(totalAjustadas / allTechnicalStats.submissions.length),
      concluidas: Math.round(totalConcluidas / allTechnicalStats.submissions.length),
      detalhes: allDetails
    };
  }

  if (allTechnicalStats.back_takes.length > 0) {
    const totalBackTakes = allTechnicalStats.back_takes.reduce((sum, b) => sum + (b.quantidade || 0), 0);
    const avgTimeBack = allTechnicalStats.back_takes.reduce((sum, b) => sum + (b.tempo_medio_segundos || 0), 0) / allTechnicalStats.back_takes.length;
    const anyFinalization = allTechnicalStats.back_takes.some(b => b.tentou_finalizar);
    
    consolidated.technical_stats.back_takes = {
      quantidade: Math.round(totalBackTakes / allTechnicalStats.back_takes.length),
      tempo_medio_segundos: Math.round(avgTimeBack),
      tentou_finalizar: anyFinalization
    };
  }

  // Consolidar sumários
  const uniqueSummaries = [...new Set(consolidated.summaries.filter(Boolean))];
  consolidated.summary = uniqueSummaries.length > 0 ? uniqueSummaries.join(' ') : 'Resumo não disponível';

  delete consolidated.summaries;

  return consolidated;
}

module.exports = { analyzeFrame, consolidateAnalyses };
