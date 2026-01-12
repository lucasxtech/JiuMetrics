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
[VOCÊ É UM TREINADOR DE JIU-JITSU]

Você vai falar com um atleta. Use linguagem simples e direta, como se estivesse conversando pessoalmente.

COMO ESCREVER:

1. SEM OBVIEDADES:
   - Não escreva coisas óbvias tipo "Evite ser montado", "Não dê as costas". 
   - Só fale do básico se o cara tiver algo específico ali (Ex: "Cuidado com a montada dele, ele ataca armlock rápido do S-Mount").

2. SEJA ESPECÍFICO:
   - Ruim: "Cuidado com as quedas."
   - Bom: "Ele entra double leg no contra-ataque. Não chute sem fintar antes."
   - Ruim: "Tente passar a guarda."
   - Bom: "A De La Riva dele é fraca contra Long Step para o lado oposto do gancho."

3. PONTUAÇÃO:
   - Pense em como marcar pontos contra ESSE cara.
   - Ex: "Ele aceita a raspagem pra pegar o pé. Raspe pra fazer 2 pontos e trave a 50/50 por cima."

4. USE OS NÚMEROS:
   - Compare números reais: "Você tem 70% de sucesso em raspagens vs 30% dele"
   - Identifique diferenças: "Ele tenta 5 finalizações por luta mas só consegue 1 (20%)"
   - Seja específico: "Ele passa guarda 3x por luta, você raspa 4.5x - vantagem sua"

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

Use linguagem simples e direta. Fale como um treinador falando com o atleta.

{
  "tese_da_vitoria": "A ideia principal em 1 frase. Ex: 'Negar o judô dele puxando De La Riva, onde ele é fraco, e trabalhar subidas.'",

  "analise_de_matchup": {
    "vantagem_critica": "Onde você é BEM melhor que ele? Seja específico com técnicas e percentuais.",
    "risco_oculto": "O perigo escondido. Ex: 'Ele entrega a passagem pra pegar as costas na transição.'",
    "fator_chave": "O que vai decidir a luta. Ex: 'Condicionamento nos últimos 2 minutos - ele cansa.'"
  },

  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Comando claro: Puxar, Quedar ou Contra-atacar",
      "detalhe_tecnico": "O detalhe importante pra vencer contra ESSE cara."
    },
    "jogo_de_passagem_top": {
      "caminho_das_pedras": "Qual passagem funciona contra a guarda dele? (Ex: Long step vs DLR, Toreada vs Spider)",
      "alerta_de_reversao": "Qual raspagem dele você precisa bloquear? Seja claro."
    },
    "jogo_de_guarda_bottom": {
      "melhor_posicao": "Qual guarda sua expõe a fraqueza dele? (Ex: Butterfly vs passador de joelho)",
      "gatilho_de_ataque": "O momento exato de disparar a raspagem ou finalização."
    }
  },

  "cronologia_inteligente": {
    "inicio": "Como anular o plano dele nos primeiros 60 segundos?",
    "meio": "Como explorar o cansaço dele no meio da luta? (2-4 minutos)",
    "final": "Placar. Ex: 'Ele se abre quando tá perdendo, busca finalização no erro.'"
  },

  "checklist_tatico": {
    "oportunidades_de_pontos": [
      {
        "tecnica": "Nome da técnica (ex: Raspagem de DLR)",
        "quando": "Momento exato (ex: Quando ele tenta circular)",
        "pontos": "Quantos pontos vale (2, 3, 4)",
        "probabilidade": "alta|media|baixa"
      }
    ],
    "armadilhas_dele": [
      {
        "situacao": "Contexto (ex: Quando solta manga na troca)",
        "tecnica_perigosa": "O que ele faz (ex: Single-leg rápido)",
        "como_evitar": "Como prevenir (ex: Nunca soltar sem substituir pegada)"
      }
    ],
    "protocolo_de_seguranca": {
      "jamais_fazer": "Erro que encaixa no jogo forte dele (cite posição/técnica exata)",
      "saida_de_emergencia": "Como sair da posição forte dele"
    }
  }
}

 EXEMPLO DE RESPOSTA VÁLIDA

{
  "tese_da_vitoria": "Negar o single-leg dele puxando De La Riva, onde ele é fraco em defesa, e usar subidas pra pontuar.",
  "analise_de_matchup": {
    "vantagem_critica": "Sua raspagem de DLR funciona 70% das vezes e ele só defende 30% - diferença grande a seu favor.",
    "risco_oculto": "Ele entrega a passagem de propósito pra pegar kani basami no pé durante a transição.",
    "fator_chave": "Condicionamento nos últimos 2 minutos - ele cansa e baixa a postura em 80% das lutas longas."
  },
  "plano_tatico_faseado": {
    "em_pe_standup": {
      "acao_recomendada": "Puxar De La Riva antes dele pegar a manga de judô",
      "detalhe_tecnico": "Entrar com manga cruzada pra evitar a disputa de pegadas onde ele domina"
    },
    "jogo_de_passagem_top": {
      "caminho_das_pedras": "Toreada com pressão lateral - a guarda aranha dele não aguenta movimento circular rápido",
      "alerta_de_reversao": "Ele usa flower sweep quando você para na toreada - mantenha pressão o tempo todo"
    },
    "jogo_de_guarda_bottom": {
      "melhor_posicao": "De La Riva com manga - ele não tem resposta boa pra long step sweep",
      "gatilho_de_ataque": "Quando ele tentar circular pra passar, dispara raspagem pro single-leg X"
    }
  },
  "cronologia_inteligente": {
    "inicio": "Puxar DLR nos primeiros 20 segundos antes dele esquentar - ele demora pra entrar no ritmo",
    "meio": "Manter pressão de raspagens - ele fica frustrado e erra a base por volta dos 3 minutos",
    "final": "Se tiver ganhando, segura no top. Se perdendo, aproveita o cansaço dele e ataca sem parar"
  },
  "checklist_tatico": {
    "oportunidades_de_pontos": [
      {
        "tecnica": "Raspagem de DLR",
        "quando": "Quando ele tenta circular pra passar",
        "pontos": "2",
        "probabilidade": "alta"
      },
      {
        "tecnica": "Passagem de toreada",
        "quando": "Aos 3-4 minutos quando ele cansa e baixa os joelhos",
        "pontos": "3",
        "probabilidade": "media"
      }
    ],
    "armadilhas_dele": [
      {
        "situacao": "Quando você solta a manga na troca de pegada",
        "tecnica_perigosa": "Single-leg rápido com timing bom",
        "como_evitar": "Nunca soltar manga sem substituir pegada na hora"
      },
      {
        "situacao": "Durante fim de passagem",
        "tecnica_perigosa": "Finge aceitar e pega tartaruga pra buscar costas",
        "como_evitar": "Sempre controlar quadril antes de achar que passou"
      }
    ],
    "protocolo_de_seguranca": {
      "jamais_fazer": "Nunca trabalhar meia guarda por baixo - ele domina smash pass nessa posição com 90% de sucesso",
      "saida_de_emergencia": "Se cair no smash pass: shrimp na hora pro lado + recuperar DLR antes da pressão estabilizar (você tem 2 segundos)"
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
