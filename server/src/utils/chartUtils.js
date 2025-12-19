const fs = require('fs');

// Constantes
const DEFAULT_CHARTS = [
  {
    title: "Personalidade Geral",
    data: [
      { label: "Agressivo", value: 50 },
      { label: "Calmo", value: 50 }
    ]
  },
  {
    title: "Comportamento Inicial",
    data: [
      { label: "Puxar Guarda", value: 60 },
      { label: "Trocar Queda", value: 40 }
    ]
  },
  {
    title: "Jogo de Guarda",
    data: [
      { label: "Guarda Fechada", value: 70 },
      { label: "Raspagem", value: 30 }
    ]
  },
  {
    title: "Jogo de Passagem",
    data: [
      { label: "Pressão", value: 60 },
      { label: "Toreada", value: 40 }
    ]
  }
];

const DEBUG_FILE_PATH = '/tmp/gemini-json-debug.txt';

/**
 * Limpa texto removendo markdown e formatações problemáticas
 * @param {string} text - Texto bruto do Gemini
 * @returns {string} Texto limpo
 */
function cleanMarkdown(text) {
  return text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .replace(/\\n/g, ' ')
    .replace(/\*\*/g, '')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')  
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '')
    .replace(/,\s*,/g, ',')
    .replace(/:\s*,/g, ': null,')
    .replace(/:\s*}/g, ': null}')
    .replace(/:\s*]/g, ': null]');
}

/**
 * Encontra os limites corretos de um objeto JSON aninhado
 * @param {string} text - Texto contendo JSON
 * @param {number} start - Posição inicial da chave de abertura
 * @returns {number} Posição do fechamento correspondente
 */
function findJsonEnd(text, start) {
  let braceCount = 0;
  
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') braceCount++;
    if (text[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        return i;
      }
    }
  }
  
  return text.length - 1;
}

/**
 * Cria estrutura de fallback para quando o parsing falha
 * @param {string} summary - Sumário extraído ou mensagem de erro
 * @returns {Object} Estrutura padrão com charts
 */
function createFallbackStructure(summary = "Análise baseada em inferência técnica geral.") {
  return {
    charts: DEFAULT_CHARTS,
    summary,
    technical_stats: {
      sweeps: { quantidade: 0, efetividade_percentual: 0 },
      guard_passes: { quantidade: 0, tempo_medio_segundos: 0 },
      submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
      back_takes: { quantidade: 0, tempo_medio_segundos: 0, tentou_finalizar: false }
    },
    _warning: "JSON malformado - dados padrão retornados"
  };
}

/**
 * Normaliza os valores de um gráfico para somar exatamente 100%
 * @param {Array} data - Array de {label, value}
 * @returns {Array} Array normalizado
 */
function normalizeChartData(data) {
  if (!Array.isArray(data) || data.length === 0) return data;
  
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  
  // Se total é 0, não há dados - retorna como está
  if (total === 0) return data;
  
  // Se total já é 100, retorna como está
  if (total === 100) return data;
  
  // Normalizar para somar 100
  const factor = 100 / total;
  let normalized = data.map(item => ({
    ...item,
    value: Math.round((Number(item.value) || 0) * factor)
  }));
  
  // Ajustar arredondamento para garantir soma exata de 100
  const newTotal = normalized.reduce((sum, item) => sum + item.value, 0);
  if (newTotal !== 100) {
    const diff = 100 - newTotal;
    // Adiciona/subtrai a diferença do maior valor não-zero
    const maxIndex = normalized.reduce((iMax, item, i, arr) => 
      item.value > arr[iMax].value ? i : iMax, 0
    );
    normalized[maxIndex].value += diff;
  }
  
  return normalized;
}

/**
 * Extraí e parseia JSON de resposta do Gemini, com tratamento robusto de erros
 * @param {string} text - Texto bruto contendo JSON
 * @returns {Object} Objeto parseado ou estrutura de fallback
 */
function extractJson(text) {
  const cleanText = cleanMarkdown(text);
  const start = cleanText.indexOf("{");
  
  if (start === -1) {
    console.warn("⚠️ Nenhum JSON encontrado na resposta");
    return createFallbackStructure();
  }

  const jsonEnd = findJsonEnd(cleanText, start);
  const jsonString = cleanText.slice(start, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonString);
    
    // ⚠️ NORMALIZAR TODOS OS GRÁFICOS PARA GARANTIR 100%
    if (Array.isArray(parsed.charts)) {
      parsed.charts = parsed.charts.map(chart => ({
        ...chart,
        data: normalizeChartData(chart.data)
      }));
    }
    
    return parsed;
  } catch (error) {
    console.error("❌ Erro ao parsear JSON:", error.message);
    
    // Salvar para debug
    try {
      fs.writeFileSync(DEBUG_FILE_PATH, jsonString, 'utf8');
    } catch (fsError) {
      // Ignorar erro de escrita
    }
    
    // Tentar recuperar sumário
    const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
    const summary = summaryMatch ? summaryMatch[1] : "Erro no processamento - JSON inválido";
    
    return createFallbackStructure(summary);
  }
}


// Cores modernas para gráficos
const CHART_COLORS = [
  '#1565C0', // Azul Faixa
  '#D84315', // Laranja Terroso
  '#2E7D32', // Verde Musgo
  '#4527A0', // Roxo Profundo
  '#C62828', // Vermelho Sangue
  '#37474F', // Cinza Chumbo
  '#F9A825'  // Amarelo Ouro
];

const CHART_CONFIG = {
  width: 600,
  height: 350,
  background: 'white',
  cutoutPercentage: 60,
  borderWidth: 3
};

/**
 * Gera URL do QuickChart para visualização de gráfico
 * @param {Object} chartData - Dados do gráfico {title, data: [{label, value}]}
 * @returns {string} URL do QuickChart
 */
function generateQuickChartUrl(chartData) {
  const labels = chartData.data.map(item => item.label);
  const values = chartData.data.map(item => item.value);

  const chartConfig = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: chartData.title,
        data: values,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: CHART_CONFIG.borderWidth,
      }]
    },
    options: {
      layout: { padding: 20 },
      title: {
        display: true,
        text: chartData.title.toUpperCase(),
        fontSize: 18,
        fontColor: '#222',
        fontStyle: 'bold',
        padding: 15
      },
      legend: {
        display: true,
        position: 'right',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          fontSize: 12,
          fontColor: '#444'
        }
      },
      cutoutPercentage: CHART_CONFIG.cutoutPercentage,
      plugins: {
        datalabels: {
          display: true,
          color: '#ffffff',
          font: { weight: 'bold', size: 14 },
          textStrokeColor: 'rgba(0,0,0,0.3)',
          textStrokeWidth: 3,
        }
      }
    }
  };

  const jsonString = JSON.stringify(chartConfig);
  const baseUrl = 'https://quickchart.io/chart';
  const params = `c=${encodeURIComponent(jsonString)}&w=${CHART_CONFIG.width}&h=${CHART_CONFIG.height}&bkg=${CHART_CONFIG.background}`;
  
  return `${baseUrl}?${params}`;
}

module.exports = { extractJson, generateQuickChartUrl, normalizeChartData };