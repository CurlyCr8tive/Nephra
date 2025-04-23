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
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": f"Summarize this for a kidney disease patient in plain language:\n{text}"}
        ]
    )
    return response.choices[0].message["content"]

# Function to summarize with Gemini
def summarize_with_gemini(text: str) -> str:
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(f"Summarize this for a kidney disease patient in plain language:\n{text}")
    return response.text.strip()

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
        print(f"Summarizing: {article['title']}...")
        openai_summary = summarize_with_openai(article["content"])
        gemini_summary = summarize_with_gemini(article["content"])
        entry = {
            "title": article["title"],
            "summary": openai_summary,  # You can swap to gemini_summary if preferred
            "url": article["url"],
            "source": article["source"],
            "published_date": datetime.date.today().isoformat(),
            "category": article["category"],
            "user_focus_tags": article["tags"]
        }
        print(f"Inserting into Supabase: {entry['title']}")
        supabase.table("education_articles").insert(entry).execute()

if __name__ == "__main__":
    print("🔁 Uploading transplant and education summaries...")
    store_articles(articles_to_upload)
    print("✅ Upload complete.")