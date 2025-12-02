# 🔧 Setup do Supabase - Passo a Passo

## ❗ IMPORTANTE: Execute AGORA

Você precisa criar as tabelas no Supabase antes de usar o sistema.

## 📋 Passos:

### 1. Acesse o SQL Editor do Supabase
1. Vá para https://supabase.com/dashboard/project/ikjudbypwfvdywlgzsjr
2. Clique em **SQL Editor** no menu lateral esquerdo
3. Clique em **New query**

### 2. Execute o Schema SQL
1. Copie **TODO** o conteúdo do arquivo `server/supabase-schema.sql`
2. Cole no editor SQL
3. Clique em **Run** (ou Ctrl+Enter)

### 3. Verifique as Tabelas
1. Clique em **Table Editor** no menu lateral
2. Você deve ver 3 tabelas:
   - ✅ `athletes`
   - ✅ `opponents`
   - ✅ `fight_analyses`

### 4. Teste a Conexão
Depois de executar o SQL, volte para o navegador e:
1. Atualize a página de Adversários
2. Deve carregar sem erros
3. Teste criando um novo adversário

## 🔑 Suas Credenciais (já configuradas no .env)
```
URL: https://ikjudbypwfvdywlgzsjr.supabase.co
ANON KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🐛 Se ainda der erro "Invalid API key":
1. Vá em **Project Settings** > **API**
2. Copie a **anon/public key** novamente
3. Substitua no arquivo `server/.env` na variável `SUPABASE_ANON_KEY`
4. Reinicie o servidor: `npm run dev`

## ✅ Próximos Passos após Setup
Depois que as tabelas estiverem criadas:
1. Teste criar um atleta
2. Teste criar um adversário
3. Teste fazer uma análise de vídeo
4. Verifique se os dados aparecem no dashboard
