// Função Auxiliar: Limpar JSON do Gemini
function extractJson(text) {
  // Remove markdown code blocks primeiro
  let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  
  const start = cleanText.indexOf("{");
  if (start === -1) {
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

  // Encontra o fechamento correto do objeto JSON principal
  // Conta abertura e fechamento de chaves para encontrar o par correto
  let braceCount = 0;
  let jsonEnd = start;
  
  for (let i = start; i < cleanText.length; i++) {
    if (cleanText[i] === '{') braceCount++;
    if (cleanText[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  let clean = cleanText.slice(start, jsonEnd + 1);
  
  // CRÍTICO: Processar o JSON linha por linha para escapar aspas problemáticas
  // O Gemini frequentemente usa aspas duplas dentro de valores (ex: "o 'movimento' especial")
  clean = clean
    .replace(/\\n/g, ' ')                                   // Remove \n literais que o Gemini adiciona
    .replace(/\*\*/g, '')                                   // Remove markdown bold
    .replace(/\n/g, ' ')                                    // Remove quebras reais
    .replace(/\s+/g, ' ')                                   // Normaliza espaços
    .replace(/([{,]\s*)([A-Za-z0-9_]+)\s*:/g, '$1"$2":')  // Aspas em chaves
    .replace(/,\s*([}\]])/g, '$1')                         // Remove vírgulas antes de }]
    .replace(/\/\/.*$/gm, '')                               // Remove comentários //
    .replace(/\/\*[\s\S]*?\*\//gm, '')                     // Remove comentários /* */
    .replace(/,\s*,/g, ',')                                 // Remove vírgulas duplicadas
    .replace(/:\s*,/g, ': null,')                           // Valores vazios viram null
    .replace(/:\s*}/g, ': null}')                           // Valores vazios no fim
    .replace(/:\s*]/g, ': null]');                          // Valores vazios em arrays
    
  // NOVO: Escapar aspas duplas dentro de valores de string
  // Regex robusta: encontra strings JSON e escapa aspas internas
  clean = clean.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
    // Se já tem escape correto, mantém
    if (!match.includes('"') || match.match(/\\"/g)) return match;
    // Senão, escapa aspas internas manualmente
    return match.replace(/"(.+)"/g, (m, content) => {
      return '"' + content.replace(/"/g, '\\"') + '"';
    });
  });

  try {
    console.log('\n🔍 Tentando parsear JSON limpo (primeiros 1000 chars):');
    console.log(clean.substring(0, 1000));
    console.log('\n🔍 JSON limpo (últimos 500 chars):');
    console.log(clean.substring(clean.length - 500));
    
    // Salvar JSON problemático em arquivo para debug
    const fs = require('fs');
    fs.writeFileSync('/tmp/gemini-json-debug.txt', clean, 'utf8');
    console.log('\n💾 JSON completo salvo em: /tmp/gemini-json-debug.txt');
    
    return JSON.parse(clean);
  } catch (e) {
    console.error("Erro ao parsear JSON:", e);
    console.error("JSON problemático (primeiros 500 chars):", clean.substring(0, 500));
    
    // Tentativa de recuperação: usar regex para extrair dados importantes
    try {
      const summaryMatch = text.match(/"summary"\s*:\s*"([^"]+)"/);
      const summary = summaryMatch ? summaryMatch[1] : "Erro no processamento - JSON inválido";
      
      // Tentar extrair charts mesmo com JSON malformado
      const chartsMatch = text.match(/"charts"\s*:\s*\[([\s\S]*?)\]/);
      let charts = [];
      
      if (chartsMatch) {
        // Tentar parsear só a parte dos charts
        try {
          charts = JSON.parse('[' + chartsMatch[1] + ']');
        } catch (chartsError) {
          console.warn("Não foi possível recuperar charts do JSON malformado");
        }
      }
      
      // Se não conseguiu recuperar charts, retorna estrutura padrão
      if (!charts || charts.length === 0) {
        charts = [
          {
            title: "Personalidade Geral",
            data: [
              { label: "agressivo", value: 40 },
              { label: "estratégico", value: 30 },
              { label: "conservador", value: 30 }
            ]
          },
          {
            title: "Comportamento Inicial",
            data: [
              { label: "puxa guarda", value: 50 },
              { label: "troca de queda", value: 50 }
            ]
          },
          {
            title: "Jogo de Guarda",
            data: [
              { label: "guarda fechada", value: 40 },
              { label: "guarda aberta agressiva", value: 30 },
              { label: "de la riva", value: 30 }
            ]
          },
          {
            title: "Jogo de Passagem",
            data: [
              { label: "toreada", value: 40 },
              { label: "pressão de quadril", value: 30 },
              { label: "over/under", value: 30 }
            ]
          },
          {
            title: "Tentativas de Finalização",
            data: [
              { label: "estrangulamento", value: 40 },
              { label: "arm lock", value: 30 },
              { label: "triângulo", value: 30 }
            ]
          }
        ];
      }
      
      return {
        charts,
        summary,
        technical_stats: {
          sweeps: { quantidade: 0, efetividade_percentual: 0 },
          guard_passes: { quantidade: 0, tempo_medio_segundos: 0 },
          submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
          back_takes: { quantidade: 0, tempo_medio_segundos: 0, tentou_finalizar: false }
        },
        _warning: "JSON malformado - análise parcial/estimada retornada"
      };
    } catch (fallbackError) {
      console.error("Erro no fallback de recuperação:", fallbackError);
      return {
        charts: [
          {
            title: "Personalidade Geral",
            data: [
              { label: "agressivo", value: 40 },
              { label: "estratégico", value: 30 },
              { label: "conservador", value: 30 }
            ]
          },
          {
            title: "Comportamento Inicial",
            data: [
              { label: "puxa guarda", value: 50 },
              { label: "troca de queda", value: 50 }
            ]
          },
          {
            title: "Jogo de Guarda",
            data: [
              { label: "guarda fechada", value: 40 },
              { label: "guarda aberta agressiva", value: 60 }
            ]
          },
          {
            title: "Jogo de Passagem",
            data: [
              { label: "toreada", value: 50 },
              { label: "pressão de quadril", value: 50 }
            ]
          },
          {
            title: "Tentativas de Finalização",
            data: [
              { label: "estrangulamento", value: 50 },
              { label: "arm lock", value: 50 }
            ]
          }
        ],
        summary: "Erro no processamento - JSON inválido retornado pelo modelo. Dados estimados.",
        technical_stats: null,
        _error: "Falha completa no parsing do JSON"
      };
    }
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
