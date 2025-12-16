// Script de teste para verificar se a tabela tactical_analyses existe
const { supabase } = require('./src/config/supabase');

async function testTable() {
  console.log('🔍 Testando tabela tactical_analyses...\n');

  try {
    // Tentar fazer uma query simples
    const { data, error, count } = await supabase
      .from('tactical_analyses')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ ERRO ao acessar tabela:');
      console.error('Código:', error.code);
      console.error('Mensagem:', error.message);
      console.error('Detalhes:', error.details);
      console.error('\n⚠️ A tabela tactical_analyses NÃO EXISTE no Supabase!');
      console.error('\n📋 AÇÃO NECESSÁRIA:');
      console.error('1. Acesse: https://app.supabase.com');
      console.error('2. Selecione seu projeto JiuMetrics');
      console.error('3. Vá em SQL Editor');
      console.error('4. Execute o arquivo: server/supabase-tactical-analyses.sql');
      return;
    }

    console.log('✅ Tabela tactical_analyses existe!');
    console.log('📊 Total de registros:', count);
    
    if (data && data.length > 0) {
      console.log('\n📄 Exemplo de registro:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('\n📭 Ainda não há análises salvas (tabela vazia)');
    }

    console.log('\n✅ Tudo pronto! A funcionalidade de histórico está funcionando.');

  } catch (err) {
    console.error('❌ Erro inesperado:', err.message);
  }

  process.exit(0);
}

testTable();
