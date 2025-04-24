import os
import datetime
from typing import List, Optional
from supabase import create_client, Client
import openai
import google.generativeai as genai
import requests
import json
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
        ],
        max_tokens=800,
        temperature=0.7
    )
    return response.choices[0].message["content"]

# Function to summarize with Gemini
def summarize_with_gemini(text: str) -> str:
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(
        f"Summarize this for a kidney disease patient in plain language:\n{text}",
        generation_config={"max_output_tokens": 800}
    )
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
            "summary": openai_summary,
            "url": article["url"],
            "source": article["source"],
            "published_date": datetime.date.today().isoformat(),
            "category": article["category"],
            "user_focus_tags": article["tags"]
        }
        print("🔍 FULL RESPONSE:\n", openai_summary)
        supabase.table("education_articles").insert(entry).execute()

# Improved GFR calculator with better gender handling
def calculate_egfr(age: Optional[int], gender: Optional[str], serum_creatinine: Optional[float]) -> Optional[float]:
    """
    Calculate eGFR using the CKD-EPI 2021 equation (no race factor)
    
    Args:
        age: Patient age in years (can be None)
        gender: Patient gender string (can be None, any format)
        serum_creatinine: Serum creatinine in mg/dL (can be None)
        
    Returns:
        Estimated GFR in mL/min/1.73m² or None if calculation failed
    """
    # Debug inputs for troubleshooting
    print(f"⚙️ GFR Calculation Inputs - Age: {age}, Gender: {gender}, Creatinine: {serum_creatinine}")
    
    # Validate required inputs
    if age is None:
        print("⚠️ Age is missing. Cannot calculate GFR.")
        return None
        
    if serum_creatinine is None or serum_creatinine <= 0:
        print("⚠️ Valid serum creatinine value is missing. Cannot calculate GFR.")
        return None
    
    # Gender normalization with extensive validation
    is_female = False
    if gender is not None:
        # Handle different formats and normalize
        if isinstance(gender, str):
            gender_normalized = gender.lower().strip()
            # Check for female indicators (multiple formats)
            if gender_normalized in ['female', 'f', 'woman', 'girl', 'feminine', 'mujer']:
                is_female = True
                print("✓ Gender identified as female")
            # Check for male indicators (multiple formats)
            elif gender_normalized in ['male', 'm', 'man', 'boy', 'masculine', 'hombre']:
                is_female = False
                print("✓ Gender identified as male")
            else:
                print(f"⚠️ Gender format not recognized: '{gender}'. Defaulting to male.")
        else:
            print(f"⚠️ Gender is not a string: {type(gender)}. Defaulting to male.")
    else:
        print("⚠️ Gender is None. Defaulting to male.")
    
    # Set gender-specific coefficients based on CKD-EPI 2021 equation
    if is_female:
        k = 0.7
        alpha = -0.241
        sex_factor = 1.012
    else:
        k = 0.9
        alpha = -0.302
        sex_factor = 1.0

    # Calculate eGFR using the equation
    try:
        scr_k_ratio = serum_creatinine / k
        min_ratio = min(scr_k_ratio, 1)
        max_ratio = max(scr_k_ratio, 1)
        
        egfr = 142 * (min_ratio ** alpha) * (max_ratio ** -1.200) * (0.9938 ** age) * sex_factor
        result = round(egfr, 2)
        print(f"✅ Calculated eGFR: {result} mL/min/1.73m²")
        return result
    except Exception as e:
        print(f"❌ Error in GFR calculation: {str(e)}")
        return None

# Function to fetch and refresh user profile data with improved error handling
def fetch_user_profile(user_id: str):
    try:
        response = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        data = response.get("data", [])
        
        if data and len(data) > 0:
            user_data = data[0]
            # Cache the user profile for offline use
            with open("user_cache.json", "w") as f:
                json.dump(user_data, f)
            
            # Debug the gender field
            if "gender" in user_data:
                print(f"📊 User profile gender: {user_data['gender']} (type: {type(user_data['gender'])})")
            else:
                print("⚠️ Gender field missing in user profile")
                
            return user_data
        else:
            print(f"❌ User profile not found for ID: {user_id}")
            # Try to load from cache if available
            try:
                with open("user_cache.json", "r") as f:
                    cached_data = json.load(f)
                print("📁 Using cached user profile data")
                return cached_data
            except Exception as cache_error:
                print(f"⚠️ No cache available: {str(cache_error)}")
                return None
    except Exception as e:
        print(f"❌ Error fetching user profile: {str(e)}")
        return None

# Example usage
if __name__ == "__main__":
    # Test with different gender formats
    print("\n🧪 TESTING GFR CALCULATION WITH DIFFERENT GENDER FORMATS:")
    print("-" * 50)
    test_cases = [
        {"age": 45, "gender": "female", "creatinine": 1.0},
        {"age": 50, "gender": "male", "creatinine": 1.2},
        {"age": 60, "gender": "FEMALE", "creatinine": 0.9},
        {"age": 55, "gender": "M", "creatinine": 1.1},
        {"age": 65, "gender": "F", "creatinine": 1.3},
        {"age": 70, "gender": "woman", "creatinine": 1.4},
        {"age": 75, "gender": None, "creatinine": 1.5},
        {"age": None, "gender": "female", "creatinine": 1.0},
        {"age": 45, "gender": "female", "creatinine": None},
    ]
    
    for i, case in enumerate(test_cases):
        print(f"\nTest #{i+1}:")
        result = calculate_egfr(case["age"], case["gender"], case["creatinine"])
        print(f"Input: {case}, Output: {result}")
        print("-" * 30)
    
    # Uncommenting these will run the actual operations:
    # print("\n🔁 Uploading transplant and education summaries...")
    # store_articles(articles_to_upload)
    # print("✅ Upload complete.")
    
    # test_user = fetch_user_profile("user123")
    # if test_user:
    #     print(f"Found user: {test_user.get('username')}")
    #     gfr = calculate_egfr(test_user.get('age'), test_user.get('gender'), 1.2)
    #     print(f"Estimated GFR: {gfr}")