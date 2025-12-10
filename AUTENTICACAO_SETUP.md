# 🔐 Sistema de Autenticação - Guia de Setup

## ✅ O que já foi implementado

### Frontend (React)
- ✅ **Login.jsx** - Tela de login moderna com glass morphism
- ✅ **AuthContext.jsx** - Gerenciamento global de autenticação
- ✅ **PrivateRoute.jsx** - Proteção de rotas
- ✅ **authService.js** - Serviço de API para autenticação
- ✅ **App.jsx** - Rotas protegidas configuradas

### Backend (Node.js + Express)
- ✅ **User.js** - Model com bcrypt (hashing de senhas)
- ✅ **authController.js** - Endpoints de registro/login/logout
- ✅ **auth.js** (middleware) - Validação de tokens JWT
- ✅ **auth.js** (routes) - Rotas de autenticação
- ✅ **index.js** - Rotas registradas
- ✅ **Pacotes instalados** - bcryptjs e jsonwebtoken
- ✅ **JWT_SECRET** - Configurado no .env

### Banco de Dados
- ✅ **supabase-users-schema.sql** - Script SQL pronto

## 📋 Próximos passos para ativar o sistema

### 1. Criar tabela de usuários no Supabase

Acesse o Supabase Dashboard:
1. Vá para: https://supabase.com/dashboard/project/ikjudbypwfvdywlgzsjr
2. Clique em **SQL Editor** no menu lateral
3. Cole o conteúdo do arquivo `server/supabase-users-schema.sql`
4. Clique em **RUN** para executar

### 2. Reiniciar o servidor

```bash
cd server
npm run dev
```

### 3. Testar o sistema

#### Criar primeiro usuário (via API):

```bash
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lucas Menezes",
    "email": "lucas@example.com",
    "password": "senha123"
  }'
```

#### Fazer login:

```bash
curl -X POST http://localhost:5050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lucas@example.com",
    "password": "senha123"
  }'
```

### 4. Acessar aplicação

1. Inicie o frontend: `cd frontend && npm run dev`
2. Acesse: http://localhost:5173
3. Você será redirecionado para `/login`
4. Use as credenciais criadas no passo 3

## 🔑 Endpoints disponíveis

### Públicos (sem autenticação)
- `POST /api/auth/register` - Criar nova conta
- `POST /api/auth/login` - Fazer login

### Protegidos (requer token)
- `GET /api/auth/me` - Dados do usuário logado
- `POST /api/auth/logout` - Fazer logout
- Todas as rotas existentes (`/api/athletes`, `/api/opponents`, etc.)

## 🛡️ Segurança implementada

- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ Tokens JWT com expiração (7 dias padrão, 30 dias com "lembrar-me")
- ✅ Row Level Security (RLS) no Supabase
- ✅ Validação de entrada no frontend e backend
- ✅ Bearer token authentication
- ✅ Middleware de proteção de rotas

## 🎨 Features da tela de login

- Design moderno com glass morphism
- Validação em tempo real
- Estados de loading
- Animação de erro (shake)
- Checkbox "Lembrar-me"
- Link para recuperação de senha
- Responsivo (mobile-friendly)

## 📝 Próximas melhorias (opcional)

- [ ] Tela de registro (sign up)
- [ ] Recuperação de senha (forgot password)
- [ ] Confirmação de email
- [ ] Refresh token automático
- [ ] Logout em todos os dispositivos
- [ ] Histórico de logins

## 🐛 Troubleshooting

### Erro: "Cannot find module 'jsonwebtoken'"
```bash
cd server
npm install bcryptjs jsonwebtoken
```

### Erro: "JWT_SECRET não definido"
Verifique se o arquivo `server/.env` contém:
```
JWT_SECRET=jiujistu-metrics-secret-key-2025-XXXXXXXXXX
```

### Erro: "Tabela users não existe"
Execute o script SQL no Supabase Dashboard (passo 1)

### Frontend não redireciona para login
1. Limpe o localStorage: `localStorage.clear()`
2. Recarregue a página
3. Verifique se App.jsx tem AuthProvider e PrivateRoute

## 📚 Estrutura de arquivos criados

```
frontend/src/
├── pages/
│   └── Login.jsx                    # Tela de login
├── context/
│   └── AuthContext.jsx              # Estado global de autenticação
├── components/
│   └── PrivateRoute.jsx             # Wrapper de proteção de rotas
└── services/
    └── authService.js               # API de autenticação

server/src/
├── models/
│   └── User.js                      # Model de usuário
├── controllers/
│   └── authController.js            # Lógica de autenticação
├── middleware/
│   └── auth.js                      # Validação de tokens
└── routes/
    └── auth.js                      # Rotas de autenticação

server/
└── supabase-users-schema.sql        # Schema do banco de dados
```

## ✨ Sistema pronto para uso!

Após executar os passos 1-4, o sistema de autenticação estará 100% funcional.
