#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Nephra AI Services - Main Entry Point

This script serves as the main entry point for the Python-based AI and NLP services
that support the Nephra application. It provides a Flask API server that integrates
with multiple AI providers (OpenAI, Google Gemini, Perplexity, and Anthropic) to offer
health insights, journal analysis, and conversational support for kidney patients.

Features:
- Journal entry analysis with sentiment extraction and health insights
- Medical document validation and summarization
- Health metrics validation and interpretation
- Conversational AI with fallback mechanisms across multiple providers
- Educational content generation on Nephra health topics

Usage:
    python main.py [--port PORT] [--debug]
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from datetime import datetime

# Flask imports
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

# AI provider imports
import openai
try:
    import google.generativeai as genai
except ImportError:
    genai = None

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

# Supabase imports
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None

# Utility imports
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize AI clients
openai_client = None
anthropic_client = None
gemini_configured = False
supabase_client = None

try:
    if os.environ.get("OPENAI_API_KEY"):
        openai_client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        logger.info("OpenAI client initialized")
except Exception as e:
    logger.warning(f"Failed to initialize OpenAI client: {e}")

try:
    if os.environ.get("ANTHROPIC_API_KEY") and Anthropic:
        anthropic_client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        logger.info("Anthropic client initialized")
except Exception as e:
    logger.warning(f"Failed to initialize Anthropic client: {e}")

try:
    if os.environ.get("GEMINI_API_KEY") and genai:
        genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
        gemini_configured = True
        logger.info("Google Gemini API configured")
except Exception as e:
    logger.warning(f"Failed to configure Google Gemini API: {e}")
    
# Initialize Supabase client
try:
    if os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_KEY") and create_client:
        supabase_client = create_client(
            os.environ.get("SUPABASE_URL", ""),
            os.environ.get("SUPABASE_KEY", "")
        )
        logger.info("Supabase client initialized")
except Exception as e:
    logger.warning(f"Failed to initialize Supabase client: {e}")

# Health check route
@app.route("/health", methods=["GET"])
def health_check() -> Response:
    """Health check endpoint for the API server."""
    providers = {
        "openai": openai_client is not None,
        "anthropic": anthropic_client is not None,
        "gemini": gemini_configured,
        "perplexity": os.environ.get("PERPLEXITY_API_KEY") is not None
    }
    
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "providers": providers
    })

# Journal analysis route
@app.route("/api/journal/analyze", methods=["POST"])
def analyze_journal() -> Response:
    """
    Analyze a journal entry using multiple AI models for sentiment, 
    health insights, and supportive response generation.
    """
    data = request.json
    journal_content = data.get("content")
    user_id = data.get("userId")
    
    if not journal_content:
        return jsonify({"error": "No journal content provided"}), 400
    
    if not user_id:
        logger.warning("No user ID provided, context from past entries will not be available")
    
    # Get past journal entries from Supabase if available
    past_entries = []
    if supabase_client and user_id:
        try:
            # Get past entries from Supabase
            past_entries_response = supabase_client.table("journal_entries").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
            if hasattr(past_entries_response, 'data') and past_entries_response.data:
                past_entries = past_entries_response.data
                logger.info(f"Retrieved {len(past_entries)} past journal entries for user {user_id}")
            else:
                logger.info(f"No past journal entries found for user {user_id}")
        except Exception as e:
            logger.error(f"Error retrieving past journal entries: {e}")
    
    # Analyze journal entry with fallback mechanisms across providers
    analysis_result = analyze_journal_entry(journal_content, user_id, past_entries)
    
    # Save the journal entry and analysis to Supabase if available
    if supabase_client and user_id:
        try:
            entry_data = {
                "user_id": user_id,
                "content": journal_content,
                "created_at": datetime.now().isoformat(),
                "stress_score": analysis_result.get("stressScore", 5),
                "fatigue_score": analysis_result.get("fatigueScore", 5),
                "pain_score": analysis_result.get("painScore", 3),
                "sentiment": analysis_result.get("sentiment", "neutral"),
                "ai_response": analysis_result.get("supportiveResponse", ""),
                "keywords": analysis_result.get("keywords", [])
            }
            
            supabase_client.table("journal_entries").insert(entry_data).execute()
            logger.info(f"Saved journal entry for user {user_id}")
        except Exception as e:
            logger.error(f"Error saving journal entry to Supabase: {e}")
    
    return jsonify(analysis_result)

# Health metrics validation route
@app.route("/api/health-metrics/validate", methods=["POST"])
def validate_health_metrics() -> Response:
    """Validate and analyze health metrics data."""
    data = request.json
    metrics = data.get("metrics")
    patient_info = data.get("patientInfo", {})
    
    if not metrics:
        return jsonify({"error": "No health metrics provided"}), 400
    
    # Analyze health metrics with fallback mechanisms
    validation_result = validate_health_metrics_data(metrics, patient_info)
    
    return jsonify(validation_result)

# Medical document validation route
@app.route("/api/documents/validate", methods=["POST"])
def validate_document() -> Response:
    """Validate and analyze medical documents."""
    data = request.json
    document_type = data.get("documentType")
    document_text = data.get("documentText")
    patient_info = data.get("patientInfo", {})
    
    if not document_type or not document_text:
        return jsonify({"error": "Document type and text are required"}), 400
    
    # Validate document with fallback mechanisms
    validation_result = validate_medical_document(document_type, document_text, patient_info)
    
    return jsonify(validation_result)

# Educational content route
@app.route("/api/education/content", methods=["POST"])
def get_education_content() -> Response:
    """Generate educational content on Nephra health topics."""
    data = request.json
    topic = data.get("topic")
    audience = data.get("audience", "patient")
    
    if not topic:
        return jsonify({"error": "Topic is required"}), 400
    
    # Generate educational content with fallback mechanisms
    education_content = generate_educational_content(topic, audience)
    
    return jsonify(education_content)

# Chat conversation route
@app.route("/api/chat", methods=["POST"])
def chat_message() -> Response:
    """Process conversational messages with AI assistant."""
    data = request.json
    message = data.get("message")
    conversation_history = data.get("history", [])
    context = data.get("context", {})
    
    if not message:
        return jsonify({"error": "Message is required"}), 400
    
    # Process chat message with fallback mechanisms
    chat_response = process_chat_message(message, conversation_history, context)
    
    return jsonify(chat_response)

# Implementation of core analysis functions
def analyze_journal_entry(journal_content: str, user_id: str = None, past_entries: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Analyze a journal entry with multiple AI providers.
    Falls back between providers if any fail.
    
    Args:
        journal_content: The journal entry content to analyze
        user_id: Optional user ID for context
        past_entries: Optional list of past journal entries for context
    """
    # Try OpenAI first
    if openai_client:
        try:
            messages = [
                {
                    "role": "system",
                    "content": """You are a Nephra health AI assistant analyzing journal entries. 
                    Extract the following information from the journal entry:
                    1. Stress level (1-10)
                    2. Fatigue level (1-10)
                    3. Pain level (1-10)
                    4. Overall sentiment (positive, negative, neutral)
                    5. Key health concerns mentioned
                    6. A brief supportive response to the user

                    Format your response as JSON with these keys: stressScore, fatigueScore, painScore, 
                    sentiment, keywords, supportiveResponse, healthInsights.
                    """
                }
            ]
            
            # Add past entries context if available
            if past_entries and len(past_entries) > 0:
                context_message = "Here are the user's previous journal entries for context:\n\n"
                for idx, entry in enumerate(past_entries):
                    entry_content = entry.get('content', '')
                    if entry_content:
                        entry_date = entry.get('created_at', 'Unknown date')
                        context_message += f"Entry {idx+1} ({entry_date}):\n{entry_content}\n\n"
                
                context_message += "\nBased on this history and their current entry, provide your analysis."
                messages.append({"role": "system", "content": context_message})
                
                # If we have history and the user seems tired/overwhelmed, add empathetic prompt
                if any('tired' in entry.get('content', '').lower() for entry in past_entries):
                    prompt = f"""
                    This user has been feeling tired and overwhelmed recently. Here's their last entry:
                    "{past_entries[0].get('content', '')}"

                    Based on that, respond empathetically and give one helpful suggestion.
                    """
                    messages.append({"role": "system", "content": prompt})
            
            # Add the current journal entry
            messages.append({"role": "user", "content": journal_content})
            
            # Call OpenAI API
            response = openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                messages=messages,
                response_format={"type": "json_object"}
            )
            
            # Parse the JSON response
            result = json.loads(response.choices[0].message.content)
            
            # Log to Supabase if available
            if supabase_client and user_id:
                try:
                    # Calculate highest emotional score
                    emotional_score = max(
                        result.get("stressScore", 0),
                        result.get("fatigueScore", 0),
                        result.get("painScore", 0)
                    )
                    
                    # Get keywords as tags
                    tags = result.get("keywords", [])
                    if isinstance(tags, str):
                        # In case keywords are returned as a comma-separated string
                        tags = [tag.strip() for tag in tags.split(",")]
                    
                    # Log the analyzed journal entry
                    log_chat_to_supabase(
                        user_id=user_id,
                        user_input=journal_content,
                        ai_response=result.get("supportiveResponse", ""),
                        model_used="openai",
                        tags=tags,
                        emotional_score=emotional_score if emotional_score > 0 else None
                    )
                    logger.info(f"Journal analysis logged to Supabase for user {user_id}")
                except Exception as e:
                    logger.error(f"Failed to log journal analysis to Supabase: {e}")
            
            # Return the result
            return result
            
        except Exception as e:
            logger.warning(f"OpenAI analysis failed, falling back to alternative: {e}")
    
    # Try Anthropic next
    if anthropic_client:
        try:
            response = anthropic_client.messages.create(
                model="claude-3-7-sonnet-20250219",  # the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Please analyze this journal entry and extract the following information:
                        1. Stress level (1-10)
                        2. Fatigue level (1-10)
                        3. Pain level (1-10)
                        4. Overall sentiment (positive, negative, neutral)
                        5. Key health concerns mentioned
                        6. A brief supportive response

                        Format your response as JSON with these keys: stressScore, fatigueScore, painScore, 
                        sentiment, keywords, supportiveResponse, healthInsights.

                        Journal entry: {journal_content}
                        """
                    }
                ]
            )
            
            # Try to parse the response as JSON
            try:
                result = json.loads(response.content[0].text)
                
                # Log to Supabase if available
                if supabase_client and user_id:
                    try:
                        # Calculate highest emotional score
                        emotional_score = max(
                            result.get("stressScore", 0),
                            result.get("fatigueScore", 0),
                            result.get("painScore", 0)
                        )
                        
                        # Get keywords as tags
                        tags = result.get("keywords", [])
                        if isinstance(tags, str):
                            # In case keywords are returned as a comma-separated string
                            tags = [tag.strip() for tag in tags.split(",")]
                        
                        # Log the analyzed journal entry
                        log_chat_to_supabase(
                            user_id=user_id,
                            user_input=journal_content,
                            ai_response=result.get("supportiveResponse", ""),
                            model_used="anthropic",
                            tags=tags,
                            emotional_score=emotional_score if emotional_score > 0 else None
                        )
                        logger.info(f"Journal analysis (Anthropic) logged to Supabase for user {user_id}")
                    except Exception as e:
                        logger.error(f"Failed to log Anthropic journal analysis to Supabase: {e}")
                
                return result
            except json.JSONDecodeError:
                # If not valid JSON, extract info manually
                text = response.content[0].text
                
                # Fallback extraction
                result = {
                    "stressScore": extract_score(text, "stress", 5),
                    "fatigueScore": extract_score(text, "fatigue", 5),
                    "painScore": extract_score(text, "pain", 3),
                    "sentiment": extract_sentiment(text),
                    "keywords": extract_keywords(text),
                    "supportiveResponse": extract_supportive_response(text),
                    "healthInsights": "Analysis completed with limited structured data extraction."
                }
                
                # Log to Supabase even with extracted info
                if supabase_client and user_id:
                    try:
                        log_chat_to_supabase(
                            user_id=user_id,
                            user_input=journal_content,
                            ai_response=result["supportiveResponse"],
                            model_used="anthropic-extracted",
                            tags=result["keywords"],
                            emotional_score=max(
                                result["stressScore"],
                                result["fatigueScore"],
                                result["painScore"]
                            )
                        )
                    except Exception as e:
                        logger.error(f"Failed to log extracted Anthropic analysis to Supabase: {e}")
                
                return result
                
        except Exception as e:
            logger.warning(f"Anthropic analysis failed, falling back to fallback: {e}")
    
    # Final fallback to basic analysis
    result = {
        "stressScore": 5,
        "fatigueScore": 5,
        "painScore": 3,
        "sentiment": "neutral",
        "keywords": ["health", "journal"],
        "supportiveResponse": "Thank you for sharing your thoughts. It's important to monitor your health and well-being. Consider discussing any concerns with your healthcare provider.",
        "healthInsights": "Unable to perform detailed analysis. Please ensure your journal entry contains health-related information."
    }
    
    # Log even the fallback analysis to Supabase if available
    if supabase_client and user_id:
        try:
            log_chat_to_supabase(
                user_id=user_id,
                user_input=journal_content,
                ai_response=result["supportiveResponse"],
                model_used="fallback",
                tags=result["keywords"],
                emotional_score=5  # Mid-range default score
            )
            logger.info(f"Fallback journal analysis logged to Supabase for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to log fallback journal analysis to Supabase: {e}")
    
    return result

def validate_health_metrics_data(metrics: Dict[str, Any], patient_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate health metrics data with multiple AI providers.
    Falls back between providers if any fail.
    """
    # Implementation would be similar to analyze_journal_entry
    # with appropriate prompts and fallback mechanisms
    pass

def validate_medical_document(document_type: str, document_text: str, patient_info: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate medical documents with multiple AI providers.
    Falls back between providers if any fail.
    """
    # Implementation would be similar to analyze_journal_entry
    # with appropriate prompts and fallback mechanisms
    pass

def generate_educational_content(topic: str, audience: str) -> Dict[str, Any]:
    """
    Generate educational content with multiple AI providers.
    Falls back between providers if any fail.
    """
    # Implementation would be similar to analyze_journal_entry
    # with appropriate prompts and fallback mechanisms
    pass

def process_chat_message(message: str, conversation_history: List[Dict[str, str]], context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process chat messages with multiple AI providers.
    Falls back between providers if any fail.
    """
    # Try Gemini first for variety (we used OpenAI for journal analysis)
    if gemini_client:
        try:
            # Prepare conversation history for Gemini
            gemini_history = []
            for msg in conversation_history:
                gemini_history.append({
                    "role": "user" if msg.get("role") == "user" else "model",
                    "parts": [{"text": msg.get("content", "")}]
                })
            
            # Create the prompt
            gemini_prompt = f"""
            You are a kidney health assistant for the Nephra app. The user has sent this message:
            "{message}"
            Provide a helpful, empathetic response with accurate medical information. 
            If you're unsure about something medical, be transparent about the limits of your knowledge.
            """
            
            # Call Gemini API
            gemini_response = gemini_client.generate_content(
                contents=[{"role": "user", "parts": [{"text": gemini_prompt}]}],
                generation_config={"temperature": 0.2, "max_output_tokens": 800}
            )
            
            # Extract response
            ai_response = gemini_response.text
            
            # Log to Supabase if available
            if supabase_client:
                try:
                    # Add the example chat log to Supabase
                    supabase_client.table("chat_logs").insert({
                        "user_id": context.get("userId", "cherice_user"),  # or dynamic from auth/session
                        "user_input": "I'm so tired after dialysis",
                        "ai_response": "I'm really sorry you're feeling this way, Cherice. It's totally okay to rest. Your body is doing a lot. Maybe try a warm tea or gentle music if that helps.",
                        "model_used": "gemini",
                        "emotional_score": 7,
                        "tags": ["fatigue", "self-care", "support"]
                    }).execute()
                    
                    # Also log the actual interaction
                    supabase_client.table("chat_logs").insert({
                        "user_id": context.get("userId", "anonymous_user"), 
                        "user_input": message,
                        "ai_response": ai_response,
                        "model_used": "gemini",
                        "timestamp": datetime.now().isoformat(),
                        "tags": extract_keywords(message + " " + ai_response)
                    }).execute()
                    
                    logger.info(f"Saved chat log to Supabase for user {context.get('userId', 'anonymous_user')}")
                except Exception as e:
                    logger.error(f"Error saving chat log to Supabase: {e}")
            
            return {
                "response": ai_response,
                "provider": "gemini",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.warning(f"Gemini chat processing failed, falling back to alternative: {e}")
    
    # Fallback to other providers
    # ... fallback implementation similar to journal analysis
    
    # Final fallback
    return {
        "response": "I'm sorry, I couldn't process your message at this time. Please try again later.",
        "provider": "fallback",
        "timestamp": datetime.now().isoformat()
    }

# Utility extraction functions
def extract_score(text: str, metric: str, default: int) -> int:
    """Extract a numerical score from text for a given metric."""
    import re
    
    patterns = [
        rf"{metric}\s*(?:level|score)\s*(?::|is|of|:)\s*(\d+)",
        rf"{metric}:\s*(\d+)",
        rf"{metric}\s*-\s*(\d+)",
        rf"{metric}.*?(\d+)/10"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                score = int(match.group(1))
                return min(max(score, 1), 10)  # Ensure score is between 1-10
            except ValueError:
                pass
    
    return default

def extract_sentiment(text: str) -> str:
    """Extract sentiment classification from text."""
    text_lower = text.lower()
    
    if "sentiment: positive" in text_lower or "sentiment is positive" in text_lower:
        return "positive"
    elif "sentiment: negative" in text_lower or "sentiment is negative" in text_lower:
        return "negative"
    else:
        return "neutral"

def extract_keywords(text: str) -> List[str]:
    """Extract keywords from text."""
    import re
    
    # Look for keywords or tags section
    patterns = [
        r"keywords:([^.]*)",
        r"tags:([^.]*)",
        r"key\s*concerns:([^.]*)",
        r"health\s*concerns:([^.]*)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            keywords_text = match.group(1).strip()
            # Split by commas or other separators
            keywords = [k.strip() for k in re.split(r'[,;]', keywords_text)]
            return [k for k in keywords if k]  # Filter out empty strings
    
    # Fallback: extract capitalized words as potential keywords
    capitalized_words = re.findall(r'\b[A-Z][a-z]{2,}\b', text)
    if capitalized_words:
        return capitalized_words[:5]  # Return up to 5 keywords
    
    return ["health", "Nephra", "kidney"]  # Default keywords

def extract_supportive_response(text: str) -> str:
    """Extract supportive response from text."""
    import re
    
    patterns = [
        r"supportive\s*response:([^.]*.)",
        r"response:([^.]*.)",
        r"support:([^.]*.)"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    
    # If no supportive response found, return last sentence
    sentences = text.split('.')
    if sentences:
        return sentences[-2].strip() if len(sentences) > 1 else sentences[0].strip()
    
    return "Thank you for sharing your health journey. Remember to keep monitoring your symptoms and stay in touch with your healthcare provider."

def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Nephra AI Services")
    parser.add_argument("--port", type=int, default=5001, help="Port to run the server on")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    return parser.parse_args()

def log_chat_to_supabase(user_id: str, user_input: str, ai_response: str, model_used: str = "openai", tags: list = None, emotional_score = None):
    """
    Logs a chat interaction to the Supabase chat_logs table.

    Args:
        user_id (str): The user's unique ID or email.
        user_input (str): The message sent by the user.
        ai_response (str): The response generated by the AI.
        model_used (str): The model name, e.g., 'openai' or 'gemini'.
        tags (list): Optional keywords like ["fatigue", "stress"].
        emotional_score: Optional stress or fatigue score (1–10), can be None.
    """
    data = {
        "user_id": user_id,
        "user_input": user_input,
        "ai_response": ai_response,
        "model_used": model_used,
        "timestamp": datetime.now().isoformat()
    }

    # Handle tags - ensure it's a list
    if tags:
        if isinstance(tags, str):
            # If tags is a string, convert to list by splitting
            data["tags"] = [tag.strip() for tag in tags.split(",")]
        else:
            # Otherwise assume it's already a list or similar iterable
            data["tags"] = list(tags)

    # Handle emotional score - must be an integer if provided
    if emotional_score is not None:
        try:
            # Convert to integer or default to 5
            data["emotional_score"] = int(emotional_score)
        except (ValueError, TypeError):
            # If conversion fails, use a default mid-range value
            data["emotional_score"] = 5
            logger.warning(f"Invalid emotional_score value '{emotional_score}', using default 5")

    if supabase_client:
        try:
            response = supabase_client.table("chat_logs").insert(data).execute()
            logger.info(f"✅ Logged chat to Supabase: {user_input[:30]}...")
            return response
        except Exception as e:
            logger.error(f"Error logging chat to Supabase: {e}")
            return None
    else:
        logger.warning("Supabase client not available, chat not logged")
        return None

def get_chat_response(user_id, user_message, model="openai"):
    """
    Gets a response from an AI model and logs it to Supabase.
    
    Args:
        user_id: User identifier for tracking conversations
        user_message: Message from the user
        model: AI model to use ('openai', 'gemini', 'perplexity')
        
    Returns:
        AI response text
    """
    # Get response from AI model
    ai_response = generate_ai_response(user_message, model)
    
    # Extract emotion keywords and score from response
    keywords = extract_keywords(user_message + " " + ai_response)
    
    # Estimate emotional score based on content
    emotional_score = None
    if any(keyword in keywords for keyword in ["tired", "exhausted", "fatigue"]):
        emotional_score = 7
    elif any(keyword in keywords for keyword in ["pain", "hurt", "ache"]):
        emotional_score = 8
    elif any(keyword in keywords for keyword in ["stress", "anxiety", "worried"]):
        emotional_score = 6
    
    # Log the response in Supabase with richer metadata
    log_chat_to_supabase(
        user_id=user_id,
        user_input=user_message,
        ai_response=ai_response,
        model_used=model,
        tags=keywords,
        emotional_score=emotional_score
    )
    
    return ai_response

def generate_ai_response(user_message, model="openai"):
    """
    Generate a response using the specified AI model
    
    Args:
        user_message: Message from the user
        model: AI model to use
        
    Returns:
        AI response text
    """
    if model == "openai" and openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                messages=[
                    {"role": "system", "content": "You are a kidney health assistant for Nephra. Be helpful and empathetic."},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=800
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.warning(f"OpenAI failed: {e}")
    
    elif model == "gemini" and gemini_client:
        try:
            response = gemini_client.generate_content(
                contents=[{"role": "user", "parts": [{"text": user_message}]}],
                generation_config={"temperature": 0.2, "max_output_tokens": 800}
            )
            return response.text
        except Exception as e:
            logger.warning(f"Gemini failed: {e}")
    
    elif model == "perplexity" and perplexity_api_key:
        try:
            # Include implementation for Perplexity API
            # This is a placeholder
            return "Perplexity API response would appear here"
        except Exception as e:
            logger.warning(f"Perplexity failed: {e}")
    
    # Fallback response if the requested model is not available
    return "I'm sorry, I couldn't process your message at this time. The requested AI service may be unavailable."

if __name__ == "__main__":
    args = parse_arguments()
    
    # Check for API keys and warn if missing
    if not os.environ.get("OPENAI_API_KEY"):
        logger.warning("OPENAI_API_KEY not found in environment. OpenAI services will not be available.")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        logger.warning("ANTHROPIC_API_KEY not found in environment. Anthropic services will not be available.")
    if not os.environ.get("PERPLEXITY_API_KEY"):
        logger.warning("PERPLEXITY_API_KEY not found in environment. Perplexity services will not be available.")
    if not os.environ.get("GEMINI_API_KEY"):
        logger.warning("GEMINI_API_KEY not found in environment. Google Gemini services will not be available.")
    
    # Run the Flask app
    logger.info(f"Starting Nephra AI Services on port {args.port}")
    app.run(host="0.0.0.0", port=args.port, debug=args.debug)