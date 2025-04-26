/**
 * AI Providers Helper
 * 
 * This module contains helper functions for initializing connections to various AI providers
 * with proper error handling and fallbacks.
 */

import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Anthropic } from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";

// Environment check for AI providers
const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
const hasGeminiKey = !!process.env.GEMINI_API_KEY;
const hasPerplexityKey = !!process.env.PERPLEXITY_API_KEY;
const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

// Status tracking for providers
export const providerStatus = {
  openai: { available: false, lastError: null as Error | null },
  gemini: { available: false, lastError: null as Error | null },
  perplexity: { available: false, lastError: null as Error | null },
  anthropic: { available: false, lastError: null as Error | null }
};

// Create OpenAI client with error handling
export const initOpenAI = (): OpenAI | null => {
  try {
    if (!hasOpenAIKey) {
      console.warn('OpenAI API key not found in environment');
      providerStatus.openai.lastError = new Error('API key not configured');
      return null;
    }
    
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    providerStatus.openai.available = true;
    providerStatus.openai.lastError = null;
    return client;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    providerStatus.openai.available = false;
    providerStatus.openai.lastError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
};

// Create Gemini client with error handling
export const initGemini = (): GoogleGenerativeAI | null => {
  try {
    if (!hasGeminiKey) {
      console.warn('Gemini API key not found in environment');
      providerStatus.gemini.lastError = new Error('API key not configured');
      return null;
    }
    
    const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);
    
    providerStatus.gemini.available = true;
    providerStatus.gemini.lastError = null;
    return client;
  } catch (error) {
    console.error('Failed to initialize Gemini client:', error);
    providerStatus.gemini.available = false;
    providerStatus.gemini.lastError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
};

// Helper for Perplexity API requests
export const fetchFromPerplexity = async (
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  } = {}
): Promise<any> => {
  try {
    if (!hasPerplexityKey) {
      console.warn('Perplexity API key not found in environment');
      providerStatus.perplexity.lastError = new Error('API key not configured');
      throw new Error('Perplexity API key not configured');
    }
    
    const model = options.model || 'llama-3.1-sonar-small-128k-online';
    const temperature = options.temperature ?? 0.2;
    const maxTokens = options.max_tokens ?? 500;
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    providerStatus.perplexity.available = true;
    providerStatus.perplexity.lastError = null;
    
    return result;
  } catch (error) {
    console.error('Error calling Perplexity API:', error);
    providerStatus.perplexity.available = false;
    providerStatus.perplexity.lastError = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

// Create Anthropic client with error handling
export const initAnthropic = (): Anthropic | null => {
  try {
    if (!hasAnthropicKey) {
      console.warn('Anthropic API key not found in environment');
      providerStatus.anthropic.lastError = new Error('API key not configured');
      return null;
    }
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY as string,
    });
    
    providerStatus.anthropic.available = true;
    providerStatus.anthropic.lastError = null;
    return client;
  } catch (error) {
    console.error('Failed to initialize Anthropic client:', error);
    providerStatus.anthropic.available = false;
    providerStatus.anthropic.lastError = error instanceof Error ? error : new Error(String(error));
    return null;
  }
};

// Get status of all AI providers
export const getProvidersStatus = (): Record<string, { available: boolean; lastError: string | null }> => {
  return {
    openai: { 
      available: providerStatus.openai.available,
      lastError: providerStatus.openai.lastError?.message || null
    },
    gemini: { 
      available: providerStatus.gemini.available,
      lastError: providerStatus.gemini.lastError?.message || null
    },
    perplexity: { 
      available: providerStatus.perplexity.available,
      lastError: providerStatus.perplexity.lastError?.message || null
    },
    anthropic: { 
      available: providerStatus.anthropic.available,
      lastError: providerStatus.anthropic.lastError?.message || null
    }
  };
};

// Provides a response from the first available AI provider
export const getResponseFromAvailableProvider = async (
  prompt: string,
  context?: string,
  options: {
    preferredProvider?: 'openai' | 'gemini' | 'perplexity' | 'anthropic';
    fallbackOrder?: Array<'openai' | 'gemini' | 'perplexity' | 'anthropic'>;
    systemPrompt?: string;
  } = {}
): Promise<{ text: string; provider: string; success: boolean }> => {
  const defaultFallbackOrder = ['openai', 'gemini', 'perplexity', 'anthropic'];
  const providersToTry = options.preferredProvider 
    ? [options.preferredProvider, ...defaultFallbackOrder.filter(p => p !== options.preferredProvider)]
    : options.fallbackOrder || defaultFallbackOrder;
  
  // Add context to prompt if provided
  const fullPrompt = context 
    ? `${prompt}\n\nContext information:\n${context}`
    : prompt;
  
  const systemPrompt = options.systemPrompt || 
    "You are Nephra, a helpful assistant for kidney health patients. Provide compassionate, accurate information.";
  
  for (const provider of providersToTry) {
    try {
      let response = "";
      
      switch (provider) {
        case 'openai': {
          const client = initOpenAI();
          if (!client) continue;
          
          const completion = await client.chat.completions.create({
            model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: fullPrompt }
            ],
            max_tokens: 500
          });
          
          response = completion.choices[0].message.content || "";
          break;
        }
        
        case 'gemini': {
          const client = initGemini();
          if (!client) continue;
          
          const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });
          const result = await model.generateContent([
            systemPrompt, 
            fullPrompt
          ]);
          const text = result.response.text();
          response = text;
          break;
        }
        
        case 'perplexity': {
          const result = await fetchFromPerplexity([
            { role: "system", content: systemPrompt },
            { role: "user", content: fullPrompt }
          ]);
          
          response = result.choices[0].message.content;
          break;
        }
        
        case 'anthropic': {
          const client = initAnthropic();
          if (!client) continue;
          
          const message = await client.messages.create({
            model: "claude-3-7-sonnet-20250219", // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            max_tokens: 500,
            system: systemPrompt,
            messages: [
              { role: "user", content: fullPrompt }
            ]
          });
          
          response = message.content[0].text;
          break;
        }
      }
      
      if (response) {
        return { text: response, provider, success: true };
      }
    } catch (error) {
      console.error(`Error with ${provider} provider:`, error);
      // Continue to the next provider
    }
  }
  
  // If all providers failed, return fallback message
  return { 
    text: "I'm sorry, I'm having trouble accessing my knowledge systems at the moment. Please try again later.",
    provider: "fallback",
    success: false
  };
};

// Export initialized clients
export const openai = initOpenAI();
export const gemini = initGemini();
export const anthropic = initAnthropic();