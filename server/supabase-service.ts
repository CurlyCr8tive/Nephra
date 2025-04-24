/**
 * Supabase Service for Nephra App
 * 
 * This service provides integration with Supabase for educational content,
 * chatbot support, and other features requiring external data.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

let supabase: SupabaseClient;

try {
  console.log('Initializing Supabase client');
  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  console.error('Failed to initialize Supabase:', error);
  throw new Error('Supabase initialization failed');
}

/**
 * Interfaces for Supabase data structures
 */
export interface EducationalContent {
  id: number;
  title: string;
  content: string;
  summary: string;
  category: string;
  tags: string[];
  source_url: string;
  created_at: string;
  updated_at: string;
}

export interface ChatbotResource {
  id: number;
  query_pattern: string;
  response: string;
  source_urls: string[];
  category: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get educational content from Supabase
 * 
 * @param category Optional category filter
 * @param query Optional search query
 * @param limit Maximum number of results to return
 * @returns Array of educational content items
 */
export async function getEducationalContent(
  category?: string,
  query?: string,
  limit: number = 10
): Promise<EducationalContent[]> {
  try {
    let request = supabase
      .from('educational_content')
      .select('*')
      .limit(limit);
    
    if (category) {
      request = request.eq('category', category);
    }
    
    if (query) {
      request = request.textSearch('content', query);
    }
    
    const { data, error } = await request;
    
    if (error) {
      console.error('Error fetching educational content:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Supabase educational content query failed:', error);
    return [];
  }
}

/**
 * Get relevant chatbot responses from Supabase
 * 
 * @param query The user query to match against patterns
 * @returns The most relevant chatbot resource
 */
export async function getChatbotResponse(query: string): Promise<ChatbotResource | null> {
  try {
    // Search for exact matches first
    let { data, error } = await supabase
      .from('chatbot_resources')
      .select('*')
      .textSearch('query_pattern', query)
      .limit(1);
    
    if (error) {
      console.error('Error fetching chatbot response:', error);
      return null;
    }
    
    // If no exact matches, search for partial matches
    if (!data || data.length === 0) {
      // Extract keywords by removing common words
      const keywords = query
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 3 && !['what', 'when', 'where', 'which', 'how', 'why', 'is', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'can', 'does', 'did', 'has', 'have', 'had', 'been', 'being', 'this', 'that', 'these', 'those', 'with', 'from', 'about'].includes(word))
        .join(' ');
      
      if (keywords.length > 0) {
        const { data: keywordData, error: keywordError } = await supabase
          .from('chatbot_resources')
          .select('*')
          .textSearch('query_pattern', keywords, { type: 'websearch' })
          .limit(1);
        
        if (!keywordError && keywordData && keywordData.length > 0) {
          return keywordData[0];
        }
      }
    } else {
      return data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Supabase chatbot query failed:', error);
    return null;
  }
}

/**
 * Store a user chat interaction in Supabase for analytics and improvement
 * 
 * @param userId The user ID (anonymized if privacy is a concern)
 * @param query The user's query
 * @param response The response provided
 * @param wasHelpful Whether the user indicated the response was helpful
 */
export async function logChatInteraction(
  userId: number,
  query: string,
  response: string,
  wasHelpful?: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('chat_interactions')
      .insert([
        {
          user_id: userId,
          query,
          response,
          was_helpful: wasHelpful,
          timestamp: new Date().toISOString()
        }
      ]);
    
    if (error) {
      console.error('Error logging chat interaction:', error);
    }
  } catch (error) {
    console.error('Supabase chat log failed:', error);
  }
}

/**
 * Log a chat message to Supabase with detailed metadata.
 * This function aligns with the Python implementation for consistency.
 * 
 * @param userId The user's ID
 * @param userInput The message from the user
 * @param aiResponse The AI-generated response
 * @param modelUsed The AI model used (openai, gemini, perplexity)
 * @param tags Optional array of keywords detected in the conversation
 * @param emotionalScore Optional emotional intensity score (1-10)
 * @returns The Supabase response object or null if operation failed
 */
export async function logChatToSupabase(
  userId: string | number,
  userInput: string,
  aiResponse: string,
  modelUsed: string = 'openai',
  tags?: string[],
  emotionalScore?: number
): Promise<any> {
  try {
    const data: any = {
      user_id: userId,
      user_input: userInput,
      ai_response: aiResponse,
      model_used: modelUsed,
      timestamp: new Date().toISOString()
    };

    if (tags) {
      data.tags = tags;
    }
    
    if (emotionalScore !== undefined) {
      data.emotional_score = emotionalScore;
    }

    const { data: result, error } = await supabase
      .from('chat_logs')
      .insert([data])
      .select();
    
    if (error) {
      console.error('Error logging chat to Supabase:', error);
      return null;
    }
    
    console.log(`✅ Logged chat to Supabase: ${userInput.substring(0, 30)}...`);
    return result;
  } catch (error) {
    console.error('Supabase chat log failed:', error);
    return null;
  }
}

/**
 * Get chat logs from Supabase
 * 
 * @param userId User ID to filter by
 * @param limit Maximum number of chat logs to return
 * @returns Chat logs with associated metadata like emotional scores and tags
 */
export async function getChatLogs(userId: string | number, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('chat_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching chat logs from Supabase:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Failed to fetch chat logs from Supabase:', error);
    return [];
  }
}

/**
 * Get journal entries with emotional analysis from Supabase
 * 
 * @param userId User ID to filter by
 * @param limit Maximum number of journal entries to return
 * @returns Journal entries with associated metadata like emotional scores and tags
 */
export async function getJournalEntries(userId: string | number, limit: number = 10) {
  try {
    // First check if we have a dedicated journal_entries table
    let { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error || !data || data.length === 0) {
      // Fall back to chat_logs with filters for journal entries
      const { data: chatData, error: chatError } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_journal', true) // if this column exists
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (chatError) {
        console.error('Error fetching journal entries from Supabase chat_logs:', chatError);
        return [];
      }
      
      return chatData || [];
    }
    
    return data;
  } catch (error) {
    console.error('Failed to fetch journal entries from Supabase:', error);
    return [];
  }
}

/**
 * Check if Supabase connection is working
 * 
 * @returns True if connection is working, false otherwise
 */
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Try first with chat_logs which is our primary integration table
    const { error } = await supabase.from('chat_logs').select('user_id').limit(1);
    
    if (!error) {
      return true;
    }
    
    // Fall back to checking educational_content
    const { error: contentError } = await supabase.from('educational_content').select('id').limit(1);
    return !contentError;
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}

// Export the supabase client for direct use if needed
export { supabase };