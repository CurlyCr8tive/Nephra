#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Verification script for KidneyHealth AI components.
This script checks that all required AI and NLP libraries are properly installed
and that API keys are available in the environment.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional
import importlib
import platform
import datetime

# Add parent directory to path so we can import from the project root
sys.path.append(str(Path(__file__).parent.parent))

# Colored output for terminal
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
BLUE = "\033[94m"
RESET = "\033[0m"

def check_environment() -> Dict:
    """Check Python environment details."""
    return {
        "python_version": platform.python_version(),
        "platform": platform.platform(),
        "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }

def check_package(package_name: str) -> Dict:
    """Check if a package is installed and get its version."""
    try:
        module = importlib.import_module(package_name)
        version = getattr(module, "__version__", "Unknown")
        return {"status": "installed", "version": version}
    except ImportError:
        return {"status": "not_installed", "version": None}

def check_api_keys() -> Dict:
    """Check if required API keys are available in environment variables."""
    required_keys = {
        "OPENAI_API_KEY": False,
        "GEMINI_API_KEY": False,
        "PERPLEXITY_API_KEY": False,
        "ANTHROPIC_API_KEY": False
    }
    
    for key in required_keys:
        if os.environ.get(key):
            required_keys[key] = True
    
    return required_keys

def verify_openai() -> Dict:
    """Verify OpenAI functionality by making a simple API call."""
    result = {"status": "not_verified", "message": ""}
    
    if not os.environ.get("OPENAI_API_KEY"):
        result["message"] = "OpenAI API key not found"
        return result
    
    try:
        import openai
        client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        
        # Make a simple test request
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": "Say 'KidneyHealth verification successful'"}],
            max_tokens=20
        )
        
        if "verification successful" in response.choices[0].message.content.lower():
            result["status"] = "verified"
            result["message"] = "OpenAI API working correctly"
        else:
            result["status"] = "warning"
            result["message"] = f"Unexpected response: {response.choices[0].message.content}"
    
    except Exception as e:
        result["status"] = "error"
        result["message"] = str(e)
    
    return result

def main():
    """Run verification checks and display results."""
    print(f"\n{BLUE}=== KidneyHealth AI Components Verification ==={RESET}\n")
    
    # Check environment
    env_info = check_environment()
    print(f"{BLUE}Environment:{RESET}")
    print(f"  Python version: {env_info['python_version']}")
    print(f"  Platform: {env_info['platform']}")
    print(f"  Date: {env_info['date']}")
    print("")
    
    # Check required packages
    required_packages = [
        "openai", "anthropic", "google.generativeai", 
        "flask", "pandas", "numpy", "spacy", "transformers", 
        "nltk", "sqlalchemy", "requests"
    ]
    
    print(f"{BLUE}Required packages:{RESET}")
    all_packages_installed = True
    
    for package in required_packages:
        check_result = check_package(package)
        status_color = GREEN if check_result["status"] == "installed" else RED
        version_str = f" (v{check_result['version']})" if check_result["version"] else ""
        print(f"  {package}: {status_color}{check_result['status']}{version_str}{RESET}")
        
        if check_result["status"] != "installed":
            all_packages_installed = False
    
    print("")
    
    # Check API keys
    api_keys = check_api_keys()
    print(f"{BLUE}API Keys:{RESET}")
    all_keys_available = True
    
    for key, available in api_keys.items():
        status_color = GREEN if available else YELLOW
        status_text = "Available" if available else "Not found"
        print(f"  {key}: {status_color}{status_text}{RESET}")
        
        if not available:
            all_keys_available = False
    
    print("")
    
    # Test OpenAI if key is available
    if api_keys["OPENAI_API_KEY"]:
        print(f"{BLUE}Testing OpenAI:{RESET}")
        openai_result = verify_openai()
        
        status_color = GREEN if openai_result["status"] == "verified" else RED
        print(f"  Status: {status_color}{openai_result['status']}{RESET}")
        print(f"  Message: {openai_result['message']}")
    
    print("")
    
    # Overall status
    if all_packages_installed and all_keys_available:
        print(f"{GREEN}All components are properly installed and configured!{RESET}")
    else:
        print(f"{YELLOW}Some components require attention. See details above.{RESET}")
    
    print("")

if __name__ == "__main__":
    main()