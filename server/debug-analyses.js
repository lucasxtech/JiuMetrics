// Script para debugar análises no Supabase
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY não configurados');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugAnalyses() {
  console.log('🔍 Iniciando debug de análises...\n');

  // 1. Buscar todas as análises
  console.log('1️⃣ Buscando TODAS as análises:');
  const { data: allAnalyses, error: error1 } = await supabase
    .from('fight_analyses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error1) {
    console.error('❌ Erro:', error1);
  } else {
    console.log(`   Total: ${allAnalyses.length} análises`);
    console.log(`   Com user_id: ${allAnalyses.filter(a => a.user_id).length}`);
    console.log(`   Sem user_id: ${allAnalyses.filter(a => !a.user_id).length}\n`);
  }

  // 2. Buscar adversários
  console.log('2️⃣ Buscando adversários:');
  const { data: opponents, error: error2 } = await supabase
    .from('opponents')
    .select('id, name, user_id')
    .order('created_at', { ascending: false });

  if (error2) {
    console.error('❌ Erro:', error2);
  } else {
    console.log(`   Total: ${opponents.length} adversários`);
    opponents.forEach(o => {
      console.log(`   - ${o.name} (ID: ${o.id}, UserID: ${o.user_id || 'NULL'})`);
    });
    console.log();
  }

  // 3. Buscar Pablo Oliveira especificamente
  console.log('3️⃣ Buscando Pablo Oliveira:');
  const { data: pablo, error: error3 } = await supabase
    .from('opponents')
    .select('*')
    .ilike('name', '%pablo%oliveira%');

  if (error3) {
    console.error('❌ Erro:', error3);
  } else if (pablo && pablo.length > 0) {
    console.log(`   ✅ Encontrado: ${pablo[0].name} (ID: ${pablo[0].id})`);
    console.log(`   UserID: ${pablo[0].user_id || 'NULL'}\n`);

    // 4. Buscar análises do Pablo
    console.log('4️⃣ Buscando análises do Pablo Oliveira:');
    const { data: pabloAnalyses, error: error4 } = await supabase
      .from('fight_analyses')
      .select('*')
      .eq('person_id', pablo[0].id);

    if (error4) {
      console.error('❌ Erro:', error4);
    } else {
      console.log(`   Total: ${pabloAnalyses.length} análises`);
      pabloAnalyses.forEach((a, i) => {
        console.log(`   Análise ${i + 1}:`);
        console.log(`     ID: ${a.id}`);
        console.log(`     UserID: ${a.user_id || 'NULL'}`);
        console.log(`     Criada em: ${new Date(a.created_at).toLocaleString('pt-BR')}`);
        console.log(`     Resumo: ${a.summary ? a.summary.substring(0, 60) + '...' : 'N/A'}\n`);
      });
    }
  } else {
    console.log('   ❌ Pablo Oliveira não encontrado\n');
  }

  // 5. Mostrar user_ids únicos nas análises
  if (allAnalyses && allAnalyses.length > 0) {
    console.log('5️⃣ User IDs únicos nas análises:');
    const userIds = [...new Set(allAnalyses.map(a => a.user_id).filter(Boolean))];
    userIds.forEach(uid => {
      const count = allAnalyses.filter(a => a.user_id === uid).length;
      console.log(`   - ${uid}: ${count} análises`);
    });
    console.log();
  }

  console.log('✅ Debug concluído!');
}

debugAnalyses().catch(console.error);
