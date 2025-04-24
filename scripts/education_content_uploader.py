import os
import datetime
from typing import List, Dict, Any
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

# Set up Supabase and AI clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
openai_client = openai.OpenAI(api_key=OPENAI_API_KEY)
genai.configure(api_key=GEMINI_API_KEY)

# Function to summarize with OpenAI (updated for 2024 API)
def summarize_with_openai(text: str) -> str:
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a skilled medical writer who specializes in making complex health information accessible to patients."},
                {"role": "user", "content": f"Summarize this for a kidney disease patient in plain language:\n{text}"}
            ],
            max_tokens=800,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI error: {e}")
        return "Error processing with OpenAI."

# Function to summarize with Gemini
def summarize_with_gemini(text: str) -> str:
    try:
        # Using the latest Gemini model
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            f"Summarize this for a kidney disease patient in plain language:\n{text}",
            generation_config={"max_output_tokens": 800}
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        return "Error processing with Gemini."

# Function to summarize with Perplexity (as fallback)
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
                        "content": "You are a skilled medical writer who specializes in making complex health information accessible to patients."
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
        return response_data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"Perplexity error: {e}")
        return "Error processing with Perplexity."

# Function to fetch and clean article content
def fetch_article_text(url: str) -> str:
    try:
        response = requests.get(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        })
        soup = BeautifulSoup(response.text, 'html.parser')
        paragraphs = soup.find_all('p')
        return '\n'.join(p.get_text() for p in paragraphs if len(p.get_text()) > 60)
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

# Transplant-related articles from trusted sources
articles_to_upload = [
    {
        "title": "Understanding Dialysis",
        "url": "https://medlineplus.gov/dialysis.html",
        "source": "MedlinePlus",
        "category": "Education",
        "tags": ["dialysis", "kidney failure"],
        "content": "Dialysis is a treatment for kidney failure that removes waste, salt, and extra water to prevent them from building up in the body."
    },
    {
        "title": "Chronic Kidney Disease Basics",
        "url": "https://www.cdc.gov/kidneydisease/basics.html",
        "source": "CDC",
        "category": "Education",
        "tags": ["CKD", "basics"],
        "content": "Chronic kidney disease includes conditions that damage your kidneys and decrease their ability to keep you healthy by doing their jobs."
    },
    {
        "title": "Living Donor Transplant Information",
        "url": "https://www.kidney.org/transplantation/livingdonors",
        "source": "National Kidney Foundation",
        "category": "Transplant",
        "tags": ["transplant", "living donor"],
        "content": fetch_article_text("https://www.kidney.org/transplantation/livingdonors")
    },
    {
        "title": "OPTN: How to Get on the Transplant Waitlist",
        "url": "https://optn.transplant.hrsa.gov/learn/about-transplantation/waiting-list/",
        "source": "OPTN",
        "category": "Transplant",
        "tags": ["transplant", "waitlist", "eligibility"],
        "content": fetch_article_text("https://optn.transplant.hrsa.gov/learn/about-transplantation/waiting-list/")
    },
    {
        "title": "UNOS Transplant Basics",
        "url": "https://unos.org/transplant/",
        "source": "UNOS",
        "category": "Transplant",
        "tags": ["UNOS", "transplant basics"],
        "content": fetch_article_text("https://unos.org/transplant/")
    }
]

# Upload summarized articles to Supabase
def store_articles(articles: List[Dict[str, Any]]):
    for article in articles:
        print(f"Processing: {article['title']}...")
        
        # Try OpenAI first
        summary = "No summary available."
        try:
            summary = summarize_with_openai(article["content"])
            model_used = "openai"
        except Exception as e:
            print(f"OpenAI summarization failed: {e}, trying Gemini...")
            try:
                summary = summarize_with_gemini(article["content"])
                model_used = "gemini"
            except Exception as e2:
                print(f"Gemini summarization failed: {e2}, trying Perplexity...")
                try:
                    summary = summarize_with_perplexity(article["content"])
                    model_used = "perplexity"
                except Exception as e3:
                    print(f"All summarization methods failed: {e3}")
                    model_used = "none"
        
        if summary != "No summary available.":
            entry = {
                "title": article["title"],
                "summary": summary,
                "url": article["url"],
                "source": article["source"],
                "published_date": datetime.date.today().isoformat(),
                "category": article["category"],
                "user_focus_tags": article["tags"],
                "model_used": model_used
            }
            
            print(f"Summary generated using {model_used}. Storing in Supabase...")
            try:
                supabase.table("education_articles").insert(entry).execute()
                print(f"✅ Stored: {article['title']}")
            except Exception as e:
                print(f"❌ Failed to store in Supabase: {e}")
        else:
            print(f"❌ Could not generate summary for: {article['title']}")

# Reusable chat log function for journaling/chatbot
def log_chat_to_supabase(user_id: str, user_input: str, ai_response: str, model_used: str = "openai", tags: list = None, emotional_score: int = None):
    data = {
        "user_id": user_id,
        "user_input": user_input,
        "ai_response": ai_response,
        "model_used": model_used,
        "timestamp": datetime.datetime.now().isoformat()
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
        print(f"❌ Failed to log chat: {e}")
        return None

# Health scoring logger with AI-generated self-care suggestions
def generate_health_suggestion(pain: int, stress: int, fatigue: int) -> str:
    try:
        prompt = f"""
        The user logged:
        - Pain level: {pain}/10
        - Stress level: {stress}/10
        - Fatigue level: {fatigue}/10

        Write a short, supportive suggestion for managing these symptoms. Include self-care tips. Respond directly to the user in a kind, empathetic tone.
        """
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a compassionate health assistant for kidney patients."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating health suggestion: {e}")
        
        # Fallback to Gemini if OpenAI fails
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e2:
            print(f"Fallback to Gemini also failed: {e2}")
            return "I notice you're experiencing some discomfort. Remember to rest when needed, stay hydrated, and contact your healthcare provider if symptoms persist or worsen."

def log_health_scores(user_id: str, pain: int, stress: int, fatigue: int, notes: str = ""):
    suggestion = generate_health_suggestion(pain, stress, fatigue)

    try:
        response = supabase.table("health_logs").insert({
            "user_id": user_id,
            "pain_score": pain,
            "stress_score": stress,
            "fatigue_score": fatigue,
            "notes": notes,
            "suggestion": suggestion,
            "timestamp": datetime.datetime.now().isoformat()
        }).execute()

        if "error" in response:
            print("❌ Supabase insert error:", response["error"])
            return False
        else:
            print("✅ Health scores + suggestion saved.")
            return True
    except Exception as e:
        print(f"❌ Error logging health scores: {e}")
        return False

# GFR calculator based on CKD-EPI 2021 equation (no race factor)
def calculate_egfr(age: int, gender: str, serum_creatinine: float) -> float:
    """
    Calculate eGFR using the CKD-EPI 2021 equation (no race factor)
    
    Args:
        age: Patient age in years
        gender: 'male' or 'female'
        serum_creatinine: Serum creatinine in mg/dL
        
    Returns:
        Estimated GFR in mL/min/1.73m²
    """
    if gender.lower() == 'female':
        k = 0.7
        alpha = -0.241
        sex_factor = 1.012
    else:
        k = 0.9
        alpha = -0.302
        sex_factor = 1.0

    scr_k_ratio = serum_creatinine / k
    min_ratio = min(scr_k_ratio, 1)
    max_ratio = max(scr_k_ratio, 1)

    # CKD-EPI 2021 equation
    egfr = 142 * (min_ratio ** alpha) * (max_ratio ** -1.200) * (0.9938 ** age) * sex_factor
    return round(egfr, 2)

if __name__ == "__main__":
    print("🔁 Uploading transplant and education summaries...")
    store_articles(articles_to_upload)
    print("✅ Upload complete.")