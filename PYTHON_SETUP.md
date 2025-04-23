# Python Setup for KidneyHealth AI Components

This guide will help you set up the Python environment for the KidneyHealth application, which uses Python for enhanced AI and NLP features.

## Prerequisites

- Python 3.10+ installed on your system
- pip (Python package manager)
- Virtual environment tool (venv or conda recommended)

## Setup Instructions

### 1. Create a Virtual Environment

It's recommended to create a virtual environment to isolate the dependencies:

```bash
# Using venv (built into Python)
python -m venv kidney_health_env

# Activate on Windows
kidney_health_env\Scripts\activate

# Activate on macOS/Linux
source kidney_health_env/bin/activate
```

### 2. Install Dependencies

Install all required packages from the provided `python_dependencies.txt` file:

```bash
pip install -r python_dependencies.txt
```

### 3. Download Additional NLP Resources

For NLP functionality, download the required spaCy language models:

```bash
python -m spacy download en_core_web_md
```

### 4. Set Up Environment Variables

Create a `.env` file in the project root with the following API keys:

```
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Python Components Architecture

The application uses Python for advanced NLP and AI functionality, including:

1. **Enhanced Journal Analysis**
   - Sentiment analysis with multiple AI providers
   - Health metric extraction from natural language
   - Emotional pattern detection

2. **Medical Document Validation**
   - Verification of medical test results
   - Extraction of key health indicators

3. **Multimodal AI Fallback System**
   - Designed to ensure service continuity with multiple AI providers
   - Automatically selects the best available provider

## Testing the Python Environment

To verify your setup, run the diagnostic script:

```bash
python ./scripts/verify_ai_setup.py
```

## Troubleshooting

### Common Issues

- **Memory Errors with Transformers**: For machines with limited memory, add `TRANSFORMERS_OFFLINE=1` to your environment variables to prevent model downloads.
- **SSL Certificate Errors**: Make sure your Python installation has up-to-date certificates.
- **API Rate Limiting**: If you encounter rate limiting, implement request throttling by modifying the retries parameter in the AI service files.

### Getting Help

For issues with the Python components, please open an issue on the repository.