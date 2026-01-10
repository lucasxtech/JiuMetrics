const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractJson } = require("../utils/chartUtils");

const apiKey = process.env.GEMINI_API_KEY;

// Constantes
const DEFAULT_MODEL = 'gemini-2.0-flash';
const MAX_SUMMARY_WORDS = 250;
const DEBUG_RESPONSE_CHARS = { first: 500, last: 300 };

if (!apiKey) {
  console.warn('⚠️ GEMINI_API_KEY não configurada. As análises retornarão erro até que a variável esteja definida.');
}

const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Cria uma instância do modelo Gemini
 * @param {string} modelName - Nome do modelo
 * @returns {Object|null} Instância do modelo ou null se API key não configurada
 */
const getModel = (modelName = DEFAULT_MODEL) => {
  if (!ai) return null;
  return ai.getGenerativeModel({ model: modelName });
};

// Modelo padrão para compatibilidade com código existente
const model = getModel();

const BASE_PROMPT = (url) => {
  return `
[SISTEMA: ATIVAR MODO SCOUT FAIXA PRETA & ÁRBITRO IBJJF]
[CONTEXTO: ANÁLISE DE ALTO RENDIMENTO PARA PLATAFORMA DE ESTRATÉGIA]

Você é a autoridade máxima em análise de dados de Jiu-Jitsu. Sua missão é dissecar o vídeo abaixo, ignorando ruídos e focando obsessivamente no "Atleta Alvo".
Seu objetivo não é apenas descrever o que aconteceu, mas quantificar o comportamento tático para criar um algoritmo de vitória contra ele.

URL DO VÍDEO:
${url}

---

PROTOCOLO ANTI-ALUCINAÇÃO (O PROBLEMA DO "GUARDEIRO PURO")
Este é o passo mais importante da sua análise. LEIA COM ATENÇÃO:

1. A REGRA DOS DADOS REAIS:
   Muitas IAs inventam dados para fazer os gráficos somarem 100%. VOCÊ NÃO FARÁ ISSO.
   
2. CENÁRIO DE EXEMPLO:
   Se o atleta é um "Guarderio" que puxa para a guarda imediatamente e nunca sobe:
   - O gráfico "Jogo de Passagem" deve ter TODOS os valores iguais a 0.
   - O gráfico "Comportamento Inicial" deve ter 100% em "puxa pra guarda" e 0 em "troca de queda".
   
3. A LEI DO ZERO:
   Se uma ação não aconteceu, o valor É ZERO. Não tente adivinhar o estilo de passagem de um cara que nunca passou a guarda. Prefiro um gráfico vazio (tudo zero) do que um gráfico mentiroso.

---

DIRETRIZES TÉCNICAS (DEFINIÇÕES DE ÁRBITRO)

1. ANÁLISE DE PERSONALIDADE 
- "Agressivo": É o atleta que inicia 80% das ações. Ele não aceita andar para trás.
- "Explosivo": Atleta de "surtos" (blitz). Ele explode em rajadas intensas e depois desacelera.
- "Estratégico": Joga com o placar. Faz uma vantagem e trava a luta. Usa a regra a seu favor.
- "Conservador": Tem aversão ao risco. Só ataca quando sente 100% de segurança.
- "Ritmo Constante (Grinder)": Não é rápido, mas não para. É uma pressão isométrica contínua.
- "Fadiga Progressiva": Observe se há queda visível de intensidade, postura mais baixa ou respiração ofegante ao longo da luta.
- "Contra-atacador": Ele recua intencionalmente para atrair o oponente para armadilhas.
- "Aceleração no Final": Aumenta a intensidade conforme a luta avança.

2. COMPORTAMENTO INICIAL (PRIMEIROS MOMENTOS DA LUTA)
⚠️ FOCO CRÍTICO: Analise a FASE INICIAL da luta, logo após o "combate".
- "Troca de Queda": Judô ou Wrestling real. Há disputa de pegada em pé visando projeção.
- "Puxa pra Guarda": Ele aceita ficar por baixo imediatamente? Senta puxando para a guarda?
- "Tenta Quedas Explosivas": Double legs ou Single legs com penetração profunda (shots).
- "Busca Controle em Pé": Disputa de pegada sem intenção clara de queda, apenas buscando vantagem.
- "Fica Esperando": Passividade, aguardando o oponente definir o nível.
- "Tenta Passar Direto ao Chão": Já vai direto para o solo sem trabalho em pé.

3. JOGO DE GUARDA 
- "Laço/Aranha": Controle de mangas. Jogo de desaceleração.
- "Guarda Aberta Agressiva": Uso de ganchos sem pegada fixa para chutar (Collar & Sleeve dinâmica).
- "Subir de Single-leg (Wrestling Up)": O meta moderno. Ele usa a guarda apenas para levantar e derrubar.
- "Guarda Borboleta": Ganchos internos visando elevação.
- "Amarra o jogo": Uso de guarda fechada alta ou lapelas (worm guard) para parar o tempo.
- "Scramble": Ele não aceita a guarda; ele gira e embola loucamente para não ser estabilizado.

4. JOGO DE PASSAGEM
- SE ELE NÃO ESTEVE POR CIMA, MANTENHA TUDO ZERO.
- "Toreada": Passagem em pé, controlando as calças, velocidade lateral.
- "Over/Under (Emborcada)": Passagem de pressão pura (Stack pass).
- "Pressão de Quadril (Body Lock)": Trava o tronco e passa "amassando" (Smash pass).
- "Caminhada Lateral": Long step ou passos curtos cercando a guarda.

5. REGRAS DE PONTUAÇÃO (CRITÉRIO IBJJF RÍGIDO)
Para o campo 'technical_stats':
- RASPAGENS: Só conta se inverter e manter o oponente no chão. Scrambles não contam.
- PASSAGEM: Só conta se estabilizar lateralmente (100kg), Norte-Sul ou Joelho na Barriga.
- FINALIZAÇÕES: Só conte tentativas com PERIGO REAL (oponente teve que defender para não bater).

---

RESUMO ESTRATÉGICO (CAMPO 'summary')

Gere um parágrafo técnico corrido (200-250 palavras) descrevendo o perfil completo do atleta.

INCLUA:
1. Perfil físico e estilo geral (ágil/forte, guardeiro/passador, agressivo/técnico)
2. Sequências de ataque preferidas (ex: puxa guarda DLR > raspa > finaliza arm lock)
3. Pontos fortes recorrentes (posições dominantes, técnicas efetivas)
4. Fraquezas técnicas identificadas (gaps defensivos, erros repetidos)
5. Como adversários podem explorá-lo (baseado nas fraquezas observadas)

FORMATO OBRIGATÓRIO:
- Texto corrido em parágrafo único
- SEM markdown (sem negrito, sem código, sem listas)
- SEM estruturas como "Perfil: ...", "Pontos fortes: ..." (apenas texto narrativo)
- Linguagem técnica, direta e baseada em dados observados

EXEMPLO CORRETO:
"O atleta possui perfil ágil e bem condicionado, utilizando principalmente velocidade, mobilidade de quadril e movimentações laterais, em vez de pressão constante. Não é um passador de amasso, mas tem força para manter posições dominantes quando estabiliza. Seu jogo começa em pé, forçando o adversário a puxar para a guarda, com passagens móveis como toreada e knee slide, buscando rapidamente a montada para atacar finalizações de alto percentual, especialmente o arm lock. Sua principal fragilidade está na transição da passagem para a montada, que pode ser instável. Já conseguiu alcançar a posição, mas perdeu o controle devido a reposições explosivas, mostrando falhas na estabilização. O plano de jogo contra ele deve focar em anular suas passagens, evitando guardas abertas passivas. Guardas que controlem a distância e quebrem a postura dificultam sua mobilidade e favorecem raspagens, enquanto a disputa de quedas, com entradas de single ou double leg, o coloca em um cenário menos confortável."

---

FORMATO DE SAÍDA (JSON ESTRITO)

Retorne APENAS o JSON abaixo.
Lembre-se: SE NÃO ACONTECEU, O VALOR É 0. SE ACONTECEU, OS GRAFICOS PRECISAM SOMAR 100%.

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
        { "label": "puxa pra guarda", "value": 0 },
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
        { "label": "subir de single-leg", "value": 0 },
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
      "quantidade": 0
    },
    "submissions": {
      "tentativas": 0,
      "ajustadas": 0,
      "concluidas": 0,
      "detalhes": []
    },
    "back_takes": {
      "quantidade": 0,
      "tentou_finalizar": false
    }
  },
  "summary": ""
}`;
};

function buildPrompt(url, context = {}) {
  const { athleteName, giColor, videos, matchResult } = context;
  
  let contextText = '';
  
  if (athleteName) {
    contextText += `\n\n🎯 ATLETA ALVO: ${athleteName}`;
  }
  
  if (videos && Array.isArray(videos) && videos.length > 0) {
    contextText += `\n\n📹 VÍDEOS PARA ANÁLISE (${videos.length} vídeo(s)):`;
    videos.forEach((video, index) => {
      contextText += `\n   • Vídeo ${index + 1}: ${video.url} - Kimono ${video.giColor}`;
    });
    contextText += `\n\n⚠️ INSTRUÇÃO CRÍTICA: Analise APENAS o atleta ${athleteName}. Em cada vídeo, ele está usando kimono ${videos.map((v, i) => `${v.giColor} (vídeo ${i + 1})`).join(', ')}.`;
    contextText += `\n   Ignore completamente os oponentes. Consolide o comportamento através de TODOS os vídeos.`;
  } else if (giColor) {
    contextText += `\n\n👕 KIMONO DO ATLETA ALVO: ${giColor}`;
    contextText += `\n\n⚠️ INSTRUÇÃO CRÍTICA: Analise APENAS o atleta que está usando kimono ${giColor}. Ignore o oponente.`;
  }

  // Adicionar resultado da luta se fornecido
  if (matchResult) {
    const resultMap = {
      'vitoria-pontos': 'VENCEU esta luta por PONTOS',
      'vitoria-finalizacao': 'VENCEU esta luta por FINALIZAÇÃO',
      'vitoria-vantagens': 'VENCEU esta luta por VANTAGENS',
      'vitoria-wO': 'VENCEU por W.O. (adversário desistiu/desclassificado)',
      'derrota-pontos': 'PERDEU esta luta por PONTOS',
      'derrota-finalizacao': 'PERDEU esta luta por FINALIZAÇÃO (foi finalizado)',
      'derrota-vantagens': 'PERDEU esta luta por VANTAGENS',
      'derrota-desclassificacao': 'PERDEU por DESCLASSIFICAÇÃO',
      'empate': 'Esta luta terminou EMPATADA'
    };
    
    const resultText = resultMap[matchResult] || matchResult;
    contextText += `\n\n📊 RESULTADO DA LUTA: O atleta ${athleteName} ${resultText}.`;
    contextText += `\n⚠️ Use esta informação para contextualizar se o estilo dele foi EFICAZ ou se cometeu ERROS CRÍTICOS que levaram ao resultado.`;
    contextText += `\n   Se perdeu: identifique o que falhou. Se venceu: destaque o que funcionou bem.`;
  }

  return `${BASE_PROMPT(url)}${contextText}`;
}

/**
 * Analisa um frame de vídeo usando Gemini Vision
 * @param {string} url - URL do vídeo para análise
 * @param {Object} context - Contexto adicional (athleteName, giColor, videos)
 * @param {string|null} customModel - Modelo customizado (opcional)
 * @returns {Promise<Object>} Análise e metadados de uso
 */
async function analyzeFrame(url, context = {}, customModel = null) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  if (!modelToUse) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  const prompt = buildPrompt(url, context);

  try {
    const result = await modelToUse.generateContent(prompt);
    const responseText = result.response.text();
    const analysis = extractJson(responseText);
    
    const usageMetadata = result.response.usageMetadata || {};
    
    return {
      analysis,
      usage: {
        modelName,
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error("❌ Erro ao analisar frame:", error.message);
    throw error;
  }
}

/**
 * Consolida múltiplas análises de frames em uma única análise agregada
 * @param {Array<Object>} frameAnalyses - Array de análises de frames
 * @returns {Object} Análise consolidada com médias
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
      guard_passes: { quantidade: 0 },
      submissions: { tentativas: 0, ajustadas: 0, concluidas: 0, detalhes: [] },
      back_takes: { quantidade: 0, tentou_finalizar: false }
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
  const consolidateStats = (statsArray, processor) => {
    if (statsArray.length === 0) return null;
    return processor(statsArray);
  };

  consolidated.technical_stats.sweeps = consolidateStats(allTechnicalStats.sweeps, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, s) => sum + (s.quantidade || 0), 0) / stats.length),
    efetividade_percentual: Math.round(stats.reduce((sum, s) => sum + (s.efetividade_percentual || 0), 0) / stats.length)
  })) || consolidated.technical_stats.sweeps;

  consolidated.technical_stats.guard_passes = consolidateStats(allTechnicalStats.guard_passes, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, g) => sum + (g.quantidade || 0), 0) / stats.length)
  })) || consolidated.technical_stats.guard_passes;

  consolidated.technical_stats.submissions = consolidateStats(allTechnicalStats.submissions, (stats) => ({
    tentativas: Math.round(stats.reduce((sum, s) => sum + (s.tentativas || 0), 0) / stats.length),
    ajustadas: Math.round(stats.reduce((sum, s) => sum + (s.ajustadas || 0), 0) / stats.length),
    concluidas: Math.round(stats.reduce((sum, s) => sum + (s.concluidas || 0), 0) / stats.length),
    detalhes: stats.flatMap(s => s.detalhes || [])
  })) || consolidated.technical_stats.submissions;

  consolidated.technical_stats.back_takes = consolidateStats(allTechnicalStats.back_takes, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, b) => sum + (b.quantidade || 0), 0) / stats.length),
    tentou_finalizar: stats.some(b => b.tentou_finalizar)
  })) || consolidated.technical_stats.back_takes;

  // Consolidar sumários
  const uniqueSummaries = [...new Set(consolidated.summaries.filter(Boolean))];
  consolidated.summary = uniqueSummaries.length > 0 ? uniqueSummaries.join(' ') : 'Resumo não disponível';

  delete consolidated.summaries;

  return consolidated;
}

/**
 * Gera estratégia tática comparando atleta vs adversário usando IA
 * @param {Object} athleteData - Dados do atleta (name, resumo, technical_stats)
 * @param {Object} opponentData - Dados do adversário (name, resumo, technical_stats)
 * @param {string|null} customModel - Modelo customizado
 * @returns {Promise<Object>} Estratégia e metadados de uso
 */
async function generateTacticalStrategy(athleteData, opponentData, customModel = null) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  if (!modelToUse) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  // Formatar technical_stats para exibição legível
  const formatStats = (stats, name) => {
    if (!stats) return `${name}: Dados técnicos não disponíveis ainda.`;
    
    let formatted = `${name} - DADOS QUANTITATIVOS (baseados em ${stats.total_analises} análise(s)):\n\n`;
    
    formatted += `RASPAGENS:\n`;
    formatted += `  • Total: ${stats.sweeps.quantidade_total} raspagens\n`;
    formatted += `  • Média por luta: ${stats.sweeps.quantidade_media}\n`;
    formatted += `  • Efetividade: ${stats.sweeps.efetividade_percentual_media}%\n\n`;
    
    formatted += `PASSAGENS DE GUARDA:\n`;
    formatted += `  • Total: ${stats.guard_passes.quantidade_total} passagens\n`;
    formatted += `  • Média por luta: ${stats.guard_passes.quantidade_media}\n\n`;
    
    formatted += `FINALIZAÇÕES:\n`;
    formatted += `  • Tentativas totais: ${stats.submissions.tentativas_total}\n`;
    formatted += `  • Tentativas médias por luta: ${stats.submissions.tentativas_media}\n`;
    formatted += `  • Finalizações ajustadas: ${stats.submissions.ajustadas_total}\n`;
    formatted += `  • Finalizações concluídas: ${stats.submissions.concluidas_total}\n`;
    formatted += `  • Taxa de sucesso: ${stats.submissions.taxa_sucesso_percentual}%\n`;
    
    if (stats.submissions.finalizacoes_mais_usadas && stats.submissions.finalizacoes_mais_usadas.length > 0) {
      formatted += `  • Técnicas mais usadas: ${stats.submissions.finalizacoes_mais_usadas.map(f => `${f.tecnica} (${f.quantidade}x)`).join(', ')}\n`;
    }
    formatted += `\n`;
    
    formatted += `TOMADAS DE COSTAS:\n`;
    formatted += `  • Total: ${stats.back_takes.quantidade_total}\n`;
    formatted += `  • Média por luta: ${stats.back_takes.quantidade_media}\n`;
    formatted += `  • Finalizou após pegar costas: ${stats.back_takes.percentual_com_finalizacao}% das vezes\n`;
    
    return formatted;
  };

  const athleteStats = formatStats(athleteData.technical_stats, athleteData.name);
  const opponentStats = formatStats(opponentData.technical_stats, opponentData.name);

  const prompt = `
[SISTEMA: ANALISTA ESTRATÉGICO DE ALTO RENDIMENTO - BLACK BELT LEVEL]

Você está conversando com um atleta experiente.
Sua missão é cruzar os dados dos dois lutadores e encontrar a "Assimetria Tática" (onde um ganha e o outro perde).

FILTRO DE OBVIEDADES (LEIA ANTES DE ESCREVER)

1. PROIBIDO O BÁSICO:
   - Nunca escreva "Evite ser montado", "Não dê as costas", "Mantenha a postura". ISSO É ÓBVIO.
   - Só mencione o básico se o adversário tiver uma arma *específica* ali (Ex: "Cuidado com a montada técnica dele, pois ele usa o S-Mount para armlock direto").

2. ESPECIFICIDADE CIRÚRGICA:
   - Ruim: "Cuidado com as quedas."
   - Bom: "O tempo de entrada de Double Leg dele é no contra-ataque. Não chute sem fintar antes."
   - Ruim: "Tente passar a guarda."
   - Bom: "A guarda De La Riva dele é fraca contra passagem de Long Step para o lado oposto do gancho."

3. CONTEXTO DE PONTUAÇÃO (IBJJF):
   - Foque em como a regra interage com O ESTILO DELES.
   - Ex: "Ele aceita a raspagem para pegar o pé. Use isso para fazer 2 pontos e travar a 50/50 por cima."

4. USE OS DADOS QUANTITATIVOS:
   - Compare números reais: "Você tem 70% de taxa de sucesso em raspagens vs 30% dele em defesa"
   - Identifique assimetrias: "Ele tenta 5 finalizações por luta mas só consegue 1 (20% sucesso)"
   - Seja específico: "Ele passa guarda 3x por luta em média, você raspa 4.5x - vantagem numérica sua"

DADOS DO CONFRONTO

ATLETA (SEU LUTADOR)
Nome: ${athleteData.name}

${athleteStats}

PERFIL TÉCNICO CONSOLIDADO:
${athleteData.resumo}


ADVERSÁRIO (ALVO)
Nome: ${opponentData.name}

 ${opponentStats}

 PERFIL TÉCNICO CONSOLIDADO:
${opponentData.resumo}

FORMATO JSON ESTRITO (ANTI-MARKDOWN)

IMPORTANTE:
- Retorne APENAS JSON válido
- NÃO use markdown (**negrito**, \`code\`, etc)
- NÃO quebre linhas com \\n
- Use aspas simples dentro de strings se necessário
- NÃO adicione \`\`\`json antes ou depois

ESTRUTURA DO JSON

IMPORTANTE SOBRE O ESTILO DE ESCRITA:
- Use linguagem CLARA e EXPLICATIVA, como se estivesse conversando com o atleta
- Evite frases muito técnicas sem contexto - sempre explique O PORQUÊ
- Cada campo deve ser COMPREENSÍVEL por alguém que não é professor
- Use exemplos práticos quando possível
- Conecte as ideias com frases de transição

{
  "resumo_rapido": {
    "como_vencer": "Explicação em 2-3 frases de COMO você vai vencer essa luta. Não seja telegráfico. Ex: 'A chave para vencer essa luta está no jogo de guarda. O adversário tem dificuldade comprovada contra guardas com controle de manga, especialmente a De La Riva. Como você tem 70% de efetividade em raspagens dessa posição, o plano é puxar cedo e forçar ele a jogar onde você domina.'",
    "tres_prioridades": [
      "PRIORIDADE 1 com explicação do porquê - ex: 'Puxar para guarda nos primeiros 20 segundos PORQUE ele é mais forte em pé e fica perigoso quando estabelece grip de judô'",
      "PRIORIDADE 2 com explicação - ex: 'Manter controle de manga PORQUE sem isso ele consegue circular e passar com toreada, que é o ponto forte dele'",
      "PRIORIDADE 3 com explicação - ex: 'Forçar o ritmo alto PORQUE os dados mostram que ele cai de rendimento após 3 minutos de luta intensa'"
    ]
  },

  "tese_da_vitoria": "Explicação completa em 3-4 frases da estratégia macro. Deve responder: O QUE fazer, POR QUE funciona contra ESSE adversário específico, e COMO isso leva à vitória. Ex: 'A estratégia central é negar completamente o jogo de judô do adversário, que é onde ele conquistou 80% das suas vitórias. Para isso, vamos puxar para guarda De La Riva ofensiva logo no início, posição onde sua defesa de raspagem é notadamente fraca (apenas 30% de sucesso em defender). A partir dessa guarda, trabalharemos subidas técnicas para single-leg X, acumulando pontos de forma consistente enquanto evitamos qualquer troca em pé.'",

  "analise_de_matchup": {
    "vantagem_critica": "Explicação detalhada (2-3 frases) de onde temos vantagem significativa, COM os números que comprovam. Ex: 'Nossa maior vantagem está no jogo de raspagem. Enquanto você tem 70% de efetividade nas raspagens de De La Riva, o adversário consegue defender apenas 30% delas. Isso cria uma assimetria de 40 pontos percentuais a nosso favor - basicamente, a cada 10 tentativas, você deve conseguir 7 raspagens contra apenas 3 defesas dele.'",
    "risco_oculto": "Explicação do perigo que não é óbvio, com contexto de COMO e QUANDO acontece. Ex: 'Cuidado: ele tem um padrão de aceitar a passagem de guarda intencionalmente. Quando sente que vai perder a guarda, ele vira de costas fingindo proteger, mas na verdade está preparando um kani basami no seu pé durante a transição. Isso já funcionou em 3 das últimas 5 lutas dele. Fique atento quando ele \"desistir fácil\" da guarda.'",
    "fator_chave": "O elemento decisivo da luta com explicação do impacto. Ex: 'O fator que vai decidir essa luta é o condicionamento físico nos minutos finais. Em 80% das lutas que passam de 4 minutos, o adversário baixa significativamente a postura e começa a cometer erros de base. Se você conseguir manter um ritmo alto e levar a luta para os minutos finais com placar próximo, a probabilidade de conseguir uma raspagem ou finalização aumenta drasticamente.'"
  },

  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Comando claro: Puxar, Quedar ou Contra-atacar",
      "explicacao": "Por que essa é a melhor opção contra ESSE adversário? (2-3 frases com contexto). Ex: 'Puxar para guarda é a melhor opção porque o adversário tem formação de judô e já venceu 4 lutas por queda seguida de imobilização. Em pé, ele é mais forte e experiente. Ao puxar cedo, tiramos ele da zona de conforto e levamos para onde temos vantagem.'",
      "como_executar": "O passo-a-passo técnico para fazer funcionar. Ex: 'Entre com controle de manga cruzada (mão direita na manga esquerda dele), puxe a manga para baixo enquanto senta, e estabeleça o gancho de DLR antes dele reagir. Isso evita o grip fight onde ele domina.'"
    },
    "jogo_de_passagem_top": {
      "estilo_recomendado": "Qual abordagem de passagem funciona contra a guarda específica dele? Ex: 'Passagem com pressão lateral (estilo toreada) funciona melhor porque a guarda aranha dele depende de espaço para funcionar. Quando você pressiona lateralmente e tira o espaço, os ganchos dele perdem força.'",
      "passo_a_passo": "Como executar a passagem com detalhes. Ex: 'Controle as duas mangas, passe uma para a mesma mão, use a mão livre para pressionar o joelho dele para baixo, e circule rapidamente para o lado. Mantenha pressão constante - se parar, ele recupera a guarda.'",
      "armadilha_a_evitar": "O contra-ataque principal dele e como neutralizar. Ex: 'Ele usa flower sweep quando você fica estático na passagem. Para evitar, nunca pare o movimento - mantenha pressão e movimento constantes. Se sentir que ele está puxando sua cabeça para baixo, base imediatamente e recomeça.'"
    },
    "jogo_de_guarda_bottom": {
      "guarda_ideal": "Qual guarda usar e por quê funciona contra o estilo de passagem dele. Ex: 'De La Riva com controle de manga é a guarda ideal porque ele passa primariamente com toreada, e o gancho de DLR impede ele de circular. Além disso, ele não tem resposta efetiva para a raspagem de long step.'",
      "momento_de_atacar": "Quando e como disparar o ataque. Ex: 'O momento ideal para raspar é quando ele começa a circular para tentar a passagem. Nesse instante, ele está com o peso comprometido para frente. Use o gancho de DLR para desequilibrar e entre no single-leg X para completar a raspagem.'",
      "se_der_errado": "Plano B se a guarda principal não funcionar. Ex: 'Se ele conseguir tirar o gancho de DLR, transicione imediatamente para X-guard. Não fique tentando reestabelecer DLR - ele é rápido demais. A X-guard mantém controle similar e você pode trabalhar raspagens de lá.'"
    }
  },

  "cronologia_inteligente": {
    "primeiro_minuto": "O que fazer nos primeiros 60 segundos e por quê. Ex: 'Nos primeiros 60 segundos, o objetivo é PUXAR PARA GUARDA o mais rápido possível. O adversário demora cerca de 30 segundos para aquecer e estabelecer suas pegadas de judô. Se você puxar antes disso, ele fica desorientado e você já começa na posição vantajosa.'",
    "minutos_2_a_4": "Estratégia para o meio da luta com foco em acumular vantagem. Ex: 'Entre os minutos 2 e 4, foque em ACUMULAR PONTOS com raspagens. O adversário começa a ficar frustrado quando não consegue passar sua guarda e perde a calma por volta dos 3 minutos. Mantenha pressão constante de raspagens - mesmo que não complete, força ele a defender e gasta energia.'",
    "minutos_finais": "Gestão de placar e estratégia de finalização. Ex: 'Nos minutos finais, a estratégia depende do placar. Se estiver GANHANDO: trabalhe controle de tempo por cima, não arrisque - ele vai abrir para tentar empatar. Se estiver PERDENDO: explore a fadiga dele com ataques contínuos - ele comete erros de base quando cansado e já cedeu 3 raspagens em lutas assim.'"
  },

  "checklist_tatico": {
    "oportunidades_de_pontos": [
      {
        "tecnica": "Nome da técnica específica",
        "situacao": "Contexto completo de quando aplicar (2 frases). Ex: 'Quando ele começa a circular para tentar passar a guarda De La Riva. Nesse momento o peso dele está comprometido para frente e ele não consegue defender a raspagem.'",
        "pontos": "2, 3 ou 4",
        "probabilidade": "alta, media ou baixa",
        "por_que_funciona": "Explicação de por que essa técnica funciona contra ele especificamente. Ex: 'Funciona porque ele não tem base sólida quando está em movimento e os dados mostram que ele só defende 30% das raspagens dessa posição.'"
      }
    ],
    "armadilhas_dele": [
      {
        "situacao": "Contexto completo que ativa a armadilha",
        "o_que_ele_faz": "Descrição da técnica perigosa e como ela funciona. Ex: 'Ele faz um single-leg explosivo aproveitando o timing do momento que você solta a manga para trocar de pegada. É muito rápido e já conseguiu queda em 4 lutas assim.'",
        "como_evitar": "Ação preventiva detalhada. Ex: 'Nunca solte a manga sem antes ter substituído por outra pegada (gola ou outra manga). Se precisar soltar, faça sentado ou dando um passo para trás - nunca parado na frente dele.'"
      }
    ],
    "protocolo_de_emergencia": {
      "posicao_perigosa": "Qual posição evitar a todo custo e por quê. Ex: 'Evite a half-guard por baixo a todo custo. Ele domina o smash pass nessa posição com 90% de taxa de sucesso. Quando você fica em half-guard, ele consegue achatar e passar em menos de 15 segundos na maioria dos casos.'",
      "como_escapar": "Rota de fuga detalhada se cair na posição perigosa. Ex: 'Se cair no smash pass: shrimp IMEDIATAMENTE para o lado (você tem uns 2 segundos antes dele estabilizar a pressão). Use esse movimento para recuperar De La Riva ou pelo menos colocar um joelho shield. NÃO tente ficar em half-guard - saia para guarda aberta.'"
    }
  }
}

 EXEMPLO DE RESPOSTA VÁLIDA

{
  "resumo_rapido": {
    "como_vencer": "A chave para vencer essa luta está no jogo de guarda. O adversário tem dificuldade comprovada contra guardas com controle de manga, especialmente a De La Riva - ele só consegue defender 30% das raspagens dessa posição. Como você tem 70% de efetividade em raspagens de DLR, o plano é puxar cedo para essa guarda e forçar ele a jogar onde você domina.",
    "tres_prioridades": [
      "Puxar para guarda nos primeiros 20 segundos PORQUE ele é mais forte em pé e fica perigoso quando estabelece grip de judô - já venceu 4 lutas assim",
      "Manter controle de manga durante toda a luta PORQUE sem isso ele consegue circular e passar com toreada, que é o ponto forte dele",
      "Forçar ritmo alto especialmente após os 3 minutos PORQUE os dados mostram que ele cai de rendimento e comete erros de base quando cansado"
    ]
  },
  "tese_da_vitoria": "A estratégia central é negar completamente o jogo de judô do adversário, que é onde ele conquistou a maioria das vitórias. Para isso, vamos puxar para guarda De La Riva ofensiva logo no início, posição onde a defesa dele é notadamente fraca (apenas 30% de sucesso). A partir dessa guarda, trabalharemos subidas técnicas para single-leg X, acumulando pontos de forma consistente enquanto evitamos qualquer troca em pé onde ele domina.",
  "analise_de_matchup": {
    "vantagem_critica": "Nossa maior vantagem está no jogo de raspagem. Enquanto você tem 70% de efetividade nas raspagens de De La Riva, o adversário consegue defender apenas 30% delas. Isso cria uma assimetria de 40 pontos percentuais a nosso favor - basicamente, a cada 10 tentativas, você deve conseguir 7 raspagens contra apenas 3 defesas dele.",
    "risco_oculto": "Cuidado: ele tem um padrão de aceitar a passagem de guarda intencionalmente. Quando sente que vai perder a guarda, ele vira de costas fingindo proteger, mas na verdade está preparando um kani basami no seu pé durante a transição. Isso já funcionou em 3 das últimas 5 lutas dele. Fique atento quando ele desistir fácil da guarda.",
    "fator_chave": "O fator que vai decidir essa luta é o condicionamento físico nos minutos finais. Em 80% das lutas que passam de 4 minutos, o adversário baixa significativamente a postura e começa a cometer erros de base. Se você conseguir manter um ritmo alto e levar a luta para os minutos finais, a probabilidade de conseguir uma raspagem ou finalização aumenta muito."
  },
  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Puxar para De La Riva nos primeiros 20 segundos",
      "explicacao": "Puxar para guarda é a melhor opção porque o adversário tem formação de judô e já venceu 4 lutas por queda seguida de imobilização. Em pé, ele é mais forte e experiente. Ao puxar antes dele estabelecer pegadas, tiramos ele da zona de conforto.",
      "como_executar": "Entre com controle de manga cruzada (mão direita na manga esquerda dele), puxe a manga para baixo enquanto senta, e estabeleça o gancho de DLR antes dele reagir. Isso evita o grip fight onde ele domina."
    },
    "jogo_de_passagem_top": {
      "estilo_recomendado": "Passagem com pressão lateral estilo toreada funciona melhor porque a guarda aranha dele depende de espaço para funcionar. Quando você pressiona lateralmente e tira o espaço, os ganchos dele perdem força e ele não consegue atacar.",
      "passo_a_passo": "Controle as duas mangas, passe uma para a mesma mão, use a mão livre para pressionar o joelho dele para baixo, e circule rapidamente para o lado. Mantenha pressão constante - se parar o movimento, ele recupera a guarda.",
      "armadilha_a_evitar": "Ele usa flower sweep quando você fica estático na passagem. Para evitar, nunca pare o movimento lateral - mantenha pressão e movimento constantes. Se sentir que ele está puxando sua cabeça para baixo, base imediatamente e recomeça."
    },
    "jogo_de_guarda_bottom": {
      "guarda_ideal": "De La Riva com controle de manga é a guarda ideal porque ele passa primariamente com toreada, e o gancho de DLR impede ele de circular. Além disso, ele não tem resposta efetiva para a raspagem de long step a partir dessa posição.",
      "momento_de_atacar": "O momento ideal para raspar é quando ele começa a circular para tentar a passagem. Nesse instante, ele está com o peso comprometido para frente. Use o gancho de DLR para desequilibrar e entre no single-leg X para completar a raspagem.",
      "se_der_errado": "Se ele conseguir tirar o gancho de DLR, transicione imediatamente para X-guard. Não fique tentando reestabelecer DLR - ele é rápido demais. A X-guard mantém controle similar e você pode trabalhar raspagens de lá."
    }
  },
  "cronologia_inteligente": {
    "primeiro_minuto": "Nos primeiros 60 segundos, o objetivo é PUXAR PARA GUARDA o mais rápido possível. O adversário demora cerca de 30 segundos para aquecer e estabelecer suas pegadas de judô. Se você puxar antes disso, ele fica desorientado e você já começa na posição vantajosa.",
    "minutos_2_a_4": "Entre os minutos 2 e 4, foque em ACUMULAR PONTOS com raspagens. O adversário começa a ficar frustrado quando não consegue passar sua guarda e perde a calma por volta dos 3 minutos. Mantenha pressão constante de raspagens - mesmo que não complete, força ele a defender e gasta energia.",
    "minutos_finais": "Nos minutos finais, a estratégia depende do placar. Se estiver GANHANDO: trabalhe controle de tempo por cima, não arrisque - ele vai abrir para tentar empatar. Se estiver PERDENDO: explore a fadiga dele com ataques contínuos - ele comete erros de base quando cansado."
  },
  "checklist_tatico": {
    "oportunidades_de_pontos": [
      {
        "tecnica": "Raspagem de DLR para single-leg X",
        "situacao": "Quando ele começa a circular para tentar passar a guarda De La Riva. Nesse momento o peso dele está comprometido para frente e ele não consegue defender bem.",
        "pontos": "2",
        "probabilidade": "alta",
        "por_que_funciona": "Funciona porque ele não tem base sólida quando está em movimento e os dados mostram que ele só defende 30% das raspagens dessa posição."
      },
      {
        "tecnica": "Passagem de toreada",
        "situacao": "Aos 3-4 minutos quando ele fica cansado e começa a baixar os joelhos na guarda. A fadiga faz ele perder a estrutura da guarda aranha.",
        "pontos": "3",
        "probabilidade": "media",
        "por_que_funciona": "A guarda aranha dele depende de ter os braços firmes. Quando cansa, os ganchos ficam fracos e a passagem lateral funciona bem."
      }
    ],
    "armadilhas_dele": [
      {
        "situacao": "Quando você solta a manga durante troca de pegada em pé",
        "o_que_ele_faz": "Ele faz um single-leg explosivo aproveitando o timing do momento que você solta a manga. É muito rápido e já conseguiu queda em 4 lutas assim.",
        "como_evitar": "Nunca solte a manga sem antes ter substituído por outra pegada. Se precisar soltar, faça sentado ou dando um passo para trás - nunca parado na frente dele."
      },
      {
        "situacao": "Durante a finalização da passagem de guarda",
        "o_que_ele_faz": "Ele finge aceitar a passagem e vira de costas, mas na verdade está preparando kani basami ou entrada para pegar suas costas na transição.",
        "como_evitar": "Sempre controle o quadril dele completamente antes de considerar a passagem completa. Se ele virar muito fácil, desconfie e mantenha controle do quadril."
      }
    ],
    "protocolo_de_emergencia": {
      "posicao_perigosa": "Evite a half-guard por baixo a todo custo. Ele domina o smash pass nessa posição com 90% de taxa de sucesso. Quando você fica em half-guard, ele consegue achatar e passar em menos de 15 segundos.",
      "como_escapar": "Se cair no smash pass: shrimp IMEDIATAMENTE para o lado (você tem uns 2 segundos antes dele estabilizar). Use esse movimento para recuperar De La Riva ou pelo menos colocar um joelho shield. NÃO tente ficar em half-guard - saia para guarda aberta."
    }
  }
}

RETORNE APENAS O JSON. SEM TEXTO ADICIONAL.`;

  try {
    const result = await modelToUse.generateContent(prompt);
    const responseText = result.response.text();
    const strategy = extractJson(responseText);
    
    const usageMetadata = result.response.usageMetadata || {};
    
    return {
      strategy,
      usage: {
        modelName,
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('❌ Erro ao gerar estratégia:', error.message);
    throw error;
  }
}

/**
 * Gera resumo técnico profissional de um atleta usando IA
 * @param {Object} athleteData - Dados do atleta (name, analyses, attributes)
 * @param {string|null} customModel - Modelo customizado
 * @returns {Promise<Object>} Resumo e metadados de uso
 */
async function generateAthleteSummary(athleteData, customModel = null) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  if (!modelToUse) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  const { name, analyses, attributes } = athleteData;

  const prompt = `Você é um Analista Técnico de Jiu-Jitsu profissional.

Gere um resumo técnico detalhado do atleta baseado nos dados fornecidos.

ATLETA: ${name}

ANÁLISES DISPONÍVEIS: ${analyses?.length || 0}

ATRIBUTOS CALCULADOS:
${attributes ? Object.entries(attributes).map(([key, value]) => `• ${key}: ${value}/100`).join('\n') : 'Nenhum atributo calculado ainda'}

DADOS DAS ANÁLISES:
${JSON.stringify(analyses || [], null, 2)}

INSTRUÇÕES:
- Identifique o estilo geral de luta
- Liste pontos fortes técnicos
- Liste pontos fracos e áreas de melhoria
- Indique posições favoritas e evitadas
- Sugira como adversários deveriam lutar contra ele
- Seja técnico, objetivo e específico

Retorne APENAS um texto corrido (sem JSON), direto e profissional, como um relatório de scouting.
Máximo ${MAX_SUMMARY_WORDS} palavras.`;

  try {
    const result = await modelToUse.generateContent(prompt);
    const summary = result.response.text();
    
    // Extrair metadata de uso
    const usageMetadata = result.response.usageMetadata || {};
    
    return {
      summary,
      usage: {
        modelName,
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('❌ Erro ao gerar resumo do atleta:', error.message);
    throw error;
  }
}

/**
 * Constrói o system prompt para o chat baseado no contexto
 * @param {string} contextType - 'analysis' ou 'strategy'
 * @param {Object} contextData - Dados do contexto
 * @returns {string} System prompt formatado
 */
function buildChatSystemPrompt(contextType, contextData) {
  if (contextType === 'analysis') {
    return `[SISTEMA: MODO ASSISTENTE DE ANÁLISE DE LUTA]

Você é um assistente especializado em Jiu-Jitsu que ajuda a refinar análises de vídeo.

CONTEXTO DA ANÁLISE ATUAL:
- Atleta: ${contextData.athleteName || 'Não informado'}
- Tipo: ${contextData.personType === 'athlete' ? 'Atleta' : 'Adversário'}
- Data: ${contextData.createdAt || 'Não informada'}

RESUMO ATUAL DA ANÁLISE:
${contextData.summary || 'Sem resumo disponível'}

ESTATÍSTICAS TÉCNICAS:
${JSON.stringify(contextData.technical_stats || {}, null, 2)}

GRÁFICOS DE PERFIL ATUAIS:
${JSON.stringify(contextData.charts || [], null, 2)}

---

⚠️⚠️⚠️ REGRAS CRÍTICAS - LEIA COM ATENÇÃO ⚠️⚠️⚠️

1. NUNCA MOSTRE JSON NO CHAT
   - PROIBIDO usar \`\`\`json no chat
   - PROIBIDO mostrar arrays ou objetos JSON para o usuário
   - SEMPRE use o formato ---EDIT_SUGGESTION--- para qualquer alteração

2. NUNCA INVENTE DADOS
   - Use APENAS informações que estão no RESUMO ATUAL DA ANÁLISE
   - Se o resumo menciona "leg lock", use "leg lock" - NÃO adicione "heel hook", "chave de pé" etc.
   - Se algo não foi mencionado no resumo, NÃO inclua nos gráficos

3. SOMA DOS GRÁFICOS = EXATAMENTE 100%
   - ANTES de responder, VERIFIQUE A SOMA de cada gráfico
   - Se a soma não for 100, AJUSTE os valores até dar 100
   - EXEMPLO ERRADO: 70 + 40 + 30 + 30 = 170 ❌ ISSO ESTÁ ERRADO!
   - EXEMPLO CORRETO: 40 + 30 + 20 + 10 = 100 ✅
   - DICA: Se quiser 3 itens iguais, use 33 + 33 + 34 = 100
   - DICA: Se quiser 4 itens, distribua como 40 + 30 + 20 + 10 = 100
   - FAÇA A CONTA ANTES DE ENVIAR!

4. VOCÊ É O ESPECIALISTA
   - Quando pedirem para gerar gráficos, analise o RESUMO e infira os valores
   - NÃO peça para o usuário especificar números
   - Use sua expertise em Jiu-Jitsu para distribuir os percentuais

---

FORMATO OBRIGATÓRIO PARA EDIÇÕES:

Quando o usuário pedir QUALQUER mudança (texto, gráficos, etc), responda com uma frase curta E ADICIONE:

---EDIT_SUGGESTION---
{
  "field": "charts",
  "newValue": [ARRAY DE GRÁFICOS AQUI],
  "reason": "explicação breve"
}
---END_SUGGESTION---

CAMPOS DISPONÍVEIS:
- "field": "summary" → "newValue" é STRING
- "field": "charts" → "newValue" é ARRAY de gráficos
- "field": "technical_stats" → "newValue" é OBJETO

---

FORMATO DOS GRÁFICOS (field="charts"):

REGRAS:
1. Soma de cada gráfico = EXATAMENTE 100%
2. Inclua APENAS labels com valor > 0
3. Inclua APENAS gráficos que tenham dados relevantes baseados no RESUMO
4. Use APENAS técnicas/características MENCIONADAS no resumo

EXEMPLO BASEADO NO RESUMO "atleta puxa guarda, joga meia guarda, tentou leg lock":
[
  {
    "title": "Comportamento Inicial",
    "data": [
      {"label": "puxa pra guarda", "value": 100}
    ]
  },
  {
    "title": "Jogo de Guarda",
    "data": [
      {"label": "meia guarda", "value": 100}
    ]
  },
  {
    "title": "Tentativas de Finalização",
    "data": [
      {"label": "leg lock", "value": 100}
    ]
  }
]

GRÁFICOS POSSÍVEIS:
- "Personalidade Geral"
- "Comportamento Inicial"
- "Jogo de Guarda"
- "Jogo de Passagem"
- "Tentativas de Finalização"

LABELS VÁLIDAS:
- Personalidade Geral: agressivo, explosivo, estratégico, conservador, ritmo constante, cansa no final, acelera no final, pressão contínua, contra-atacador
- Comportamento Inicial: troca de queda, puxa pra guarda, tenta quedas explosivas, busca controle em pé, fica esperando, tenta passar direto ao chão
- Jogo de Guarda: laço, guarda fechada, guarda aberta agressiva, subir de single-leg, guarda borboleta, amarra o jogo, riscadas/botes sucessivos, scramble, de la riva, meia guarda, one leg, guarda usando lapela
- Jogo de Passagem: toreada, over/under, emborcada, pressão de quadril, caminhada lateral, passos rápidos por fora, amarração antes de passar, explosão para lateral, pulando
- Tentativas de Finalização: arm lock, triângulo, estrangulamento, mata leão, arco e flecha, omoplata, leg lock, chave de pé, mão de vaca, guilhotina, baratoplata, tarikoplata, baseball choke, estrangulamento com lapela, heel hook, mata leão no pé, chave de panturrilha, chave de bíceps, chave de virilha`;
  }

  // Para edição de perfil técnico
  if (contextType === 'profile') {
    return `[SISTEMA: MODO EDITOR DE PERFIL TÉCNICO]

Você é um assistente especializado em Jiu-Jitsu que ajuda a editar e refinar resumos técnicos de lutadores.

CONTEXTO DO PERFIL:
- Lutador: ${contextData.personName || 'Não informado'}
- Tipo: ${contextData.personType === 'athlete' ? 'Atleta' : 'Adversário'}

RESUMO TÉCNICO ATUAL:
${contextData.currentSummary || 'Sem resumo disponível'}

---

⚠️⚠️⚠️ REGRAS CRÍTICAS - LEIA COM ATENÇÃO ⚠️⚠️⚠️

1. VOCÊ É UM EDITOR ESPECIALISTA
   - O usuário vai pedir para MODIFICAR partes do texto
   - Você deve entender a solicitação e gerar uma versão editada do resumo
   - Mantenha o estilo técnico e profissional

2. PRESERVE O QUE NÃO FOI PEDIDO PARA MUDAR
   - Se o usuário pedir para "remover informações sobre guardas", MANTENHA todo o resto
   - Faça APENAS as alterações solicitadas
   
3. MANTENHA A QUALIDADE
   - Texto corrido em parágrafos (sem listas ou bullet points)
   - Linguagem técnica de Jiu-Jitsu
   - 200-300 palavras idealmente

4. SEMPRE USE O FORMATO DE SUGESTÃO
   - Responda com uma frase curta explicando o que você fez
   - E ADICIONE o bloco ---EDIT_SUGGESTION--- com o novo texto

---

FORMATO OBRIGATÓRIO PARA EDIÇÕES:

Quando o usuário pedir QUALQUER mudança, responda com uma frase curta E ADICIONE:

---EDIT_SUGGESTION---
{
  "field": "summary",
  "newValue": "TEXTO COMPLETO DO NOVO RESUMO AQUI",
  "reason": "explicação breve do que foi alterado"
}
---END_SUGGESTION---

IMPORTANTE:
- "field" é SEMPRE "summary" para edições de perfil
- "newValue" deve conter o TEXTO COMPLETO do resumo (não apenas a parte editada)
- Inclua TODO o resumo atualizado, não apenas os trechos modificados

---

EXEMPLOS DE SOLICITAÇÕES E COMO RESPONDER:

SOLICITAÇÃO: "Remova as informações sobre guarda"
RESPOSTA: "Removi as referências ao jogo de guarda do resumo, mantendo as outras informações técnicas."
+ bloco ---EDIT_SUGGESTION--- com o resumo completo sem as partes de guarda

SOLICITAÇÃO: "Adicione mais detalhes sobre finalizações"
RESPOSTA: "Adicionei informações mais detalhadas sobre o sistema de finalização do atleta."
+ bloco ---EDIT_SUGGESTION--- com o resumo completo com seção de finalizações expandida

SOLICITAÇÃO: "Simplifique o texto"
RESPOSTA: "Simplifiquei o texto, tornando-o mais direto e fácil de entender."
+ bloco ---EDIT_SUGGESTION--- com versão mais concisa do resumo`;
  }

  // Para estratégias
  if (contextType === 'strategy') {
    const strategyData = contextData.strategy?.strategy || contextData.strategy || {};
    
    return `[SISTEMA: MODO ASSISTENTE DE ESTRATÉGIA DE LUTA]

Você é um assistente especializado em Jiu-Jitsu que ajuda a refinar estratégias de luta.

CONTEXTO DO CONFRONTO:
- Atleta: ${contextData.athleteName || 'Não informado'}
- Adversário: ${contextData.opponentName || 'Não informado'}

ESTRATÉGIA ATUAL:

📍 Tese da Vitória / Como Vencer:
${strategyData.resumo_rapido?.como_vencer || strategyData.tese_da_vitoria || 'Não definida'}

📊 Análise de Matchup:
${JSON.stringify(strategyData.analise_de_matchup || {}, null, 2)}

🎯 Plano Tático por Fase:
${JSON.stringify(strategyData.plano_tatico_faseado || {}, null, 2)}

⏱️ Cronologia Inteligente:
${JSON.stringify(strategyData.cronologia_inteligente || {}, null, 2)}

---

⚠️⚠️⚠️ REGRAS CRÍTICAS - IDENTIFICAÇÃO DO CAMPO ⚠️⚠️⚠️

VOCÊ DEVE IDENTIFICAR O CAMPO CORRETO BASEADO NO PEDIDO DO USUÁRIO:

| Se o usuário pedir sobre...                    | Use field =                |
|------------------------------------------------|----------------------------|
| "como vencer", "tese", "estratégia geral"      | "tese_da_vitoria"          |
| "fases", "em pé", "passagem", "guarda", "plano"| "plano_tatico_faseado"     |
| "cronologia", "timeline", "minutos", "tempo"   | "cronologia_inteligente"   |
| "matchup", "vantagem", "risco", "análise"      | "analise_de_matchup"       |

EXEMPLOS DE MAPEAMENTO:
- "Sugira ajustes para cada fase da luta" → field: "plano_tatico_faseado"
- "Melhore a estratégia de guarda" → field: "plano_tatico_faseado"
- "Ajuste o primeiro minuto" → field: "cronologia_inteligente"
- "Expanda a tese da vitória" → field: "tese_da_vitoria"
- "Detalhe as vantagens no matchup" → field: "analise_de_matchup"

---

FORMATO OBRIGATÓRIO PARA EDIÇÕES:

Quando o usuário pedir QUALQUER alteração, responda com explicação E ADICIONE:

---EDIT_SUGGESTION---
{
  "field": "CAMPO_CORRETO_DA_TABELA_ACIMA",
  "newValue": VALOR_ESTRUTURADO,
  "reason": "explicação breve"
}
---END_SUGGESTION---

ESTRUTURA DO newValue POR CAMPO:

1. field="tese_da_vitoria" → newValue é STRING
   "Texto da nova tese de vitória..."

2. field="plano_tatico_faseado" → newValue é OBJETO:
   {
     "em_pe_standup": {
       "acao_recomendada": "...",
       "como_executar": "...",
       "explicacao": "..."
     },
     "jogo_de_passagem_top": {
       "estilo_recomendado": "...",
       "passo_a_passo": "...",
       "armadilha_a_evitar": "..."
     },
     "jogo_de_guarda_bottom": {
       "guarda_ideal": "...",
       "momento_de_atacar": "...",
       "se_der_errado": "..."
     }
   }

3. field="cronologia_inteligente" → newValue é OBJETO:
   {
     "primeiro_minuto": "...",
     "minutos_2_a_4": "...",
     "minutos_finais": "..."
   }

4. field="analise_de_matchup" → newValue é OBJETO:
   {
     "vantagem_critica": "...",
     "risco_oculto": "...",
     "fator_chave": "..."
   }

---

LEMBRE-SE: O field determina ONDE a edição aparece na interface!
- field errado = edição aparece no lugar errado
- Sempre use o field da tabela de mapeamento acima`;
  }

  // Fallback genérico
  return `[SISTEMA: MODO ASSISTENTE DE JIU-JITSU]
Você é um assistente especializado em Jiu-Jitsu.
${JSON.stringify(contextData, null, 2)}`;
}

/**
 * Extrai sugestão de edição da resposta da IA (se houver)
 * @param {string} responseText - Texto da resposta
 * @returns {Object|null} Sugestão de edição ou null
 */
function extractEditSuggestion(responseText) {
  const suggestionMatch = responseText.match(/---EDIT_SUGGESTION---([\s\S]*?)---END_SUGGESTION---/);
  
  if (!suggestionMatch) {
    console.log('ℹ️ Nenhuma sugestão de edição encontrada na resposta');
    return null;
  }

  try {
    const jsonStr = suggestionMatch[1].trim();
    console.log('📋 JSON da sugestão extraído:', jsonStr.substring(0, 200) + '...');
    const parsed = JSON.parse(jsonStr);
    console.log('✅ Sugestão parseada:', {
      field: parsed.field,
      reason: parsed.reason,
      newValueType: typeof parsed.newValue,
      newValueLength: typeof parsed.newValue === 'string' ? parsed.newValue.length : 'N/A'
    });
    return parsed;
  } catch (error) {
    console.error('❌ Erro ao parsear sugestão de edição:', error.message);
    console.error('📄 Texto que tentou parsear:', suggestionMatch[1].substring(0, 300));
    return null;
  }
}

/**
 * Remove marcadores de sugestão do texto para exibição limpa
 * @param {string} text - Texto com possíveis marcadores
 * @returns {string} Texto limpo
 */
function cleanResponseText(text) {
  return text.replace(/---EDIT_SUGGESTION---[\s\S]*?---END_SUGGESTION---/g, '').trim();
}

/**
 * Inicia ou continua uma sessão de chat contextual com a IA
 * @param {Object} params - Parâmetros do chat
 * @param {string} params.contextType - 'analysis' ou 'strategy'
 * @param {Object} params.contextData - Dados completos do contexto (análise/estratégia)
 * @param {Array} params.history - Histórico de mensagens [{role: 'user'|'model', content: string}]
 * @param {string} params.userMessage - Nova mensagem do usuário
 * @param {string|null} params.customModel - Modelo customizado (opcional)
 * @returns {Promise<Object>} Resposta da IA + sugestões de edição + usage
 */
async function chat({ contextType, contextData, history = [], userMessage, customModel = null }) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  if (!modelToUse) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  // Construir system prompt com contexto
  const systemPrompt = buildChatSystemPrompt(contextType, contextData);

  // Preparar histórico para o Gemini
  const geminiHistory = [
    { 
      role: 'user', 
      parts: [{ text: systemPrompt }] 
    },
    { 
      role: 'model', 
      parts: [{ text: 'Entendi o contexto da análise. Estou pronto para ajudar a refinar os dados. O que você gostaria de ajustar?' }] 
    },
    ...history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }))
  ];

  try {
    // Iniciar chat com histórico
    const chatSession = modelToUse.startChat({
      history: geminiHistory,
    });

    // Enviar nova mensagem
    const result = await chatSession.sendMessage(userMessage);
    const responseText = result.response.text();

    // Extrair sugestão de edição (se houver)
    const editSuggestion = extractEditSuggestion(responseText);
    
    // Limpar texto para exibição
    const cleanMessage = cleanResponseText(responseText);

    // Extrair metadata de uso
    const usageMetadata = result.response.usageMetadata || {};

    return {
      message: cleanMessage,
      editSuggestion,
      usage: {
        modelName,
        promptTokens: usageMetadata.promptTokenCount || 0,
        completionTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0
      }
    };
  } catch (error) {
    console.error('❌ Erro no chat com IA:', error.message);
    throw error;
  }
}

module.exports = { 
  analyzeFrame, 
  consolidateAnalyses, 
  generateTacticalStrategy, 
  generateAthleteSummary,
  getModel,
  chat,
  buildChatSystemPrompt,
  extractEditSuggestion
};
