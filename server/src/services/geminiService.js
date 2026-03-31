/**
 * Serviço de integração com a API Gemini
 * 
 * Responsável por todas as interações com a IA do Google,
 * incluindo análise de vídeos, geração de estratégias e chat.
 */

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { extractJson } = require("../utils/chartUtils");
const { getPrompt, fillPrompt } = require("./prompts");
const { DEFAULT_MODEL, MAX_SUMMARY_WORDS } = require("../config/ai");
const { GeminiApiKeyMissingError, parseGeminiError } = require("../utils/errors");

// ====================================
// CONFIGURAÇÃO
// ====================================

const apiKey = process.env.GEMINI_API_KEY;

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

/**
 * Verifica se o modelo está disponível
 * @param {Object} modelToUse - Instância do modelo
 * @throws {GeminiApiKeyMissingError} Se a API key não está configurada
 */
function assertModelAvailable(modelToUse) {
  if (!modelToUse) {
    throw new GeminiApiKeyMissingError();
  }
}

// ====================================
// BUILDERS DE CONTEXTO
// ====================================

/**
 * Constrói contexto adicional para o prompt de análise de vídeo
 * @param {Object} context - Contexto (athleteName, giColor, videos, matchResult, belt)
 * @returns {string} Texto de contexto formatado
 */
function buildVideoAnalysisContext(context = {}) {
  const { athleteName, giColor, videos, matchResult, belt } = context;
  
  let contextText = '';
  
  if (athleteName) {
    contextText += `\n\n🎯 ATLETA ALVO: ${athleteName}`;
  }
  
  // Adicionar faixa com regras específicas
  if (belt) {
    contextText += `\n🥋 FAIXA: ${belt.toUpperCase()}`;
    contextText += getBeltRulesText(belt);
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

  return contextText;
}

/**
 * Retorna texto de regras IBJJF baseado na faixa
 * @param {string} belt - Faixa do atleta
 * @returns {string} Texto com regras
 */
function getBeltRulesText(belt) {
  if (!belt) return '';
  
  const beltLower = belt.toLowerCase();
  
  if (['branca', 'azul', 'white', 'blue'].includes(beltLower)) {
    return `\n⚠️ REGRA IBJJF: Faixa ${belt} - LEG LOCKS PROIBIDOS (exceto chave de pé reta). Heel hook, toe hold, kneebar são ILEGAIS.`;
  } else if (['roxa', 'purple'].includes(beltLower)) {
    return `\n⚠️ REGRA IBJJF: Faixa ${belt} - Apenas chave de pé reta e toe hold são permitidos. Heel hook e kneebar são ILEGAIS.`;
  } else if (['marrom', 'preta', 'brown', 'black'].includes(beltLower)) {
    return `\n⚠️ REGRA IBJJF: Faixa ${belt} - Toe hold, kneebar e chave de pé são permitidos. Heel hook só é permitido em NO-GI.`;
  }
  
  return '';
}

/**
 * Formata regras IBJJF completas para estratégia
 * @param {string} belt - Faixa do atleta
 * @returns {string} Texto formatado com regras
 */
function formatBeltRulesForStrategy(belt) {
  if (!belt) return '';
  
  const beltLower = belt.toLowerCase();
  let rules = `\n🥋 FAIXA: ${belt.toUpperCase()}\n`;
  
  if (['branca', 'white'].includes(beltLower)) {
    rules += `⚠️ REGRAS IBJJF FAIXA BRANCA:
   • LEG LOCKS: Apenas CHAVE DE PÉ RETA é permitida
   • PROIBIDO: Heel hook, toe hold, kneebar, calf slicer, bicep slicer
   • PROIBIDO: Puxar guarda saltando (jump guard)
   • PROIBIDO: Scissor takedown (tesoura)
   • SLAM: Qualquer slam resulta em desclassificação`;
  } else if (['azul', 'blue'].includes(beltLower)) {
    rules += `⚠️ REGRAS IBJJF FAIXA AZUL:
   • LEG LOCKS: Apenas CHAVE DE PÉ RETA é permitida
   • PROIBIDO: Heel hook, toe hold, kneebar, calf slicer
   • PROIBIDO: Bicep slicer, scissor takedown
   • SLAM: Qualquer slam resulta em desclassificação`;
  } else if (['roxa', 'purple'].includes(beltLower)) {
    rules += `⚠️ REGRAS IBJJF FAIXA ROXA:
   • LEG LOCKS: Chave de pé reta + TOE HOLD permitidos
   • PROIBIDO: Heel hook, kneebar, calf slicer
   • PERMITIDO: Bicep slicer da montada`;
  } else if (['marrom', 'brown'].includes(beltLower)) {
    rules += `⚠️ REGRAS IBJJF FAIXA MARROM:
   • LEG LOCKS: Chave de pé reta, toe hold, KNEEBAR, CALF SLICER permitidos
   • PROIBIDO: Heel hook (apenas em NO-GI de algumas federações)
   • PERMITIDO: Bicep slicer de qualquer posição`;
  } else if (['preta', 'black'].includes(beltLower)) {
    rules += `⚠️ REGRAS IBJJF FAIXA PRETA:
   • LEG LOCKS: Chave de pé reta, toe hold, kneebar, calf slicer permitidos
   • PROIBIDO: Heel hook (apenas em NO-GI de algumas federações)
   • PERMITIDO: Todas as chaves de braço e compressões`;
  }
  
  return rules;
}

/**
 * Retorna nível numérico da faixa (para comparação)
 * @param {string} belt - Faixa
 * @returns {number} Nível (1-5)
 */
function getBeltLevel(belt) {
  if (!belt) return 5;
  const beltLower = belt.toLowerCase();
  if (['branca', 'white'].includes(beltLower)) return 1;
  if (['azul', 'blue'].includes(beltLower)) return 2;
  if (['roxa', 'purple'].includes(beltLower)) return 3;
  if (['marrom', 'brown'].includes(beltLower)) return 4;
  if (['preta', 'black'].includes(beltLower)) return 5;
  return 5;
}

// ====================================
// ANÁLISE DE VÍDEO
// ====================================

/**
 * Constrói o prompt completo para análise de vídeo
 * @param {string} url - URL do vídeo
 * @param {Object} context - Contexto adicional
 * @returns {string} Prompt completo
 */
function buildVideoAnalysisPrompt(url, context = {}) {
  const basePrompt = getPrompt('video-analysis', { VIDEO_URL: url });
  const contextText = buildVideoAnalysisContext(context);
  return basePrompt + contextText;
}

/**
 * Analisa um frame de vídeo usando Gemini Vision
 * @param {string} url - URL do vídeo para análise
 * @param {Object} context - Contexto adicional (athleteName, giColor, videos)
 * @param {string|null} customModel - Modelo customizado (opcional)
 * @param {boolean} useAgents - Se deve usar sistema multi-agentes (padrão: false)
 * @returns {Promise<Object>} Análise e metadados de uso
 */
async function analyzeFrame(url, context = {}, customModel = null, useAgents = false) {
  // Se multi-agentes está habilitado, delega para o Orchestrator
  if (useAgents) {
    return analyzeFrameWithAgents(url, context, customModel);
  }

  // Lógica original (monolítico) - CORRIGIDA para passar imagem corretamente
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  assertModelAvailable(modelToUse);

  // Construir prompt — para YouTube, passa a URL no contexto; para base64, marca como imagem anexada
  const isYouTube = url.includes('youtube.com/') || url.includes('youtu.be/');
  const basePrompt = getPrompt('video-analysis', { VIDEO_URL: isYouTube ? url : '[MÍDIA ANEXADA]' });
  const contextText = buildVideoAnalysisContext(context);
  const textPrompt = basePrompt + contextText;

  // Preparar partes para o Gemini (texto + imagem)
  const parts = [{ text: textPrompt }];

  // Verificar se é Data URI (base64) ou URL do YouTube
  if (url.startsWith('data:')) {
    const match = url.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
      parts.push({
        inlineData: {
          mimeType: match[1], // Ex: "image/png"
          data: match[2] // Base64 data (sem prefixo)
        }
      });
      console.log('📷 [analyzeFrame] Imagem anexada ao prompt (inlineData)');
    } else {
      console.error('❌ [analyzeFrame] Data URI inválido - formato não reconhecido');
      throw new Error('Data URI inválido');
    }
  } else if (url.includes('youtube.com/') || url.includes('youtu.be/')) {
    // Gemini 1.5+ suporta YouTube URLs nativamente via fileData
    parts.push({
      fileData: {
        mimeType: 'video/mp4',
        fileUri: url
      }
    });
    console.log('🎬 [analyzeFrame] YouTube URL anexada ao prompt (fileData):', url);
  } else {
    console.warn('⚠️ [analyzeFrame] Tipo de URL não suportado:', url.substring(0, 60));
    throw new Error('Tipo de URL não suportado. Use YouTube ou faça upload do vídeo.');
  }

  try {
    const result = await modelToUse.generateContent(parts);
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
    throw parseGeminiError(error);
  }
}

/**
 * Analisa frame usando sistema multi-agentes
 * @param {string} url - URL do vídeo (ou fileUri)
 * @param {Object} context - Contexto da análise
 * @param {string|null} customModel - Modelo Gemini customizado (opcional)
 * @returns {Promise<Object>} Análise consolidada dos agentes
 */
async function analyzeFrameWithAgents(url, context = {}, customModel = null) {
  const { Orchestrator } = require('./agents');
  // getBeltRulesText já está definido neste arquivo, uso direto
  
  try {
    console.log('\n🤖 ========================================');
    console.log('🤖 INICIANDO SISTEMA MULTI-AGENTES');
    console.log('🤖 ========================================');
    
    // Preparar contexto enriquecido para os agentes
    const enrichedContext = {
      athleteName: context.athleteName || 'Atleta',
      giColor: context.giColor || 'azul',
      belt: context.belt || 'Não especificada',
      result: context.matchResult || context.result || 'Não especificado',
      beltRules: context.belt ? getBeltRulesText(context.belt) : ''
    };
    
    console.log('🤖 Contexto preparado:');
    console.log('   - Atleta:', enrichedContext.athleteName);
    console.log('   - Faixa:', enrichedContext.belt);
    console.log('   - Cor kimono:', enrichedContext.giColor);

    // Preparar frameData para os agentes
    // O frameData será processado pelo AgentBase que detecta automaticamente
    // se é Data URI (base64) ou File URI do Gemini
    const frameData = {
      fileUri: url // Data URI (base64) ou File URI
    };
    
    console.log('🤖 Frame preparado:');
    console.log('   - Tipo:', url.startsWith('data:') ? 'Base64 Data URI' : 'File URI');
    console.log('   - Tamanho:', url.length, 'caracteres');

    // Instanciar orchestrator
    const modelToUse = customModel || DEFAULT_MODEL;
    console.log('🤖 Instanciando Orchestrator...');
    console.log('   - Modelo GPT (fixo):', process.env.OPENAI_MODEL || 'gpt-4-turbo-preview');
    console.log('   - Modelo Gemini (agentes):', modelToUse);
    
    const orchestrator = new Orchestrator(
      ai, // Cliente do Gemini
      process.env.OPENAI_API_KEY,
      modelToUse // Gemini model para agentes
    );
    
    console.log('✅ Orchestrator criado com sucesso');

    // Executar orquestração
    console.log('🤖 Executando orquestração dos agentes...');
    const result = await orchestrator.orchestrateVideoAnalysis(frameData, enrichedContext);
    
    console.log('✅ Orquestração concluída com sucesso!');
    console.log('   - Agentes executados:', result.metadata.successfulAgents + '/' + result.metadata.agentCount);
    console.log('   - Custo estimado: $' + result.totalUsage.estimatedCost.toFixed(4));
    console.log('🤖 ========================================\n');

    // Retornar em formato compatível com o código existente
    return {
      analysis: {
        charts: result.charts,
        technical_stats: result.technical_stats,
        summary: result.summary
      },
      usage: {
        modelName: `multi-agents (${result.metadata.orchestrator})`,
        promptTokens: result.totalUsage.gemini.promptTokens + result.totalUsage.gpt.prompt_tokens,
        completionTokens: result.totalUsage.gemini.completionTokens + result.totalUsage.gpt.completion_tokens,
        totalTokens: result.totalUsage.totalTokens
      },
      // Metadados adicionais do sistema multi-agentes
      metadata: result.metadata,
      totalUsage: result.totalUsage,
      agentResults: result.agentResults // Para debug
    };
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ ERRO NO SISTEMA MULTI-AGENTES');
    console.error('❌ ========================================');
    console.error('❌ Tipo:', error.constructor.name);
    console.error('❌ Mensagem:', error.message);
    if (error.stack) {
      console.error('❌ Stack trace:');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
    console.error('❌ ========================================\n');
    throw error;
  }
}

// ====================================
// CONSOLIDAÇÃO DE ANÁLISES
// ====================================

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
  const allLabels = {}; // { chartTitle: { label: [values] } }
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
  
  // Se há múltiplos summaries, marcar para consolidação via IA
  if (uniqueSummaries.length > 1) {
    consolidated.summariesToConsolidate = uniqueSummaries;
    consolidated.summary = uniqueSummaries.join(' '); // Fallback
  } else {
    consolidated.summary = uniqueSummaries.length > 0 ? uniqueSummaries[0] : 'Resumo não disponível';
  }

  delete consolidated.summaries;

  return consolidated;
}

/**
 * Consolida múltiplos summaries de vídeos usando IA
 * @param {Array<string>} summaries - Array de summaries para consolidar
 * @param {string} athleteName - Nome do atleta
 * @param {string|null} customModel - Modelo customizado
 * @returns {Promise<string>} Summary consolidado
 */
async function consolidateSummariesWithAI(summaries, athleteName, customModel = null) {
  if (!summaries || summaries.length <= 1) {
    return summaries?.[0] || 'Resumo não disponível';
  }
  
  const modelToUse = customModel ? getModel(customModel) : model;
  
  if (!modelToUse) {
    // Fallback: concatenar
    return summaries.join(' ');
  }
  
  const prompt = getPrompt('consolidate-summaries', {
    SUMMARY_COUNT: summaries.length,
    ATHLETE_NAME: athleteName,
    SUMMARIES: summaries.map((s, i) => `[Vídeo ${i + 1}]: ${s}`).join('\n\n')
  });

  try {
    const result = await modelToUse.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('❌ Erro ao consolidar summaries com IA:', error.message);
    return summaries.join(' '); // Fallback
  }
}

// ====================================
// ESTRATÉGIA TÁTICA
// ====================================

/**
 * Formata technical_stats para exibição legível (omitindo zeros)
 * @param {Object} stats - Estatísticas técnicas
 * @param {string} name - Nome do lutador
 * @returns {string} Texto formatado
 */
function formatTechnicalStats(stats, name) {
  if (!stats) return `${name}: Dados técnicos não disponíveis ainda.`;
  
  const sections = [];
  
  // Raspagens (só se tiver dados)
  if (stats.sweeps?.quantidade_total > 0) {
    let section = `RASPAGENS:\n`;
    section += `  • Total: ${stats.sweeps.quantidade_total} raspagens\n`;
    section += `  • Média por luta: ${stats.sweeps.quantidade_media}\n`;
    if (stats.sweeps.efetividade_percentual_media > 0) {
      section += `  • Efetividade: ${stats.sweeps.efetividade_percentual_media}%`;
    }
    sections.push(section);
  }
  
  // Passagens (só se tiver dados)
  if (stats.guard_passes?.quantidade_total > 0) {
    let section = `PASSAGENS DE GUARDA:\n`;
    section += `  • Total: ${stats.guard_passes.quantidade_total} passagens\n`;
    section += `  • Média por luta: ${stats.guard_passes.quantidade_media}`;
    sections.push(section);
  }
  
  // Finalizações (só se tiver dados)
  if (stats.submissions?.tentativas_total > 0) {
    let section = `FINALIZAÇÕES:\n`;
    section += `  • Tentativas: ${stats.submissions.tentativas_total}`;
    if (stats.submissions.ajustadas_total > 0) {
      section += ` (${stats.submissions.ajustadas_total} ajustadas)`;
    }
    if (stats.submissions.concluidas_total > 0) {
      section += `\n  • Concluídas: ${stats.submissions.concluidas_total} (${stats.submissions.taxa_sucesso_percentual}% sucesso)`;
    }
    if (stats.submissions.finalizacoes_mais_usadas?.length > 0) {
      section += `\n  • Preferidas: ${stats.submissions.finalizacoes_mais_usadas.map(f => `${f.tecnica} (${f.quantidade}x)`).join(', ')}`;
    }
    sections.push(section);
  }
  
  // Tomadas de costas (só se tiver dados)
  if (stats.back_takes?.quantidade_total > 0) {
    let section = `TOMADAS DE COSTAS:\n`;
    section += `  • Total: ${stats.back_takes.quantidade_total}\n`;
    section += `  • Média por luta: ${stats.back_takes.quantidade_media}`;
    if (stats.back_takes.percentual_com_finalizacao > 0) {
      section += `\n  • Finalizou após pegar: ${stats.back_takes.percentual_com_finalizacao}%`;
    }
    sections.push(section);
  }
  
  if (sections.length === 0) {
    return `${name}: Sem dados quantitativos significativos.`;
  }
  
  return `${name} - DADOS QUANTITATIVOS (${stats.total_analises} análise(s)):\n\n${sections.join('\n\n')}`;
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
  
  assertModelAvailable(modelToUse);

  const athleteStats = formatTechnicalStats(athleteData.technical_stats, athleteData.name);
  const opponentStats = formatTechnicalStats(opponentData.technical_stats, opponentData.name);

  const athleteBeltInfo = formatBeltRulesForStrategy(athleteData.belt);
  const opponentBeltInfo = formatBeltRulesForStrategy(opponentData.belt);
  
  // Determinar a faixa mais restritiva (para estratégia segura)
  const athleteLevel = getBeltLevel(athleteData.belt);
  const opponentLevel = getBeltLevel(opponentData.belt);
  const restrictiveBelt = athleteLevel <= opponentLevel ? athleteData.belt : opponentData.belt;
  
  let beltWarning = '';
  if (restrictiveBelt && getBeltLevel(restrictiveBelt) < 5) {
    beltWarning = `\n\n🚨 ATENÇÃO - REGRAS DA COMPETIÇÃO:
A faixa mais restritiva é ${restrictiveBelt?.toUpperCase()}. 
NÃO SUGIRA técnicas ilegais para essa faixa (leg locks proibidos, etc).
Se sugerir leg lock, verifique se é permitido para a faixa.`;
  }

  const prompt = getPrompt('tactical-strategy', {
    BELT_WARNING: beltWarning,
    ATHLETE_NAME: athleteData.name,
    ATHLETE_BELT_INFO: athleteBeltInfo,
    ATHLETE_STATS: athleteStats,
    ATHLETE_RESUMO: athleteData.resumo,
    OPPONENT_NAME: opponentData.name,
    OPPONENT_BELT_INFO: opponentBeltInfo,
    OPPONENT_STATS: opponentStats,
    OPPONENT_RESUMO: opponentData.resumo
  });

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
    throw parseGeminiError(error);
  }
}

/**
 * Gera estratégia tática usando sistema multi-agentes (Scout + Gameplan + Rules + GPT-4)
 * @param {Object} athleteData  - { name, belt, resumo, technical_stats }
 * @param {Object} opponentData - { name, belt, resumo, technical_stats }
 * @returns {Promise<Object>} { strategy, usage, metadata }
 */
async function generateTacticalStrategyWithAgents(athleteData, opponentData) {
  const { StrategyOrchestrator } = require('./agents/strategy');

  // Pré-processa dados na camada de serviço (formatTechnicalStats e getBeltLevel disponíveis aqui)
  const athleteLevel = getBeltLevel(athleteData.belt);
  const opponentLevel = getBeltLevel(opponentData.belt);
  const restrictiveBelt = athleteLevel <= opponentLevel ? athleteData.belt : opponentData.belt;

  const enrichedAthlete = {
    ...athleteData,
    statsText: formatTechnicalStats(athleteData.technical_stats, athleteData.name),
  };
  const enrichedOpponent = {
    ...opponentData,
    statsText: formatTechnicalStats(opponentData.technical_stats, opponentData.name),
  };

  const orchestrator = new StrategyOrchestrator(ai, process.env.OPENAI_API_KEY);
  const result = await orchestrator.orchestrate(enrichedAthlete, enrichedOpponent, restrictiveBelt);

  return {
    strategy: result.strategy,
    usage: {
      modelName: `multi-agents-strategy (${result.metadata.orchestrator})`,
      promptTokens: result.totalUsage.gemini.promptTokens + (result.totalUsage.gpt.prompt_tokens || 0),
      completionTokens: result.totalUsage.gemini.completionTokens + (result.totalUsage.gpt.completion_tokens || 0),
      totalTokens: result.totalUsage.totalTokens,
    },
    metadata: result.metadata,
  };
}

// ====================================
// RESUMO DE ATLETA
// ====================================

/**
 * Gera resumo técnico profissional de um atleta usando IA
 * @param {Object} athleteData - Dados do atleta (name, analyses, attributes)
 * @param {string|null} customModel - Modelo customizado
 * @returns {Promise<Object>} Resumo e metadados de uso
 */
async function generateAthleteSummary(athleteData, customModel = null) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  assertModelAvailable(modelToUse);

  const { name, analyses, attributes } = athleteData;

  const prompt = getPrompt('athlete-summary', {
    ATHLETE_NAME: name,
    ANALYSES_COUNT: analyses?.length || 0,
    ATTRIBUTES: attributes 
      ? Object.entries(attributes).map(([key, value]) => `• ${key}: ${value}/100`).join('\n')
      : 'Nenhum atributo calculado ainda',
    ANALYSES_DATA: JSON.stringify(analyses || [], null, 2),
    MAX_WORDS: MAX_SUMMARY_WORDS
  });

  try {
    const result = await modelToUse.generateContent(prompt);
    const summary = result.response.text();
    
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
    throw parseGeminiError(error);
  }
}

// ====================================
// CHAT
// ====================================

/**
 * Constrói o system prompt para o chat baseado no contexto
 * @param {string} contextType - 'analysis', 'profile' ou 'strategy'
 * @param {Object} contextData - Dados do contexto
 * @returns {string} System prompt formatado
 */
function buildChatSystemPrompt(contextType, contextData) {
  if (contextType === 'analysis') {
    return getPrompt('chat-analysis', {
      ATHLETE_NAME: contextData.athleteName || 'Não informado',
      PERSON_TYPE: contextData.personType === 'athlete' ? 'Atleta' : 'Adversário',
      CREATED_AT: contextData.createdAt || 'Não informada',
      SUMMARY: contextData.summary || 'Sem resumo disponível',
      TECHNICAL_STATS: JSON.stringify(contextData.technical_stats || {}, null, 2),
      CHARTS: JSON.stringify(contextData.charts || [], null, 2)
    });
  }

  if (contextType === 'profile') {
    return getPrompt('chat-profile', {
      PERSON_NAME: contextData.personName || 'Não informado',
      PERSON_TYPE: contextData.personType === 'athlete' ? 'Atleta' : 'Adversário',
      CURRENT_SUMMARY: contextData.currentSummary || 'Sem resumo disponível'
    });
  }

  if (contextType === 'strategy') {
    const strategyData = contextData.strategy?.strategy || contextData.strategy || {};
    
    return getPrompt('chat-strategy', {
      ATHLETE_NAME: contextData.athleteName || 'Não informado',
      OPPONENT_NAME: contextData.opponentName || 'Não informado',
      TESE_DA_VITORIA: strategyData.resumo_rapido?.como_vencer || strategyData.tese_da_vitoria || 'Não definida',
      ANALISE_DE_MATCHUP: JSON.stringify(strategyData.analise_de_matchup || {}, null, 2),
      PLANO_TATICO_FASEADO: JSON.stringify(strategyData.plano_tatico_faseado || {}, null, 2),
      CRONOLOGIA_INTELIGENTE: JSON.stringify(strategyData.cronologia_inteligente || {}, null, 2),
      CHECKLIST_TATICO: JSON.stringify(strategyData.checklist_tatico || {}, null, 2)
    });
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
    // Tentar encontrar JSON solto no formato esperado
    const jsonMatch = responseText.match(/\{[\s\S]*?"field"[\s\S]*?"newValue"[\s\S]*?"reason"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.field && parsed.newValue) {
          return parsed;
        }
      } catch (e) {
        // Silently fail
      }
    }
    return null;
  }

  try {
    let jsonStr = suggestionMatch[1].trim();
    
    // Remover marcadores de código markdown (```json ... ```)
    jsonStr = jsonStr
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const parsed = JSON.parse(jsonStr);
    
    // Fallback: aceitar formatos antigos
    if (!parsed.newValue) {
      if (parsed.data) {
        parsed.newValue = parsed.data;
        delete parsed.data;
      } else if (parsed.newSummary) {
        parsed.newValue = parsed.newSummary;
        delete parsed.newSummary;
      }
    }
    
    // Se newValue é um objeto com "content", extrair apenas o content
    if (parsed.newValue && typeof parsed.newValue === 'object') {
      if (parsed.newValue.content) {
        parsed.newValue = parsed.newValue.content;
      } else if (parsed.newValue.section && parsed.newValue.content) {
        parsed.newValue = parsed.newValue.content;
      }
    }
    
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
 * @param {Object} editSuggestion - Sugestão extraída (para fallback)
 * @returns {string} Texto limpo
 */
function cleanResponseText(text, editSuggestion = null) {
  if (!text) {
    if (editSuggestion?.reason) {
      return `Sugestão de alteração: ${editSuggestion.reason}`;
    }
    return 'Preparei uma sugestão de alteração para você revisar.';
  }
  
  // Remove o bloco de sugestão
  let cleaned = text.replace(/---EDIT_SUGGESTION---[\s\S]*?---END_SUGGESTION---/g, '').trim();
  
  // Remove também blocos de código JSON que podem ter sobrado
  cleaned = cleaned
    .replace(/```json[\s\S]*?```/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .trim();
  
  // Se ficou vazio mas temos uma sugestão, usar o reason como mensagem
  if (!cleaned && editSuggestion?.reason) {
    cleaned = `Sugestão de alteração: ${editSuggestion.reason}`;
  }
  
  // Se ainda está vazio, mensagem padrão
  if (!cleaned) {
    cleaned = 'Preparei uma sugestão de alteração para você revisar.';
  }
  
  return cleaned;
}

/**
 * Inicia ou continua uma sessão de chat contextual com a IA
 * @param {Object} params - Parâmetros do chat
 * @param {string} params.contextType - 'analysis', 'profile' ou 'strategy'
 * @param {Object} params.contextData - Dados completos do contexto
 * @param {Array} params.history - Histórico de mensagens [{role: 'user'|'model', content: string}]
 * @param {string} params.userMessage - Nova mensagem do usuário
 * @param {string|null} params.customModel - Modelo customizado (opcional)
 * @returns {Promise<Object>} Resposta da IA + sugestões de edição + usage
 */
async function chat({ contextType, contextData, history = [], userMessage, customModel = null }) {
  const modelToUse = customModel ? getModel(customModel) : model;
  const modelName = customModel || DEFAULT_MODEL;
  
  assertModelAvailable(modelToUse);

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

  // Para estratégia, reinjetar o mapeamento de campos ao final do histórico.
  // Sem isso, após 2-3 trocas o modelo perde o contexto do mapeamento e
  // tende a reutilizar o último field sugerido (viés de recência).
  const messageToSend = contextType === 'strategy'
    ? `${userMessage}\n\n[LEMBRETE INTERNO — NÃO EXIBIR AO USUÁRIO: Use os campos corretos conforme o pedido: "como vencer"/"tese"/"resumo" → como_vencer | "matchup"/"análise"/"assimetria" → analise_de_matchup | "plano"/"fases"/"faseado"/"tático"/"cronograma" → plano_tatico_faseado | "cronologia"/"linha do tempo"/"sequência de tempo" → cronologia_inteligente | "checklist"/"lista"/"pontos" → checklist_tatico. Identifique o campo pelo PEDIDO ATUAL, não pelo histórico recente.]`
    : userMessage;

  try {
    // Iniciar chat com histórico
    const chatSession = modelToUse.startChat({
      history: geminiHistory,
    });

    // Enviar nova mensagem
    const result = await chatSession.sendMessage(messageToSend);
    const responseText = result.response.text();

    // Extrair sugestão de edição (se houver)
    const editSuggestion = extractEditSuggestion(responseText);
    
    // Limpar texto para exibição (passa a sugestão para fallback)
    const cleanMessage = cleanResponseText(responseText, editSuggestion);

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
    throw parseGeminiError(error);
  }
}

// ====================================
// EXPORTS
// ====================================

module.exports = { 
  // Análise de vídeo
  analyzeFrame,
  analyzeFrameWithAgents, // Nova função multi-agentes
  
  // Consolidação
  consolidateAnalyses, 
  consolidateSummariesWithAI,
  
  // Estratégia e resumo
  generateTacticalStrategy,
  generateTacticalStrategyWithAgents,
  generateAthleteSummary,
  
  // Chat
  chat,
  buildChatSystemPrompt,
  extractEditSuggestion,
  
  // Utilitários
  getModel,
  formatTechnicalStats,
  formatBeltRulesForStrategy,
  getBeltLevel,
  getBeltRulesText // Necessário para o sistema multi-agentes
};
