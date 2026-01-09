# Componentes de Chat com IA

Esta pasta contém os componentes para o sistema de chat com IA que permite refinar análises de vídeo.

## Componentes

### `AiChatPanel.jsx`
Painel principal de chat com a IA. Permite ao usuário enviar mensagens e receber respostas da IA, incluindo sugestões de edição.

**Props:**
- `analysis` - Objeto da análise atual
- `onClose` - Callback para fechar o painel
- `onApplySuggestion` - Callback para aplicar sugestão de edição
- `onAnalysisUpdated` - Callback quando a análise é atualizada

### `EditableAnalysisText.jsx`
Componente de texto editável inline. Permite ao usuário editar diretamente o resumo ou outros textos da análise.

**Props:**
- `value` - Texto atual
- `onSave` - Callback para salvar alterações
- `label` - Label do campo
- `placeholder` - Placeholder quando vazio
- `maxLength` - Limite de caracteres
- `disabled` - Desabilita edição

### `VersionHistoryPanel.jsx`
Painel que exibe o histórico de versões de uma análise. Permite visualizar e restaurar versões anteriores.

**Props:**
- `analysisId` - ID da análise
- `analysisType` - Tipo ('fight' ou 'tactical')
- `onVersionRestored` - Callback quando uma versão é restaurada
- `onClose` - Callback para fechar o painel

## Uso

```jsx
import AiChatPanel from './chat/AiChatPanel';
import EditableAnalysisText from './chat/EditableAnalysisText';
import VersionHistoryPanel from './chat/VersionHistoryPanel';

// Chat com IA
<AiChatPanel 
  analysis={currentAnalysis}
  onClose={() => setShowChat(false)}
  onApplySuggestion={handleApplySuggestion}
  onAnalysisUpdated={refreshAnalysis}
/>

// Texto editável
<EditableAnalysisText
  value={analysis.summary}
  onSave={(newText) => handleSaveSummary(newText)}
  label="Resumo da Análise"
/>

// Histórico de versões
<VersionHistoryPanel
  analysisId={analysis.id}
  onVersionRestored={(updated) => setAnalysis(updated)}
  onClose={() => setShowHistory(false)}
/>
```

## Fluxo de Funcionamento

1. **Usuário abre chat** → Sessão é criada no backend
2. **Usuário envia mensagem** → IA responde com texto + possível sugestão
3. **Se há sugestão** → Usuário pode aceitar ou ignorar
4. **Ao aceitar** → Análise é atualizada e versão é salva no histórico
5. **Edição manual** → Usuário pode editar diretamente e salvar
6. **Histórico** → Todas as versões ficam disponíveis para restauração
