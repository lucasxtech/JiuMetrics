# Componentes de Chat com IA

Esta pasta contém os componentes para o sistema de chat com IA que permite refinar análises, perfis técnicos e estratégias de luta.

## Visão Geral

O sistema de chat é organizado em **três contextos principais**:

| Contexto | Componentes | Finalidade |
|----------|-------------|------------|
| **Análises** | `AiChatPanel` + `VersionHistoryPanel` | Refinar resumos de análises de vídeo |
| **Perfis Técnicos** | `ProfileChatPanel` + `ProfileVersionHistoryPanel` | Editar resumos técnicos de atletas/adversários |
| **Estratégias** | `StrategyChatPanel` + `VersionHistoryPanel` | Refinar estratégias táticas de luta |

---

## Componentes

### `AiChatPanel.jsx`
Painel de chat para refinar **análises de vídeo**. Permite ao usuário enviar mensagens e receber respostas da IA com sugestões de edição.

**Props:**
- `analysis` - Objeto da análise atual
- `onClose` - Callback para fechar o painel
- `onApplySuggestion` - Callback para aplicar sugestão de edição
- `onAnalysisUpdated` - Callback quando a análise é atualizada

---

### `ProfileChatPanel.jsx`
Painel de chat para editar **resumo técnico** de atletas ou adversários.

**Props:**
- `personId` - ID do atleta ou adversário
- `personType` - Tipo: `'athlete'` ou `'opponent'`
- `personName` - Nome para exibição
- `currentSummary` - Resumo técnico atual
- `onSummaryUpdated` - Callback quando o resumo é atualizado
- `onClose` - Callback para fechar o painel

**Características:**
- Mostra diff visual (antes/depois) das sugestões
- Integra com `DiffViewer` para comparação
- Salva versões automaticamente no histórico

---

### `StrategyChatPanel.jsx`
Painel de chat para refinar **estratégias táticas de luta**. Usado na página de detalhes de análise para modificar campos específicos da estratégia.

**Props:**
- `strategy` - Objeto completo da estratégia atual
- `athleteName` - Nome do atleta
- `opponentName` - Nome do adversário
- `onStrategyUpdated` - Callback quando a estratégia é atualizada
- `onPendingEdit` - Callback para exibir diff inline no campo correspondente

**Campos da Estratégia:**
| Campo | Descrição |
|-------|-----------|
| `tese_da_vitoria` | Tese central de como vencer a luta |
| `plano_tatico_faseado` | Plano detalhado por fases da luta |
| `cronologia_inteligente` | Timeline de ações durante a luta |
| `analise_de_matchup` | Análise comparativa atleta vs adversário |
| `checklist_tatico` | Lista de fazer/não fazer durante a luta |

**Mapeamento de Campos (IA → Frontend):**
A IA usa palavras-chave para identificar qual campo modificar:
```
| Palavras no pedido | Campo retornado |
|--------------------|-----------------|
| "tese", "vencer", "vitória" | tese_da_vitoria |
| "plano", "faseado", "fases" | plano_tatico_faseado |
| "cronologia", "tempo", "timeline" | cronologia_inteligente |
| "matchup", "versus", "comparação" | analise_de_matchup |
| "checklist", "lista", "não fazer" | checklist_tatico |
```

---

### `EditableAnalysisText.jsx`
Componente de texto editável inline. Permite ao usuário editar diretamente textos com suporte a sugestões de IA.

**Props:**
- `value` - Texto atual
- `onSave` - Callback para salvar alterações
- `label` - Label do campo
- `placeholder` - Placeholder quando vazio
- `maxLength` - Limite de caracteres
- `disabled` - Desabilita edição
- `pendingEdit` - Sugestão pendente da IA (para diff)

**Funcionalidades:**
- Modo edição com `Textarea` expansível
- Exibe diff visual quando há `pendingEdit`
- Contador de caracteres

---

### `VersionHistoryPanel.jsx`
Painel de histórico de versões para **análises táticas/de luta**.

**Props:**
- `analysisId` - ID da análise
- `analysisType` - Tipo: `'fight'` ou `'tactical'`
- `onVersionRestored` - Callback quando uma versão é restaurada
- `onClose` - Callback para fechar o painel

**Funcionalidades:**
- Lista todas as versões com indicador de "atual"
- Preview do conteúdo de cada versão
- Restaurar versão anterior com confirmação
- Indica se edição foi por usuário ou IA

---

### `ProfileVersionHistoryPanel.jsx`
Painel de histórico de versões para **resumos técnicos de perfis**.

**Props:**
- `personId` - ID do atleta ou adversário
- `personType` - Tipo: `'athlete'` ou `'opponent'`
- `personName` - Nome para exibição
- `onVersionRestored` - Callback quando uma versão é restaurada
- `onClose` - Callback para fechar o painel

**Diferenças do `VersionHistoryPanel`:**
- Usa endpoints específicos de perfil (`/chat/profile-versions/...`)
- Mostra preview do resumo técnico em cada versão

---

## Uso

```jsx
// Chat para Análises
import AiChatPanel from './chat/AiChatPanel';

<AiChatPanel 
  analysis={currentAnalysis}
  onClose={() => setShowChat(false)}
  onApplySuggestion={handleApplySuggestion}
  onAnalysisUpdated={refreshAnalysis}
/>

// Chat para Perfis
import ProfileChatPanel from './chat/ProfileChatPanel';

<ProfileChatPanel
  personId={athlete.id}
  personType="athlete"
  personName={athlete.name}
  currentSummary={athlete.technicalSummary}
  onSummaryUpdated={(newSummary) => setAthlete({...athlete, technicalSummary: newSummary})}
  onClose={() => setShowProfileChat(false)}
/>

// Chat para Estratégias
import StrategyChatPanel from './chat/StrategyChatPanel';

<StrategyChatPanel
  strategy={strategyData}
  athleteName={athlete.name}
  opponentName={opponent.name}
  onStrategyUpdated={handleStrategyUpdated}
  onPendingEdit={setPendingEdit}
/>

// Histórico de Versões
import VersionHistoryPanel from './chat/VersionHistoryPanel';
import ProfileVersionHistoryPanel from './chat/ProfileVersionHistoryPanel';

<VersionHistoryPanel
  analysisId={analysis.id}
  analysisType="tactical"
  onVersionRestored={(updated) => setAnalysis(updated)}
  onClose={() => setShowHistory(false)}
/>

<ProfileVersionHistoryPanel
  personId={opponent.id}
  personType="opponent"
  personName={opponent.name}
  onVersionRestored={(newSummary) => setOpponent({...opponent, technicalSummary: newSummary})}
  onClose={() => setShowProfileHistory(false)}
/>
```

---

## Fluxo de Funcionamento

### Chat de Análises/Perfis
```
1. Usuário abre chat
   └─> Sessão criada no backend

2. Usuário envia mensagem
   └─> IA responde com texto + sugestão de edição

3. Se há sugestão
   ├─> DiffViewer mostra antes/depois
   ├─> Usuário aceita → Conteúdo atualizado + versão salva
   └─> Usuário rejeita → Sugestão descartada

4. Histórico
   └─> Todas as versões disponíveis para restauração
```

### Chat de Estratégias (Fluxo Especial)
```
1. Usuário envia pedido (ex: "refaça o checklist tático")
   └─> IA identifica campo via palavras-chave

2. IA retorna sugestão com campo específico
   └─> { field: "checklist_tatico", newValue: "...", reason: "..." }

3. Frontend recebe via onPendingEdit
   └─> Diff exibido INLINE no campo correspondente (via EditableText)

4. Usuário aceita/rejeita no próprio campo
   ├─> Aceita → Estratégia atualizada
   └─> Rejeita → Diff removido
```

---

## Arquitetura de Serviços

### `chatService.js` - Funções por Contexto

```javascript
// Análises (genérico)
createChatSession(contextType, contextId)
sendChatMessage(sessionId, message)
getAnalysisVersions(analysisId, type)
restoreAnalysisVersion(analysisId, versionNumber)

// Perfis Técnicos
createProfileChatSession(personId, personType, currentSummary)
sendProfileChatMessage(sessionId, message, currentSummary)
saveProfileSummary(personId, personType, newSummary, editReason)
getProfileVersions(personId, personType)
restoreProfileVersion(personId, personType, versionNumber)

// Estratégias
createStrategyChatSession(strategyData, athleteName, opponentName)
sendStrategyChatMessage(sessionId, message, currentStrategy)
```

### Endpoints do Backend

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/chat/session` | Criar sessão genérica |
| POST | `/chat/send` | Enviar mensagem |
| POST | `/chat/apply-edit` | Aplicar sugestão da IA |
| POST | `/chat/manual-edit` | Salvar edição manual |
| GET | `/chat/versions/:id` | Listar versões |
| POST | `/chat/restore-version` | Restaurar versão |
| POST | `/chat/profile-session` | Criar sessão de perfil |
| POST | `/chat/profile-send` | Mensagem em chat de perfil |
| POST | `/chat/profile-save` | Salvar resumo técnico |
| GET | `/chat/profile-versions/:type/:id` | Versões de perfil |
| POST | `/chat/profile-restore` | Restaurar versão de perfil |
| POST | `/chat/strategy-session` | Criar sessão de estratégia |
| POST | `/chat/strategy-send` | Mensagem em chat de estratégia |

---

## Componentes Auxiliares Usados

- `DiffViewer` - Exibe comparação visual antes/depois
- `EditableText` (em `AiStrategyBox`) - Campo com suporte a diff inline
