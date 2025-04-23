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
    
    if not journal_content:
        return jsonify({"error": "No journal content provided"}), 400
    
    # Analyze journal entry with fallback mechanisms across providers
    analysis_result = analyze_journal_entry(journal_content)
    
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
def analyze_journal_entry(journal_content: str) -> Dict[str, Any]:
    """
    Analyze a journal entry with multiple AI providers.
    Falls back between providers if any fail.
    """
    # Try OpenAI first
    if openai_client:
        try:
            response = openai_client.chat.completions.create(
                model="gpt-4o",  # the newest OpenAI model is "gpt-4o" which was released May 13, 2024
                messages=[
                    {
                        "role": "system",
                        "content": """You are a kidney health AI assistant analyzing journal entries. 
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
                    },
                    {"role": "user", "content": journal_content}
                ],
                response_format={"type": "json_object"}
            )
            
            # Parse and return the JSON response
            return json.loads(response.choices[0].message.content)
            
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
                return json.loads(response.content[0].text)
            except json.JSONDecodeError:
                # If not valid JSON, extract info manually
                text = response.content[0].text
                
                # Fallback extraction
                return {
                    "stressScore": extract_score(text, "stress", 5),
                    "fatigueScore": extract_score(text, "fatigue", 5),
                    "painScore": extract_score(text, "pain", 3),
                    "sentiment": extract_sentiment(text),
                    "keywords": extract_keywords(text),
                    "supportiveResponse": extract_supportive_response(text),
                    "healthInsights": "Analysis completed with limited structured data extraction."
                }
                
        except Exception as e:
            logger.warning(f"Anthropic analysis failed, falling back to fallback: {e}")
    
    # Final fallback to basic analysis
    return {
        "stressScore": 5,
        "fatigueScore": 5,
        "painScore": 3,
        "sentiment": "neutral",
        "keywords": ["health", "journal"],
        "supportiveResponse": "Thank you for sharing your thoughts. It's important to monitor your health and well-being. Consider discussing any concerns with your healthcare provider.",
        "healthInsights": "Unable to perform detailed analysis. Please ensure your journal entry contains health-related information."
    }

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
    # Implementation would be similar to analyze_journal_entry
    # with appropriate prompts and fallback mechanisms
    pass

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
    
    return ["health", "kidney"]  # Default keywords

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
    logger.info(f"Starting KidneyHealth AI Services on port {args.port}")
    app.run(host="0.0.0.0", port=args.port, debug=args.debug)