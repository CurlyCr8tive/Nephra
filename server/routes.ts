import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertHealthMetricsSchema, 
  insertEmotionalCheckInSchema, 
  insertAiChatSchema,
  insertMedicalDocumentSchema,
  insertJournalEntrySchema,
  insertEducationResourceSchema,
  insertTransplantStepSchema,
  insertUserTransplantProgressSchema
} from "@shared/schema";

import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development" 
});

// Estimate GFR based on health metrics and user profile
// This is a simplified estimation for demonstration purposes
function estimateGFR(
  age: number, 
  gender: string, 
  race: string, 
  weight: number, 
  systolicBP: number, 
  diastolicBP: number, 
  hydration: number, 
  stressLevel: number, 
  painLevel: number, 
  diseaseStage: number
): number {
  // This is a simplified formula for estimation purposes
  // In a real application, you would use established medical formulas
  // such as CKD-EPI or MDRD equations
  
  // Base GFR range based on kidney disease stage (simplified)
  let baseGFR = 90;
  if (diseaseStage === 1) baseGFR = 90;
  else if (diseaseStage === 2) baseGFR = 75;
  else if (diseaseStage === 3) baseGFR = 45;
  else if (diseaseStage === 4) baseGFR = 25;
  else if (diseaseStage === 5) baseGFR = 15;
  
  // Adjustment factors (simplified for demo)
  const ageAdjustment = Math.max(0, (40 - age) / 100);
  const genderFactor = gender.toLowerCase() === 'female' ? 0.85 : 1.0;
  const raceFactor = race.toLowerCase() === 'black' ? 1.2 : 1.0;
  
  // Health metric adjustments (simplified for demo)
  const bpFactor = 1 - Math.max(0, (systolicBP - 120) / 400);
  const hydrationFactor = 1 + (hydration / 10);
  const stressFactor = 1 - (stressLevel / 20);
  const painFactor = 1 - (painLevel / 20);
  
  // Calculate adjusted GFR
  let adjustedGFR = baseGFR * (1 + ageAdjustment) * genderFactor * 
                    raceFactor * bpFactor * hydrationFactor * 
                    stressFactor * painFactor;
  
  // Ensure result is within reasonable bounds for the disease stage
  adjustedGFR = Math.min(adjustedGFR, 120);
  adjustedGFR = Math.max(adjustedGFR, 5);
  
  return Math.round(adjustedGFR);
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health metrics endpoints
  app.post("/api/health-metrics", async (req, res) => {
    try {
      const data = insertHealthMetricsSchema.parse(req.body);
      
      // If user exists, retrieve user data for GFR estimation
      const user = await storage.getUser(data.userId);
      if (user && data.systolicBP && data.painLevel && data.stressLevel && data.hydration) {
        // Only estimate GFR if we have the necessary user data
        if (user.age && user.gender && user.race && user.weight && user.kidneyDiseaseStage) {
          const gfr = estimateGFR(
            user.age,
            user.gender,
            user.race,
            user.weight,
            data.systolicBP,
            data.diastolicBP || 80, // Default if not provided
            data.hydration,
            data.stressLevel,
            data.painLevel,
            user.kidneyDiseaseStage
          );
          data.estimatedGFR = gfr;
        }
      }
      
      const result = await storage.createHealthMetrics(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/health-metrics/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const results = await storage.getHealthMetrics(userId, limit);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/health-metrics/:userId/range", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const startDate = new Date(req.query.start as string);
      const endDate = new Date(req.query.end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format" });
      }
      
      const results = await storage.getHealthMetricsByDate(userId, startDate, endDate);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Emotional check-in endpoints
  app.post("/api/emotional-check-in", async (req, res) => {
    try {
      const data = insertEmotionalCheckInSchema.parse(req.body);
      const result = await storage.createEmotionalCheckIn(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/emotional-check-in/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const results = await storage.getEmotionalCheckIns(userId, limit);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // User management endpoints
  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const result = await storage.createUser(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.updateUser(id, req.body);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // AI chat endpoints
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { userId, userMessage } = req.body;
      
      try {
        // Send message to OpenAI
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a supportive AI health companion for people with kidney disease. Provide empathetic, informative responses. Focus on emotional support and practical advice while being clear that you are not a medical professional and serious concerns should be discussed with healthcare providers."
            },
            {
              role: "user",
              content: userMessage
            }
          ],
          max_tokens: 500,
        });

        const aiResponse = response.choices[0].message.content;
        
        // Save the conversation to storage
        const chat = await storage.createAiChat({
          userId,
          userMessage,
          aiResponse,
          timestamp: new Date()
        });
        
        res.json({ message: aiResponse, chat });
      } catch (error) {
        console.error("OpenAI API error:", error);
        res.status(500).json({ 
          error: "Could not process request with AI service", 
          message: "I'm having trouble connecting right now. Please try again later."
        });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/ai-chat/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const chats = await storage.getAiChats(userId, limit);
      res.json(chats);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Transplant roadmap endpoints
  app.get("/api/transplant-steps", async (req, res) => {
    try {
      const steps = await storage.getTransplantSteps();
      res.json(steps);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/transplant-progress/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const progress = await storage.getUserTransplantProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/transplant-progress", async (req, res) => {
    try {
      const data = req.body;
      const result = await storage.createUserTransplantProgress(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/transplant-progress/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const progress = await storage.updateUserTransplantProgress(id, req.body);
      if (!progress) {
        return res.status(404).json({ error: "Progress record not found" });
      }
      res.json(progress);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Medical documents endpoints
  app.post("/api/medical-documents", async (req, res) => {
    try {
      const data = insertMedicalDocumentSchema.parse(req.body);
      
      // Here we would normally have file upload logic
      // For now we'll simulate it with the provided metadata
      const result = await storage.createMedicalDocument(data);
      
      // If we had an AI verification system, we'd call it here
      // For now, we'll just mark it as unverified
      if (result.documentType === "test_result") {
        // Use OpenAI to analyze the document if it's a test result
        try {
          const verification = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a medical document verification assistant. Verify the following test result data for accuracy and provide a brief analysis."
              },
              {
                role: "user",
                content: `Document type: ${result.documentType}, File name: ${result.fileName}, Metadata: ${JSON.stringify(result.metadata)}`
              }
            ],
            max_tokens: 250,
          });
          
          // Update the document with verification notes
          const updated = await storage.updateMedicalDocument(result.id, {
            aiVerified: true,
            aiVerificationNotes: verification.choices[0].message.content
          });
          
          res.status(201).json(updated);
        } catch (error) {
          console.error("AI verification error:", error);
          res.status(201).json(result);
        }
      } else {
        res.status(201).json(result);
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get("/api/medical-documents/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const documentType = req.query.type as string | undefined;
      const results = await storage.getMedicalDocuments(userId, documentType);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Journal entries endpoints
  app.post("/api/journal-entries", async (req, res) => {
    try {
      const data = insertJournalEntrySchema.parse(req.body);
      
      // Create the journal entry first
      let result = await storage.createJournalEntry(data);
      
      // If we want AI analysis of the journal entry
      if (data.content) {
        try {
          // Generate AI response and sentiment analysis
          const analysis = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "You are a supportive AI assistant. Analyze the following journal entry for emotional tone and provide a supportive, uplifting response. Also determine the primary sentiment (positive, neutral, negative) and suggest 2-3 relevant tags separated by commas."
              },
              {
                role: "user",
                content: data.content
              }
            ],
            max_tokens: 350,
            response_format: { type: "json_object" }
          });
          
          // Parse the JSON response
          const aiResponse = JSON.parse(analysis.choices[0].message.content);
          
          // Update the journal entry with AI response and sentiment
          const updatedEntry = await storage.updateJournalEntry(result.id, {
            aiResponse: aiResponse.response,
            sentiment: aiResponse.sentiment,
            tags: aiResponse.tags.split(',').map(tag => tag.trim())
          });
          
          result = updatedEntry;
        } catch (error) {
          console.error("AI analysis error:", error);
          // Continue without AI analysis if there's an error
        }
      }
      
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.get("/api/journal-entries/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const results = await storage.getJournalEntries(userId, limit);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  // Education resources endpoints
  app.get("/api/education-resources", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const results = await storage.getEducationResources(category);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  app.post("/api/education-resources", async (req, res) => {
    try {
      const data = insertEducationResourceSchema.parse(req.body);
      const result = await storage.createEducationResource(data);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
