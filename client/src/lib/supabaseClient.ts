import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Check for environment variables (Vite uses import.meta.env for client-side)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Only create the client if we have the credentials
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase credentials not found. Supabase features will be disabled.');
}

export { supabase };