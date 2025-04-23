import os
from typing import Dict, List, Any, Optional
from supabase import create_client, Client
import openai
import google.generativeai as genai
import requests
import json

# Load environment variables
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

# Set up clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai.api_key = OPENAI_API_KEY
genai.configure(api_key=GEMINI_API_KEY)

# Cache for storing recently retrieved articles to reduce database calls
article_cache = {}

def get_relevant_articles(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Fetch relevant articles from the database based on the user query"""
    # Extract key terms from the query using OpenAI
    terms_response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "Extract 3-5 key medical terms from this query as a JSON array."},
            {"role": "user", "content": query}
        ],
        response_format={"type": "json_object"}
    )
    
    key_terms = json.loads(terms_response.choices[0].message.content).get("terms", [])
    
    # Check cache first
    cache_key = "-".join(sorted(key_terms))
    if cache_key in article_cache:
        return article_cache[cache_key]
    
    # Query Supabase for relevant articles
    # This uses Postgres full-text search capabilities
    search_terms = " | ".join(key_terms)
    response = supabase.rpc(
        "search_articles",
        {"search_query": search_terms, "max_results": limit}
    ).execute()
    
    articles = response.data if response.data else []
    
    # Cache the results
    article_cache[cache_key] = articles
    return articles

def create_context_from_articles(articles: List[Dict[str, Any]]) -> str:
    """Create a context string from relevant articles"""
    if not articles:
        return ""
    
    context = "Information from trusted medical sources:\n\n"
    for article in articles:
        context += f"Title: {article['title']}\n"
        context += f"Source: {article['source']}\n"
        context += f"Summary: {article['summary']}\n"
        context += f"URL: {article['url']}\n\n"
    
    return context

def generate_response_with_openai(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using OpenAI with information from trusted sources"""
    system_prompt = """
    You are a helpful assistant for kidney disease patients. 
    Provide accurate, compassionate information based on trusted medical sources.
    Always include source citations when providing medical information.
    Be clear about the limitations of your advice and encourage consultation with healthcare providers.
    """
    
    if context:
        system_prompt += f"\n\nUse the following information from trusted sources to inform your response:\n{context}"
    
    try:
        response = openai.ChatCompletion.create(
            model="gpt-4",  # Using GPT-4 for more accurate medical information
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ]
        )
        
        return {
            "provider": "openai",
            "response": response.choices[0].message.content,
            "sources": [article["url"] for article in article_cache.get("-".join(sorted(query.split())), [])]
        }
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

def generate_response_with_perplexity(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using Perplexity API with information from trusted sources"""
    if not PERPLEXITY_API_KEY:
        return None
        
    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type": "application/json"
    }
    
    system_message = """
    You are a helpful assistant for kidney disease patients. 
    Provide accurate, compassionate information based on trusted medical sources.
    Always include source citations when providing medical information.
    Be clear about the limitations of your advice and encourage consultation with healthcare providers.
    """
    
    if context:
        system_message += f"\n\nUse the following information from trusted sources to inform your response:\n{context}"
    
    try:
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": query}
            ],
            "temperature": 0.2,
            "search_domain_filter": [],
            "return_citations": True
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            data = response.json()
            return {
                "provider": "perplexity",
                "response": data["choices"][0]["message"]["content"],
                "sources": data.get("citations", [])
            }
        else:
            print(f"Perplexity API error: {response.status_code}, {response.text}")
            return None
    except Exception as e:
        print(f"Perplexity error: {e}")
        return None

def generate_response_with_gemini(query: str, context: str) -> Dict[str, Any]:
    """Generate a response using Google Gemini with information from trusted sources"""
    try:
        prompt = f"""
        You are a helpful assistant for kidney disease patients. 
        Provide accurate, compassionate information based on trusted medical sources.
        Always include source citations when providing medical information.
        Be clear about the limitations of your advice and encourage consultation with healthcare providers.
        
        {context}
        
        User query: {query}
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        return {
            "provider": "gemini",
            "response": response.text,
            "sources": [article["url"] for article in article_cache.get("-".join(sorted(query.split())), [])]
        }
    except Exception as e:
        print(f"Gemini error: {e}")
        return None

def get_ai_response(query: str) -> Dict[str, Any]:
    """Get response from AI with fallback between providers"""
    # Get relevant articles from our database
    relevant_articles = get_relevant_articles(query)
    context = create_context_from_articles(relevant_articles)
    
    # Try each provider with fallback
    response = generate_response_with_openai(query, context)
    if not response:
        response = generate_response_with_perplexity(query, context)
    if not response:
        response = generate_response_with_gemini(query, context)
    if not response:
        # Last resort fallback without context
        response = {
            "provider": "fallback",
            "response": "I'm sorry, I couldn't retrieve the information you requested. Please try again later or consult with your healthcare provider.",
            "sources": []
        }
    
    # Add metadata showing which source articles were used
    if relevant_articles:
        response["source_articles"] = [
            {"title": article["title"], "source": article["source"], "url": article["url"]}
            for article in relevant_articles
        ]
    
    return response

# Example usage
if __name__ == "__main__":
    # Test the integration
    test_queries = [
        "What should I expect during a kidney transplant evaluation?",
        "How does dialysis work?",
        "What are the common side effects of immunosuppressants?"
    ]
    
    for query in test_queries:
        print(f"\nTesting query: '{query}'")
        response = get_ai_response(query)
        print(f"Response from {response['provider']}: {response['response'][:150]}...")
        if "source_articles" in response:
            print("Sources used:")
            for source in response["source_articles"]:
                print(f"- {source['title']} ({source['source']})")