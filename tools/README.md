# 🛠️ Ferramentas de Desenvolvimento

Utilitários para debug e testes durante o desenvolvimento.

## 📁 Arquivos

### TEST_TOKEN.js
Script para testar autenticação via console do navegador.

**Como usar:**
1. Faça login na aplicação
2. Abra o Console do navegador (F12)
3. Copie e cole o conteúdo de `TEST_TOKEN.js`
4. Execute para verificar se o token está válido

**Output esperado:**
```
🔍 Verificando autenticação...
Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
User: {"id":"123","email":"user@example.com"}
✅ Token encontrado
```

### api-requests.http
Coleção de requests HTTP para testar a API usando REST Client (VS Code) ou Postman.

**Como usar:**

**No VS Code:**
1. Instale a extensão "REST Client"
2. Abra `api-requests.http`
3. Clique em "Send Request" acima de cada request

**No Postman/Insomnia:**
1. Importe o arquivo
2. Ajuste o `baseURL` se necessário
3. Execute as requests

**Endpoints disponíveis:**
- ✅ Atletas (CRUD completo)
- ✅ Adversários (CRUD completo)
- ✅ Autenticação (login/register)
- ✅ Estratégias com IA
- ✅ Upload de vídeos
- ✅ Análises táticas

## 🔧 Configuração

Certifique-se de que o servidor está rodando:
```bash
cd server && npm run dev
```

Endpoints padrão:
- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:5050

## 📝 Notas

- Arquivos de teste apenas para desenvolvimento
- Não incluir credenciais reais
- Ajustar URLs conforme ambiente (dev/staging/prod)
