# Nephra (KidneyHealth) AI Agent Instructions

## Project Overview
Nephra is a full-stack kidney health tracking application with AI-powered journal analysis and health metrics monitoring. Built with React/TypeScript frontend, Express/Node.js backend, PostgreSQL with Drizzle ORM, and multiple AI providers (OpenAI GPT-4o, Google Gemini, Perplexity, Anthropic Claude).

## Architecture & Tech Stack

### Monorepo Structure
- **`client/`**: React + TypeScript + Vite frontend
- **`server/`**: Express TypeScript backend with AI services
- **`shared/`**: Shared schema (`schema.ts`) with Drizzle ORM definitions and Zod validation
- **`scripts/`**: Python utilities for advanced NLP and AI content generation

### Key Technologies
- **Frontend**: React 18, TypeScript, Wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS
- **Backend**: Express, TypeScript, Passport.js (dual auth: local + Replit), session-based auth
- **Database**: PostgreSQL with Drizzle ORM (`shared/schema.ts` is single source of truth)
- **AI Providers**: OpenAI GPT-4o (primary), Google Gemini, Perplexity, Anthropic Claude with fallback chain
- **Python**: spaCy, transformers for advanced NLP (optional enhancement layer)

## Development Workflows

### Running the Application
```bash
# Install dependencies
npm install

# Development (runs both frontend and backend)
npm run dev  # Port 5000 serves both API and frontend

# Database migrations
npm run db:push  # Push schema changes to database

# Build for production
npm run build && npm start
```

### Python Components (Optional)
Python scripts in `scripts/` provide advanced AI features. Setup via:
```bash
python -m venv kidney_health_env
source kidney_health_env/bin/activate  # or kidney_health_env\Scripts\activate on Windows
pip install -r python_dependencies.txt
python -m spacy download en_core_web_md
```

### Environment Variables Required
Create `.env` in project root:
```
DATABASE_URL=postgresql://...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=...
ANTHROPIC_API_KEY=...
```

## Critical Code Patterns

### 1. Database Schema & Validation
**ALWAYS** reference `shared/schema.ts` for table definitions. Use Zod insert schemas before creating records:

```typescript
import { insertHealthMetricsSchema } from "@shared/schema";

// Validate before storage
const validated = insertHealthMetricsSchema.parse(data);
const result = await storage.createHealthMetrics(validated);
```

**Key tables**: `users`, `healthMetrics` (with GFR tracking), `journalEntries`, `aiChats`, `healthAlerts`, `medicationReminders`, `medicalAppointments`, community features (forums, support groups)

### 2. Authentication Pattern (Hybrid)
Two auth systems coexist:
- **Custom auth** (development): Passport Local Strategy in `server/auth.ts`
- **Replit Auth** (production): OpenID Connect in `server/replitAuth.ts`

Routes check auth via `req.isAuthenticated()`. Example protected endpoint:
```typescript
app.get("/api/data/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const authenticatedUserId = req.user.id;
  const requestedUserId = parseInt(req.params.userId);
  
  // SECURITY: Users can only access their own data
  if (authenticatedUserId !== requestedUserId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  // Proceed with data retrieval
});
```

Frontend auth state via `useAuth()` hook (`client/src/hooks/use-auth.ts`) with TanStack Query.

### 3. AI Services Architecture
**Multi-provider fallback chain** in `server/ai-router.ts` and service files:

```typescript
// Primary: OpenAI GPT-4o (in openai-service.ts)
const response = await openai.chat.completions.create({
  model: "gpt-4o",  // DO NOT change unless explicitly requested
  messages: [...]
});

// Secondary: Gemini (gemini-service.ts)
// Tertiary: Perplexity (perplexity-service.ts) for evidence-based info
// Fallback: Anthropic Claude (anthropic-service.ts)
```

**AI Endpoints**:
- `/api/ai/chat` - General health chat
- `/api/ai/journal/analyze` - Journal sentiment analysis
- `/api/enhanced-journal/*` - Python-enhanced journal analysis
- `/api/evidence-health-info` - Perplexity for evidence-based research

### 4. GFR (Kidney Function) Calculation
Specialized module: `server/utils/gfr-calculator.ts`

Two methods:
1. **Creatinine-based** (high confidence): When creatinine levels available
2. **Symptom-and-vital-based** (moderate/low confidence): From BP, hydration, stress, pain

**Trend analysis** compares current GFR with previous readings stored in `healthMetrics` table. Always calculate trends when GFR data exists:

```typescript
const gfrResult = estimateGfrScore(
  age, gender, weight, height, 
  hydration_level, systolic_bp, diastolic_bp,
  stress, fatigue, pain, creatinine,
  race, previousReadings  // Pass previous readings for trend analysis
);
```

Python version available in `scripts/gfr_calculator.py` (legacy/experimental).

### 5. Frontend Routing
Uses **Wouter** (not React Router):

```tsx
import { Route, Switch, Redirect, useLocation, Link } from "wouter";

// Navigation
const [pathname, navigate] = useLocation();
navigate("/dashboard");

// Links
<Link href="/journal">Go to Journal</Link>
```

Protected routes pattern in `client/src/App.tsx`: Check auth, redirect to `/auth` if unauthenticated.

### 6. Health Data Security Pattern
**CRITICAL**: All health data endpoints require authentication and ownership validation:

```typescript
// ❌ WRONG - Missing auth check
app.get("/api/health-metrics/:userId", async (req, res) => {
  const userId = parseInt(req.params.userId);
  const results = await storage.getHealthMetrics(userId);
  res.json(results);
});

// ✅ CORRECT - Auth + ownership validation
app.get("/api/health-metrics/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentication required" });
  }
  
  const authenticatedUserId = req.user.id;
  const requestedUserId = parseInt(req.params.userId);
  
  if (authenticatedUserId !== requestedUserId) {
    return res.status(403).json({ error: "Access denied" });
  }
  
  const results = await storage.getHealthMetrics(authenticatedUserId);
  res.json(results);
});
```

**NEVER** store sensitive health data in localStorage or sessionStorage. Only use sessionStorage for non-sensitive UI preferences like unit system.

## Common Tasks

### Adding a New Database Table
1. Define in `shared/schema.ts` with `pgTable()`
2. Create Zod insert schema with `createInsertSchema()`
3. Export TypeScript types
4. Run `npm run db:push` to migrate
5. Add storage methods in `server/storage.ts` or `server/database-storage.ts`

### Creating New AI Endpoint
1. Add service function in appropriate `server/*-service.ts` file
2. Register route in `server/ai-router.ts` or create dedicated router
3. Mount router in `server/routes.ts`
4. Follow the multi-provider fallback pattern
5. Always handle errors gracefully with fallback responses

### Adding New Protected Page
1. Create component in `client/src/pages/`
2. Add route in `client/src/App.tsx` within authenticated `<Switch>`
3. Access user via `useUser()` hook from `client/src/contexts/UserContext.tsx`
4. Use `useAuth()` for loading states

## Testing & Debugging

### Manual Testing Routes
- Use authenticated session or provide auth headers
- Test GFR calculations: POST `/api/estimate-gfr` with user health data
- Test AI chat: POST `/api/ai/chat` with `{userId, userMessage}`

### Python Script Testing
```bash
python test_gfr.py  # Test GFR calculator with sample data
python scripts/verify_ai_setup.py  # Verify AI provider connections
```

### Database Inspection
```bash
# Access PostgreSQL directly (if DATABASE_URL available)
psql $DATABASE_URL
```

## Project-Specific Conventions

### API Response Patterns
- Success: `res.json({ data })` or `res.status(201).json({ result })`
- Client errors: `res.status(400).json({ error: "message" })`
- Auth errors: `res.status(401).json({ error: "Authentication required" })`
- Forbidden: `res.status(403).json({ error: "Access denied" })`
- Server errors: `res.status(500).json({ error: "message" })`

### Logging
Use `console.log` with emojis for readability:
```typescript
console.log("✅ Health metrics saved successfully");
console.warn("⚠️ Missing user profile data");
console.error("❌ Database error:", error);
```

### TypeScript
- Strict mode enabled
- Prefer explicit types over `any`
- Use Zod schemas for runtime validation
- Import shared types from `@shared/schema`

### Component Organization
- UI components: `client/src/components/` (shadcn/ui based)
- Pages: `client/src/pages/`
- Hooks: `client/src/hooks/`
- Contexts: `client/src/contexts/`
- Utils: `client/src/lib/`

## Important Files Reference

- **`shared/schema.ts`**: Complete database schema with Zod validation
- **`server/routes.ts`**: Main API route registration (1000+ lines)
- **`server/ai-router.ts`**: AI service endpoints
- **`server/storage.ts`** / **`database-storage.ts`**: Database operations
- **`server/utils/gfr-calculator.ts`**: GFR estimation with trend analysis
- **`client/src/App.tsx`**: Routing and auth flow
- **`client/src/contexts/UserContext.tsx`**: Global user state management
- **`README.md`**: High-level project documentation
- **`PYTHON_SETUP.md`**: Python environment setup for AI features

## External Dependencies & Integrations

### Supabase (Optional)
Some features have Supabase integration for analytics:
- Education content storage
- Chat history backup
- Check connection before using: `supabaseService.checkSupabaseConnection()`

### Replit Deployment
Production deployment on Replit uses:
- Replit Auth (OpenID Connect)
- Single port 5000 for both API and static assets
- `REPL_ID` environment variable triggers production mode
