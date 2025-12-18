-- Schema SQL para Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de Atletas
CREATE TABLE IF NOT EXISTS athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  belt VARCHAR(50),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  age INTEGER,
  style VARCHAR(100),
  strong_attacks TEXT,
  weaknesses TEXT,
  video_url TEXT,
  cardio INTEGER DEFAULT 0,
  technical_profile JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Adversários
CREATE TABLE IF NOT EXISTS opponents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  belt VARCHAR(50),
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  age INTEGER,
  style VARCHAR(100),
  strong_attacks TEXT,
  weaknesses TEXT,
  video_url TEXT,
  cardio INTEGER DEFAULT 0,
  technical_profile JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Análises de Luta (IA)
CREATE TABLE IF NOT EXISTS fight_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL,
  person_type VARCHAR(20) NOT NULL CHECK (person_type IN ('athlete', 'opponent')),
  video_url TEXT,
  charts JSONB DEFAULT '[]',
  summary TEXT,
  technical_profile TEXT,
  frames_analyzed INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fight_analyses_person ON fight_analyses(person_id, person_type);
CREATE INDEX IF NOT EXISTS idx_fight_analyses_created ON fight_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_athletes_name ON athletes(name);
CREATE INDEX IF NOT EXISTS idx_opponents_name ON opponents(name);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opponents_updated_at BEFORE UPDATE ON opponents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fight_analyses_updated_at BEFORE UPDATE ON fight_analyses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE opponents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fight_analyses ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (permitir tudo por enquanto - ajuste conforme necessário)
CREATE POLICY "Enable all operations for all users" ON athletes FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON opponents FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON fight_analyses FOR ALL USING (true);
