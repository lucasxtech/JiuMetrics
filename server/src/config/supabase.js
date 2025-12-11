const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Supabase não configurado! Adicione SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente');
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Backend não precisa persistir sessão
  },
});

module.exports = { supabase };
