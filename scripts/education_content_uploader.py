import os
import datetime
from typing import List
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

# Set up Supabase, OpenAI, and Gemini clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
openai.api_key = OPENAI_API_KEY
genai.configure(api_key=GEMINI_API_KEY)

# Function to summarize with OpenAI
def summarize_with_openai(text: str) -> str:
    try:
        # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
        print(f"OpenAI error: {e}")
        # Fallback to older API format if necessary
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "user", "content": f"Summarize this for a kidney disease patient in plain language:\n{text}"}
                ],
                max_tokens=800,
                temperature=0.7
            )
            return response.choices[0].message["content"]
        except Exception as e2:
            print(f"Fallback OpenAI error: {e2}")
            return f"Failed to generate summary with OpenAI. Error: {e2}"

# Function to summarize with Gemini
def summarize_with_gemini(text: str) -> str:
    try:
        # Note: Using the latest Gemini model available
        model = genai.GenerativeModel('gemini-1.5-pro')
        response = model.generate_content(
            f"Summarize this for a kidney disease patient in plain language:\n{text}",
            generation_config={"max_output_tokens": 800}
        )
        return response.text.strip()
    except Exception as e:
        print(f"Gemini error: {e}")
        # Try fallback to older model if available
        try:
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(
                f"Summarize this for a kidney disease patient in plain language:\n{text}",
                generation_config={"max_output_tokens": 800}
            )
            return response.text.strip()
        except Exception as e2:
            print(f"Fallback Gemini error: {e2}")
            return f"Failed to generate summary with Gemini. Error: {e2}"

# Function to fetch and clean article content
def fetch_article_text(url: str) -> str:
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        paragraphs = soup.find_all('p')
        content = '\n'.join(p.get_text() for p in paragraphs if len(p.get_text()) > 60)
        
        # If the content is too short, try getting all text
        if len(content) < 500:
            content = soup.get_text()
            
        # Limit to 10000 chars to avoid token limits
        return content[:10000]
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
def store_articles(articles: List[dict]):
    for article in articles:
        try:
            print(f"Summarizing: {article['title']}...")
            
            # Try OpenAI first
            try:
                openai_summary = summarize_with_openai(article["content"])
                print("✅ OpenAI summary generated")
            except Exception as e:
                print(f"⚠️ OpenAI summarization failed: {e}")
                openai_summary = f"Summary generation failed with OpenAI: {str(e)}"
            
            # Try Gemini
            try:
                gemini_summary = summarize_with_gemini(article["content"])
                print("✅ Gemini summary generated")
            except Exception as e:
                print(f"⚠️ Gemini summarization failed: {e}")
                gemini_summary = f"Summary generation failed with Gemini: {str(e)}"
            
            # Use the best summary available
            final_summary = openai_summary if len(openai_summary) > 100 and "failed" not in openai_summary.lower() else gemini_summary
            
            # Prepare entry data
            entry = {
                "title": article["title"],
                "category": article["category"],
                "summary": final_summary,
                "content": article["content"][:2000] if len(article["content"]) > 2000 else article["content"],
                "resourceUrl": article["url"],
                "imageUrl": None,  # Could be added in future
                "publishDate": datetime.datetime.now().isoformat(),
                "sortOrder": 0  # Default ordering
            }
            
            print("🔍 SUMMARY PREVIEW:\n", final_summary[:200] + "...")
            
            # Insert into Supabase
            result = supabase.table("education_resources").insert(entry).execute()
            
            if hasattr(result, 'error') and result.error:
                print(f"❌ Supabase error: {result.error}")
            else:
                print(f"✅ Successfully uploaded article: {article['title']}")
                
        except Exception as e:
            print(f"❌ Error processing article {article['title']}: {e}")
            continue

# Reusable chat log function for journaling/chatbot
def log_chat_to_supabase(user_id: str, user_input: str, ai_response: str, model_used: str = "openai", tags: list = None, emotional_score: int = None):
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

    response = supabase.table("chat_logs").insert(data).execute()
    print(f"✅ Logged chat to Supabase: {user_input[:30]}...")
    return response

# Health scoring logger with AI-generated self-care suggestions
def generate_health_suggestion(pain: int, stress: int, fatigue: int) -> str:
    """Generate a personalized health suggestion based on pain, stress, and fatigue levels"""
    try:
        prompt = f"""
        The user logged:
        - Pain level: {pain}/10
        - Stress level: {stress}/10
        - Fatigue level: {fatigue}/10

        Write a short, supportive suggestion for managing these symptoms. Include self-care tips. Respond directly to the user in a kind, empathetic tone.
        """
        
        # Try the latest model first with proper error handling
        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            suggestion = response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Error with gpt-4o, trying fallback model: {e}")
            # Fallback to older model and API
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.7
            )
            suggestion = response.choices[0].message["content"].strip()
            
        return suggestion
    except Exception as e:
        print(f"❌ Failed to generate health suggestion: {e}")
        return "Remember to take care of yourself today. Rest when needed and stay hydrated."

def log_health_scores(user_id: str, pain: int, stress: int, fatigue: int, notes: str = ""):
    """Log health scores and provide an AI-generated self-care suggestion"""
    try:
        # Generate personalized suggestion
        suggestion = generate_health_suggestion(pain, stress, fatigue)
        
        # Create the record
        response = supabase.table("health_logs").insert({
            "user_id": user_id,
            "pain_score": pain,
            "stress_score": stress,
            "fatigue_score": fatigue,
            "notes": notes,
            "suggestion": suggestion,
            "timestamp": datetime.datetime.now().isoformat()
        }).execute()

        if hasattr(response, 'error') and response.error:
            print("❌ Supabase insert error:", response.error)
            return False
        else:
            print("✅ Health scores + suggestion saved successfully")
            return True
    except Exception as e:
        print(f"❌ Error logging health scores: {e}")
        return False

if __name__ == "__main__":
    print("🔁 Uploading transplant and education summaries...")
    store_articles(articles_to_upload)
    print("✅ Upload complete.")