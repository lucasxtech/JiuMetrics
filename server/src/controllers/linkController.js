const { analyzeFrame, consolidateAnalyses, consolidateSummariesWithAI } = require('../services/geminiService');
const FightAnalysis = require('../models/FightAnalysis');
const ApiUsage = require('../models/ApiUsage');

function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/watch')) {
        return u.searchParams.get('v');
      }
      if (u.pathname.startsWith('/shorts/')) {
        return u.pathname.split('/')[2];
      }
    }
    if (u.hostname.includes('youtu.be')) {
      return u.pathname.replace('/', '');
    }
    return null;
  } catch (_) {
    return null;
  }
}

exports.analyzeLink = async (req, res) => {
  try {
    const { videos, athleteName, personId, personType, model, matchResult, belt } = req.body || {};
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!videos || !Array.isArray(videos) || videos.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Array de vídeos é obrigatório (mínimo 1 vídeo)' 
      });
    }

    // Log do modelo selecionado
    if (model) {
      console.log(`🤖 Modelo selecionado pelo usuário: ${model}`);
    }

    // Log do resultado da luta se fornecido
    if (matchResult) {
      console.log(`📊 Resultado da luta: ${matchResult}`);
    }

    console.log(`🎬 Iniciando análise de ${videos.length} vídeo(s)...`);

    // Validar URLs e extrair IDs
    const videoData = [];
    for (let i = 0; i < videos.length; i++) {
      const { url, giColor } = videos[i];
      
      if (!url) {
        return res.status(400).json({ 
          success: false, 
          error: `URL do vídeo ${i + 1} está vazia` 
        });
      }

      const videoId = extractYouTubeId(url);
      if (!videoId) {
        return res.status(400).json({ 
          success: false, 
          error: `Vídeo ${i + 1}: Apenas links do YouTube são suportados nesta versão` 
        });
      }

      videoData.push({
        url,
        giColor: giColor?.trim() || 'preto',
        videoId,
      });
    }

    // Criar contexto com informações do atleta e vídeos
    const frameContext = {
      athleteName: athleteName?.trim(),
      videos: videoData,
      matchResult: matchResult?.trim(),
    };

    console.log('📊 Contexto da análise:', frameContext);

    // Analisar cada vídeo separadamente
    console.log(`🔬 Analisando ${videoData.length} vídeo(s) individualmente...`);
    const analyses = [];
    const usageRecords = [];
    
    for (let i = 0; i < videoData.length; i++) {
      const video = videoData[i];
      console.log(`\n📹 Vídeo ${i + 1}/${videoData.length}: ${video.url}`);
      
      try {
        const result = await analyzeFrame(video.url, {
          athleteName: athleteName?.trim(),
          giColor: video.giColor,
          videos: [video], // Passa apenas este vídeo para o prompt
          matchResult: matchResult?.trim(), // Adiciona resultado da luta
          belt: belt?.trim() // Adiciona faixa do atleta
        }, model); // Passa o modelo selecionado
        
        analyses.push(result.analysis);
        usageRecords.push(result.usage);
        console.log(`✅ Vídeo ${i + 1} analisado com sucesso`);
      } catch (error) {
        console.error(`❌ Erro ao analisar vídeo ${i + 1}:`, error.message);
        // Continua com os próximos vídeos mesmo se um falhar
      }
    }
    
    if (analyses.length === 0) {
      return res.status(500).json({ 
        success: false, 
        error: 'Nenhum vídeo foi analisado com sucesso' 
      });
    }
    
    console.log(`\n📊 Consolidando ${analyses.length} análise(s)...`);
    let consolidated = consolidateAnalyses(analyses);
    
    // Se há múltiplos summaries, consolidar via IA
    if (consolidated.summariesToConsolidate && consolidated.summariesToConsolidate.length > 1) {
      console.log(`🤖 Consolidando ${consolidated.summariesToConsolidate.length} summaries via IA...`);
      try {
        const consolidatedSummary = await consolidateSummariesWithAI(
          consolidated.summariesToConsolidate,
          athleteName,
          model
        );
        consolidated.summary = consolidatedSummary;
        delete consolidated.summariesToConsolidate;
        console.log('✅ Summaries consolidados com sucesso via IA');
      } catch (aiError) {
        console.error('⚠️ Erro ao consolidar via IA, usando fallback:', aiError.message);
        // Fallback já está definido em consolidated.summary
        delete consolidated.summariesToConsolidate;
      }
    }
    
    // Salvar uso da API
    if (req.user?.id && usageRecords.length > 0) {
      const totalUsage = usageRecords.reduce((acc, usage) => ({
        promptTokens: acc.promptTokens + usage.promptTokens,
        completionTokens: acc.completionTokens + usage.completionTokens,
        totalTokens: acc.totalTokens + usage.totalTokens
      }), { promptTokens: 0, completionTokens: 0, totalTokens: 0 });
      
      await ApiUsage.logUsage({
        userId: req.user.id,
        modelName: usageRecords[0].modelName,
        operationType: 'video_analysis',
        promptTokens: totalUsage.promptTokens,
        completionTokens: totalUsage.completionTokens,
        accessToken,
        metadata: {
          videosCount: videoData.length,
          athleteName,
          personType
        }
      });
    }
    
    // Salvar análise se personId for fornecido
    if (personId && personType) {
      try {
        console.log('💾 Salvando análise com userId:', req.userId);
        await FightAnalysis.create({
          personId,
          personType,
          videoUrl: videoData.map(v => v.url).join(', '),
          charts: consolidated.charts || {},
          summary: consolidated.summary || '',
          technicalProfile: consolidated.technicalProfile || '',
          framesAnalyzed: videos.length,
          userId: req.userId, // ⚠️ CRÍTICO: Adicionar userId
        });
        console.log(`✅ Análise salva com sucesso para ${personType} ${personId}`);
      } catch (saveError) {
        console.error('❌ Erro ao salvar análise:', saveError);
        // Não retornar erro, apenas logar
      }
    }
    
    console.log('✅ Análise concluída com sucesso!\n');
    
    return res.json({ 
      success: true, 
      data: {
        ...consolidated,
        videosAnalyzed: videos.length,
      }
    });
  } catch (err) {
    console.error('❌ analyzeLink error:', err);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao analisar vídeos',
      details: err.message,
    });
  }
};

module.exports = exports;