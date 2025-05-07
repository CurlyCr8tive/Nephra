import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Check for environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY;

// Only create the client if we have the credentials
let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized');
} else {
  console.warn('Supabase credentials not found. Storage features will not work.');
}

export { supabase };