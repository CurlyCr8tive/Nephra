#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Test script for KidneyHealth AI providers.
This script performs simple tests on all integrated AI providers to verify API keys and functionality.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional
import importlib
import platform
import datetime
import time

# Add parent directory to path so we can import from the project root
sys.path.append(str(Path(__file__).parent.parent))

# Colored output for terminal
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

def test_openai():
    """Test OpenAI API connection and functionality."""
    result = {"provider": "OpenAI", "status": "not_tested", "message": "", "response": None}
    
    if not os.environ.get("OPENAI_API_KEY"):
        result["message"] = "OpenAI API key not found in environment variables"
        return result
    
    try:
        import openai
        client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Test prompt for kidney health
        test_prompt = "What are three important dietary recommendations for someone with stage 3 chronic kidney disease? Keep your answer brief."
        
        # Make a request with the newest model (gpt-4o)
        start_time = time.time()
        response = client.chat.completions.create(
            model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
            messages=[{"role": "user", "content": test_prompt}],
            max_tokens=150
        )
        end_time = time.time()
        
        result["status"] = "success"
        result["message"] = f"API responded in {end_time - start_time:.2f} seconds"
        result["response"] = response.choices[0].message.content
        
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)
    
    return result

def test_gemini():
    """Test Google Gemini API connection and functionality."""
    result = {"provider": "Google Gemini", "status": "not_tested", "message": "", "response": None}
    
    if not os.environ.get("GEMINI_API_KEY"):
        result["message"] = "Gemini API key not found in environment variables"
        return result
    
    try:
        import google.generativeai as genai
        
        # Configure the Gemini API
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        
        # Test prompt for kidney health
        test_prompt = "What are three important dietary recommendations for someone with stage 3 chronic kidney disease? Keep your answer brief."
        
        # Make a request
        start_time = time.time()
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(test_prompt)
        end_time = time.time()
        
        result["status"] = "success"
        result["message"] = f"API responded in {end_time - start_time:.2f} seconds"
        result["response"] = response.text
        
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)
    
    return result

def test_perplexity():
    """Test Perplexity API connection and functionality."""
    result = {"provider": "Perplexity", "status": "not_tested", "message": "", "response": None}
    
    if not os.environ.get("PERPLEXITY_API_KEY"):
        result["message"] = "Perplexity API key not found in environment variables"
        return result
    
    try:
        import requests
        
        # Test prompt for kidney health
        test_prompt = "What are three important dietary recommendations for someone with stage 3 chronic kidney disease? Keep your answer brief."
        
        # Make a request to Perplexity API
        start_time = time.time()
        response = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {os.environ.get('PERPLEXITY_API_KEY')}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.1-sonar-small-128k-online",
                "messages": [
                    {
                        "role": "system",
                        "content": "Be precise and concise."
                    },
                    {
                        "role": "user",
                        "content": test_prompt
                    }
                ],
                "max_tokens": 150,
                "temperature": 0.2
            }
        )
        end_time = time.time()
        
        if response.status_code == 200:
            result["status"] = "success"
            result["message"] = f"API responded in {end_time - start_time:.2f} seconds"
            result["response"] = response.json()["choices"][0]["message"]["content"]
        else:
            result["status"] = "error"
            result["message"] = f"API returned status code {response.status_code}: {response.text}"
        
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)
    
    return result

def test_anthropic():
    """Test Anthropic API connection and functionality."""
    result = {"provider": "Anthropic Claude", "status": "not_tested", "message": "", "response": None}
    
    if not os.environ.get("ANTHROPIC_API_KEY"):
        result["message"] = "Anthropic API key not found in environment variables"
        return result
    
    try:
        from anthropic import Anthropic
        
        # Test prompt for kidney health
        test_prompt = "What are three important dietary recommendations for someone with stage 3 chronic kidney disease? Keep your answer brief."
        
        # Make a request to Anthropic API
        start_time = time.time()
        client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        response = client.messages.create(
            model="claude-3-7-sonnet-20250219",  # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            max_tokens=150,
            messages=[{"role": "user", "content": test_prompt}]
        )
        end_time = time.time()
        
        result["status"] = "success"
        result["message"] = f"API responded in {end_time - start_time:.2f} seconds"
        result["response"] = response.content[0].text
        
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)
    
    return result

def main():
    """Run tests for all AI providers."""
    print(f"\n{BLUE}=== KidneyHealth AI Providers Test ==={RESET}\n")
    
    # Test all providers
    providers = [
        ("OpenAI", test_openai),
        ("Google Gemini", test_gemini),
        ("Perplexity", test_perplexity),
        ("Anthropic Claude", test_anthropic)
    ]
    
    for name, test_function in providers:
        print(f"{BLUE}Testing {name}...{RESET}")
        result = test_function()
        
        # Print status
        if result["status"] == "success":
            status_color = GREEN
        elif result["status"] == "not_tested":
            status_color = YELLOW
        else:
            status_color = RED
            
        print(f"  Status: {status_color}{result['status']}{RESET}")
        print(f"  Message: {result['message']}")
        
        # Print response if successful
        if result["response"]:
            print(f"\n  {BLUE}Response:{RESET}")
            for line in result["response"].split("\n"):
                print(f"    {line}")
        
        print("\n" + "-" * 50 + "\n")
    
    print(f"{BLUE}All tests completed.{RESET}\n")

if __name__ == "__main__":
    main()