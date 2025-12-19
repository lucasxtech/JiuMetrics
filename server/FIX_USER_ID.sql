-- Script para atualizar análises antigas sem user_id

-- PASSO 1: Ver seu user_id atual (você precisa estar logado)
-- Execute no Supabase SQL Editor e anote o user_id que aparece

SELECT id as user_id, email
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- PASSO 2: Ver análises sem user_id
SELECT 
  fa.id,
  fa.person_id,
  fa.person_type,
  fa.user_id,
  fa.created_at,
  CASE 
    WHEN fa.person_type = 'athlete' THEN a.name
    WHEN fa.person_type = 'opponent' THEN o.name
  END as person_name
FROM fight_analyses fa
LEFT JOIN athletes a ON fa.person_id = a.id AND fa.person_type = 'athlete'
LEFT JOIN opponents o ON fa.person_id = o.id AND fa.person_type = 'opponent'
WHERE fa.user_id IS NULL
ORDER BY fa.created_at DESC;

-- PASSO 3: Atualizar análises sem user_id
-- ⚠️ IMPORTANTE: Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real do PASSO 1
-- Descomente e execute as linhas abaixo:

/*
UPDATE fight_analyses
SET user_id = 'SEU_USER_ID_AQUI'
WHERE user_id IS NULL;
*/

-- PASSO 4: Verificar se funcionou
SELECT 
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_user_id
FROM fight_analyses;

-- PASSO 5: Ver análises do Pablo Oliveira especificamente
SELECT 
  fa.id,
  fa.person_id,
  fa.user_id,
  o.name as opponent_name,
  fa.created_at,
  SUBSTRING(fa.summary, 1, 80) as summary_preview
FROM fight_analyses fa
JOIN opponents o ON o.id = fa.person_id
WHERE LOWER(o.name) LIKE '%pablo%'
ORDER BY fa.created_at DESC;
