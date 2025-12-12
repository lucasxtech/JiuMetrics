const { analyzeFrame, consolidateAnalyses } = require('../services/geminiService');
const FightAnalysis = require('../models/FightAnalysis');

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
    const { videos, athleteName, personId, personType, model } = req.body || {};
    
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
    };

    console.log('📊 Contexto da análise:', frameContext);

    // Analisar cada vídeo separadamente
    console.log(`🔬 Analisando ${videoData.length} vídeo(s) individualmente...`);
    const analyses = [];
    
    for (let i = 0; i < videoData.length; i++) {
      const video = videoData[i];
      console.log(`\n📹 Vídeo ${i + 1}/${videoData.length}: ${video.url}`);
      
      try {
        const result = await analyzeFrame(video.url, {
          athleteName: athleteName?.trim(),
          giColor: video.giColor,
          videos: [video] // Passa apenas este vídeo para o prompt
        }, model); // Passa o modelo selecionado
        analyses.push(result);
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
    const consolidated = consolidateAnalyses(analyses);
    
    // Salvar análise se personId for fornecido
    if (personId && personType) {
      try {
        await FightAnalysis.create({
          personId,
          personType,
          videoUrl: videoData.map(v => v.url).join(', '),
          charts: consolidated.charts || {},
          summary: consolidated.summary || '',
          technicalProfile: consolidated.technicalProfile || '',
          framesAnalyzed: videos.length,
        });
        console.log(`💾 Análise salva para ${personType} ${personId}`);
      } catch (saveError) {
        console.error('Erro ao salvar análise:', saveError);
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