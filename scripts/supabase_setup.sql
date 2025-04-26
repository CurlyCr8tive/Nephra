-- Supabase Database Setup for Nephra Application
-- Run this script in your Supabase SQL Editor to create the required tables for the Nephra application

-- Create tables if they don't exist already

-- Table for chat logs
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_input TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  model_used TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  tags TEXT[],
  emotional_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for journal entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_response TEXT,
  sentiment TEXT,
  tags TEXT[],
  stress_score INTEGER,
  fatigue_score INTEGER,
  pain_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for health logs
CREATE TABLE IF NOT EXISTS public.health_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  pain INTEGER,
  stress INTEGER,
  fatigue INTEGER,
  gfr DECIMAL,
  blood_pressure TEXT,
  medications TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table for education articles
CREATE TABLE IF NOT EXISTS public.education_articles (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT,
  tags TEXT[],
  source_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_logs_user_id ON public.chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_health_logs_user_id ON public.health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_education_articles_category ON public.education_articles(category);

-- Enable full-text search for education articles
ALTER TABLE public.education_articles ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content || ' ' || COALESCE(summary, ''))) STORED;

CREATE INDEX IF NOT EXISTS idx_education_articles_fts ON public.education_articles USING GIN (fts);

-- Row-level security policies
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

-- Policies for chat_logs - only authenticated users can see their own chats
CREATE POLICY "Users can view their own chat_logs" 
  ON public.chat_logs FOR SELECT USING (auth.uid()::text = user_id);

-- Policies for journal_entries - only authenticated users can see their own journal entries
CREATE POLICY "Users can view their own journal_entries" 
  ON public.journal_entries FOR SELECT USING (auth.uid()::text = user_id);

-- Policies for health_logs - only authenticated users can see their own health logs
CREATE POLICY "Users can view their own health_logs" 
  ON public.health_logs FOR SELECT USING (auth.uid()::text = user_id);

-- Education articles are public read-only
ALTER TABLE public.education_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Education articles are public" 
  ON public.education_articles FOR SELECT USING (true);

-- Enable authenticated users to insert their own data
CREATE POLICY "Users can insert their own chat_logs" 
  ON public.chat_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own journal_entries" 
  ON public.journal_entries FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own health_logs" 
  ON public.health_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create storage buckets if using Supabase Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('user_documents', 'User Documents', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_images', 'Profile Images', true)
ON CONFLICT (id) DO NOTHING;

-- Grant access to buckets
CREATE POLICY "Users can access their own documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user_documents' AND auth.uid()::text = owner);

CREATE POLICY "Users can upload their documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user_documents' AND auth.uid()::text = owner);

CREATE POLICY "Profile images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'profile_images');

CREATE POLICY "Users can upload their profile images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'profile_images' AND auth.uid()::text = owner);

-- Setup complete
SELECT 'Nephra database setup complete!' as message;