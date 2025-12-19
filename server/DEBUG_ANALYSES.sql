-- Script para debugar problema de análises não aparecendo

-- 1. Ver todas as análises e seus user_ids
SELECT 
  id,
  person_id,
  person_type,
  user_id,
  created_at,
  SUBSTRING(summary, 1, 50) as summary_preview
FROM fight_analyses
ORDER BY created_at DESC;

-- 2. Ver quantas análises existem por person_id
SELECT 
  person_id,
  person_type,
  COUNT(*) as total_analyses,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_user_id,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_user_id
FROM fight_analyses
GROUP BY person_id, person_type;

-- 3. Ver adversários cadastrados
SELECT 
  id,
  name,
  user_id,
  created_at
FROM opponents
ORDER BY created_at DESC;

-- 4. Ver se Pablo Oliveira existe
SELECT 
  id,
  name,
  user_id
FROM opponents
WHERE LOWER(name) LIKE '%pablo%oliveira%';

-- 5. Ver análises do Pablo Oliveira (se existir)
SELECT 
  fa.id,
  fa.person_id,
  fa.user_id,
  o.name as opponent_name,
  fa.created_at
FROM fight_analyses fa
JOIN opponents o ON o.id = fa.person_id
WHERE LOWER(o.name) LIKE '%pablo%oliveira%';

-- 6. SOLUÇÃO: Atualizar user_id de análises antigas (se necessário)
-- EXECUTE APENAS SE VOCÊ TIVER CERTEZA DO SEU USER_ID
-- Substitua 'SEU_USER_ID_AQUI' pelo seu user_id real
/*
UPDATE fight_analyses
SET user_id = 'SEU_USER_ID_AQUI'
WHERE user_id IS NULL;
*/
