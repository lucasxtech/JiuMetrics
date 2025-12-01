// Função Auxiliar: Limpar JSON do Gemini
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    console.warn("Nenhum JSON encontrado no texto, retornando estrutura padrão");
    return {
      charts: [
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
      ],
      summary: "Análise baseada em inferência técnica geral de lutador de alto nível."
    };
  }

  let clean = text.slice(start, end + 1)
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')
    .replace(/'([^']*)'/g, '"$1"')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//gm, '');

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Erro ao parsear JSON:", e);
    return {
      charts: [],
      summary: "Erro no processamento"
    };
  }
}

// Função Auxiliar: Criar URL do Gráfico (QuickChart)
function generateQuickChartUrl(chartData) {
  const labels = chartData.data.map(item => item.label);
  const values = chartData.data.map(item => item.value);

  const modernColors = [
    '#1565C0', // Azul Faixa
    '#D84315', // Laranja Terroso
    '#2E7D32', // Verde Musgo
    '#4527A0', // Roxo Profundo
    '#C62828', // Vermelho Sangue
    '#37474F', // Cinza Chumbo
    '#F9A825'  // Amarelo Ouro
  ];

  const chartConfig = {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        label: chartData.title,
        data: values,
        backgroundColor: modernColors.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 3,
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
      cutoutPercentage: 60,
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
  return `https://quickchart.io/chart?c=${encodeURIComponent(jsonString)}&w=600&h=350&bkg=white`;
}

module.exports = { extractJson, generateQuickChartUrl };
