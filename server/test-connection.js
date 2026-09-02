#!/usr/bin/env node

/**
 * Script para testar conexão com o Supabase
 * Execute: node test-connection.js
 */

require('dotenv').config();
const { supabase } = require('./src/config/supabase');

async function testConnection() {
  console.log('\n🔍 Testando conexão com Supabase...\n');
  console.log('URL:', process.env.SUPABASE_URL);
  console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Configurada' : '❌ Não configurada');
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Teste 1: Verificar se o Supabase responde
    console.log('📡 Teste 1: Verificando resposta do Supabase...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (healthError && healthError.code === 'PGRST204') {
      console.log('✅ Supabase respondeu! (tabela users vazia ou não existe)\n');
    } else if (healthError) {
      throw healthError;
    } else {
      console.log('✅ Supabase respondeu! Conexão OK\n');
    }

    // Teste 2: Verificar tabelas existentes
    console.log('📋 Teste 2: Verificando tabelas no banco...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables')
      .catch(() => null);

    // Se não tiver a function, tenta listar users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!usersError || usersError.code === 'PGRST204') {
      console.log('✅ Tabela "users" existe!');
    } else if (usersError.code === '42P01') {
      console.log('❌ Tabela "users" NÃO existe!');
      console.log('⚠️  Você precisa rodar as migrações!\n');
      showMigrationInstructions();
      return;
    } else {
      console.log('⚠️  Erro ao verificar tabelas:', usersError.message);
    }

    // Teste 3: Verificar se existem usuários
    console.log('\n👥 Teste 3: Verificando usuários cadastrados...');
    const { data: users, error: usersListError } = await supabase
      .from('users')
      .select('id, email, name, created_at')
      .limit(5);

    if (usersListError) {
      throw usersListError;
    }

    if (users && users.length > 0) {
      console.log(`✅ ${users.length} usuário(s) encontrado(s):`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.name})`);
      });
    } else {
      console.log('⚠️  Nenhum usuário cadastrado ainda');
      console.log('   Use a rota /api/auth/register para criar um usuário');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ CONEXÃO OK! Tudo funcionando!\n');

  } catch (error) {
    console.error('\n❌ ERRO na conexão:', error.message);
    
    if (error.message.includes('fetch failed')) {
      console.log('\n⚠️  O Supabase não está acessível!');
      console.log('   Possíveis causas:');
      console.log('   1. Projeto ainda está sendo restaurado (aguarde alguns minutos)');
      console.log('   2. URL do Supabase incorreta no .env');
      console.log('   3. Problema de rede/internet');
      console.log('\n   Tente novamente em 1-2 minutos...\n');
    } else if (error.code === '42P01') {
      console.log('\n⚠️  Tabelas não existem no banco!');
      showMigrationInstructions();
    } else {
      console.log('\nDetalhes:', error);
    }
    
    process.exit(1);
  }
}

function showMigrationInstructions() {
  console.log('\n📚 COMO RODAR AS MIGRAÇÕES:');
  console.log('   1. Acesse: https://supabase.com/dashboard/project/ikjudbypwfvdywlgzsjr/editor');
  console.log('   2. Vá em "SQL Editor"');
  console.log('   3. Execute os arquivos em ordem (001 → 016):');
  console.log('      - server/migrations/001-schema.sql');
  console.log('      - server/migrations/002-add-user-id.sql');
  console.log('      - ... (continue até 016)');
  console.log('\n   Ou use o comando: make migrate\n');
}

// Executar teste
testConnection();
