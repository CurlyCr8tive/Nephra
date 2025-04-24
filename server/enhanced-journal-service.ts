/**
 * Enhanced Journal Service - Integrates functionality from the Python chatbot implementation
 * Provides multi-modal AI analysis of journal entries with fallback options
 */
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { JournalEntry, InsertJournalEntry, journalEntries } from "@shared/schema";
import { db } from "./db";
import * as perplexityService from "./perplexity-service";
import * as mockAiService from "./mock-ai-service";
import * as supabaseService from "./supabase-service";

// Initialize API clients
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || '' 
});

// Initialize Google Generative AI with proper configuration
// For Gemini models, version should match current API version (v1) 
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ''
);

// Types for AI responses
interface AIJournalAnalysis {
  stress: number;
  fatigue: number;
  response: string;
  link?: string;
}

/**
 * Analyze journal entry with OpenAI
 * 
 * @param entry The journal entry text
 * @returns Analysis with stress, fatigue scores and supportive response
 */
export async function analyzeWithOpenAI(entry: string): Promise<AIJournalAnalysis> {
  const systemPrompt = `
    You are a compassionate emotional wellness assistant for kidney patients.
    Estimate stress and fatigue from 1–10, then give a kind, encouraging reply.
    
    Your response must fit in a mobile app card (under 400 words).
    Keep your language simple and supportive, focusing on the most important feedback.
    
    Also, include a single suggestion from a public health source and a relevant link.
    
    Output this JSON: { "stress": X, "fatigue": Y, "response": "...", "link": "..." }
    Make sure to properly escape any quotes or special characters in your response.
  `;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: entry }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the response as JSON
    const content = completion.choices[0].message.content || '{}';
    try {
      const result = JSON.parse(content);
      return {
        stress: Math.min(10, Math.max(1, result.stress || 5)),
        fatigue: Math.min(10, Math.max(1, result.fatigue || 5)),
        response: result.response || "I analyzed your entry but couldn't generate a detailed response.",
        link: result.link || ""
      };
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      return {
        stress: 5,
        fatigue: 5,
        response: content.substring(0, 500) || "I analyzed your entry but couldn't structure my response properly.",
        link: ""
      };
    }
  } catch (error) {
    console.error("OpenAI failed, falling back to Gemini...", error);
    return analyzeWithGemini(entry);
  }
}

/**
 * Analyze journal entry with Google Gemini (fallback option)
 * 
 * @param entry The journal entry text
 * @returns Analysis with stress, fatigue scores and supportive response
 */
async function analyzeWithGemini(entry: string): Promise<AIJournalAnalysis> {
  try {
    // Use the current 1.5 model which replaced gemini-pro
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `
      As a wellness assistant for kidney patients, estimate stress and fatigue levels from 1–10.
      Then give an encouraging response (maximum 400 words) that is supportive and includes a health suggestion with a credible source link.
      
      Keep your response focused on being encouraging. Your response must fit within a UI card.
      
      Output your response in this JSON format (ensure the response is properly formatted): 
      { "stress": X, "fatigue": Y, "response": "...", "link": "..." }
      
      Make sure to properly escape any quotes or special characters in your response text.
      
      Entry:
      ${entry}
    `;
    
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Try to parse the response as JSON
    try {
      const parsedResponse = JSON.parse(responseText);
      return {
        stress: Math.min(10, Math.max(1, parsedResponse.stress || 5)),
        fatigue: Math.min(10, Math.max(1, parsedResponse.fatigue || 5)),
        response: parsedResponse.response || responseText,
        link: parsedResponse.link || ""
      };
    } catch (parseError) {
      // If parsing fails, extract values using regex and make best effort
      const stressMatch = responseText.match(/stress:?\s*(\d+)/i);
      const fatigueMatch = responseText.match(/fatigue:?\s*(\d+)/i);
      
      return {
        stress: stressMatch ? Math.min(10, Math.max(1, parseInt(stressMatch[1]))) : 5,
        fatigue: fatigueMatch ? Math.min(10, Math.max(1, parseInt(fatigueMatch[1]))) : 5,
        response: responseText.substring(0, 500), // Limit length for safety
        link: ""
      };
    }
  } catch (error) {
    console.error("Gemini analysis failed, trying Perplexity...", error);
    
    // Try Perplexity as a final fallback
    try {
      return await perplexityService.analyzeJournalEntry(entry);
    } catch (perplexityError) {
      console.error("All AI services failed:", perplexityError);
      // Return default values if all else fails
      return {
        stress: 5,
        fatigue: 5,
        response: "I'm having trouble analyzing your entry right now, but I appreciate you sharing. How else can I support you today?",
        link: ""
      };
    }
  }
}

/**
 * Process and save a journal entry with enhanced AI analysis
 * 
 * @param userId The user's ID
 * @param content The journal entry content
 * @returns The processed journal entry with AI analysis
 */
export async function processEnhancedJournalEntry(
  userId: number,
  content: string
): Promise<{ entry: JournalEntry, aiAnalysis: AIJournalAnalysis }> {
  // Perform AI analysis
  console.log("Processing journal entry with enhanced AI...");
  const aiAnalysis = await analyzeWithOpenAI(content);
  
  // Determine pain score (defaulting to middle value if not detected)
  // In a more sophisticated implementation, we would extract this from the journal text
  const painScore = 5;
  
  // Create journal entry data
  const journalData: InsertJournalEntry = {
    content: content,
    date: new Date(),
    userId: userId,
    aiResponse: aiAnalysis.response, // Save the full response without truncation
    sentiment: aiAnalysis.response.substring(0, 50), // Use first part of response as sentiment
    stressScore: aiAnalysis.stress,
    fatigueScore: aiAnalysis.fatigue,
    painScore: painScore,
    tags: aiAnalysis.response.toLowerCase().includes("pain") ? ["pain"] : [] // Basic tag extraction
  };
  
  // Insert the entry into the database
  const [savedEntry] = await db.insert(journalEntries).values(journalData).returning();
  
  return {
    entry: savedEntry,
    aiAnalysis
  };
}

/**
 * Get follow-up response to a journal conversation
 * 
 * @param userId The user's ID 
 * @param followUpPrompt The follow-up question from the user
 * @param previousContext Previous conversation for context
 * @returns AI response to the follow-up
 */
export async function getJournalFollowUpResponse(
  userId: number,
  followUpPrompt: string,
  previousContext: { role: 'user' | 'ai', content: string }[]
): Promise<string> {
  try {
    // Format previous conversation for OpenAI chat format
    const messages: {role: 'system' | 'user' | 'assistant', content: string}[] = [
      {
        role: "system",
        content: "You are a compassionate wellness assistant for kidney patients. Provide supportive, evidence-based responses. Include credible health information when appropriate. IMPORTANT: Keep your responses concise (under 400 words) and in plain language as they will be displayed in a mobile app UI card."
      }
    ];
    
    // Add previous context
    for (const message of previousContext) {
      messages.push({
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content
      });
    }
    
    // Add the current message
    messages.push({
      role: "user",
      content: followUpPrompt
    });
    
    // Get response from OpenAI with character limit to prevent truncation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
      messages: messages as any, // Type cast to resolve OpenAI's strict typing
      max_tokens: 1000, // Limit token length to ensure responses don't get truncated
    });
    
    return completion.choices[0].message.content || "I understand your question, but I'm having trouble formulating a response right now.";
  } catch (error) {
    console.error("OpenAI follow-up failed:", error);
    
    // Fallback to Gemini
    try {
      // Use the current 1.5 model which replaced gemini-pro
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      
      // Format context for Gemini
      let contextText = "Previous conversation:\n";
      for (const message of previousContext) {
        contextText += `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}\n`;
      }
      
      const prompt = `
        ${contextText}
        
        User: ${followUpPrompt}
        
        You are a compassionate wellness assistant for kidney patients. Provide a supportive, evidence-based response.
      `;
      
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (geminiError) {
      console.error("Gemini follow-up failed, trying Perplexity...", geminiError);
      
      // Try Perplexity as a final fallback
      try {
        // Create a simple prompt for Perplexity
        const systemPrompt = "You are a compassionate wellness assistant for kidney patients. Provide supportive, evidence-based responses.";
        
        // Format context for Perplexity
        let contextPrompt = "Previous conversation:\n";
        for (const message of previousContext) {
          contextPrompt += `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}\n`;
        }
        contextPrompt += `\nUser: ${followUpPrompt}\n\nProvide a supportive response:`;
        
        // Call Perplexity API
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.1-sonar-small-128k-online",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: contextPrompt
              }
            ],
            temperature: 0.3,
            max_tokens: 1024
          })
        });
        
        if (!response.ok) {
          throw new Error(`Perplexity API error: ${response.status}`);
        }
        
        const perplexityData = await response.json();
        return perplexityData.choices[0].message.content || "I understand your question, but I'm having trouble formulating a response right now.";
      } catch (perplexityError) {
        console.error("All AI services failed for follow-up:", perplexityError);
        return "I'm having trouble responding right now. How else can I support you today?";
      }
    }
  }
}