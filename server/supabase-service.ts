import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseEducationArticle, SupabaseHealthLog, SupabaseChatLog, SupabaseJournalEntry } from '../shared/schema';

// Environment variables for Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Retrieves education articles from Supabase by category
 */
export async function getEducationArticlesByCategory(category?: string, limit: number = 10): Promise<SupabaseEducationArticle[]> {
  try {
    let query = supabase
      .from('education_articles')
      .select('*')
      .limit(limit);
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
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
 * Searches education articles by query text
 */
export async function searchEducationArticles(query: string, limit: number = 5): Promise<SupabaseEducationArticle[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }
  
  try {
    // Split query into words for better search results
    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (queryWords.length === 0) {
      return [];
    }
    
    // Try to use full-text search if available
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
      // If full-text search fails, continue to basic search
      console.warn('Full-text search failed, using fallback method:', e);
    }
    
    // Fallback to basic search
    const { data, error } = await supabase
      .from('education_articles')
      .select('*')
      .limit(limit * 3); // Get more results to filter client-side
    
    if (error) {
      console.error('Error searching education articles:', error.message);
      return [];
    }
    
    // Filter results by relevance
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
 * Saves a health log to Supabase
 */
export async function saveHealthLog(healthLog: SupabaseHealthLog): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    const { data, error } = await supabase
      .from('health_logs')
      .insert([healthLog])
      .select();
    
    if (error) {
      console.error('Error saving health log:', error.message);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save health log:', error);
    return { success: false, error };
  }
}

/**
 * Retrieves health logs for a user
 */
export async function getHealthLogs(userId: string | number, limit: number = 20): Promise<SupabaseHealthLog[]> {
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
 * Saves a chat log to Supabase
 */
export async function saveChatLog(chatLog: SupabaseChatLog): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .insert([chatLog])
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
 * Retrieves chat history for a user
 */
export async function getChatHistory(userId: string | number, limit: number = 10): Promise<SupabaseChatLog[]> {
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('user_id', userId)
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

/**
 * Saves a journal entry to Supabase
 */
export async function saveJournalEntry(journalEntry: SupabaseJournalEntry): Promise<{success: boolean, data?: any, error?: any}> {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([journalEntry])
      .select();
    
    if (error) {
      console.error('Error saving journal entry:', error.message);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save journal entry:', error);
    return { success: false, error };
  }
}

/**
 * Retrieves journal entries for a user
 */
export async function getJournalEntries(userId: string | number, limit: number = 20): Promise<SupabaseJournalEntry[]> {
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching journal entries:', error.message);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch journal entries:', error);
    return [];
  }
}

// Export Supabase client for direct use if needed
export { supabase };