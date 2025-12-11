# KidneyHealth: Comprehensive Kidney Health Tracking Application

KidneyHealth is a mobile-first kidney health tracking application that leverages advanced AI and NLP technologies to provide comprehensive health monitoring and emotional wellness support for kidney patients.

![KidneyHealth App](./attached_assets/ChatGPT%20Image%20Apr%2018%2C%202025%2C%2007_32_45%20PM.png)

## Key Features

- **Health Metrics Tracking**: Monitor GFR, creatinine, blood pressure, pain, stress, and fatigue
- **Kidney Stress Load Score (KSLS)**: Daily wellness index combining BP, hydration, symptoms, and BMI into a 0-100 score with demographic-informed insights (NEW!)
- **AI-Powered Journal**: Intelligent analysis of your journal entries with emotional wellness support
- **Multi-AI Provider System**: Uses OpenAI, Perplexity, Google Gemini, and Anthropic with fallback options
- **Education & Advocacy Hub**: Resources on kidney health, treatment options, and self-advocacy
- **Transplant Roadmap**: Interactive guide through the transplant journey

## Technology Stack

### Frontend
- React with TypeScript
- TailwindCSS + ShadCN UI components
- Recharts for data visualization
- React Query for state management

### Backend
- Node.js & Express
- TypeScript
- PostgreSQL with Drizzle ORM
- Multiple AI provider integrations

### AI & NLP Components
- OpenAI GPT-4o for intelligent insights
- Perplexity API for evidence-based health information
- Google Gemini for specialized kidney health advice
- Anthropic Claude for emotional support
- Custom NLP pipeline using spaCy and transformers

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- API keys for AI providers (OpenAI, Gemini, Perplexity, Anthropic)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/kidney-health.git
cd kidney-health
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables  
Create a `.env` file with the following:
```
DATABASE_URL=postgresql://username:password@localhost:5432/kidneyhealth
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
PERPLEXITY_API_KEY=your_perplexity_key
ANTHROPIC_API_KEY=your_anthropic_key
```

4. Initialize the database
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

### Python Components Setup

Some advanced NLP features require Python. See [Python Setup Guide](./PYTHON_SETUP.md) for details.

## Application Architecture

### Pages
- **Dashboard**: Overview of health metrics and recent entries
- **Health Trends**: Visualization and analysis of health data over time
- **Journal & Chat**: Record feelings and chat with AI health assistant
- **Education Hub**: Resources and educational materials
- **Transplant Roadmap**: Step-by-step journey tracking

### AI Integration
The application uses a multi-modal AI system with fallback options:
1. Primary: Enhanced Chatbot (combination of multiple providers)
2. Secondary: OpenAI for general health insights
3. Tertiary: Perplexity for evidence-based information
4. Backup: Google Gemini and Anthropic Claude

### Kidney Stress Load Score (KSLS)
KSLS is a 0-100 wellness index that helps users understand daily kidney stress from health metrics. **NOT** a measure of kidney function (GFR) or a diagnostic tool.

**Key Principles:**
- Demographics **NEVER** affect the numeric score (equity-focused design)
- Combines 6 factors: blood pressure (35%), hydration (15%), fatigue (15%), pain (10%), stress (10%), BMI (15%)
- Score bands: Stable (0-33), Elevated (34-66), High (67-100)
- Demographic-informed interpretation layer provides personalized educational context
- Based on evidence from JNC 8, KDIGO, KDOQI, and NKF guidelines

**Usage:**
```typescript
// API endpoint
POST /api/ksls/calculate
POST /api/ksls/calculate-from-metrics/:userId

// React hook
import { useKSLS } from '@/hooks/useKSLS';
const { calculateKSLS } = useKSLS();

// Component
import { KSLSCard } from '@/components/KSLSCard';
<KSLSCard result={result} interpretation={interpretation} />
```

See [KSLS Documentation](./docs/KSLS.md) for full details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Kidney Foundation for educational resources
- Medical advisors for domain knowledge
- Open source community for tools and libraries