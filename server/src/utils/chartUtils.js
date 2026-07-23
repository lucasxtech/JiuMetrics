const fs = require('fs');
const { GeminiParseError } = require('./errors');

const DEBUG_FILE_PATH = '/tmp/gemini-json-debug.txt';

/**
 * Remove apenas os marcadores de code fence markdown (```json ... ```)
 * da resposta bruta da IA. Não tenta "consertar" JSON malformado —
 * transformações mais agressivas (remover comentários, auto-quotar chaves)
 * corrompiam respostas válidas que continham strings com "//" ou vírgulas.
 * @param {string} text - Texto bruto do Gemini
 * @returns {string} Texto sem os fences de código
 */
function cleanMarkdown(text) {
  return text
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();
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
 * Extrai e parseia JSON de uma resposta do Gemini.
 * NUNCA retorna dados sintéticos em caso de falha — lança GeminiParseError
 * para que o chamador trate a análise como falha explícita, em vez de
 * salvar um resultado inventado como se fosse real.
 * @param {string} text - Texto bruto contendo JSON
 * @returns {Object} Objeto parseado
 * @throws {GeminiParseError} Se nenhum JSON for encontrado ou o parse falhar
 */
function extractJson(text) {
  const cleanText = cleanMarkdown(text);
  const start = cleanText.indexOf("{");

  if (start === -1) {
    throw new GeminiParseError('Nenhum JSON encontrado na resposta da IA');
  }

  const jsonEnd = findJsonEnd(cleanText, start);
  const jsonString = cleanText.slice(start, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonString);

    // Normalizar todos os gráficos para garantir soma de 100%
    if (Array.isArray(parsed.charts)) {
      parsed.charts = parsed.charts.map(chart => ({
        ...chart,
        data: normalizeChartData(chart.data)
      }));
    }

    return parsed;
  } catch (error) {
    // Salvar para debug antes de propagar o erro
    try {
      fs.writeFileSync(DEBUG_FILE_PATH, jsonString, 'utf8');
    } catch (fsError) {
      // Ignorar erro de escrita
    }

    throw new GeminiParseError(`JSON malformado na resposta da IA: ${error.message}`);
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