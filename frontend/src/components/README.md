# 🧩 Componentes

Estrutura organizada de componentes React por categoria.

## 📁 Estrutura

### analysis/
Componentes relacionados a análises táticas e estratégias.

- **AiStrategyBox.jsx** - Caixa de estratégia gerada por IA com edição manual
- **StrategySummaryModal.jsx** - Modal completo para visualizar e editar estratégias
- **AnalysisCard.jsx** - Card de análise tática
- **AnalysisDetailModal.jsx** - Modal com detalhes completos da análise

**Usado em:** `Analyses.jsx`, `Strategy.jsx`, `PersonDetail.jsx`

### chat/
Componentes de chat com IA para refinar conteúdo.

- **AiChatPanel.jsx** - Chat para refinar análises de vídeo
- **ProfileChatPanel.jsx** - Chat para melhorar perfis de atletas/adversários
- **StrategyChatPanel.jsx** - Chat para refinar estratégias táticas
- **EditableAnalysisText.jsx** - Texto editável inline com suporte a diff
- **VersionHistoryPanel.jsx** - Histórico de versões de análises
- **ProfileVersionHistoryPanel.jsx** - Histórico de versões de perfis

**Fluxo:** Usuário envia mensagem → IA sugere edição → Diff exibido → Aceitar/Rejeitar

**Usado em:** `Analyses.jsx`, `PersonDetail.jsx`, `Strategy.jsx`

### video/
Componentes para análise de vídeos.

- **VideoAnalysis.jsx** - Componente principal de análise de vídeos
- **VideoAnalysisCard.jsx** - Card de vídeo analisado
- **VideoAnalysisEmptyState.jsx** - Estado vazio quando não há vídeos

**Usado em:** `VideoAnalysis.jsx` (page), `PersonDetail.jsx`

### charts/
Componentes de gráficos e visualizações.

- **StatsRadarChart.jsx** - Gráfico radar de estatísticas
- **StatsLineChart.jsx** - Gráfico de linha (evolução)
- **StatsBarChart.jsx** - Gráfico de barras
- **PieChartSection.jsx** - Seção com gráfico de pizza

**Usado em:** `Overview.jsx`, `PersonDetail.jsx`, `VideoAnalysis.jsx`, `AnalysisDetailModal.jsx`

### common/
Componentes reutilizáveis em toda aplicação.

- **Header.jsx** - Cabeçalho de navegação
- **AthleteCard.jsx** - Card de atleta/adversário (só nome, faixa, contagem de análises e criador)
- **QuickAddModal.jsx** - Cadastro rápido sobre `Modal` + `PersonForm`
- **LoadingSpinner.jsx** - Indicador de carregamento
- **ErrorMessage.jsx** - Exibição de erros
- **Modal.jsx** - Modal base reutilizável
- **Badge.jsx** - Tag/badge reutilizável para categorias e status
- **FormattedText.jsx** - Renderização de texto com suporte a markdown

**Usado em:** Todas as páginas

### forms/
Formulários de cadastro e edição.

- **PersonForm.jsx** - Formulário único de atleta/adversário (nome + faixa; envia só `{ name, belt }`)

**Usado em:** `PersonList.jsx`, `PersonDetail.jsx`, `QuickAddModal.jsx`

### person/
Peças da página de detalhe (`pages/PersonDetail.jsx`, spec 012).

- **PersonHeader.jsx** - Nome, seletor de faixa, ações
- **BeltSelect.jsx** - `<select>` nativo com as cores de `constants/persons.js`
- **TechnicalSummaryPanel.jsx** - Painel único do resumo técnico, recolhido por padrão
- **AnalysesSection.jsx** - Lista de análises de vídeo
- **PersonDetailSkeleton.jsx** - Estado de carregamento

### routing/
Componentes relacionados a roteamento.

- **ProtectedRoute.jsx** - Proteção de rotas autenticadas
- **ProtectedRoute.test.jsx** - Testes do componente

**Usado em:** `App.jsx`

## 🔄 Importação

```jsx
// Analysis
import AiStrategyBox from '../components/analysis/AiStrategyBox';
import StrategySummaryModal from '../components/analysis/StrategySummaryModal';
import AnalysisCard from '../components/analysis/AnalysisCard';

// Chat
import AiChatPanel from '../components/chat/AiChatPanel';
import ProfileChatPanel from '../components/chat/ProfileChatPanel';
import StrategyChatPanel from '../components/chat/StrategyChatPanel';
import VersionHistoryPanel from '../components/chat/VersionHistoryPanel';
import ProfileVersionHistoryPanel from '../components/chat/ProfileVersionHistoryPanel';
import EditableAnalysisText from '../components/chat/EditableAnalysisText';

// Video
import VideoAnalysis from '../components/video/VideoAnalysis';

// Charts
import StatsRadarChart from '../components/charts/StatsRadarChart';
import PieChartSection from '../components/charts/PieChartSection';

// Common
import Header from '../components/common/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Badge from '../components/common/Badge';
import FormattedText from '../components/common/FormattedText';

// Forms
import PersonForm from '../components/forms/PersonForm';

// Routing
import ProtectedRoute from '../components/routing/ProtectedRoute';
```

## 🛠️ Utilitários

Funções auxiliares em `src/utils/`:

```jsx
// Manipulação de dados de estratégia
import { 
  extractStrategyContent, 
  updateStrategyField, 
  normalizeStrategyStructure 
} from '../utils/strategyUtils';

// Formatação de texto
import { formatObjectToText } from '../utils/formatters';
```

## 📝 Convenções

- **Nome de arquivo:** PascalCase (`AthleteCard.jsx`)
- **Export:** `export default function ComponentName()`
- **Imports:** Paths relativos (`../components/...`)
- **Props:** Tipadas com PropTypes ou comentários
- **Testes:** Na mesma pasta ou em `__tests__/`
- **Componentes reutilizáveis:** Sempre em `common/`
- **Funções utilitárias:** Sempre em `utils/`

## ✨ Melhores Práticas

1. **Separação de responsabilidades:** Cada componente tem função única
2. **Reutilização:** Componentes em `common/` são genéricos
3. **Organização por feature:** `analysis/`, `video/`, `chat/` agrupam por funcionalidade
4. **Testes próximos:** Testes na mesma pasta do componente
5. **Documentação:** Comentários JSDoc para props complexas
6. **Evitar duplicação:** Extrair código comum para `common/` ou `utils/`
