# 🥋 Plataforma de Análise Tática de Jiu-Jitsu

Uma aplicação web responsiva para análise de atletas e adversários de Jiu-Jitsu, com dashboards interativos e geração de estratégias com IA.

## 🎯 Funcionalidades

✅ **Cadastro de Atletas** - CRUD completo de atletas da academia
✅ **Cadastro de Adversários** - Gerencie seus oponentes
✅ **Dashboard Interativo** - Visualize estatísticas com gráficos em tempo real
✅ **Comparador de Estratégias** - Analise diferenças entre competidores
✅ **Módulo de IA** - Gere planos de luta personalizados
✅ **Gráficos Avançados** - Radar, barras e linhas com Recharts
✅ **Interface Responsiva** - Funciona em desktop, tablet e mobile

## 📋 Requisitos

- Node.js 18.0+
- npm 9.0+
- Navegador moderno (Chrome, Firefox, Safari, Edge)

## 🚀 Instalação e Setup

### 1. Clonar/Acessar o Projeto

```bash
cd /Users/lucasmenezes/Downloads/js-curso-2-aula1/projeto\ analise\ atletas
```

### 2. Instalar Dependências

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd ../server
npm install
```

## ▶️ Executar a Aplicação

### Terminal 1 - Backend
```bash
cd server
npm run dev
```

O servidor estará em: `http://localhost:5000`

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

A aplicação estará em: `http://localhost:5173`

## 📁 Estrutura do Projeto

```
projeto analise atletas/
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

## 🔌 API Endpoints

### Atletas
- `GET /api/athletes` - Listar todos
- `GET /api/athletes/:id` - Detalhes de um atleta
- `POST /api/athletes` - Criar novo
- `PUT /api/athletes/:id` - Atualizar
- `DELETE /api/athletes/:id` - Deletar

### Adversários
- `GET /api/opponents` - Listar todos
- `GET /api/opponents/:id` - Detalhes
- `POST /api/opponents` - Criar novo
- `PUT /api/opponents/:id` - Atualizar
- `DELETE /api/opponents/:id` - Deletar

### IA/Estratégia
- `POST /api/ai/strategy` - Gerar estratégia
  ```json
  {
    "athleteId": "1",
    "opponentId": "2"
  }
  ```

## 🎨 Páginas da Aplicação

1. **Dashboard** (`/`) - Visão geral com estatísticas e gráficos
2. **Atletas** (`/athletes`) - Gerenciar atletas
3. **Detalhe Atleta** (`/athletes/:id`) - Perfil completo do atleta
4. **Adversários** (`/opponents`) - Gerenciar adversários
5. **Comparador** (`/compare`) - Análise lado a lado
6. **Estratégia** (`/strategy`) - Gerador de planos com IA

## 🛠️ Stack Tecnológico

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

## 📝 Dados de Exemplo

A aplicação vem com dados mock pré-carregados para testes:

### Atletas
- João Silva - Roxa, Guarda, 85kg
- Maria Santos - Azul, Passagem, 62kg
- Carlos Oliveira - Marrom, Pressão, 92kg

### Adversários
- Pedro Ramos - Marrom, Pressão, 90kg
- Ana Costa - Roxa, Explosão, 65kg

## 🔄 Próximas Implementações

- [ ] Integração com Supabase/Firebase
- [ ] Upload de vídeos
- [ ] Autenticação de usuários
- [ ] Histórico de lutas
- [ ] Integração com IA real (OpenAI, Claude)
- [ ] Estatísticas avançadas
- [ ] Sistema de notificações
- [ ] Export de relatórios (PDF)

## 📖 Documentação de Componentes

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

## 🐛 Troubleshooting

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

## 💡 Dicas de Desenvolvimento

1. **Adicionar novo atleta**: Vá para `/athletes` e clique em "Novo Atleta"
2. **Testar IA**: Selecione um atleta e adversário em `/strategy`
3. **Ver comparação**: Use `/compare` para análise visual
4. **Verificar dados**: Abra o DevTools (F12) para ver requisições

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique se o servidor está rodando (`npm run dev`)
2. Limpe o cache do navegador (Ctrl+Shift+Delete)
3. Reinicie ambos os servidores

## 📄 Licença

Este projeto é desenvolvido como propósito educacional.

---

**🥋 Desenvolvido para Análise Tática de Jiu-Jitsu | v1.0**
