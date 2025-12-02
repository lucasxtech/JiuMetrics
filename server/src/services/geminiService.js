const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractJson } = require("../utils/chartUtils");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. As análises de vídeo retornarão erro até que a variável esteja definida.');
}

const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = ai ? ai.getGenerativeModel({ model: "gemini-2.0-flash" }) : null;

/**
 * Analisa um frame usando Gemini Vision
 */
async function analyzeFrame(base64Data, mimeType = 'image/png') {
  if (!model) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  const prompt = `Você é um Analista Sênior de Estatísticas de Jiu-Jitsu (BJJ Scout).

Analise este frame de uma luta de Jiu-Jitsu e inferir características do lutador:
- Personalidade geral (agressivo, calmo, explosivo, etc)
- Comportamento inicial (puxar guarda, takedown, trocar queda)
- Jogo de guarda (que tipo de guarda, raspagem, ataques)
- Jogo de passagem (pressão, toreada, técnicas de passagem)

NÃO descreva o frame detalhadamente.
INTERPRETE o frame para inferir características técnicas do lutador.

Retorne APENAS JSON válido, sem markdown, sem nenhuma explicação:

{
  "charts": [
    {
      "title": "Personalidade Geral",
      "data": [
        { "label": "Agressivo/Ofensivo", "value": 45 },
        { "label": "Explosivo", "value": 25 },
        { "label": "Calmo/Controlador", "value": 20 },
        { "label": "Tático", "value": 10 }
      ]
    },
    {
      "title": "Comportamento Inicial",
      "data": [
        { "label": "Puxar para Guarda", "value": 55 },
        { "label": "Takedown/Queda", "value": 30 },
        { "label": "Trocação", "value": 15 }
      ]
    },
    {
      "title": "Jogo de Guarda",
      "data": [
        { "label": "Guarda Fechada", "value": 50 },
        { "label": "Raspagem", "value": 30 },
        { "label": "Leglocks", "value": 20 }
      ]
    },
    {
      "title": "Jogo de Passagem",
      "data": [
        { "label": "Pressão Constante", "value": 50 },
        { "label": "Passagem Lateral", "value": 30 },
        { "label": "Toreada", "value": 20 }
      ]
    }
  ],
  "summary": "Resumo técnico breve do lutador baseado no frame"
}`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
      {
        text: prompt,
      },
    ]);

    const responseText = result.response.text();
    console.log("📸 Frame analisado pelo Gemini Vision");
    
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

  // Coletar todos os dados de cada categoria
  const allLabels = {};
  
  frameAnalyses.forEach((analysis) => {
    if (analysis.summary) {
      consolidated.summaries.push(analysis.summary);
    }

    if (analysis.charts && Array.isArray(analysis.charts)) {
      analysis.charts.forEach((chart, idx) => {
        if (chart.data) {
          chart.data.forEach((item) => {
            const key = item.label;
            if (!allLabels[key]) {
              allLabels[key] = [];
            }
            allLabels[key].push(item.value);
          });
        }
      });
    }
  });

  // Calcular médias para cada label
  const averagedData = {};
  Object.keys(allLabels).forEach((label) => {
    const values = allLabels[label];
    averagedData[label] = Math.round(
      values.reduce((a, b) => a + b, 0) / values.length
    );
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

  // Consolidar sumários
  const uniqueSummaries = [...new Set(consolidated.summaries)];
  consolidated.summary = uniqueSummaries.join(" ");

  delete consolidated.summaries;

  return consolidated;
}

module.exports = { analyzeFrame, consolidateAnalyses };
