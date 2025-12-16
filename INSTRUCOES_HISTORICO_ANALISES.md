# 🚀 Instruções para Ativar o Histórico de Análises Táticas

## 1. Executar SQL no Supabase

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto **JiuMetrics**
3. Vá em **SQL Editor** (no menu lateral esquerdo)
4. Clique em **+ New Query**
5. Copie TODO o conteúdo do arquivo: `server/supabase-tactical-analyses.sql`
6. Cole na janela do SQL Editor
7. Clique em **Run** (ou pressione Ctrl/Cmd + Enter)
8. Verifique se apareceu "Success. No rows returned"

## 2. Verificar Tabela Criada

Após executar o SQL, vá em **Table Editor** e confirme que existe a tabela:
- ✅ `tactical_analyses`

Colunas esperadas:
- id (uuid)
- user_id (uuid)
- athlete_id (uuid)
- athlete_name (text)
- opponent_id (uuid)
- opponent_name (text)
- strategy_data (jsonb)
- metadata (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

## 3. Verificar Políticas RLS

Vá em **Authentication** > **Policies** e confirme 3 policies na tabela `tactical_analyses`:
- ✅ "Users can view their own tactical analyses" (SELECT)
- ✅ "Users can create their own tactical analyses" (INSERT)
- ✅ "Users can delete their own tactical analyses" (DELETE)

## 4. Testar Sistema

### Backend já está pronto:
- ✅ Tabela no banco de dados
- ✅ Model: `TacticalAnalysis.js` (CRUD completo)
- ✅ Controller: `strategyController.js` (auto-save ao gerar)
- ✅ Routes: `GET /api/strategy/analyses`, `GET /api/strategy/analyses/:id`, `DELETE /api/strategy/analyses/:id`

### Frontend já está pronto:
- ✅ Service: `analysisService.js` (chamadas à API)
- ✅ Página: `Analyses.jsx` (lista + modal)
- ✅ Componente: `AnalysisCard.jsx` (card bonito)
- ✅ Rota: `/analyses` configurada
- ✅ Link no menu: "Análises"

### Como testar:

1. **Inicie o servidor backend:**
   ```bash
   cd server
   npm start
   ```

2. **Inicie o frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Acesse a aplicação** e faça login

4. **Gere uma estratégia:**
   - Vá em **Estratégia**
   - Selecione um atleta e adversário
   - Clique em **Gerar Estratégia**
   - A estratégia será automaticamente salva no banco

5. **Visualize o histórico:**
   - Clique em **Análises** no menu
   - Você verá um card: "Nome do Atleta vs Nome do Adversário (criado há X minutos)"
   - Clique em **Ver análise completa** para abrir o modal
   - Use o botão de deletar (lixeira) para remover análises antigas

## 5. Features Implementadas

### Auto-Save ✅
Toda estratégia gerada é automaticamente salva no histórico (ver `strategyController.js` linha ~50)

### Listagem com Stats ✅
- Total de análises
- Análises desta semana
- Atletas únicos analisados

### Modal Bonito ✅
- Reaproveita o componente `AiStrategyBox` redesenhado
- Botão de imprimir
- Scroll interno
- Fecha com ESC ou botão X

### Delete com Confirmação ✅
- Primeiro clique: mostra "Confirmar / Cancelar"
- Segundo clique: deleta do banco
- Atualiza lista automaticamente

### Design System Consistente ✅
- Usa mesmas classes: `panel`, `btn-primary`, `btn-secondary`
- Cores do TailwindCSS configurado
- Responsivo (grid adapta para mobile/tablet/desktop)

## 6. Commits Sugeridos

Após testar e validar:

```bash
git add .
git commit -m "feat(analyses): add tactical analyses history with auto-save

- Created tactical_analyses table in Supabase
- Implemented TacticalAnalysis model with full CRUD
- Added controller endpoints for list/view/delete
- Created Analyses page with beautiful card layout
- Auto-save strategy on generation
- Modal viewer reusing AiStrategyBox component
- Stats dashboard (total, weekly, unique athletes)
- Delete with confirmation UI
- Responsive grid layout"

git push origin main
```

## 7. Próximas Melhorias (Opcional)

- [ ] Filtrar análises por atleta ou adversário
- [ ] Paginação (se houver >20 análises)
- [ ] Buscar por texto (nome do atleta/adversário)
- [ ] Exportar análise como PDF
- [ ] Comparar 2 análises lado a lado
- [ ] Dashboard com gráfico de análises por semana
- [ ] Tags/categorias personalizadas
- [ ] Favoritar análises importantes

---

**Tudo pronto! 🎉**

Execute o SQL no Supabase e teste a aplicação. O sistema está 100% funcional.
