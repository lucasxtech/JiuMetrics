const dotenv = require('dotenv');
dotenv.config();

async function checkLastAnalysis() {
  console.log('🔍 Verificando última análise...\n');
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase
      .from('fight_analyses')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('❌ Erro ao buscar análise:', error.message);
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('⚠️  Nenhuma análise encontrada no banco de dados');
      return;
    }
    
    console.log(`📊 Últimas ${data.length} análises:\n`);
    
    data.forEach((analysis, index) => {
      console.log(`${index + 1}. Análise #${analysis.id}`);
      console.log(`   Criada em: ${new Date(analysis.created_at).toLocaleString('pt-BR')}`);
      console.log(`   Atleta ID: ${analysis.athlete_id}`);
      
      // Verificar se tem metadata
      if (analysis.charts_data) {
        const charts = JSON.parse(analysis.charts_data);
        console.log(`   ✅ Charts: ${charts.length || 0} gráficos`);
      } else {
        console.log(`   ⚠️  Sem charts_data`);
      }
      
      if (analysis.technical_summary) {
        console.log(`   ✅ Summary: ${analysis.technical_summary.length} caracteres`);
        const preview = analysis.technical_summary.substring(0, 150).replace(/\n/g, ' ');
        console.log(`   Preview: "${preview}..."`);
      } else {
        console.log(`   ⚠️  Sem technical_summary`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
}

checkLastAnalysis().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
