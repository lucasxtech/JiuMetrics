# 🧩 Componentes

Estrutura organizada de componentes React por categoria.

## 📁 Estrutura

### analysis/
Componentes relacionados a análises táticas e estratégias.

- **AiStrategyBox.jsx** - Caixa de estratégia gerada por IA
- **AnalysisCard.jsx** - Card de análise tática
- **AnalysisDetailModal.jsx** - Modal com detalhes completos da análise

**Usado em:** `Analyses.jsx`, `Strategy.jsx`, `AthleteDetail.jsx`

### video/
Componentes para análise de vídeos.

- **VideoAnalysis.jsx** - Componente principal de análise de vídeos
- **VideoAnalysisCard.jsx** - Card de vídeo analisado
- **VideoAnalysisEmptyState.jsx** - Estado vazio quando não há vídeos

**Usado em:** `VideoAnalysis.jsx` (page), `AthleteDetail.jsx`

### charts/
Componentes de gráficos e visualizações.

- **StatsRadarChart.jsx** - Gráfico radar de estatísticas
- **StatsLineChart.jsx** - Gráfico de linha (evolução)
- **StatsBarChart.jsx** - Gráfico de barras
- **PieChartSection.jsx** - Seção com gráfico de pizza

**Usado em:** `Overview.jsx`, `AthleteDetail.jsx`, `VideoAnalysis.jsx`, `AnalysisDetailModal.jsx`

### common/
Componentes reutilizáveis em toda aplicação.

- **Header.jsx** - Cabeçalho de navegação
- **AthleteCard.jsx** - Card de atleta/adversário
- **LoadingSpinner.jsx** - Indicador de carregamento
- **ErrorMessage.jsx** - Exibição de erros
- **Modal.jsx** - Modal base reutilizável

**Usado em:** Todas as páginas

### forms/
Formulários de cadastro e edição.

- **AthleteForm.jsx** - Formulário de atleta/adversário

**Usado em:** `Athletes.jsx`, `Opponents.jsx`, `AthleteDetail.jsx`

### routing/
Componentes relacionados a roteamento.

- **ProtectedRoute.jsx** - Proteção de rotas autenticadas
- **ProtectedRoute.test.jsx** - Testes do componente

**Usado em:** `App.jsx`

## 🔄 Importação

```jsx
// Analysis
import AiStrategyBox from '../components/analysis/AiStrategyBox';
import AnalysisCard from '../components/analysis/AnalysisCard';

// Video
import VideoAnalysis from '../components/video/VideoAnalysis';

// Charts
import StatsRadarChart from '../components/charts/StatsRadarChart';
import PieChartSection from '../components/charts/PieChartSection';

// Common
import Header from '../components/common/Header';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Forms
import AthleteForm from '../components/forms/AthleteForm';

// Routing
import ProtectedRoute from '../components/routing/ProtectedRoute';
```

## 📝 Convenções

- **Nome de arquivo:** PascalCase (`AthleteCard.jsx`)
- **Export:** `export default function ComponentName()`
- **Imports:** Paths relativos (`../components/...`)
- **Props:** Tipadas com PropTypes ou comentários
- **Testes:** Na mesma pasta ou em `__tests__/`

## ✨ Melhores Práticas

1. **Separação de responsabilidades:** Cada componente tem função única
2. **Reutilização:** Componentes em `common/` são genéricos
3. **Organização por feature:** `analysis/`, `video/` agrupam por funcionalidade
4. **Testes próximos:** Testes na mesma pasta do componente
5. **Documentação:** Comentários JSDoc para props complexas
