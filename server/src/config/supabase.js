const { createClient } = require('@supabase/supabase-js');

// spec 008 — cliente único, service_role. Antes havia dois clientes
// (`supabase` anon + `supabaseAdmin` service_role) sem regra documentada
// sobre qual model usava qual, e `supabaseAdmin` caía SILENCIOSAMENTE para
// o cliente anon quando a chave de serviço não estava definida — o mesmo
// código rodando com dois níveis de privilégio dependendo de uma variável
// de ambiente, sem aviso nenhum.
//
// Isso deixou de fazer sentido depois do REVOKE de `anon`/`authenticated`
// nas tabelas de `public` (spec 008): o cliente anon não consegue mais ler
// nem escrever nada, então mantê-lo era manter um cliente que não funciona.
// Falhar no boot sem a chave de serviço é intencional — não há fallback
// razoável quando o único cliente que existe é o privilegiado.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    '❌ Supabase não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente. ' +
    'Desde a spec 008 este é o único cliente do backend (service_role) — não há fallback para chave anon.'
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Backend não precisa persistir sessão
    autoRefreshToken: false,
  },
});

module.exports = { supabase };
