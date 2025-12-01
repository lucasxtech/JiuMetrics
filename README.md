# JiuMetrics – Jiu-Jitsu Tactical Analysis

A modern, responsive web app for Jiu-Jitsu athlete and opponent management, AI-powered fight strategy, and rich visual dashboards.

## Features

- Athlete and Opponent management
- Interactive Dashboard with charts
- Strategy generator with AI (Gemini)
- Comparison view (Radar, Bars, Lines with Recharts)
- Modern responsive UI (cards, gradients)

## Requirements

- Node.js 18+
- npm 9+
- Modern browser
- FFmpeg (for frame extraction)

## Setup

### Environment
Create `server/.env` with:
```
PORT=5000
GEMINI_API_KEY=YOUR_GEMINI_KEY
```

### Install
Frontend
```
cd frontend
npm install
```
Backend
```
cd server
npm install
```

## Run
Backend
```
cd server
npm run dev
```
Frontend
```
cd frontend
npm run dev
```
Visit `http://localhost:5173`

## Project Structure

```
project/
├── frontend/                    # Aplicação React Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Componentes reutilizáveis
│   │   │   ├── forms/          # Formulários
│   │   │   └── charts/         # Gráficos
│   │   ├── pages/              # Páginas principais
│   │   ├── services/           # Chamadas à API
│   │   ├── hooks/              # Custom hooks (futura expansão)
│   │   ├── context/            # Context API (futura expansão)
│   │   ├── utils/              # Utilitários
│   │   ├── App.jsx             # Router principal
│   │   ├── index.css           # Estilos globais
│   │   └── main.jsx            # Entry point
│   ├── .env                    # Variáveis de ambiente
│   ├── tailwind.config.js      # Configuração Tailwind
│   └── package.json
│
├── server/                     # Backend Express
│   ├── src/
│   │   ├── controllers/        # Lógica de negócio
│   │   ├── models/             # Modelos de dados
│   │   ├── routes/             # Rotas da API
│   │   └── utils/              # Funções auxiliares
│   ├── index.js                # Servidor principal
│   ├── config.js               # Configurações
│   ├── .env                    # Variáveis de ambiente
│   └── package.json
│
└── README.md

```

## API Endpoints

### Athletes
- `GET /api/athletes` - Listar todos
- `GET /api/athletes/:id` - Detalhes de um atleta
- `POST /api/athletes` - Criar novo
- `PUT /api/athletes/:id` - Atualizar
- `DELETE /api/athletes/:id` - Deletar

### Opponents
- `GET /api/opponents` - Listar todos
- `GET /api/opponents/:id` - Detalhes
- `POST /api/opponents` - Criar novo
- `PUT /api/opponents/:id` - Atualizar
- `DELETE /api/opponents/:id` - Deletar

### AI/Strategy
- `POST /api/ai/strategy` - Gerar estratégia
  ```json
  {
    "athleteId": "1",
    "opponentId": "2"
  }
  ```

## App Pages

1. **Dashboard** (`/`) - Visão geral com estatísticas e gráficos
2. **Atletas** (`/athletes`) - Gerenciar atletas
3. **Detalhe Atleta** (`/athletes/:id`) - Perfil completo do atleta
4. **Adversários** (`/opponents`) - Gerenciar adversários
5. **Comparador** (`/compare`) - Análise lado a lado
6. **Estratégia** (`/strategy`) - Gerador de planos com IA

## Tech Stack

### Frontend
- **React 19** - UI library
- **Vite** - Build tool
- **React Router v6** - Roteamento
- **TailwindCSS** - Estilos
- **Recharts** - Gráficos
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime
- **Express** - Framework web
- **CORS** - Segurança CORS
- **UUID** - Geração de IDs
- **Nodemon** - Dev reload

## Sample Data

A aplicação vem com dados mock pré-carregados para testes:

### Atletas
- João Silva - Roxa, Guarda, 85kg
- Maria Santos - Azul, Passagem, 62kg
- Carlos Oliveira - Marrom, Pressão, 92kg

### Adversários
- Pedro Ramos - Marrom, Pressão, 90kg
- Ana Costa - Roxa, Explosão, 65kg

## Roadmap

- [ ] Integração com Supabase/Firebase
- [ ] Upload de vídeos
- [ ] Autenticação de usuários
- [ ] Histórico de lutas
- [ ] Integração com IA real (OpenAI, Claude)
- [ ] Estatísticas avançadas
- [ ] Sistema de notificações
- [ ] Export de relatórios (PDF)

## Components

### AthleteCard
Exibe informações resumidas de um atleta com progresso visual.

### AthleteForm
Formulário completo para criar/editar atletas com validação.

### StatsRadarChart
Gráfico radar para exibir atributos multidimensionais.

### StatsBarChart
Gráfico de barras para frequência de ataques.

### CompareView
Visualização lado a lado com gráfico duplo e análise de diferenças.

### AiStrategyBox
Exibe estratégia gerada com seções expansíveis.

## Troubleshooting

### Porta 5000 já em uso
```bash
# Mudar porta no arquivo server/.env
PORT=5001
```

### Erro de CORS
Verifique se o `VITE_API_URL` no frontend está apontando para o servidor correto.

### Componentes não carregam
Certifique-se de que:
1. Todas as dependências estão instaladas (`npm install`)
2. Não há erros de sintaxe nos componentes
3. O servidor está rodando na porta correta

## Dev Tips

1. **Adicionar novo atleta**: Vá para `/athletes` e clique em "Novo Atleta"
2. **Testar IA**: Selecione um atleta e adversário em `/strategy`
3. **Ver comparação**: Use `/compare` para análise visual
4. **Verificar dados**: Abra o DevTools (F12) para ver requisições

## Support

Para dúvidas ou problemas:
1. Verifique se o servidor está rodando (`npm run dev`)
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Reinicie ambos os servidores

## License

Este projeto é desenvolvido como propósito educacional.

---

**JiuMetrics | v1.0**
