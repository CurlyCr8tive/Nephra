#!/usr/bin/env python3
"""
Test script for Nephra AI providers.
This script performs simple tests on all integrated AI providers to verify API keys and functionality.
"""

import os
import sys
import json
import time
from typing import Dict, Any, Optional

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

try:
    from anthropic import Anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    print("⚠️ Anthropic library not found")

# Environment variable keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")

# Test prompts
KIDNEY_PROMPT = "Explain how kidney function affects overall health in simple terms."
CKD_PROMPT = "What are three early warning signs of chronic kidney disease?"
DIET_PROMPT = "Suggest a kidney-friendly meal plan for someone on dialysis."
TECH_PROMPT = "What are the latest technologies being used in kidney transplantation?"

def test_openai() -> Dict[str, Any]:
    """Test OpenAI API connection and functionality."""
    result = {
        "provider": "OpenAI",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not OPENAI_AVAILABLE:
        result["error"] = "OpenAI library not installed"
        return result
    
    if not OPENAI_API_KEY:
        result["error"] = "No OpenAI API key found in environment variables"
        return result
    
    try:
        openai.api_key = OPENAI_API_KEY
        
        print("📨 Sending request to OpenAI...")
        start_time = time.time()
        
        # Try the latest model first
        try:
            # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": KIDNEY_PROMPT}],
                max_tokens=300,
                temperature=0.7
            )
            result["model"] = "gpt-4o"
            result["response"] = response.choices[0].message.content
        except Exception as e:
            print(f"⚠️ Error with gpt-4o, trying fallback model: {e}")
            # Fallback to GPT-3.5 Turbo
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": KIDNEY_PROMPT}],
                max_tokens=300,
                temperature=0.7
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

def test_gemini() -> Dict[str, Any]:
    """Test Google Gemini API connection and functionality."""
    result = {
        "provider": "Google Gemini",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not GEMINI_AVAILABLE:
        result["error"] = "Google Generative AI library not installed"
        return result
    
    if not GEMINI_API_KEY:
        result["error"] = "No Gemini API key found in environment variables"
        return result
    
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        
        print("📨 Sending request to Google Gemini...")
        start_time = time.time()
        
        # Try the latest model first
        try:
            model = genai.GenerativeModel('gemini-1.5-pro')
            response = model.generate_content(CKD_PROMPT)
            result["model"] = "gemini-1.5-pro"
            result["response"] = response.text
        except Exception as e:
            print(f"⚠️ Error with gemini-1.5-pro, trying fallback model: {e}")
            # Fallback to older model
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content(CKD_PROMPT)
            result["model"] = "gemini-pro"
            result["response"] = response.text
        
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        result["success"] = True
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Google Gemini API Error: {e}")
    
    return result

def test_perplexity() -> Dict[str, Any]:
    """Test Perplexity API connection and functionality."""
    result = {
        "provider": "Perplexity",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not PERPLEXITY_AVAILABLE:
        result["error"] = "Requests library not installed (needed for Perplexity API)"
        return result
    
    if not PERPLEXITY_API_KEY:
        result["error"] = "No Perplexity API key found in environment variables"
        return result
    
    try:
        print("📨 Sending request to Perplexity...")
        start_time = time.time()
        
        headers = {
            "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a medical expert specializing in nephrology."
                },
                {
                    "role": "user",
                    "content": DIET_PROMPT
                }
            ],
            "max_tokens": 300,
            "temperature": 0.7,
            "stream": False
        }
        
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers=headers,
            json=payload
        )
        
        if response.status_code == 200:
            response_data = response.json()
            result["model"] = response_data.get("model", "unknown")
            result["response"] = response_data.get("choices", [{}])[0].get("message", {}).get("content", "No content")
            result["success"] = True
        else:
            result["error"] = f"HTTP {response.status_code}: {response.text}"
        
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Perplexity API Error: {e}")
    
    return result

def test_anthropic() -> Dict[str, Any]:
    """Test Anthropic API connection and functionality."""
    result = {
        "provider": "Anthropic Claude",
        "success": False,
        "response": None,
        "error": None,
        "model": None,
        "time_ms": 0
    }
    
    if not ANTHROPIC_AVAILABLE:
        result["error"] = "Anthropic library not installed"
        return result
    
    if not ANTHROPIC_API_KEY:
        result["error"] = "No Anthropic API key found in environment variables"
        return result
    
    try:
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        
        print("📨 Sending request to Anthropic Claude...")
        start_time = time.time()
        
        # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",
            max_tokens=300,
            messages=[
                {"role": "user", "content": TECH_PROMPT}
            ]
        )
        
        result["model"] = response.model
        result["response"] = response.content[0].text
        result["success"] = True
        
        end_time = time.time()
        result["time_ms"] = int((end_time - start_time) * 1000)
        
    except Exception as e:
        result["error"] = str(e)
        print(f"❌ Anthropic API Error: {e}")
    
    return result

def pretty_print_result(result: Dict[str, Any]) -> None:
    """Print test result in a readable format."""
    provider = result["provider"]
    success = result["success"]
    model = result["model"]
    time_ms = result["time_ms"]
    
    if success:
        print(f"✅ {provider} ({model}): Success - {time_ms}ms")
        print("📝 Response preview:")
        response = result["response"]
        if response:
            # Print first 200 chars of response
            print(f"   {response[:200]}...")
        else:
            print("   <Empty response>")
    else:
        print(f"❌ {provider}: Failed - {result['error']}")
    
    print("-" * 80)

def main() -> None:
    """Run tests for all AI providers."""
    print("\n🧪 Testing AI Providers for Nephra App\n")
    print("=" * 80)
    
    results = []
    
    # Test OpenAI
    print("\n🔍 Testing OpenAI API...")
    openai_result = test_openai()
    pretty_print_result(openai_result)
    results.append(openai_result)
    
    # Test Google Gemini
    print("\n🔍 Testing Google Gemini API...")
    gemini_result = test_gemini()
    pretty_print_result(gemini_result)
    results.append(gemini_result)
    
    # Test Perplexity
    print("\n🔍 Testing Perplexity API...")
    perplexity_result = test_perplexity()
    pretty_print_result(perplexity_result)
    results.append(perplexity_result)
    
    # Test Anthropic
    print("\n🔍 Testing Anthropic Claude API...")
    anthropic_result = test_anthropic()
    pretty_print_result(anthropic_result)
    results.append(anthropic_result)
    
    # Summary
    successful = sum(1 for r in results if r["success"])
    total = len(results)
    print("\n📊 Summary:")
    print(f"   {successful} of {total} AI providers operational")
    
    # Output table of providers
    print("\n📋 Provider Status Table:")
    print("-" * 80)
    print(f"{'Provider':<20} {'Status':<10} {'Model':<25} {'Response Time':<15}")
    print("-" * 80)
    for r in results:
        status = "✅ Success" if r["success"] else "❌ Failed"
        model = r["model"] if r["model"] else "N/A"
        time_str = f"{r['time_ms']}ms" if r["success"] else "N/A"
        print(f"{r['provider']:<20} {status:<10} {model:<25} {time_str:<15}")
    
    print("\n✨ Test completed")

if __name__ == "__main__":
    main()