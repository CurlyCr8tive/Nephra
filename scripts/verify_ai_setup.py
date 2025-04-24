#!/usr/bin/env python3
"""
Verification script for Nephra AI components.
This script checks that all required AI and NLP libraries are properly installed
and that API keys are available in the environment.
"""

import os
import sys
import json
import platform
import importlib
import subprocess
from typing import Dict, List, Any, Optional

# Define packages to check
REQUIRED_PACKAGES = [
    "openai",
    "google-generativeai",
    "anthropic",
    "supabase",
    "requests",
    "beautifulsoup4",
    "tiktoken",
    "numpy",
    "pandas",
    "spacy"
]

# Define API keys to check
REQUIRED_API_KEYS = [
    "OPENAI_API_KEY",
    "GEMINI_API_KEY",
    "PERPLEXITY_API_KEY",
    "ANTHROPIC_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_KEY"
]

def check_environment() -> Dict:
    """Check Python environment details."""
    return {
        "python_version": platform.python_version(),
        "system": platform.system(),
        "platform": platform.platform(),
        "path": sys.executable,
        "pip_version": _get_pip_version()
    }

def _get_pip_version() -> str:
    """Get pip version."""
    try:
        result = subprocess.run([sys.executable, "-m", "pip", "--version"], 
                                capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception:
        return "Unknown"

def check_package(package_name: str) -> Dict:
    """Check if a package is installed and get its version."""
    result = {
        "name": package_name,
        "installed": False,
        "version": None,
        "error": None
    }
    
    try:
        module = importlib.import_module(package_name.replace("-", "_"))
        result["installed"] = True
        
        # Try to get version in different ways
        try:
            version = getattr(module, "__version__", None)
            if version:
                result["version"] = version
            elif hasattr(module, "version") and callable(module.version):
                result["version"] = module.version()
            else:
                # Try to get version using pip
                pkg_info = subprocess.run(
                    [sys.executable, "-m", "pip", "show", package_name],
                    capture_output=True, text=True
                )
                for line in pkg_info.stdout.splitlines():
                    if line.startswith("Version:"):
                        result["version"] = line.split(":", 1)[1].strip()
                        break
        except Exception as e:
            result["error"] = f"Error getting version: {str(e)}"
    
    except ImportError as e:
        result["error"] = str(e)
    
    return result

def check_api_keys() -> Dict:
    """Check if required API keys are available in environment variables."""
    results = {}
    
    for key in REQUIRED_API_KEYS:
        value = os.getenv(key)
        results[key] = {
            "available": value is not None,
            "length": len(value) if value else 0,
            "prefix": value[:4] + "..." if value and len(value) > 4 else None
        }
    
    return results

def verify_openai() -> Dict:
    """Verify OpenAI functionality by making a simple API call."""
    result = {
        "success": False,
        "model": None,
        "error": None,
        "response_preview": None
    }
    
    try:
        import openai
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            result["error"] = "OPENAI_API_KEY environment variable not set"
            return result
        
        openai.api_key = api_key
        
        try:
            # Use the latest model with proper error handling
            try:
                # the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
                response = openai.chat.completions.create(
                    model="gpt-4o",
                    messages=[{"role": "user", "content": "Say hello to the Nephra app in one short sentence."}],
                    max_tokens=50
                )
                result["model"] = "gpt-4o"
                result["response_preview"] = response.choices[0].message.content
            except Exception as e:
                print(f"Error with gpt-4o, trying fallback model: {e}")
                # Fallback to older model and API
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": "Say hello to the Nephra app in one short sentence."}],
                    max_tokens=50
                )
                result["model"] = "gpt-3.5-turbo"
                result["response_preview"] = response.choices[0].message.content
                
            result["success"] = True
        except Exception as e:
            result["error"] = f"API call error: {str(e)}"
    
    except ImportError as e:
        result["error"] = f"Import error: {str(e)}"
    
    return result

def verify_gemini() -> Dict:
    """Verify Google Gemini functionality."""
    result = {
        "success": False,
        "model": None,
        "error": None,
        "response_preview": None
    }
    
    try:
        import google.generativeai as genai
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            result["error"] = "GEMINI_API_KEY environment variable not set"
            return result
        
        genai.configure(api_key=api_key)
        
        try:
            # Try the latest model first
            try:
                model = genai.GenerativeModel('gemini-1.5-pro')
                response = model.generate_content("Say hello to the Nephra app in one short sentence.")
                result["model"] = "gemini-1.5-pro"
                result["response_preview"] = response.text
            except Exception as e:
                print(f"Error with gemini-1.5-pro, trying fallback model: {e}")
                # Fallback to older model
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content("Say hello to the Nephra app in one short sentence.")
                result["model"] = "gemini-pro"
                result["response_preview"] = response.text
                
            result["success"] = True
        except Exception as e:
            result["error"] = f"API call error: {str(e)}"
    
    except ImportError as e:
        result["error"] = f"Import error: {str(e)}"
    
    return result

def verify_perplexity() -> Dict:
    """Verify Perplexity functionality."""
    result = {
        "success": False,
        "model": None,
        "error": None,
        "response_preview": None
    }
    
    try:
        import requests
        
        api_key = os.getenv("PERPLEXITY_API_KEY")
        if not api_key:
            result["error"] = "PERPLEXITY_API_KEY environment variable not set"
            return result
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.1-sonar-small-128k-online",
            "messages": [
                {
                    "role": "user",
                    "content": "Say hello to the Nephra app in one short sentence."
                }
            ],
            "max_tokens": 50,
            "temperature": 0.7,
            "stream": False
        }
        
        try:
            response = requests.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload
            )
            
            if response.status_code == 200:
                response_data = response.json()
                result["model"] = response_data.get("model", "unknown")
                result["response_preview"] = response_data.get("choices", [{}])[0].get("message", {}).get("content", "No content")
                result["success"] = True
            else:
                result["error"] = f"HTTP {response.status_code}: {response.text}"
        except Exception as e:
            result["error"] = f"API call error: {str(e)}"
    
    except ImportError as e:
        result["error"] = f"Import error: {str(e)}"
    
    return result

def verify_anthropic() -> Dict:
    """Verify Anthropic Claude functionality."""
    result = {
        "success": False,
        "model": None,
        "error": None,
        "response_preview": None
    }
    
    try:
        from anthropic import Anthropic
        
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            result["error"] = "ANTHROPIC_API_KEY environment variable not set"
            return result
        
        client = Anthropic(api_key=api_key)
        
        try:
            # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
            response = client.messages.create(
                model="claude-3-7-sonnet-20250219",
                max_tokens=50,
                messages=[
                    {"role": "user", "content": "Say hello to the Nephra app in one short sentence."}
                ]
            )
            
            result["model"] = response.model
            result["response_preview"] = response.content[0].text
            result["success"] = True
        except Exception as e:
            result["error"] = f"API call error: {str(e)}"
    
    except ImportError as e:
        result["error"] = f"Import error: {str(e)}"
    
    return result

def verify_supabase() -> Dict:
    """Verify Supabase connection."""
    result = {
        "success": False,
        "error": None,
        "tables": []
    }
    
    try:
        from supabase import create_client
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            result["error"] = "SUPABASE_URL or SUPABASE_KEY environment variable not set"
            return result
        
        try:
            client = create_client(url, key)
            
            # Perform a simple query to verify connection
            response = client.table("health_logs").select("*").limit(1).execute()
            
            # Try to get available tables
            try:
                tables_response = client.rpc("get_tables", {}).execute()
                result["tables"] = tables_response.data
            except:
                # If RPC method not available, just mark as success
                pass
            
            result["success"] = True
        except Exception as e:
            result["error"] = f"Connection error: {str(e)}"
    
    except ImportError as e:
        result["error"] = f"Import error: {str(e)}"
    
    return result

def format_check_results(results: Dict) -> str:
    """Format check results as a readable string."""
    output = []
    
    # Environment
    env = results["environment"]
    output.append("🖥️ Environment:")
    output.append(f"   Python: {env['python_version']} on {env['system']} ({env['platform']})")
    output.append(f"   Path: {env['path']}")
    output.append(f"   {env['pip_version']}")
    output.append("")
    
    # Packages
    packages = results["packages"]
    installed = sum(1 for p in packages if p["installed"])
    output.append(f"📦 Packages: {installed}/{len(packages)} installed")
    
    for pkg in packages:
        status = "✅" if pkg["installed"] else "❌"
        version = f"v{pkg['version']}" if pkg["version"] else "unknown version"
        output.append(f"   {status} {pkg['name']}: {version if pkg['installed'] else pkg['error']}")
    
    output.append("")
    
    # API Keys
    keys = results["api_keys"]
    available = sum(1 for k, v in keys.items() if v["available"])
    output.append(f"🔑 API Keys: {available}/{len(keys)} available")
    
    for key, info in keys.items():
        status = "✅" if info["available"] else "❌"
        details = f"Length: {info['length']}" if info["available"] else "Not set"
        output.append(f"   {status} {key}: {details}")
    
    output.append("")
    
    # OpenAI
    openai_check = results["openai"]
    status = "✅" if openai_check["success"] else "❌"
    output.append(f"🤖 OpenAI API: {status}")
    if openai_check["success"]:
        output.append(f"   Model: {openai_check['model']}")
        output.append(f"   Response: \"{openai_check['response_preview']}\"")
    else:
        output.append(f"   Error: {openai_check['error']}")
    
    output.append("")
    
    # Gemini
    gemini_check = results["gemini"]
    status = "✅" if gemini_check["success"] else "❌"
    output.append(f"🤖 Google Gemini API: {status}")
    if gemini_check["success"]:
        output.append(f"   Model: {gemini_check['model']}")
        output.append(f"   Response: \"{gemini_check['response_preview']}\"")
    else:
        output.append(f"   Error: {gemini_check['error']}")
    
    output.append("")
    
    # Perplexity
    perplexity_check = results["perplexity"]
    status = "✅" if perplexity_check["success"] else "❌"
    output.append(f"🤖 Perplexity API: {status}")
    if perplexity_check["success"]:
        output.append(f"   Model: {perplexity_check['model']}")
        output.append(f"   Response: \"{perplexity_check['response_preview']}\"")
    else:
        output.append(f"   Error: {perplexity_check['error']}")
    
    output.append("")
    
    # Anthropic
    anthropic_check = results["anthropic"]
    status = "✅" if anthropic_check["success"] else "❌"
    output.append(f"🤖 Anthropic Claude API: {status}")
    if anthropic_check["success"]:
        output.append(f"   Model: {anthropic_check['model']}")
        output.append(f"   Response: \"{anthropic_check['response_preview']}\"")
    else:
        output.append(f"   Error: {anthropic_check['error']}")
    
    output.append("")
    
    # Supabase
    supabase_check = results["supabase"]
    status = "✅" if supabase_check["success"] else "❌"
    output.append(f"🗄️ Supabase Connection: {status}")
    if supabase_check["success"]:
        if supabase_check["tables"]:
            output.append(f"   Tables: {', '.join(supabase_check['tables'])}")
        else:
            output.append("   Connection successful")
    else:
        output.append(f"   Error: {supabase_check['error']}")
    
    return "\n".join(output)

def main():
    """Run verification checks and display results."""
    print("🧪 Running Nephra AI Component Verification")
    print("=" * 60)
    
    results = {
        "environment": check_environment(),
        "packages": [check_package(pkg) for pkg in REQUIRED_PACKAGES],
        "api_keys": check_api_keys(),
        "openai": verify_openai(),
        "gemini": verify_gemini(),
        "perplexity": verify_perplexity(),
        "anthropic": verify_anthropic(),
        "supabase": verify_supabase()
    }
    
    print(format_check_results(results))
    
    # Determine overall readiness
    apis_ready = sum(1 for k in ["openai", "gemini", "perplexity", "anthropic", "supabase"] 
                      if results[k]["success"])
    total_apis = 5
    packages_ready = sum(1 for p in results["packages"] if p["installed"])
    total_packages = len(REQUIRED_PACKAGES)
    
    readiness_pct = (apis_ready / total_apis) * 0.7 + (packages_ready / total_packages) * 0.3
    readiness_pct = round(readiness_pct * 100)
    
    print("\n📊 Overall AI Readiness:")
    print(f"   {readiness_pct}% ready - {apis_ready}/{total_apis} APIs operational, {packages_ready}/{total_packages} packages installed")
    
    if readiness_pct >= 90:
        print("\n✅ System is READY for production use")
    elif readiness_pct >= 70:
        print("\n🟡 System is MOSTLY READY with fallbacks available")
    elif readiness_pct >= 40:
        print("\n⚠️ System has LIMITED CAPABILITIES - some features may not work")
    else:
        print("\n❌ System is NOT READY - critical components unavailable")

if __name__ == "__main__":
    main()