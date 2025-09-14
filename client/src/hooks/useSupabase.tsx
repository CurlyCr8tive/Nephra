import { createContext, useContext, useEffect, useState } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useToast } from './use-toast';

// SECURITY FIX: Import consolidated Supabase client instead of creating multiple instances
import { supabase } from '@/lib/supabaseClient';

interface SupabaseContextType {
  supabase: SupabaseClient;
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // SECURITY FIX: Use consolidated single Supabase instance to prevent multiple GoTrueClient warnings

  useEffect(() => {
    async function checkConnection() {
      // SECURITY FIX: Check if single consolidated Supabase client exists  
      if (!supabase) {
        setError(new Error('Supabase client not initialized'));
        setIsConnected(false);
        setIsConnecting(false);
        return;
      }

      try {
        setIsConnecting(true);
        
        // Test connection by making a simple query
        const { error } = await supabase
          .from('health_logs')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('Supabase connection error:', error.message);
          setError(new Error(error.message));
          setIsConnected(false);
          
          // Show a toast only if not a "does not exist" error (might be first run)
          if (!error.message.includes('does not exist')) {
            toast({
              title: 'Database connection issue',
              description: 'Unable to connect to the health database. Some features may be limited.',
              variant: 'destructive',
            });
          }
        } else {
          console.log('✅ Connected to Supabase successfully');
          setIsConnected(true);
          setError(null);
        }
      } catch (err) {
        console.error('Supabase initialization error:', err);
        setError(err instanceof Error ? err : new Error('Unknown Supabase connection error'));
        setIsConnected(false);
        
        toast({
          title: 'Database connection failed',
          description: 'Unable to connect to the database. Some features may be limited.',
          variant: 'destructive',
        });
      } finally {
        setIsConnecting(false);
      }
    }

    checkConnection();
  }, [supabase, toast]);

  return (
    <SupabaseContext.Provider value={{ supabase, isConnected, isConnecting, error }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}

// Utility functions for common Supabase operations

/**
 * Fetches health logs for the current user
 * @param userId The user ID
 * @param limit Maximum number of records to fetch
 * @returns Health logs array
 */
export async function fetchHealthLogs(supabase: SupabaseClient, userId: string | number, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching health logs:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch health logs:', error);
    return [];
  }
}

/**
 * Saves a health log entry to Supabase
 * @param supabase Supabase client
 * @param healthData Health data to save
 * @returns Success result and data
 */
export async function saveHealthLog(
  supabase: SupabaseClient, 
  healthData: any
): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    // Ensure created_at is set if not provided
    if (!healthData.created_at) {
      healthData.created_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('health_logs')
      .insert([healthData])
      .select();
    
    if (error) {
      console.error('Error saving health data:', error.message);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save health data:', error);
    return { success: false, error };
  }
}

/**
 * Fetches education articles with optional filtering
 * @param supabase Supabase client
 * @param category Optional category filter
 * @param limit Maximum number of articles to return
 * @returns Education articles array
 */
export async function fetchEducationArticles(
  supabase: SupabaseClient,
  category?: string,
  limit = 10
) {
  try {
    let query = supabase
      .from('education_articles')
      .select('*')
      .limit(limit);
    
    // Apply category filter if provided
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      // Don't treat "does not exist" as an error, just return empty array
      if (error.message?.includes('does not exist')) {
        console.warn('education_articles table does not exist in Supabase');
        return [];
      }
      
      console.error('Error fetching education articles:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch education articles:', error);
    return [];
  }
}

/**
 * Searches education articles using text query
 * @param supabase Supabase client
 * @param query Search text
 * @param limit Maximum number of results
 * @returns Matching education articles
 */
export async function searchEducationArticles(
  supabase: SupabaseClient,
  query: string,
  limit = 5
) {
  try {
    // Split query into words for better matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (queryWords.length === 0) {
      return [];
    }
    
    // First try full-text search if available
    try {
      const { data, error } = await supabase
        .from('education_articles')
        .select('*')
        .textSearch('search_vector', queryWords.join(' & '))
        .limit(limit);
      
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // If text search fails (column might not exist), continue to fallback
      console.warn('Full-text search failed, using fallback method:', e);
    }
    
    // Fallback to basic search
    const { data, error } = await supabase
      .from('education_articles')
      .select('*')
      .limit(limit * 3); // Get more to filter client side
    
    if (error) {
      if (error.message?.includes('does not exist')) {
        return [];
      }
      
      console.error('Error searching education articles:', error.message);
      return [];
    }
    
    // Filter results client-side by relevance
    const matchedArticles = (data || []).filter(article => {
      const titleMatch = queryWords.some(word => 
        article.title?.toLowerCase().includes(word)
      );
      const summaryMatch = queryWords.some(word => 
        article.summary?.toLowerCase().includes(word)
      );
      const tagMatch = article.user_focus_tags?.some((tag: string) => 
        queryWords.some(word => tag.toLowerCase().includes(word))
      );
      
      return titleMatch || summaryMatch || tagMatch;
    }).slice(0, limit);
    
    return matchedArticles;
  } catch (error) {
    console.error('Failed to search education articles:', error);
    return [];
  }
}

/**
 * Saves chat log to Supabase
 * @param supabase Supabase client
 * @param userId User ID
 * @param userInput User message
 * @param aiResponse AI response
 * @param model AI model used
 * @param tags Optional tags
 * @param emotionalScore Optional emotional score
 * @returns Success result and data
 */
export async function saveChatLog(
  supabase: SupabaseClient,
  userId: string | number,
  userInput: string,
  aiResponse: string,
  model = 'openai',
  tags: string[] = [],
  emotionalScore?: number
): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    
    const chatData = {
      user_id: userIdStr,
      user_input: userInput,
      ai_response: aiResponse,
      model_used: model,
      timestamp: new Date().toISOString(),
      tags,
      emotional_score: emotionalScore
    };
    
    const { data, error } = await supabase
      .from('chat_logs')
      .insert([chatData])
      .select();
    
    if (error) {
      console.error('Error saving chat log:', error.message);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save chat log:', error);
    return { success: false, error };
  }
}

/**
 * Fetches chat history for a user
 * @param supabase Supabase client
 * @param userId User ID
 * @param limit Maximum number of records
 * @returns Chat history array
 */
export async function fetchChatHistory(
  supabase: SupabaseClient,
  userId: string | number,
  limit = 10
) {
  try {
    const userIdStr = typeof userId === 'number' ? userId.toString() : userId;
    
    const { data, error } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('user_id', userIdStr)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching chat history:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }
}