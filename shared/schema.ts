import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Supabase table interfaces
export interface SupabaseHealthLog {
  id?: number;
  user_id: string | number;
  created_at: string;
  bp_systolic?: number;
  bp_diastolic?: number;
  hydration_level?: number;
  pain_level: number;
  stress_level: number;
  fatigue_level: number;
  estimated_gfr?: number | null;
  tags?: string[];
  medications_taken?: string[];
  notes?: string;
  metadata?: Record<string, any>;
}

export interface SupabaseChatLog {
  id?: number;
  user_id: string | number;
  user_input: string;
  ai_response: string;
  model_used?: string;
  timestamp: string;
  tags?: string[];
  emotional_score?: number | null;
  metadata?: Record<string, any>;
}

export interface SupabaseEducationArticle {
  id?: number;
  title: string;
  summary: string;
  url: string;
  source: string;
  published_date: string;
  category: string;
  user_focus_tags?: string[];
  image_url?: string;
  content?: string;
}

export interface SupabaseJournalEntry {
  id?: number;
  user_id: string | number;
  content: string;
  created_at: string;
  sentiment?: string;
  ai_analysis?: string;
  tags?: string[];
  stress_level?: number;
  fatigue_level?: number;
  pain_level?: number;
  metadata?: Record<string, any>;
}

// Create Zod schemas for Supabase data validation
export const supabaseHealthLogSchema = z.object({
  id: z.number().optional(),
  user_id: z.union([z.string(), z.number()]),
  created_at: z.string(),
  bp_systolic: z.number().optional(),
  bp_diastolic: z.number().optional(),
  hydration_level: z.number().optional(),
  pain_level: z.number(),
  stress_level: z.number(),
  fatigue_level: z.number(),
  estimated_gfr: z.number().nullable().optional(),
  tags: z.array(z.string()).optional(),
  medications_taken: z.array(z.string()).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// User profile table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  age: integer("age"),
  gender: text("gender"),
  weight: doublePrecision("weight"), // in kg
  height: doublePrecision("height"), // in cm
  race: text("race"),
  
  // Kidney disease and health information
  kidneyDiseaseType: text("kidney_disease_type"),
  kidneyDiseaseStage: integer("kidney_disease_stage"),
  diagnosisDate: timestamp("diagnosis_date"),
  otherHealthConditions: text("other_health_conditions").array(),
  
  // Healthcare providers
  primaryCareProvider: text("primary_care_provider"),
  nephrologist: text("nephrologist"),
  otherSpecialists: jsonb("other_specialists"), // Array of {name, specialty, phone}
  
  // Insurance and transplant information
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  transplantCenter: text("transplant_center"),
  transplantCoordinator: text("transplant_coordinator"),
  transplantCoordinatorPhone: text("transplant_coordinator_phone"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Health metrics table
export const healthMetrics = pgTable("health_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: timestamp("date").defaultNow(),
  hydration: doublePrecision("hydration"), // in liters
  systolicBP: integer("systolic_bp"),
  diastolicBP: integer("diastolic_bp"),
  painLevel: integer("pain_level"),
  stressLevel: integer("stress_level"),
  fatigueLevel: integer("fatigue_level"), // 1-10 scale for fatigue
  
  // GFR calculation related fields
  estimatedGFR: doublePrecision("estimated_gfr"),
  gfrCalculationMethod: text("gfr_calculation_method"), // "creatinine-based" or "symptom-and-vital-based"
  creatinineLevel: doublePrecision("creatinine_level"), // in mg/dL
  hydrationLevel: integer("hydration_level"), // 1-10 scale
  
  // GFR trend analysis fields
  gfrTrend: text("gfr_trend"), // "stable", "possible decline", "possible improvement", etc.
  gfrTrendDescription: text("gfr_trend_description"), // Descriptive text explaining the trend
  gfrChangePercent: doublePrecision("gfr_change_percent"), // Percentage change from previous readings
  gfrAbsoluteChange: doublePrecision("gfr_absolute_change"), // Absolute change in GFR value
  gfrLongTermTrend: text("gfr_long_term_trend"), // Long-term trend analysis
  gfrStability: text("gfr_stability"), // Assessment of GFR stability over time
});

// Emotional check-ins table
export const emotionalCheckIns = pgTable("emotional_check_ins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: timestamp("date").defaultNow(),
  emotion: text("emotion"), // e.g., "great", "good", "okay", "down", "stressed"
  tags: text("tags").array(),
  notes: text("notes"),
});

// AI chat history table
export const aiChats = pgTable("ai_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
  userMessage: text("user_message"),
  aiResponse: text("ai_response"),
});

// Transplant roadmap steps table
export const transplantSteps = pgTable("transplant_steps", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  orderIndex: integer("order_index"),
});

// User transplant progress table
export const userTransplantProgress = pgTable("user_transplant_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  stepId: integer("step_id").references(() => transplantSteps.id),
  status: text("status"), // "completed", "in_progress", "pending"
  completedDate: timestamp("completed_date"),
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: timestamp("date").defaultNow(),
  content: text("content").notNull(),
  aiResponse: text("ai_response"),
  sentiment: text("sentiment"),
  tags: text("tags").array(),
  stressScore: integer("stress_score"),
  fatigueScore: integer("fatigue_score"),
  painScore: integer("pain_score"),
});

// Medical documents table for upload center
export const medicalDocuments = pgTable("medical_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  documentType: text("document_type").notNull(), // test_result, medical_record, insurance_info
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  uploadDate: timestamp("upload_date").defaultNow(),
  metadata: jsonb("metadata"), // Additional metadata like test type, date, etc.
  aiVerified: boolean("ai_verified").default(false),
  aiVerificationNotes: text("ai_verification_notes"),
});

// Education resources table
export const educationResources = pgTable("education_resources", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // suggested_questions, treatment_options, news, self_advocacy
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  resourceUrl: text("resource_url"),
  imageUrl: text("image_url"),
  publishDate: timestamp("publish_date"),
  sortOrder: integer("sort_order"),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertHealthMetricsSchema = createInsertSchema(healthMetrics).omit({
  id: true,
});

export const insertEmotionalCheckInSchema = createInsertSchema(emotionalCheckIns).omit({
  id: true,
});

export const insertAiChatSchema = createInsertSchema(aiChats).omit({
  id: true,
});

export const insertTransplantStepSchema = createInsertSchema(transplantSteps).omit({
  id: true,
});

export const insertUserTransplantProgressSchema = createInsertSchema(userTransplantProgress).omit({
  id: true,
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
});

export const insertMedicalDocumentSchema = createInsertSchema(medicalDocuments).omit({
  id: true,
});

export const insertEducationResourceSchema = createInsertSchema(educationResources).omit({
  id: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertHealthMetrics = z.infer<typeof insertHealthMetricsSchema>;
export type HealthMetrics = typeof healthMetrics.$inferSelect;

export type InsertEmotionalCheckIn = z.infer<typeof insertEmotionalCheckInSchema>;
export type EmotionalCheckIn = typeof emotionalCheckIns.$inferSelect;

export type InsertAiChat = z.infer<typeof insertAiChatSchema>;
export type AiChat = typeof aiChats.$inferSelect;

export type InsertTransplantStep = z.infer<typeof insertTransplantStepSchema>;
export type TransplantStep = typeof transplantSteps.$inferSelect;

export type InsertUserTransplantProgress = z.infer<typeof insertUserTransplantProgressSchema>;
export type UserTransplantProgress = typeof userTransplantProgress.$inferSelect;

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

export type InsertMedicalDocument = z.infer<typeof insertMedicalDocumentSchema>;
export type MedicalDocument = typeof medicalDocuments.$inferSelect;

export type InsertEducationResource = z.infer<typeof insertEducationResourceSchema>;
export type EducationResource = typeof educationResources.$inferSelect;
