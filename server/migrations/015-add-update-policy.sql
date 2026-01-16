-- Adicionar policy para UPDATE na tabela tactical_analyses
-- Necessário para permitir edição de estratégias via chat IA

CREATE POLICY "Users can update their own tactical analyses"
  ON tactical_analyses
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Comentário
COMMENT ON POLICY "Users can update their own tactical analyses" ON tactical_analyses 
  IS 'Permite que usuários atualizem suas próprias análises táticas';
