import fetch from 'node-fetch';
import { JournalEntry } from '@shared/schema';

/**
 * Interface for Supabase configuration
 */
interface SupabaseConfig {
  url: string;
  key: string;
}

/**
 * Handles interactions with Supabase for external data storage
 */
export class SupabaseService {
  private config: SupabaseConfig;
  
  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;
    
    if (!url || !key) {
      throw new Error("Supabase URL and Key must be configured in environment variables");
    }
    
    this.config = { url, key };
  }
  
  /**
   * Save journal entry to Supabase
   */
  async saveJournalEntry(journalData: {
    entry: string;
    stress_score: number;
    fatigue_score: number;
    pain_score: number;
    ai_response: string;
    timestamp: string;
    user_id?: number;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/rest/v1/journal_logs`, {
        method: 'POST',
        headers: {
          'apikey': this.config.key,
          'Authorization': `Bearer ${this.config.key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(journalData)
      });
      
      if (response.status !== 201) {
        const errorText = await response.text();
        console.error("Supabase error:", errorText);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error saving to Supabase:", error);
      return false;
    }
  }
  
  /**
   * Export a journal entry from our database to Supabase
   */
  async exportJournalEntryToSupabase(journalEntry: JournalEntry): Promise<boolean> {
    // Convert from our database structure to Supabase structure
    const supabaseData = {
      entry: journalEntry.content,
      stress_score: journalEntry.stressScore || 5,
      fatigue_score: journalEntry.fatigueScore || 5,
      pain_score: journalEntry.painScore || 5,
      ai_response: journalEntry.aiResponse || '',
      timestamp: journalEntry.date?.toISOString() || new Date().toISOString(),
      user_id: journalEntry.userId ? journalEntry.userId : undefined
    };
    
    return this.saveJournalEntry(supabaseData);
  }
  
  /**
   * Utility function to check if Supabase is properly configured
   */
  static isConfigured(): boolean {
    return !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY);
  }
}