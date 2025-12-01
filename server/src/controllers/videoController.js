const path = require('path');
const fs = require('fs');
const { extractFrames } = require('../services/ffmpegService');
const { frameToBase64 } = require('../utils/imageUtils');
const { analyzeFrame, consolidateAnalyses } = require('../services/geminiService');
const { generateQuickChartUrl } = require('../utils/chartUtils');

/**
 * POST /api/video/upload - Processa vídeo enviado
 * Query params opcionais: personId, personType (para salvar análise automaticamente)
 */
exports.uploadAndAnalyzeVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo enviado',
      });
    }

    const videoPath = req.file.path;
    const videoName = req.file.filename;
    
    // Parâmetros opcionais para salvar análise
    const { personId, personType } = req.body;

    console.log(`\n🎬 Iniciando processamento do vídeo: ${videoName}`);
    console.log('1️⃣ Extraindo frames...');

    // Extrair frames
    const frames = await extractFrames(videoPath, 8);

    if (frames.length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao extrair frames do vídeo',
      });
    }

    console.log(`2️⃣ Convertendo ${frames.length} frames para base64...`);

    // Converter frames para base64
    const frameDataArray = [];
    for (const framePath of frames) {
      try {
        const base64Data = frameToBase64(framePath);
        frameDataArray.push(base64Data);
      } catch (error) {
        console.error(`Erro ao converter frame ${framePath}:`, error.message);
      }
    }

    console.log(`3️⃣ Enviando frames para análise com Gemini Vision...`);

    // Analisar cada frame com Gemini
    const frameAnalyses = [];
    for (let i = 0; i < frameDataArray.length; i++) {
      try {
        console.log(`   📸 Analisando frame ${i + 1}/${frameDataArray.length}...`);
        const analysis = await analyzeFrame(frameDataArray[i]);
        frameAnalyses.push(analysis);
      } catch (error) {
        console.error(`Erro ao analisar frame ${i + 1}:`, error.message);
      }
    }

    console.log(`4️⃣ Consolidando análises...`);

    // Consolidar todas as análises
    const consolidatedAnalysis = consolidateAnalyses(frameAnalyses);

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

    // Limpar frames após análise
    const frameDir = path.join(path.dirname(videoPath), 'frames');
    try {
      fs.rmSync(frameDir, { recursive: true, force: true });
      console.log('✅ Frames temporários removidos');
    } catch (err) {
      console.warn('Aviso ao limpar frames:', err.message);
    }

    console.log('✅ Análise completa!\n');

    // Se personId foi fornecido, salvar análise automaticamente
    let savedAnalysis = null;
    if (personId && personType) {
      const FightAnalysis = require('../models/FightAnalysis');
      const Athlete = require('../models/Athlete');
      const Opponent = require('../models/Opponent');
      
      try {
        // Extrair perfil técnico dos charts
        const technicalProfile = extractTechnicalProfile(consolidatedAnalysis.charts);
        
        // Criar análise
        savedAnalysis = FightAnalysis.create({
          personId,
          personType,
          videoName,
          videoUrl: '', // Upload local
          charts: consolidatedAnalysis.charts,
          summary: consolidatedAnalysis.summary,
          technicalProfile,
          framesAnalyzed: frameAnalyses.length,
        });
        
        // Atualizar perfil técnico
        if (personType === 'athlete') {
          Athlete.updateTechnicalProfile(personId, technicalProfile);
        } else if (personType === 'opponent') {
          Opponent.updateTechnicalProfile(personId, technicalProfile);
        }
        
        console.log(`💾 Análise salva e perfil técnico atualizado para ${personType} ${personId}`);
      } catch (saveError) {
        console.error('⚠️ Erro ao salvar análise:', saveError.message);
      }
    }

    // Retornar resultado
    res.json({
      success: true,
      message: 'Vídeo analisado com sucesso',
      data: {
        videoName,
        charts: consolidatedAnalysis.charts,
        summary: consolidatedAnalysis.summary,
        chartUrls: chartUrls,
        framesAnalyzed: frameAnalyses.length,
        generatedAt: consolidatedAnalysis.generatedAt,
        savedAnalysis: savedAnalysis ? { id: savedAnalysis.id } : null,
      },
    });
  } catch (error) {
    console.error('❌ Erro ao processar vídeo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar vídeo',
      details: error.message,
    });
  }
};

/**
 * Extrai perfil técnico dos dados de gráficos
 */
function extractTechnicalProfile(charts) {
  if (!charts || !Array.isArray(charts)) {
    return {};
  }

  const profile = {};

  charts.forEach((chart) => {
    const title = chart.title;
    const data = chart.data;

    if (!data || !Array.isArray(data)) return;

    const values = {};
    data.forEach((item) => {
      values[item.label] = item.value;
    });

    if (title.includes('Personalidade')) {
      profile.personality = values;
    } else if (title.includes('Comportamento Inicial')) {
      profile.initialBehavior = values;
    } else if (title.includes('Jogo de Guarda')) {
      profile.guardGame = values;
    } else if (title.includes('Jogo de Passagem')) {
      profile.passingGame = values;
    }
  });

  return profile;
}
