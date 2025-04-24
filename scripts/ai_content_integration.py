#!/usr/bin/env python3
"""
Nephra AI Content Integration Script

This script handles the integration of AI-generated responses with verified information
from trusted medical sources on kidney health. It ensures that responses to user queries
come from reliable sources rather than potentially inaccurate AI hallucinations.

Key features:
- Retrieves relevant articles from the Supabase database based on query
- Creates context from trusted medical sources
- Generates responses using multiple AI providers with fallback options
- Ensures responses are backed by vetted information
"""

import os
import json
import time
from typing import Dict, List, Any, Optional

# Import AI provider libraries with error handling
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️ OpenAI library not found")

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("⚠️ Google Generative AI library not found")

try:
    import requests
    PERPLEXITY_AVAILABLE = True
except ImportError:
    PERPLEXITY_AVAILABLE = False
    print("⚠️ Requests library not found (needed for Perplexity API)")

# Import database connection
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ Supabase library not found")

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

# Initialize clients
if SUPABASE_AVAILABLE and SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None
    print("⚠️ Supabase client not initialized - check URL and KEY")

if OPENAI_AVAILABLE and OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
else:
    print("⚠️ OpenAI not initialized - check API key")

if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("⚠️ Gemini not initialized - check API key")

def get_relevant_articles(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch relevant articles from the database based on the user query"""
    if not supabase:
        print("❌ Supabase client not available")
        return []
    
    try:
        # In a real implementation, this would use full-text search or embeddings
        # This simplified version just searches for keywords
        keywords = query.lower().split()
        results = []
        
        # Get all education resources
        response = supabase.table("education_resources").select("*").execute()
        
        if hasattr(response, 'data'):
            articles = response.data
            
            # Score articles based on keyword matches
            scored_articles = []
            for article in articles:
                score = 0
                title = article.get("title", "").lower()
                content = article.get("content", "").lower()
                summary = article.get("summary", "").lower()
                
                for keyword in keywords:
                    if keyword in title:
                        score += 3
                    if keyword in summary:
                        score += 2
                    if keyword in content:
                        score += 1
                
                if score > 0:
                    scored_articles.append((score, article))
            
            # Sort by score and take top results
            scored_articles.sort(reverse=True, key=lambda x: x[0])
            results = [article for _, article in scored_articles[:limit]]
            
            print(f"✅ Found {len(results)} relevant articles for query: '{query}'")
            return results
        else:
            print("❌ No data returned from Supabase")
            return []
            
    except Exception as e:
        print(f"❌ Error fetching articles: {e}")
        return []

def create_context_from_articles(articles: List[Dict[str, Any]]) -> str:
    """Create a context string from relevant articles"""
    if not articles:
        return "No relevant information available."
    
    context_parts = []
    
    for i, article in enumerate(articles):
        title = article.get("title", "Untitled")
        source = article.get("source", "Unknown source")
        summary = article.get("summary", "")
        
        # Use summary if available, otherwise use extract from content
        content = summary or article.get("content", "")[:500] + "..."
        
        context_parts.append(f"[Article {i+1}] {title} (Source: {source})\n{content}\n")
    
    return "\n".join(context_parts)

def generate_response_with_openai(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using OpenAI with information from trusted sources"""
    result = {
        "provider": "OpenAI",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not OPENAI_AVAILABLE or not OPENAI_API_KEY:
        result["error"] = "OpenAI not available"
        return result
    
    try:
        # Construct prompt with context
        system_prompt = """You are a specialized medical AI assistant for Nephra, a kidney health app.
Your responses must be based ONLY on the context provided. Do NOT include any information not in the context.
If you don't have enough information in the context, say so - do NOT make up facts.
Format your response in consumer-friendly plain language, making medical information accessible to patients.
Include source reference numbers like [1] when appropriate."""

        user_prompt = f"""Question: {query}

Context from verified medical sources:
{context}

Please answer based only on the context provided above."""

        start_time = time.time()
        
        # Try the latest model first with proper error handling
        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=800,
                temperature=0.5
            )
            result["model"] = "gpt-4o"
            result["response"] = response.choices[0].message.content
        except Exception as e:
            print(f"Error with gpt-4o, trying fallback model: {e}")
            # Fallback to older model and API
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=800,
                temperature=0.5
            )
            result["model"] = "gpt-3.5-turbo"
            result["response"] = response.choices[0].message.content
            
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        result["success"] = True
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ OpenAI API Error: {e}")
    
    return result

def generate_response_with_perplexity(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using Perplexity API with information from trusted sources"""
    result = {
        "provider": "Perplexity",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not PERPLEXITY_AVAILABLE or not PERPLEXITY_API_KEY:
        result["error"] = "Perplexity API not available"
        return result
    
    try:
        system_prompt = """You are a specialized medical AI assistant for Nephra, a kidney health app.
Your responses must be based ONLY on the context provided. Do NOT include any information not in the context.
If you don't have enough information in the context, say so - do NOT make up facts.
Format your response in consumer-friendly plain language, making medical information accessible to patients.
Include source reference numbers like [1] when appropriate."""

        user_prompt = f"""Question: {query}

Context from verified medical sources:
{context}

Please answer based only on the context provided above."""
        
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            "max_tokens": 800,
            "temperature": 0.5,
            "stream": False
        }
        
        start_time = time.time()
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload
        )
        
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        
        if response.status_code == 200:
            response_data = response.json()
            result["model"] = response_data.get("model", "unknown")
            result["response"] = response_data.get("choices", [{}])[0].get("message", {}).get("content", "No content")
            result["success"] = True
        else:
            result["error"] = f"HTTP {response.status_code}: {response.text}"
            
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Perplexity API Error: {e}")
    
    return result

def generate_response_with_gemini(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using Google Gemini with information from trusted sources"""
    result = {
        "provider": "Google Gemini",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not GEMINI_AVAILABLE or not GEMINI_API_KEY:
        result["error"] = "Google Generative AI not available"
        return result
    
    try:
        prompt = f"""You are a specialized medical AI assistant for Nephra, a kidney health app.
Your responses must be based ONLY on the context provided below. Do NOT include any information not in the context.
If you don't have enough information in the context, say so - do NOT make up facts.
Format your response in consumer-friendly plain language, making medical information accessible to patients.
Include source reference numbers like [1] when appropriate.

Question: {query}

Context from verified medical sources:
{context}

Please answer based only on the context provided above."""
        
        start_time = time.time()
        
        # Try the latest model first
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            generation_config = {
                "temperature": 0.5,
                "max_output_tokens": 800,
            }
            response = model.generate_content(prompt, generation_config=generation_config)
            result["model"] = "gemini-1.5-pro"
            result["response"] = response.text
        except Exception as e:
            print(f"Error with gemini-1.5-pro, trying fallback model: {e}")
            # Fallback to older model
            model = genai.GenerativeModel('gemini-pro')
            generation_config = {
                "temperature": 0.5,
                "max_output_tokens": 800,
            }
            response = model.generate_content(prompt, generation_config=generation_config)
            result["model"] = "gemini-pro"
            result["response"] = response.text
            
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        result["success"] = True
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Google Gemini API Error: {e}")
    
    return result

def get_ai_response(query: str) -> Dict[str, Any]:
    """Get response from AI with fallback between providers"""
    print(f"🔍 Processing query: '{query}'")
    
    # Get contextual information from trusted sources
    articles = get_relevant_articles(query)
    context = create_context_from_articles(articles)
    
    sources = []
    for article in articles:
        sources.append({
            "title": article.get("title", "Untitled"),
            "url": article.get("resourceUrl", ""),
            "category": article.get("category", "General")
        })
    
    result = {
        "query": query,
        "response": None,
        "provider_used": None,
        "sources": sources,
        "success": False,
        "error": None
    }
    
    if not articles:
        result["error"] = "No relevant information found in our trusted sources database."
        return result
    
    # Try OpenAI first
    openai_result = generate_response_with_openai(query, context)
    if openai_result["success"]:
        result["response"] = openai_result["response"]
        result["provider_used"] = f"OpenAI ({openai_result['model']})"
        result["success"] = True
        return result
    
    # Fallback to Gemini
    gemini_result = generate_response_with_gemini(query, context)
    if gemini_result["success"]:
        result["response"] = gemini_result["response"]
        result["provider_used"] = f"Google Gemini ({gemini_result['model']})"
        result["success"] = True
        return result
    
    # Fallback to Perplexity
    perplexity_result = generate_response_with_perplexity(query, context)
    if perplexity_result["success"]:
        result["response"] = perplexity_result["response"]
        result["provider_used"] = f"Perplexity ({perplexity_result['model']})"
        result["success"] = True
        return result
    
    # All providers failed
    result["error"] = "All AI providers failed to generate a response."
    if openai_result["error"]:
        result["error"] += f" OpenAI: {openai_result['error']}"
    if gemini_result["error"]:
        result["error"] += f" Gemini: {gemini_result['error']}"
    if perplexity_result["error"]:
        result["error"] += f" Perplexity: {perplexity_result['error']}"
    
    return result

if __name__ == "__main__":
    # Test the integration with a sample query
    test_query = "What foods should I avoid with kidney disease?"
    result = get_ai_response(test_query)
    
    print("\n=== AI Response ===")
    if result["success"]:
        print(f"Provider: {result['provider_used']}")
        print(f"\nResponse:\n{result['response']}")
        print("\nSources:")
        for i, source in enumerate(result["sources"]):
            print(f"[{i+1}] {source['title']} - {source['url']}")
    else:
        print(f"Error: {result['error']}")