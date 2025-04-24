import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
// Using process.env as a fallback for SSR environments
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL) as string;
const supabaseKey = (import.meta.env?.VITE_SUPABASE_KEY || process.env?.SUPABASE_KEY) as string;

console.log("Initializing Supabase client in frontend...");

// Function to create client with error handling
const createSupabaseClient = () => {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.warn("Missing Supabase credentials - URL or key is not available");
      return null;
    }
    return createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    console.error("Error creating Supabase client:", error);
    return null;
  }
};

// Create and export the client
export const supabase = createSupabaseClient();

// Export utility to check connection
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    // First try health_logs table
    const { error } = await supabase.from('health_logs').select('user_id').limit(1);
    
    if (!error) return true;
    
    // If that fails, try chat_logs as a fallback
    const { error: chatError } = await supabase.from('chat_logs').select('user_id').limit(1);
    return !chatError;
  } catch (error) {
    console.error('Failed to connect to Supabase:', error);
    return false;
  }
};