# 🥋 JiuMetrics - Análise Tática de Jiu-Jitsu

Sistema completo de análise de vídeos de Jiu-Jitsu com IA (Google Gemini), gerenciamento de atletas/adversários e geração de estratégias.

## 🚀 Funcionalidades

- ✅ **Análise de Vídeos com IA**: Upload ou link do YouTube com análise via Google Gemini Vision
- ✅ **Gerenciamento de Atletas e Adversários**: CRUD completo com perfis técnicos
- ✅ **Histórico de Análises**: Todas as análises ficam salvas no perfil de cada pessoa
- ✅ **Gráficos e Dashboards**: Visualização de dados técnicos e estatísticos
- ✅ **Comparação e Estratégias**: Compare atletas e gere estratégias de luta
- ✅ **Banco de Dados Supabase**: Persistência de dados em PostgreSQL

## 📦 Tecnologias

**Frontend:**
- React 18 + Vite
- TailwindCSS
- Recharts (gráficos)
- Axios

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- Google Gemini AI
- FFmpeg (extração de frames)

## ⚙️ Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/lucasxtech/JiuMetrics.git
cd JiuMetrics
```

### 2. Configure o Backend

```bash
cd server
npm install
```

Crie o arquivo `.env` com base no `.env.example`:
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:
```env
GEMINI_API_KEY=sua_chave_gemini
SUPABASE_URL=sua_url_supabase
SUPABASE_ANON_KEY=sua_chave_supabase
```

### 3. Configure o Frontend

```bash
cd ../frontend
npm install
```

Crie o arquivo `.env` com base no `.env.example`:
```bash
cp .env.example .env
```

### 4. Configure o Supabase

1. Acesse https://supabase.com e crie um projeto
2. No **SQL Editor**, execute o script `server/supabase-schema.sql`
3. Copie as credenciais em **Settings > API** para o `.env`

📖 **Guia detalhado:** [SETUP_SUPABASE.md](./SETUP_SUPABASE.md)

## 🎯 Como Usar

### Iniciar o servidor

```bash
# Terminal 1 - Backend
cd server
npm run dev
```

### Iniciar o frontend

```bash
# Terminal 2 - Frontend
cd frontend
npm run dev
```

Acesse: **http://localhost:5173**

## 📚 Documentação

- [SETUP_SUPABASE.md](./SETUP_SUPABASE.md) - Guia completo de setup do Supabase
- [API.md](./API.md) - Documentação da API REST
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitetura do sistema
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Guia de desenvolvimento

## 🗂️ Estrutura do Projeto

```
projeto analise atletas/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── pages/        # Páginas
│   │   ├── services/     # Chamadas API
│   │   └── utils/        # Utilitários
│   └── .env.example
├── server/           # Node.js + Express
│   ├── src/
│   │   ├── controllers/  # Lógica de negócio
│   │   ├── models/       # Modelos Supabase
│   │   ├── routes/       # Rotas da API
│   │   ├── services/     # Serviços externos (Gemini, FFmpeg)
│   │   └── utils/        # Utilitários
│   ├── uploads/          # Vídeos temporários
│   ├── .env.example
│   └── supabase-schema.sql
└── README.md
```

## 🔑 Variáveis de Ambiente

### Backend (.env)
```env
GEMINI_API_KEY=         # Chave da API Google Gemini
SUPABASE_URL=           # URL do projeto Supabase
SUPABASE_ANON_KEY=      # Chave anon do Supabase
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5050/api
SUPABASE_URL=           # URL do projeto Supabase (opcional)
SUPABASE_ANON_KEY=      # Chave anon do Supabase (opcional)
```

## 🎬 Fluxo de Uso

1. **Cadastre atletas e adversários** na aba "Atletas" ou "Adversários"
2. **Analise vídeos** na aba "IA":
   - Faça upload de vídeos ou cole links do YouTube
   - Selecione o atleta/adversário
   - Escolha a cor do kimono
   - Aguarde a análise
3. **Visualize análises salvas** no perfil de cada atleta/adversário
4. **Compare e crie estratégias** nas abas "Comparar" e "Estratégia"

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT

## 👤 Autor

Lucas Menezes - [@lucasxtech](https://github.com/lucasxtech)

---

**Desenvolvido com ❤️ para a comunidade de Jiu-Jitsu**
