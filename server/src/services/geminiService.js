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

⛔ PROTOCOLO ANTI-ALUCINAÇÃO (O PROBLEMA DO "GUARDEIRO PURO")
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

📜 DIRETRIZES TÉCNICAS (DEFINIÇÕES DE ÁRBITRO)

1. ANÁLISE DE PERSONALIDADE 
- "Agressivo": É o atleta que inicia 80% das ações. Ele não aceita andar para trás.
- "Explosivo": Atleta de "surtos" (blitz). Ele explode por 5 segundos e para para respirar.
- "Estratégico": Joga com o placar. Faz uma vantagem e trava a luta. Usa a regra a seu favor.
- "Conservador": Tem aversão ao risco. Só ataca quando sente 100% de segurança.
- "Ritmo Constante (Grinder)": Não é rápido, mas não para. É uma pressão isométrica contínua.
- "Cansa no Final": Observe a postura nos últimos minutos. Ele baixa a guarda? Respira pela boca?
- "Contra-atacador": Ele recua intencionalmente para atrair o oponente para armadilhas.

2. COMPORTAMENTO INICIAL 
- "Troca de Queda": Judô ou Wrestling real. Há disputa de pegada em pé visando projeção.
- "Puxa pra Guarda": Ele aceita ficar por baixo imediatamente?
- "Tenta Quedas Explosivas": Double legs ou Single legs com penetração profunda (shots).
- "Fica Esperando": Passividade, aguardando o oponente definir o nível.

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
- RASPAGENS: Só conta se inverter e manter o oponente no chão por 3 SEGUNDOS. Scrambles não contam.
- PASSAGEM: Só conta se estabilizar lateralmente (100kg), Norte-Sul ou Joelho na Barriga por 3 SEGUNDOS.
- FINALIZAÇÕES: Só conte tentativas com PERIGO REAL (oponente teve que defender para não bater).

---

🧠 RESUMO ESTRATÉGICO (O CAMPO "SUMMARY")
Gere um relatório de inteligência tática, respondendo:
1. **O Perfil Biomecânico:** Ele é forte e lento? Rápido e flexível?
2. **Cadeia de Ataque Preferida:** Qual a sequência "A > B > C" que ele sempre tenta fazer?
3. **O Erro Sistêmico (Kryptonita):** Onde ele falha consistentemente? (Ex: "Postura ruim no double leg").
4. **Plano de Jogo:** A estratégia exata para vencê-lo.

---

📦 FORMATO DE SAÍDA (JSON ESTRITO)

Retorne APENAS o JSON abaixo.
Lembre-se: SE NÃO ACONTECEU, O VALOR É 0. NÃO FORCE SOMA DE 100% EM GRÁFICOS SEM DADOS.

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
  const consolidateStats = (statsArray, processor) => {
    if (statsArray.length === 0) return null;
    return processor(statsArray);
  };

  consolidated.technical_stats.sweeps = consolidateStats(allTechnicalStats.sweeps, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, s) => sum + (s.quantidade || 0), 0) / stats.length),
    efetividade_percentual: Math.round(stats.reduce((sum, s) => sum + (s.efetividade_percentual || 0), 0) / stats.length)
  })) || consolidated.technical_stats.sweeps;

  consolidated.technical_stats.guard_passes = consolidateStats(allTechnicalStats.guard_passes, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, g) => sum + (g.quantidade || 0), 0) / stats.length),
    tempo_medio_segundos: Math.round(stats.reduce((sum, g) => sum + (g.tempo_medio_segundos || 0), 0) / stats.length)
  })) || consolidated.technical_stats.guard_passes;

  consolidated.technical_stats.submissions = consolidateStats(allTechnicalStats.submissions, (stats) => ({
    tentativas: Math.round(stats.reduce((sum, s) => sum + (s.tentativas || 0), 0) / stats.length),
    ajustadas: Math.round(stats.reduce((sum, s) => sum + (s.ajustadas || 0), 0) / stats.length),
    concluidas: Math.round(stats.reduce((sum, s) => sum + (s.concluidas || 0), 0) / stats.length),
    detalhes: stats.flatMap(s => s.detalhes || [])
  })) || consolidated.technical_stats.submissions;

  consolidated.technical_stats.back_takes = consolidateStats(allTechnicalStats.back_takes, (stats) => ({
    quantidade: Math.round(stats.reduce((sum, b) => sum + (b.quantidade || 0), 0) / stats.length),
    tempo_medio_segundos: Math.round(stats.reduce((sum, b) => sum + (b.tempo_medio_segundos || 0), 0) / stats.length),
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
 * @param {Object} athleteData - Dados do atleta (name, resumo)
 * @param {Object} opponentData - Dados do adversário (name, resumo)
 * @param {string|null} customModel - Modelo customizado
 * @returns {Promise<Object>} Estratégia e metadados de uso
 */
async function generateTacticalStrategy(athleteData, opponentData, customModel = null) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  if (!modelToUse) {
    throw new Error('GEMINI_API_KEY não configurada no servidor');
  }

  const prompt = `
[SISTEMA: ANALISTA ESTRATÉGICO DE ALTO RENDIMENTO - BLACK BELT LEVEL]
[MODO: FAIXA PRETA]

Você está conversando com um atleta experiente.
Sua missão é cruzar os dados dos dois lutadores e encontrar a "Assimetria Tática" (onde um ganha e o outro perde).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫 FILTRO DE OBVIEDADES (LEIA ANTES DE ESCREVER)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 DADOS DO CONFRONTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🥋 ATLETA (SEU LUTADOR)
Nome: ${athleteData.name}

📊 PERFIL TÉCNICO CONSOLIDADO:
${athleteData.resumo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ADVERSÁRIO (ALVO)
Nome: ${opponentData.name}

📊 PERFIL TÉCNICO CONSOLIDADO:
${opponentData.resumo}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ FORMATO JSON ESTRITO (ANTI-MARKDOWN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANTE:
- Retorne APENAS JSON válido
- NÃO use markdown (**negrito**, \`code\`, etc)
- NÃO quebre linhas com \\n
- Use aspas simples dentro de strings se necessário
- NÃO adicione \`\`\`json antes ou depois

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 ESTRUTURA DO JSON
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A linguagem deve ser técnica, direta e específica para ESTE matchup.

{
  "tese_da_vitoria": "A estratégia macro em 1 frase. Ex: 'Negar o judô dele puxando para De La Riva ofensiva, onde sua defesa de raspagem é fraca, e trabalhar subidas técnicas.'",

  "analise_de_matchup": {
    "vantagem_critica": "Onde nós somos MUITO melhores que ele? (Assimetria positiva). Seja específico com técnicas e percentuais se possível.",
    "risco_oculto": "O perigo que não é óbvio. Ex: 'Ele entrega a passagem para pegar as costas na transição.'",
    "fator_chave": "O atributo que vai decidir a luta. Ex: 'Condicionamento nos últimos 2 minutos - ele baixa a guarda.'"
  },

  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Comando claro: Puxar, Quedar ou Contra-atacar",
      "detalhe_tecnico": "O pulo do gato para vencer nesta fase contra ESSE oponente específico."
    },
    "jogo_de_passagem_top": {
      "caminho_das_pedras": "Qual estilo de passagem anula a guarda específica dele? (Ex: Long step vs DLR, Toreada vs Spider)",
      "alerta_de_reversao": "Qual a raspagem favorita dele que precisamos bloquear? Seja específico."
    },
    "jogo_de_guarda_bottom": {
      "melhor_posicao": "Qual guarda nossa expõe a fraqueza dele? (Ex: Butterfly sweep vs passador de joelho)",
      "gatilho_de_ataque": "O momento exato de disparar a raspagem ou finalização."
    }
  },

  "cronologia_inteligente": {
    "inicio": "Como anular o plano principal dele nos primeiros 60 segundos? (Tático e específico)",
    "meio": "Como explorar o cansaço ou frustração dele no meio da luta? (2-4 minutos)",
    "final": "Gestão de placar específica. Ex: 'Ele se abre quando está perdendo, busque finalização no erro.'"
  },

  "checklist_tatico": {
    "oportunidades_de_pontos": [
      "Situação específica 1 baseada no erro técnico dele",
      "Situação específica 2 baseada na nossa melhor arma"
    ],
    "armadilhas_dele": [
      "Não diga 'cuidado com quedas'. Diga: 'O single leg dele vem da lapela solta - mantenha pegada forte.'",
      "Situação específica onde ele costuma pontuar ou induzir punição"
    ],
    "protocolo_de_seguranca": {
      "jamais_fazer": "O erro técnico específico que encaixa perfeitamente no jogo forte dele.",
      "saida_de_emergencia": "Se cair na posição forte dele, qual é a rota de fuga? (Ex: 'Na montada, frame no quadril e shrimp para meia guarda')"
    }
  }
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 EXEMPLO DE RESPOSTA VÁLIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

{
  "tese_da_vitoria": "Negar o single-leg dele puxando De La Riva ofensiva, onde sua defesa de raspagem é 30% inferior, e usar subidas técnicas para pontuar.",
  "analise_de_matchup": {
    "vantagem_critica": "Nossa efetividade de raspagem de DLR (estimada em 70%) vs sua taxa de defesa baixa cria assimetria de 30+ pontos.",
    "risco_oculto": "Ele entrega a passagem intencionalmente para pegar kani basami no pé durante a transição.",
    "fator_chave": "Condicionamento cardio nos últimos 2 minutos - ele baixa a postura em 80% das lutas longas."
  },
  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Puxar para De La Riva antes dele estabelecer pegada de judô",
      "detalhe_tecnico": "Entrada com control de manga cruzada para evitar o grip fight onde ele domina"
    },
    "jogo_de_passagem_top": {
      "caminho_das_pedras": "Toreada com pressão lateral - sua guarda aranha colapsa contra movimento circular rápido",
      "alerta_de_reversao": "Ele usa flower sweep quando você fica estático na toreada - mantenha pressão constante"
    },
    "jogo_de_guarda_bottom": {
      "melhor_posicao": "De La Riva com controle de manga - ele não tem resposta efetiva para long step sweep",
      "gatilho_de_ataque": "Quando ele tenta circular para passar, disparar raspagem para single-leg X"
    }
  },
  "cronologia_inteligente": {
    "inicio": "Puxar para DLR nos primeiros 20 segundos antes dele aquecer o jogo de pegadas - ele demora para entrar no ritmo",
    "meio": "Manter pressão constante de raspagens - ele fica frustrado e comete erros de base por volta dos 3 minutos",
    "final": "Se estiver ganhando, trabalhar controle de tempo em top. Se perdendo, explorar a fadiga dele com ataques contínuos"
  },
  "checklist_tatico": {
    "oportunidades_de_pontos": [
      "Raspagem de DLR quando ele tenta circular (2 pontos garantidos pela fraqueza dele)",
      "Passagem de toreada quando ele fica cansado e baixa os joelhos (3 pontos)"
    ],
    "armadilhas_dele": [
      "O single-leg dele vem especificamente quando você solta a manga na troca de pegada - nunca solte sem substituir",
      "Ele finge aceitar a passagem para pegar turtle e buscar as costas - sempre controlar o quadril na finalização"
    ],
    "protocolo_de_seguranca": {
      "jamais_fazer": "Nunca trabalhar half guard bottom - é onde ele domina o smash pass com 90% de taxa de sucesso",
      "saida_de_emergencia": "Se cair no smash pass, shrimp imediato para recuperar DLR antes da pressão estabilizar (janela de 2 segundos)"
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

module.exports = { 
  analyzeFrame, 
  consolidateAnalyses, 
  generateTacticalStrategy, 
  generateAthleteSummary,
  getModel
};
