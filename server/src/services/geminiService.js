const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractJson } = require("../utils/chartUtils");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. As análises de vídeo retornarão erro até que a variável esteja definida.');
}

const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = ai ? ai.getGenerativeModel({ model: "gemini-3.0-pro" }) : null;

const BASE_PROMPT = (url) =>  {
  return (` Você é um Analista Sênior de Estatísticas de Jiu-Jitsu (BJJ Scout).
  Sua tarefa é assistir aos vídeos abaixo, identificar padrões técnicos e gerar um perfil estatístico do atleta:
  ${url}

  TAREFA:
  Analise o comportamento do lutador citado. Ignore o oponente, foque no alvo.
  Baseado no que viu (e inferindo o estilo geral dele), gere 4 conjuntos de dados estatísticos (que somem 100% cada).
  Quero que você tenha critérios muito críticos em relação à personalidade do lutador (ele é explosivo, muito cardio, se perde no final da luta, agressivo, etc), em relação ao jogo inicial dele (nos primeiros 20 segundos ele tentou trocar queda ou puxou para guarda e foi para o chão?), em relação à guarda dele (quando ele está por baixo ele faz uma guarda laço, ele dá muito bote, bota na fechada, etc) e em relação ao jogo de passagem dele (ele faz toreada, ele amarra o jogo, faz emborcada, etc).

  OS 4 CONJUNTOS DE DADOS NECESSÁRIOS:
  O primeiro gráfico me mostrará a personalidade geral do lutador em toda a luta. Quero que este gráfico seja um gráfico de pizza, com as porcentagens de como ele se comportou (se ele é agressivo, explosivo, calmo, pode enfraquecer no final da luta, etc). Quais estilos de luta ele tem.
  O segundo gráfico me mostrará a possibilidade desse lutador logo no início de luta querer tentar trocar queda, querer passar guarda ou puxar para guarda. Quero que este gráfico seja um gráfico de pizza.
  O terceiro gráfico me mostrará a personalidade do lutador ao fazer guarda. Quero que este gráfico seja um gráfico de pizza, com probabilidades de posições que ele pode fazer se estiver em uma situação de guarda (é mais provável subir na perna, gosta de dar triângulo, bota na fechada, amarra o jogo, etc).
  O quarto gráfico me mostrará a personalidade do lutador ao passar a guarda. Quero que este gráfico seja um gráfico de pizza, com probabilidades de técnicas de passagem de guarda que ele pode fazer (passagem por fora, toreada, emborcada, under over, etc).

  RESUMO:
  Depois de todos esses vídeos e análises, dentro de um campo JSON, nos forneça um resumo do jogo da pessoa, se a melhor estratégia para vencê-la é ser agressivo, se é melhor cansá-la, se é melhor ir para o chão, se é melhor tentar trocar queda, etc. e como o estilo dela impacta na luta.

  FORMATO DE SAÍDA:
  Retorne APENAS um JSON puro. Não inclua formatação visual (cores, tamanho). Apenas os dados.
  
  Estrutura Obrigatória do JSON:
  {
    "charts": [
      {
        "title": "Personalidade Geral",
        "data": [
          { "label": "Nome da Característica", "value": 40 },
          { "label": "Outra Característica", "value": 60 }
        ]
      },
      {
        "title": "Comportamento Inicial",
        "data": [ ... ]
      },
      {
        "title": "Jogo de Guarda",
        "data": [ ... ]
      },
      {
        "title": "Jogo de Passagem",
        "data": [ ... ]
      },
    ],
    "summary": "Aqui vai o resumo detalhado do estilo de luta do atleta e estratégias recomendadas."
  }`)};

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
      summary: "Nenhuma análise disponível",
      generatedAt: new Date().toISOString(),
    };
  }

  // Inicializar estrutura consolidada
  const consolidated = {
    charts: [
      { title: "Personalidade Geral", data: [] },
      { title: "Comportamento Inicial", data: [] },
      { title: "Jogo de Guarda", data: [] },
      { title: "Jogo de Passagem", data: [] },
    ],
    summaries: [],
    generatedAt: new Date().toISOString(),
  };

  // Coletar todos os dados de cada categoria (labels) e sumarizar textos
  const allLabels = {}; // { label: [values] }

  frameAnalyses.forEach((analysis) => {
    if (!analysis) return;

    // recolher summaries de cada frame
    if (analysis.summary && typeof analysis.summary === 'string') {
      consolidated.summaries.push(analysis.summary.trim());
    }

    // recolher dados numéricos por label
    if (Array.isArray(analysis.charts)) {
      analysis.charts.forEach((chart) => {
        if (!Array.isArray(chart.data)) return;
        chart.data.forEach((item) => {
          const label = item.label || item.name;
          const value = Number(item.value) || 0;
          if (!allLabels[label]) allLabels[label] = [];
          allLabels[label].push(value);
        });
      });
    }
  });

  // Calcular médias para cada label
  const averagedData = {};
  Object.keys(allLabels).forEach((label) => {
    const values = allLabels[label];
    averagedData[label] = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  });

  // Distribuir dados médios entre os gráficos
  consolidated.charts[0].data = [
    { label: "Agressivo/Ofensivo", value: averagedData["Agressivo/Ofensivo"] || 45 },
    { label: "Explosivo", value: averagedData["Explosivo"] || 25 },
    { label: "Calmo/Controlador", value: averagedData["Calmo/Controlador"] || 20 },
    { label: "Tático", value: averagedData["Tático"] || 10 },
  ];

  consolidated.charts[1].data = [
    { label: "Puxar para Guarda", value: averagedData["Puxar para Guarda"] || 55 },
    { label: "Takedown/Queda", value: averagedData["Takedown/Queda"] || 30 },
    { label: "Trocação", value: averagedData["Trocação"] || 15 },
  ];

  consolidated.charts[2].data = [
    { label: "Guarda Fechada", value: averagedData["Guarda Fechada"] || 50 },
    { label: "Raspagem", value: averagedData["Raspagem"] || 30 },
    { label: "Leglocks", value: averagedData["Leglocks"] || 20 },
  ];

  consolidated.charts[3].data = [
    { label: "Pressão Constante", value: averagedData["Pressão Constante"] || 50 },
    { label: "Passagem Lateral", value: averagedData["Passagem Lateral"] || 30 },
    { label: "Toreada", value: averagedData["Toreada"] || 20 },
  ];

  // Consolidar sumários (concatena, deduplica e fornece fallback)
  const uniqueSummaries = [...new Set(consolidated.summaries.filter(Boolean))];
  consolidated.summary = uniqueSummaries.length > 0 ? uniqueSummaries.join(' ') : 'Resumo não disponível';

  // remover campo temporário
  delete consolidated.summaries;

  return consolidated;
}

module.exports = { analyzeFrame, consolidateAnalyses };
