# 🔐 Guia Completo - Sistema de Autenticação JiuMetrics

## 📋 Passo 1: Configurar Banco de Dados (Supabase)

### Execute o SQL abaixo no Supabase:

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** > **New Query**
4. Cole o SQL abaixo e execute:

```sql
-- ==========================================
-- CRIAR TABELA DE USUÁRIOS - JiuMetrics
-- ==========================================

-- 1. Deletar tabela se existir (cuidado em produção!)
DROP TABLE IF EXISTS users CASCADE;

-- 2. Criar tabela de usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Criar índice para email (busca rápida)
CREATE INDEX idx_users_email ON users(email);

-- 4. Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5. Configurar RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 6. Criar políticas de acesso
CREATE POLICY "Permitir registro de novos usuários"
ON users FOR INSERT
WITH CHECK (true);

CREATE POLICY "Permitir leitura de usuários"
ON users FOR SELECT
USING (true);

CREATE POLICY "Permitir atualização de usuários"
ON users FOR UPDATE
USING (true);

-- Verificar se funcionou:
-- SELECT * FROM users;
```

---

## 🎨 Passo 2: Design da Página de Login (Dark Theme)

### Características do Design Moderno:

**✅ Tema Dark:**
- Fundo preto sólido (`bg-black`)
- Card cinza escuro (`bg-gray-900`)
- Bordas sutis (`border-gray-800`)

**✅ Espaçamentos e Paddings:**
- Container externo: `px-4 py-12`
- Card interno: `p-8`
- Campos de formulário: `space-y-4` (16px entre campos)
- Labels: `space-y-1.5` (6px entre label e input)

**✅ Inputs Modernos:**
- Altura: `h-11` (44px - ótimo para mobile)
- Padding horizontal: `px-4`
- Background: `bg-gray-800`
- Borda: `border border-gray-700`
- Focus: `focus:ring-2 focus:ring-gray-600`
- Texto: `text-white text-sm`
- Placeholder: `placeholder:text-gray-500`

**✅ Labels em UPPERCASE:**
- Tamanho: `text-xs`
- Cor: `text-gray-400`
- Tracking: `tracking-wide uppercase`

**✅ Botão Principal:**
- Fundo branco: `bg-white`
- Texto preto: `text-black`
- Altura: `h-11`
- Hover: `hover:bg-gray-100`

**✅ Botão Google:**
- Fundo escuro: `bg-gray-800`
- Borda: `border border-gray-700`
- Ícone colorido do Google

---

## 📱 Passo 3: Responsividade

### Breakpoints Mobile-First:
```css
/* Mobile (padrão) */
max-w-md (448px)

/* Tablet */
@media (min-width: 768px) {
  // Aumentar espaçamentos se necessário
}

/* Desktop */
@media (min-width: 1024px) {
  // Centralização perfeita
}
```

### Grid Layout:
- Uso de `flex items-center justify-center`
- `min-h-screen` para ocupar tela inteira
- Card com `max-w-md` para limitar largura

---

## 🚀 Passo 4: Iniciar Aplicação

### Backend:
```bash
cd server
npm start
# Deve rodar em: http://localhost:5050
```

### Frontend:
```bash
cd frontend
npm run dev
# Deve rodar em: http://localhost:5173
```

---

## ✅ Checklist de Implementação

- [x] Tabela `users` criada no Supabase
- [x] Backend rodando na porta 5050
- [x] Frontend rodando
- [x] Página de Login com tema dark
- [x] Página de Register com tema dark
- [x] Validação de formulários
- [x] Mensagens de erro
- [x] Loading states
- [x] Responsivo mobile/desktop

---

## 🎯 Estrutura de Arquivos

```
frontend/src/pages/
├── Login.tsx       # Página de login (TypeScript)
├── Register.jsx    # Página de registro (JavaScript)

server/
├── .env            # Configurações do Supabase
├── src/
│   ├── config/
│   │   └── supabase.js
│   ├── controllers/
│   │   └── authController.js
│   ├── models/
│   │   └── User.js
│   └── routes/
│       └── auth.js
```

---

## 🔧 Variáveis de Ambiente (.env)

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon
JWT_SECRET=sua-chave-secreta-aqui
```

---

## 📊 Espaçamentos Recomendados (Tailwind)

| Elemento | Classe | Pixels | Uso |
|----------|--------|--------|-----|
| Container externo | `py-12` | 48px | Espaço vertical da página |
| Container externo | `px-4` | 16px | Espaço horizontal mobile |
| Card interno | `p-8` | 32px | Padding do card |
| Entre campos | `space-y-4` | 16px | Espaço entre inputs |
| Label → Input | `space-y-1.5` | 6px | Espaço label/input |
| Header → Card | `mb-8` | 32px | Espaço logo/card |
| Título → Subtítulo | `mb-1` | 4px | Espaço entre textos |
| Botão margin-top | `mt-6` | 24px | Espaço antes do botão |
| Separador | `my-5` | 20px | Espaço do "OU" |
| Footer | `mt-6 pt-5` | 24px/20px | Espaço do link |

---

## 🎨 Paleta de Cores (Dark Theme)

```css
/* Backgrounds */
bg-black         /* #000000 - Fundo principal */
bg-gray-900      /* #111827 - Card */
bg-gray-800      /* #1F2937 - Inputs */

/* Borders */
border-gray-800  /* #1F2937 - Card border */
border-gray-700  /* #374151 - Input border */

/* Text */
text-white       /* #FFFFFF - Títulos */
text-gray-400    /* #9CA3AF - Labels/subtítulos */
text-gray-500    /* #6B7280 - Placeholders */

/* Buttons */
bg-white         /* #FFFFFF - Botão principal */
text-black       /* #000000 - Texto botão */
```

---

## 📝 Dicas de UX

1. **Loading States**: Mostrar spinner durante login/registro
2. **Validação em Tempo Real**: Feedback imediato nos campos
3. **Mensagens Claras**: Erros específicos e acionáveis
4. **Acessibilidade**: Labels adequados, foco visível
5. **Mobile-First**: Testar sempre em mobile primeiro
6. **Touch Targets**: Mínimo 44px de altura para botões/inputs

---

## 🐛 Troubleshooting

### Erro: "Could not find table 'users'"
- Execute o SQL no Supabase novamente
- Verifique se a tabela foi criada em **Table Editor**

### Erro: "Cannot read properties of undefined"
- Verifique se `module.exports = { supabase }` está correto
- Reinicie o servidor

### Erro: CORS
- Adicione no backend: `app.use(cors())`
- Verifique se as portas estão corretas

### Login não funciona
- Verifique se o servidor está rodando
- Verifique os logs do console (F12)
- Confirme que a API_URL está correta

---

## 🎉 Conclusão

Você agora tem um sistema completo de autenticação com:
- ✅ Design moderno e dark
- ✅ Totalmente responsivo
- ✅ Validação robusta
- ✅ Backend seguro com JWT
- ✅ Banco de dados PostgreSQL (Supabase)

**Bom desenvolvimento! 🚀**
