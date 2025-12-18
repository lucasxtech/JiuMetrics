# 🥋 JiuMetrics - Análise Tática de Jiu-Jitsu

Sistema completo de análise de vídeos de Jiu-Jitsu com IA (Google Gemini), gerenciamento de atletas/adversários e geração de estratégias.

## 🚀 Funcionalidades

- ✅ **Análise de Vídeos com IA**: Upload ou link do YouTube com análise via Google Gemini Vision
- ✅ **Seleção de Modelos Gemini**: Escolha entre gemini-2.0-flash, gemini-2.5-pro ou gemini-3-pro-preview
- ✅ **Rastreamento de Custos API**: Acompanhe gastos com a API do Gemini em tempo real
- ✅ **Gerenciamento de Atletas e Adversários**: CRUD completo com perfis técnicos
- ✅ **Histórico de Análises Táticas**: Sistema completo de histórico com busca e filtros
- ✅ **Download PDF**: Exporte análises táticas em PDF formatado
- ✅ **Modais de Confirmação**: Confirmação visual para todas as ações de exclusão
- ✅ **Custom Select**: Dropdown moderno e escalável para seleção de atletas/adversários
- ✅ **Cadastro Rápido**: QuickAdd modal para criar atletas/adversários sem sair da página
- ✅ **Busca e Filtros**: Sistema de busca em análises por atleta ou adversário
- ✅ **Gráficos e Dashboards**: Visualização de dados técnicos e estatísticos
- ✅ **Comparação e Estratégias**: Compare atletas e gere estratégias de luta com IA
- ✅ **Banco de Dados Supabase**: Persistência de dados em PostgreSQL

## 📦 Tecnologias

**Frontend:**
- React 19 + Vite
- TailwindCSS 4
- Recharts (gráficos)
- Axios
- html2pdf.js (geração de PDF)
- Lucide React (ícones)
- Vitest (testes unitários)

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
2. No **SQL Editor**, execute os scripts na ordem:
   - `server/supabase-schema.sql` (tabelas principais)
   - `server/supabase-api-usage-FINAL.sql` (rastreamento de custos API)
3. Copie as credenciais em **Settings > API** para o `.env`

📖 **Guias detalhados:** 
- [SETUP_SUPABASE.md](./docs/setup/SETUP_SUPABASE.md) - Setup completo
- [SETUP_API_USAGE.md](./docs/setup/SETUP_API_USAGE.md) - Sistema de rastreamento de custos

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

### 📖 Setup e Configuração
- [docs/setup/SETUP_SUPABASE.md](docs/setup/SETUP_SUPABASE.md) - Guia completo de setup do Supabase
- [docs/setup/SETUP_API_USAGE.md](docs/setup/SETUP_API_USAGE.md) - Sistema de rastreamento de custos da API Gemini
- [docs/setup/GUIA_AUTENTICACAO.md](docs/setup/GUIA_AUTENTICACAO.md) - Configuração de autenticação

### 🏗️ Arquitetura e API
- [docs/API.md](docs/API.md) - Documentação da API REST
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - Arquitetura do sistema
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) - Guia de desenvolvimento

### 🚀 Deploy
- [docs/deployment/DEPLOY.md](docs/deployment/DEPLOY.md) - Guia de deploy completo

### 🛠️ Ferramentas e Recursos
- [scripts/README.md](scripts/README.md) - Scripts de desenvolvimento
- [server/migrations/README.md](server/migrations/README.md) - Migrations do Supabase
- [server/tests/README.md](server/tests/README.md) - Testes de integração
- [tools/README.md](tools/README.md) - Ferramentas de debug
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guia de contribuição
- [CODE_REVIEW.md](CODE_REVIEW.md) - Análise e melhorias do código

## 💰 Modelos Gemini Disponíveis

| Modelo | Custo (Input) | Custo (Output) | Uso Recomendado |
|--------|---------------|----------------|-----------------|
| gemini-2.0-flash | $0.075/1M tokens | $0.30/1M tokens | Análises rápidas (padrão) |
| gemini-2.5-pro | $1.25/1M tokens | $5.00/1M tokens | Análises detalhadas |
| gemini-3-pro-preview | Grátis | Grátis | Preview (recursos experimentais) |

💡 **Acompanhe seus gastos** em tempo real na aba **Configurações**

## 🗂️ Estrutura do Projeto

```
projeto analise atletas/
├── frontend/                   React 19 + Vite + TailwindCSS 4
│   ├── src/
│   │   ├── components/        Componentes reutilizáveis
│   │   ├── pages/             Páginas da aplicação
│   │   ├── services/          Chamadas API
│   │   ├── hooks/             Custom hooks
│   │   └── utils/             Funções auxiliares
│   └── public/                Assets estáticos
│
├── server/                     Node.js + Express
│   ├── src/
│   │   ├── controllers/       Lógica de negócio
│   │   ├── models/            Modelos de dados
│   │   ├── routes/            Rotas da API
│   │   ├── middleware/        Auth & validações
│   │   └── services/          Serviços externos (IA)
│   ├── migrations/            SQLs do Supabase (001-009)
│   ├── tests/                 Testes de integração
│   └── uploads/               Arquivos de upload
│
├── scripts/                    Scripts de desenvolvimento
│   ├── dev.sh                 Comandos de desenvolvimento
│   ├── start.sh               Iniciar app completo
│   └── startup-info.sh        Documentação interativa
│
├── tools/                      Ferramentas de debug
│   ├── api-requests.http      Requests HTTP
│   └── TEST_TOKEN.js          Teste de autenticação
│
└── docs/                       Documentação completa
    ├── setup/                 Guias de configuração
    ├── deployment/            Guias de deploy
    └── guides/                Checklists e tutoriais
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
