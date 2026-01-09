/**
 * Converte dados do Supabase (snake_case) para formato da aplicação (camelCase)
 */
function parseAthleteFromDB(dbAthlete) {
  if (!dbAthlete) return null;
  
  return {
    id: dbAthlete.id,
    name: dbAthlete.name,
    belt: dbAthlete.belt,
    weight: dbAthlete.weight,
    height: dbAthlete.height,
    age: dbAthlete.age,
    style: dbAthlete.style,
    strongAttacks: dbAthlete.strong_attacks,
    weaknesses: dbAthlete.weaknesses,
    videoUrl: dbAthlete.video_url,
    cardio: dbAthlete.cardio,
    technicalProfile: dbAthlete.technical_profile || {},
    technicalSummary: dbAthlete.technical_summary || null,
    technicalSummaryUpdatedAt: dbAthlete.technical_summary_updated_at || null,
    analysesCount: dbAthlete.analyses_count || 0,
    createdAt: dbAthlete.created_at,
    updatedAt: dbAthlete.updated_at,
  };
}

/**
 * Converte múltiplos registros
 */
function parseAthletesFromDB(dbAthletes) {
  if (!Array.isArray(dbAthletes)) return [];
  return dbAthletes.map(parseAthleteFromDB);
}

/**
 * Converte análise do banco para formato da aplicação
 */
function parseAnalysisFromDB(dbAnalysis) {
  if (!dbAnalysis) return null;
  
  return {
    id: dbAnalysis.id,
    personId: dbAnalysis.person_id,
    personType: dbAnalysis.person_type,
    videoUrl: dbAnalysis.video_url,
    charts: dbAnalysis.charts || [],
    summary: dbAnalysis.summary,
    technicalProfile: dbAnalysis.technical_profile,
    technicalStats: dbAnalysis.technical_stats || null,
    framesAnalyzed: dbAnalysis.frames_analyzed,
    currentVersion: dbAnalysis.current_version || 1,
    isEdited: dbAnalysis.is_edited || false,
    originalSummary: dbAnalysis.original_summary,
    originalCharts: dbAnalysis.original_charts,
    createdAt: dbAnalysis.created_at,
    updatedAt: dbAnalysis.updated_at,
  };
}

function parseAnalysesFromDB(dbAnalyses) {
  if (!Array.isArray(dbAnalyses)) return [];
  return dbAnalyses.map(parseAnalysisFromDB);
}

module.exports = {
  parseAthleteFromDB,
  parseAthletesFromDB,
  parseAnalysisFromDB,
  parseAnalysesFromDB,
};
