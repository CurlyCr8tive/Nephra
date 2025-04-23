# Evidence-Based AI Integration for Kidney Health App

## Overview

This directory contains scripts and schemas that implement an evidence-based AI system for the Kidney Health App. The system ensures that all information provided to users comes from trusted public sources rather than solely from AI model knowledge.

## Key Components

### 1. Education Content Ingestion (`education_content_uploader.py`)

This script:
- Fetches articles from trusted medical sources (CDC, NIH, National Kidney Foundation, UNOS, etc.)
- Creates plain-language summaries using AI for readability
- Stores this information in a Supabase database with full source attribution
- Tags content for efficient retrieval

### 2. Database Schema (`supabase_schema.sql`)

The schema:
- Defines the structure for storing educational content
- Includes fields for source URLs, titles, categories, and tags
- Creates indexes for efficient searching
- Implements views for specific use cases (transplant info, recent articles)

### 3. Search Functions (`supabase_search_function.sql`)

These functions:
- Provide optimized full-text search capabilities
- Incorporate tag and category boosting for relevance
- Support related article discovery
- Enable efficient filtering by tag

### 4. AI Integration (`ai_content_integration.py`)

This integration:
- Retrieves relevant articles from the database based on user queries
- Creates a context from trusted sources to inform AI responses
- Uses a multi-provider approach (OpenAI, Perplexity, Google Gemini) with fallbacks
- Ensures responses include citations to the original sources
- Caches frequently accessed information for performance

## How It Ensures Evidence-Based Responses

1. **Source Prioritization**: When a user asks a question, the system first searches for relevant information in our database of content from trusted medical sources.

2. **Context Injection**: The retrieved evidence is injected into the AI prompt, ensuring the model has accurate, trusted information to work with.

3. **Citation Requirements**: AI models are explicitly instructed to include citations to the original sources in their responses.

4. **Multiple Provider Fallback**: If one AI provider fails, the system tries others while maintaining the same evidence-based approach.

5. **Source Transparency**: The UI displays the sources of information used in generating responses, allowing users to verify the information.

## Trusted Sources Used

- National Kidney Foundation (kidney.org)
- Centers for Disease Control and Prevention (cdc.gov)
- National Institute of Diabetes and Digestive and Kidney Diseases (niddk.nih.gov)
- United Network for Organ Sharing (unos.org)
- Organ Procurement and Transplantation Network (optn.transplant.hrsa.gov)
- MedlinePlus (medlineplus.gov)
- American Society of Transplantation (myast.org)
- Scientific Registry of Transplant Recipients (srtr.org)

## Using the System

To add new educational content:
1. Update the `articles_to_upload` list in `education_content_uploader.py`
2. Run the script to fetch and store the new content

To test AI responses:
1. Ensure the necessary API keys are set in your environment
2. Run `ai_content_integration.py` to test sample queries

## Requirements

- Python 3.8+
- OpenAI API key
- Google Gemini API key
- Perplexity API key (optional, provides additional citations)
- Supabase project with PostgreSQL database
- Required Python packages: supabase, openai, google-generativeai, requests, beautifulsoup4