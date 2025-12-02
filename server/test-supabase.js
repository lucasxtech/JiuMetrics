// Script de teste de conexão com Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testando conexão Supabase...\n');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('URL:', supabaseUrl);
console.log('Key (primeiros 20 chars):', supabaseKey?.substring(0, 20) + '...');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('📡 Tentando buscar atletas...');
    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro:', error.message);
      console.error('Código:', error.code);
      console.error('Detalhes:', error.details);
      console.error('Hint:', error.hint);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n💡 SOLUÇÃO:');
        console.log('1. Acesse: https://supabase.com/dashboard/project/ikjudbypwfvdywlgzsjr/settings/api');
        console.log('2. Copie a chave "anon public" (não a "service_role")');
        console.log('3. Substitua no arquivo server/.env a variável SUPABASE_ANON_KEY');
        console.log('4. Reinicie o servidor');
      }
    } else {
      console.log('✅ Conexão bem-sucedida!');
      console.log('Dados encontrados:', data?.length || 0, 'registro(s)');
    }
  } catch (err) {
    console.error('❌ Erro inesperado:', err);
  }
}

testConnection();
