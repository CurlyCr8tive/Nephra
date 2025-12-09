# Overview

KidneyHealth (Nephra) is a comprehensive kidney health tracking application that combines health metrics monitoring, AI-powered journaling, and educational resources to support individuals managing chronic kidney disease. The application uses a multi-modal approach, integrating multiple AI providers (OpenAI, Google Gemini, Anthropic, Perplexity) to deliver personalized health insights, emotional support, and evidence-based medical guidance. Key features include GFR estimation, transplant roadmap guidance, health trend visualization, and intelligent journal analysis with emotional wellness support.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses a React-based frontend with TypeScript, implementing a modern component architecture:
- **UI Framework**: React with TypeScript for type safety and component-based development
- **Styling**: TailwindCSS with ShadCN UI components for consistent, accessible design
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Data Visualization**: Recharts for health trend charts and metrics visualization
- **Form Handling**: React Hook Form with Zod validation for robust form management

## Backend Architecture
The backend follows a RESTful API design pattern with TypeScript and Express:
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety across the full stack
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Structure**: Modular router-based architecture with separate services for different functionalities
- **Authentication**: Passport.js with local strategy and session-based auth
- **AI Integration**: Service layer pattern with fallback mechanisms across multiple AI providers

## Database Design
The application uses PostgreSQL with a comprehensive schema designed for health data:
- **Primary Database**: PostgreSQL hosted on Neon with connection pooling
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Key Tables**: users, health_metrics, journal_entries, education_resources, transplant_steps, ai_chats
- **Data Relationships**: Foreign key relationships maintaining referential integrity
- **Indexing**: Optimized for user-based queries and time-series health data

## AI and ML Components
Multi-provider AI architecture with intelligent fallback mechanisms:
- **Primary Providers**: OpenAI GPT-4o, Google Gemini 1.5 Pro, Anthropic Claude 3.5 Sonnet, Perplexity API
- **Fallback Strategy**: Sequential provider testing with graceful degradation
- **Specialized Functions**: GFR estimation algorithm, journal sentiment analysis, health trend detection
- **Python Integration**: Additional Python backend for advanced NLP and health calculations
- **Evidence-Based Responses**: Content validation against trusted medical sources

## Authentication and Security
Session-based authentication with comprehensive user management:
- **Authentication Strategy**: Passport.js local strategy with bcrypt password hashing
- **Session Management**: Express sessions with PostgreSQL session store
- **Route Protection**: Middleware-based route protection for authenticated endpoints
- **User Context**: React context for client-side authentication state management
- **Security Headers**: CORS configuration and secure session handling

# External Dependencies

## AI Service Providers
- **OpenAI API**: GPT-4o model for conversational AI and health analysis
- **Google Generative AI**: Gemini 1.5 Pro for specialized kidney health advice
- **Anthropic API**: Claude 3.5 Sonnet for emotional support and analysis
- **Perplexity API**: Evidence-based health information retrieval

## Database and Backend Services
- **Neon PostgreSQL**: Serverless PostgreSQL database with connection pooling
- **Supabase**: Secondary integration for real-time features and storage
- **Express Session Store**: PostgreSQL-backed session persistence

## Frontend Libraries and Frameworks
- **Radix UI**: Accessible, unstyled UI components (@radix-ui/react-*)
- **Lucide React**: Icon library for consistent iconography
- **Chart.js**: Additional charting capabilities alongside Recharts
- **React Query**: Server state management and caching

## Development and Build Tools
- **Vite**: Frontend build tool with fast development server
- **ESBuild**: JavaScript bundling for production builds
- **TypeScript**: Type checking and compilation
- **Drizzle Kit**: Database migration and schema management

## Python AI/ML Dependencies
- **spaCy**: Natural language processing and entity recognition
- **transformers**: Hugging Face transformers for advanced NLP
- **pandas/numpy**: Data processing and analysis
- **scikit-learn**: Machine learning algorithms for health predictions
- **Flask**: Lightweight API server for Python AI services

## Content and Data Sources
- **Public Health APIs**: Integration with CDC, NIH, and National Kidney Foundation resources
- **Medical Literature**: PubMed and ClinicalTrials.gov integration for evidence-based content
- **Transplant Data**: UNOS and OPTN public data sources for transplant information

## News Aggregation System (Added December 2025)
Multi-source news aggregation for real-time kidney health content:
- **Perplexity AI**: Real-time AI-powered news search for latest kidney health developments
- **PubMed API**: Free access to medical research abstracts via NCBI E-utilities
- **RSS Feeds**: Configured for NKF, NIH, and FDA medical device news (URLs may need updating)
- **Caching**: 30-minute cache with forced refresh capability
- **API Endpoints**:
  - `GET /api/kidney-news` - Aggregated news from all sources
  - `GET /api/kidney-news/category/:category` - Filter by category (research, treatment, policy, prevention, general)
  - `GET /api/kidney-news/status` - Cache status and metadata