import os
import datetime
from typing import List, Dict, Any, Optional
from supabase import create_client, Client
import openai
import google.generativeai as genai
import requests
from bs4 import BeautifulSoup

# Load environment variables from Replit Secrets
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")

# Set up clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None
if OPENAI_API_KEY:
    openai.api_key = OPENAI_API_KEY
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Function to summarize with OpenAI
def summarize_with_openai(text: str) -> str:
    try:
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": f"Summarize this for a kidney disease patient in plain language:\n{text}"}
            ],
            max_tokens=800,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI summarization error: {e}")
        return ""

# Function to summarize with Gemini
def summarize_with_gemini(text: str) -> str:
    try:
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            f"Summarize this for a kidney disease patient in plain language:\n{text}",
            generation_config={"max_output_tokens": 800}
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini summarization error: {e}")
        return ""

# Function to summarize with Perplexity
def summarize_with_perplexity(text: str) -> str:
    try:
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "You summarize medical content for kidney disease patients in plain language."
                    },
                    {
                        "role": "user",
                        "content": f"Summarize this for a kidney disease patient in plain language:\n{text}"
                    }
                ],
                "temperature": 0.2,
                "max_tokens": 800
            }
        )
        response_data = response.json()
        return response_data['choices'][0]['message']['content']
    except Exception as e:
        print(f"Perplexity summarization error: {e}")
        return ""

# Function to fetch and clean article content
def fetch_article_text(url: str) -> str:
    try:
        response = requests.get(url)
        soup = BeautifulSoup(response.text, 'html.parser')
        paragraphs = soup.find_all('p')
        return '\n'.join(p.get_text() for p in paragraphs if len(p.get_text()) > 60)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

# Store articles
def store_articles(articles: List[Dict[str, Any]]):
    for article in articles:
        print(f"Summarizing: {article['title']}...")
        
        # Try different AI providers with fallback
        summary = ""
        try:
            summary = summarize_with_openai(article["content"])
        except Exception as e:
            print(f"OpenAI error, trying Gemini: {e}")
            try:
                summary = summarize_with_gemini(article["content"])
            except Exception as e:
                print(f"Gemini error, trying Perplexity: {e}")
                try:
                    summary = summarize_with_perplexity(article["content"])
                except Exception as e:
                    print(f"All summarization methods failed: {e}")
                    summary = "Summary generation failed. Please try again later."
        
        if not summary:
            print(f"Failed to generate summary for: {article['title']}")
            continue
            
        entry = {
            "title": article["title"],
            "summary": summary,
            "url": article["url"],
            "source": article["source"],
            "published_date": datetime.date.today().isoformat(),
            "category": article["category"],
            "user_focus_tags": article["tags"]
        }
        
        print(f"📝 Storing summary for: {article['title']}")
        try:
            supabase.table("education_articles").insert(entry).execute()
        except Exception as e:
            print(f"Error storing article: {e}")

# Log chat to Supabase
def log_chat_to_supabase(user_id: str, user_input: str, ai_response: str, model_used: str = "openai", tags: Optional[List[str]] = None, emotional_score: Optional[int] = None):
    if not supabase:
        print("⚠️ Supabase client not initialized")
        return None
        
    data = {
        "user_id": user_id,
        "user_input": user_input,
        "ai_response": ai_response,
        "model_used": model_used,
    }
    
    if tags:
        data["tags"] = tags
    if emotional_score is not None:
        data["emotional_score"] = emotional_score

    try:
        response = supabase.table("chat_logs").insert(data).execute()
        print(f"✅ Logged chat to Supabase: {user_input[:30]}...")
        return response
    except Exception as e:
        print(f"Error logging chat: {e}")
        return None

# Generate health suggestion
def generate_health_suggestion(pain: int, stress: int, fatigue: int) -> str:
    prompt = f"""
    The user logged:
    - Pain level: {pain}/10
    - Stress level: {stress}/10
    - Fatigue level: {fatigue}/10

    Write a short, supportive suggestion for managing these symptoms. Include self-care tips. Respond directly to the user in a kind, empathetic tone.
    """
    
    try:
        # Try OpenAI first
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error for health suggestion, trying Gemini: {e}")
        try:
            # Fall back to Gemini
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini error for health suggestion: {e}")
            return "I notice you're experiencing some symptoms. Remember to rest when needed and stay hydrated. Consider reaching out to your healthcare provider if symptoms persist or worsen."

# Log health scores
def log_health_scores(user_id: str, pain: int, stress: int, fatigue: int, notes: str = ""):
    if not supabase:
        print("⚠️ Supabase client not initialized")
        return None
        
    suggestion = generate_health_suggestion(pain, stress, fatigue)

    try:
        response = supabase.table("health_logs").insert({
            "user_id": user_id,
            "pain_score": pain,
            "stress_score": stress,
            "fatigue_score": fatigue,
            "notes": notes,
            "suggestion": suggestion
        }).execute()

        if response.get("error"):
            print("❌ Supabase insert error:", response["error"])
            return None
        else:
            print("✅ Health scores + suggestion saved.")
            return response
    except Exception as e:
        print(f"Error logging health scores: {e}")
        return None

# GFR calculator with enhanced error handling
def calculate_egfr(age: Optional[int], gender: Optional[str], serum_creatinine: float) -> Optional[float]:
    """
    Calculate eGFR using the CKD-EPI 2021 equation (no race factor)
    
    Args:
        age: Patient age in years
        gender: 'male' or 'female' (case insensitive)
        serum_creatinine: Serum creatinine in mg/dL
        
    Returns:
        Estimated GFR in mL/min/1.73m² or None if calculation failed
    """
    # Input validation
    if age is None or age <= 0 or age > 120:
        print(f"⚠️ Invalid age for eGFR calculation: {age}")
        return None
        
    if not gender or not isinstance(gender, str):
        print(f"⚠️ Invalid gender for eGFR calculation: {gender}")
        return None
    
    # Normalize gender input
    gender_normalized = gender.lower().strip()
    print(f"Calculating eGFR - Gender normalized: '{gender_normalized}'")
    
    # Assign coefficients based on gender
    if gender_normalized == 'female':
        k = 0.7
        alpha = -0.241
        sex_factor = 1.012
    elif gender_normalized == 'male':
        k = 0.9
        alpha = -0.302
        sex_factor = 1.0
    else:
        print(f"⚠️ Unsupported gender value for eGFR calculation: '{gender}'")
        return None

    try:
        # Calculate eGFR using CKD-EPI 2021 equation
        scr_k_ratio = serum_creatinine / k
        min_ratio = min(scr_k_ratio, 1)
        max_ratio = max(scr_k_ratio, 1)

        egfr = 142 * (min_ratio ** alpha) * (max_ratio ** -1.200) * (0.9938 ** age) * sex_factor
        return round(egfr, 2)
    except Exception as e:
        print(f"⚠️ Error calculating eGFR: {e}")
        return None

# Function to fetch and refresh user profile data
def fetch_user_profile(user_id: str):
    if not supabase:
        print("⚠️ Supabase client not initialized")
        return None
        
    try:
        response = supabase.table("user_profiles").select("*").eq("user_id", user_id).single().execute()
        if response.get("error"):
            print("❌ Error fetching user profile:", response["error"])
            return None
        return response.get("data")
    except Exception as e:
        print(f"Error fetching user profile: {e}")
        return None