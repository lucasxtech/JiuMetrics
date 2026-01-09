const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Supabase não configurado! Adicione SUPABASE_URL e SUPABASE_ANON_KEY nas variáveis de ambiente');
  throw new Error('Supabase credentials not configured');
}

// Cliente público (com RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Backend não precisa persistir sessão
  },
});

// Cliente admin (ignora RLS) - para operações de backend
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : supabase; // Fallback para cliente normal se não tiver service key

module.exports = { supabase, supabaseAdmin };
