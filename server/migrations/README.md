# 🗄️ Migrations do Supabase

Este diretório contém todas as migrations SQL para configuração do banco de dados Supabase.

## 📋 Ordem de Execução

Execute os arquivos SQL na ordem numérica no **Supabase SQL Editor**:

### 1️⃣ Setup Inicial
- **001-schema.sql** - Schema principal (tabelas, RLS, policies)
- **002-add-user-id.sql** - Adiciona user_id nas tabelas

### 2️⃣ API Usage Tracking
- **003-api-usage.sql** - Tabela de tracking de uso da API
- **004-api-usage-final.sql** - Versão final com melhorias
- **006-fix-api-usage-policy.sql** - Correção de policies

### 3️⃣ Policies & Constraints
- **005-fix-policies.sql** - Correção de políticas RLS
- **008-corrigir-constraint.sql** - Correção de constraints
- **009-execute-este.sql** - Ajustes finais

### 4️⃣ Features Específicas
- **007-tactical-analyses.sql** - Tabela de análises táticas

### 5️⃣ Acesso (spec 008)
- **024-revoke-anon-access.sql** — `REVOKE` de `anon`/`authenticated` em todas as tabelas de domínio. ⚠️ Rodar **depois** de validar que o backend já funciona com `service_role` (unificação de cliente feita no código desta mesma spec) — senão a aplicação perde acesso junto com a chave anon. Rollback (`GRANT` de volta) documentado no próprio arquivo.

## ⚠️ Importante

- Execute sempre na ordem numérica (001 → 009)
- Verifique se cada migration foi aplicada com sucesso antes de prosseguir
- Alguns arquivos podem sobrescrever outros (ex: 004 substitui 003)
- Use apenas no ambiente de desenvolvimento/staging primeiro

## 🔄 Verificar Migrations Aplicadas

```sql
-- Verificar se tabelas existem
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Verificar policies
SELECT * FROM pg_policies;
```

## 📝 Notas

- **004-api-usage-final.sql** é a versão definitiva do tracking de API
- Arquivos **008** e **009** corrigem problemas de constraint
- Sempre faça backup antes de executar migrations em produção
