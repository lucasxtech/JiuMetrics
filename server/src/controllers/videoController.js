const { getScopeIds } = require('../utils/tenantScope');
const path = require('path');
const fs = require('fs');
const { extractFrames } = require('../services/ffmpegService');
const { frameToBase64 } = require('../utils/imageUtils');
const { analyzeFrame, consolidateAnalyses } = require('../services/geminiService');
const { generateQuickChartUrl } = require('../utils/chartUtils');
const { extractTechnicalProfile } = require('../utils/profileUtils');
const FightAnalysis = require('../models/FightAnalysis');
const ApiUsage = require('../models/ApiUsage');
const StrategyService = require('../services/strategyService');
const Athlete = require('../models/Athlete');
const Opponent = require('../models/Opponent');
const User = require('../models/User');

/**
 * POST /api/video/upload - Processa múltiplos vídeos enviados
 * Query params opcionais: personId, personType (para salvar análise automaticamente)
 */
exports.uploadAndAnalyzeVideo = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado',
      });
    }

    const videos = req.files;
    const { personId, personType, athleteName, model, belt, matchResult } = req.body;
    
    // Log do modelo selecionado
    if (model) {
      console.log(`🤖 Modelo selecionado pelo usuário: ${model}`);
    }
    
    // Obter cores de kimono do body (formato: giColors[0], giColors[1], etc)
    const giColors = [];
    for (let i = 0; i < videos.length; i++) {
      giColors.push(req.body[`giColors[${i}]`] || 'preto');
    }

    console.log(`\n🎬 Iniciando processamento de ${videos.length} vídeo(s)`);
    console.log(`👤 Atleta: ${athleteName}`);
    console.log(`🥋 Cores de kimono:`, giColors);

    const allFrameAnalyses = [];
    const usageRecords = [];
    const videoNames = [];

    // Processar cada vídeo
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const giColor = giColors[i];
      const videoPath = video.path;
      const videoName = video.filename;
      
      videoNames.push(videoName);

      console.log(`\n📹 Vídeo ${i + 1}/${videos.length}: ${videoName}`);
      console.log(`   🥋 Cor do kimono: ${giColor}`);
      console.log(`   1️⃣ Extraindo frames...`);

      // Extrair frames
      const frames = await extractFrames(videoPath, 8);

      if (frames.length === 0) {
        console.warn(`   ⚠️ Nenhum frame extraído do vídeo ${i + 1}`);
        continue;
      }

      console.log(`   2️⃣ Convertendo ${frames.length} frames para base64...`);

      // Converter frames para base64
      const frameDataArray = [];
      for (const framePath of frames) {
        try {
          const base64Data = frameToBase64(framePath);
          frameDataArray.push(base64Data);
        } catch (error) {
          console.error(`   ❌ Erro ao converter frame ${framePath}:`, error.message);
        }
      }

      console.log(`   3️⃣ Enviando frames para análise com Gemini Vision...`);
      
      // Sistema Multi-Agentes sempre ativo
      const useAgents = true;
      console.log(`      🤖 Modo: Sistema Multi-Agentes (3 agentes + GPT orquestrador)`);

      // Contexto específico para este vídeo
      const frameContext = {
        athleteName: athleteName?.trim(),
        giColor: giColor,
        videoNumber: i + 1,
        totalVideos: videos.length,
        belt: belt || 'Não especificada',
        matchResult: matchResult || 'Não especificado'
      };

      // Analisar cada frame com Gemini
      for (let j = 0; j < frameDataArray.length; j++) {
        try {
          console.log(`      📸 Analisando frame ${j + 1}/${frameDataArray.length} do vídeo ${i + 1}...`);
          // analyzeFrame aceita: (url, context, customModel, useAgents)
          // Como estamos passando base64, precisamos passá-lo como URL data URI
          const dataUri = `data:image/png;base64,${frameDataArray[j]}`;
          const result = await analyzeFrame(dataUri, frameContext, model, useAgents);
          allFrameAnalyses.push(result.analysis);
          usageRecords.push(result.usage);
          
          // Se multi-agentes, registrar informações adicionais
          if (useAgents && result.metadata) {
            console.log(`         ✓ Agentes: ${result.metadata.successfulAgents}/${result.metadata.agentCount}`);
            console.log(`         ✓ Custo: $${result.totalUsage.estimatedCost.toFixed(4)}`);
          }
        } catch (error) {
          console.error(`   ❌ Erro ao analisar frame ${j + 1}:`, error.message);
        }
      }

      // Limpar frames deste vídeo
      const frameDir = path.join(path.dirname(videoPath), 'frames');
      try {
        fs.rmSync(frameDir, { recursive: true, force: true });
        console.log(`   ✅ Frames temporários do vídeo ${i + 1} removidos`);
      } catch (err) {
        console.warn(`   ⚠️ Aviso ao limpar frames:`, err.message);
      }
    }

    if (allFrameAnalyses.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Não foi possível extrair e analisar frames de nenhum vídeo',
      });
    }

    console.log(`\n4️⃣ Consolidando ${allFrameAnalyses.length} análises de ${videos.length} vídeo(s)...`);

    // Consolidar todas as análises
    const consolidatedAnalysis = consolidateAnalyses(allFrameAnalyses);
    
    // Salvar uso da API
    if (req.userId && usageRecords.length > 0) {
      const totalUsage = usageRecords.reduce((acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens
      }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      
      await ApiUsage.logUsage({
        userId: req.userId,
        modelName: usageRecords[0].modelName,
        operationType: 'video_analysis',
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        metadata: {
          videosCount: videos.length,
          framesAnalyzed: allFrameAnalyses.length,
          athleteName,
          personType,
          analysisMode: 'multi_agents',
          ...(usageRecords[0].metadata ? {
            orchestrator: usageRecords[0].metadata.orchestrator,
            agentsUsed: usageRecords[0].metadata.agentsUsed
          } : {})
        }
      });
    }

    console.log(`5️⃣ Gerando URLs dos gráficos...`);

    // Gerar URLs dos gráficos
    const chartUrls = [];
    if (consolidatedAnalysis.charts && Array.isArray(consolidatedAnalysis.charts)) {
      consolidatedAnalysis.charts.forEach((chart) => {
        const url = generateQuickChartUrl(chart);
        chartUrls.push({
          title: chart.title,
          url: url,
        });
      });
    }

    console.log('✅ Análise completa!\n');

    // Se personId foi fornecido, salvar análise automaticamente
    let savedAnalysis = null;
    if (personId && personType) {
      try {
        console.log('💾 Salvando análise com userId:', req.userId);
        // Criar análise
        savedAnalysis = await FightAnalysis.create({
          personId,
          personType,
          videoUrl: videoNames.join(', '), // Nome dos arquivos
          charts: consolidatedAnalysis.charts || {},
          summary: consolidatedAnalysis.summary || '',
          technicalProfile: consolidatedAnalysis.technicalProfile || '',
          framesAnalyzed: allFrameAnalyses.length,
          userId: req.userId, // ⚠️ CRÍTICO: Adicionar userId
        });
        
        console.log(`✅ Análise salva com sucesso para ${personType} ${personId}`);

        // Gera o resumo técnico sincronamente antes de responder,
        // assim o frontend sempre encontra o resumo atualizado ao navegar para o atleta
        try {
          const allowedUserIds = await getScopeIds(req, User);
          const consolidation = await StrategyService.consolidateAnalyses(personId, allowedUserIds, null);
          const updateData = {
            technicalSummary: consolidation.resumo,
            technicalSummaryUpdatedAt: new Date().toISOString()
          };
          if (personType === 'athlete') {
            const person = await Athlete.getById(personId, allowedUserIds);
            if (person) await Athlete.update(personId, updateData, person.userId);
          } else {
            const person = await Opponent.getById(personId, allowedUserIds);
            if (person) await Opponent.update(personId, updateData, person.userId);
          }
          console.log('✅ [auto] Resumo técnico atualizado —', personType, personId);
        } catch (summaryErr) {
          console.error('❌ [auto] Falha ao atualizar resumo técnico —', personType, personId, summaryErr.message);
        }
      } catch (saveError) {
        console.error('❌ Erro ao salvar análise:', saveError.message);
      }
    }

    // Retornar resultado
    res.json({
      success: true,
      message: `${videos.length} vídeo(s) analisado(s) com sucesso`,
      data: {
        videoNames: videoNames,
        videosCount: videos.length,
        charts: consolidatedAnalysis.charts,
        summary: consolidatedAnalysis.summary,
        chartUrls: chartUrls,
        framesAnalyzed: allFrameAnalyses.length,
        generatedAt: consolidatedAnalysis.generatedAt,
        savedAnalysis: savedAnalysis ? { id: savedAnalysis.id } : null,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao processar vídeos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar vídeos',
      details: error.message,
    });
  }
};

module.exports = exports;
