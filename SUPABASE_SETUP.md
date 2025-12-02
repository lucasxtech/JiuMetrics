# 🗄️ Guia de Setup do Supabase

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Faça login/cadastro (gratuito)
3. Clique em "New Project"
4. Preencha:
   - **Nome do projeto**: JiuMetrics (ou outro nome)
   - **Senha do banco**: Crie uma senha forte e **anote**
   - **Região**: South America (São Paulo) - mais próximo do Brasil

## 2. Copiar Credenciais

Após criar o projeto, vá em **Settings > API**:

1. **Project URL** → Copie a URL (algo como `https://xxxxx.supabase.co`)
2. **anon/public key** → Copie a chave (começa com `eyJ...`)

## 3. Configurar .env

Edite o arquivo `/server/.env`:

```env
GEMINI_API_KEY=AIzaSyCrrCRcY8Mis2JDuJRL7mbs37Z0aGtdjx8

# Supabase Configuration
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Substitua** pelos valores que você copiou!

## 4. Criar Tabelas no Banco

1. No Supabase, vá em **SQL Editor**
2. Clique em "New query"
3. Copie TODO o conteúdo do arquivo [`server/supabase-schema.sql`](supabase-schema.sql)
4. Cole no editor
5. Clique em **RUN** (▶️)

Você verá a mensagem "Success. No rows returned" - está correto!

## 5. Verificar Tabelas Criadas

Vá em **Table Editor** no menu lateral. Você deve ver:
- ✅ `athletes` (atletas)
- ✅ `opponents` (adversários)  
- ✅ `fight_analyses` (análises de IA)

## 6. Testar Conexão

Reinicie o servidor backend:

```bash
cd server
npm run dev
```

Se aparecer:
- ❌ `⚠️ Supabase não configurado` → Verifique o .env
- ✅ Servidor iniciou normal → Tudo certo!

## 7. Testar no Frontend

1. Acesse a página de **Atletas**
2. Tente criar um novo atleta
3. Se funcionar, está tudo conectado! 🎉

## 🔧 Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a chave **anon** (não a service_role)
- Confirme que não tem espaços extras no .env

### Erro: "relation does not exist"
- Execute o SQL do passo 4 novamente
- Verifique se está no projeto correto

### Dados não aparecem
- Verifique as políticas RLS no Supabase
- O schema.sql já configura acesso público para desenvolvimento

## 📊 Estrutura das Tabelas

### athletes / opponents
- `id` (UUID) - gerado automaticamente
- `name`, `belt`, `weight`, `height`, `age`, `style`
- `strong_attacks`, `weaknesses`, `video_url`
- `cardio` (0-100)
- `technical_profile` (JSONB) - perfil consolidado das análises
- `created_at`, `updated_at`

### fight_analyses
- `id` (UUID)
- `person_id` (UUID) - referência ao atleta/adversário
- `person_type` ('athlete' ou 'opponent')
- `video_url` - vídeo analisado
- `charts` (JSONB array) - gráficos gerados pela IA
- `summary` (TEXT) - resumo da análise
- `technical_profile` (TEXT) - perfil técnico extraído
- `frames_analyzed` (INT) - quantidade de frames processados
- `created_at`, `updated_at`

## 🚀 Próximos Passos

Após configurar:
1. ✅ Criar alguns atletas de teste
2. ✅ Fazer análise de vídeo
3. ✅ Verificar se análise foi salva no perfil
4. ✅ Testar dashboard

## 💡 Dicas

- **Backup**: Supabase faz backup automático
- **Limites free tier**: 500MB storage, 2GB bandwidth/mês
- **SQL Editor**: Use para queries avançadas
- **Table Editor**: Interface visual para ver/editar dados
