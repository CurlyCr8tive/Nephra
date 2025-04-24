import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY || '';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Export utility to check connection
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('health_logs').select('user_id').limit(1);
    return !error;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
};