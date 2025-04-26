-- health_logs table
CREATE TABLE IF NOT EXISTS public.health_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  bp_systolic INTEGER,
  bp_diastolic INTEGER,
  hydration_level INTEGER,
  pain_level INTEGER NOT NULL,
  stress_level INTEGER NOT NULL,
  fatigue_level INTEGER NOT NULL,
  estimated_gfr DOUBLE PRECISION,
  tags TEXT[],
  medications_taken TEXT[],
  notes TEXT,
  metadata JSONB
);

-- Add index for faster user queries
CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON public.health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_created_at ON public.health_logs(created_at);

-- chat_logs table
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model_used VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  tags TEXT[],
  emotional_score INTEGER,
  metadata JSONB
);

-- Add index for faster user queries
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON public.chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON public.chat_logs(timestamp);

-- journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sentiment VARCHAR(50),
  ai_analysis TEXT,
  tags TEXT[],
  stress_level INTEGER,
  fatigue_level INTEGER,
  pain_level INTEGER,
  metadata JSONB
);

-- Add index for faster user queries
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at);

-- education_articles table
CREATE TABLE IF NOT EXISTS public.education_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  url TEXT NOT NULL,
  source VARCHAR(255) NOT NULL,
  published_date TIMESTAMP WITH TIME ZONE,
  category VARCHAR(100) NOT NULL,
  user_focus_tags TEXT[],
  image_url TEXT,
  content TEXT,
  search_vector TSVECTOR
);

-- Set up full-text search for education articles
CREATE INDEX IF NOT EXISTS idx_education_articles_search ON public.education_articles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_education_articles_category ON public.education_articles(category);

-- Setup trigger for search vector updates
CREATE OR REPLACE FUNCTION education_articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER education_articles_search_update
BEFORE INSERT OR UPDATE ON public.education_articles
FOR EACH ROW
EXECUTE FUNCTION education_articles_search_vector_update();

-- RLS Policies for tables
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_articles ENABLE ROW LEVEL SECURITY;

-- Make education_articles readable by all authenticated users
CREATE POLICY "Education articles are readable by all authenticated users"
ON public.education_articles FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can only access their own health logs
CREATE POLICY "Users can only access their own health logs"
ON public.health_logs FOR ALL
USING (auth.uid()::text = user_id);

-- Users can only access their own chat logs
CREATE POLICY "Users can only access their own chat logs"
ON public.chat_logs FOR ALL
USING (auth.uid()::text = user_id);

-- Users can only access their own journal entries
CREATE POLICY "Users can only access their own journal entries"
ON public.journal_entries FOR ALL
USING (auth.uid()::text = user_id);