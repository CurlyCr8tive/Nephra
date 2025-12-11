import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

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

export interface SupabaseHealthAlert {
  id?: number;
  user_id: string | number;
  created_at: string;
  alert_type: 'critical' | 'warning' | 'insight';
  metrics: {
    name: string;
    value: number | string;
    threshold?: number | string;
  }[];
  message?: string;
  is_acknowledged: boolean;
  acknowledged_at?: string;
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

// Session storage table for Replit Auth - use existing 'session' table
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "session", // Use existing table name
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User profile table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username"), // Made optional for Replit Auth users
  password: text("password"), // Made optional for Replit Auth users  
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  // Replit Auth fields
  replitUserId: varchar("replit_user_id").unique(), // Maps to Replit's user ID
  profileImageUrl: varchar("profile_image_url"),
  authProvider: text("auth_provider").default("local"), // 'local' or 'replit'
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
  pulse: integer("pulse"), // heart rate in bpm (beats per minute)
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
  
  // KSLS (Kidney Stress Load Score) fields
  kslsScore: doublePrecision("ksls_score"), // 0-100 wellness index score
  kslsBand: text("ksls_band"), // "stable", "elevated", or "high"
  kslsFactors: jsonb("ksls_factors"), // JSON object with normalized factor values
  kslsBmi: doublePrecision("ksls_bmi"), // BMI calculated at time of KSLS
  kslsConfidence: text("ksls_confidence"), // "high", "moderate", "low" (if symptoms estimated from AI)
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

// Health alerts table
export const healthAlerts = pgTable("health_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow(),
  type: text("type").notNull(), // critical, warning, insight
  message: text("message"),
  metrics: jsonb("metrics"), // Array of {name, value, threshold}
  isAcknowledged: boolean("is_acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
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

// Medication reminders table
export const medicationReminders = pgTable("medication_reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  medicationName: text("medication_name").notNull(),
  dosage: text("dosage").notNull(),
  frequency: text("frequency").notNull(), // "daily", "twice_daily", "weekly", etc.
  times: text("times").array().notNull(), // Array of time strings like ["08:00", "20:00"]
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Medical appointments table  
export const medicalAppointments = pgTable("medical_appointments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  appointmentType: text("appointment_type").notNull(), // "checkup", "specialist", "lab", "dialysis", etc.
  doctorName: text("doctor_name"),
  location: text("location"),
  appointmentDate: timestamp("appointment_date").notNull(),
  duration: integer("duration"), // Duration in minutes
  notes: text("notes"),
  reminderSet: boolean("reminder_set").default(true),
  reminderTime: integer("reminder_time").default(24), // Hours before appointment
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community support features

// Community forums - categories table
export const forumCategories = pgTable("forum_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 20 }),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community forums - topics table
export const forumTopics = pgTable("forum_topics", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => forumCategories.id),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id),
  views: integer("views").default(0),
  isPinned: boolean("is_pinned").default(false),
  isLocked: boolean("is_locked").default(false),
  lastReplyAt: timestamp("last_reply_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community forums - replies/posts table
export const forumReplies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").references(() => forumTopics.id),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id),
  isVerified: boolean("is_verified").default(false), // Verified by medical professional
  isHelpful: boolean("is_helpful").default(false),  // Marked helpful by admin/mod
  parentReplyId: integer("parent_reply_id"), // For nested replies
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Forum likes/reactions table
export const forumReactions = pgTable("forum_reactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  replyId: integer("reply_id").references(() => forumReplies.id),
  topicId: integer("topic_id").references(() => forumTopics.id),
  reactionType: varchar("reaction_type", { length: 20 }), // like, heart, hug, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Support groups table
export const supportGroups = pgTable("support_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 30 }).notNull(), // virtual, in-person, hybrid
  location: jsonb("location"), // For in-person groups: { city, state, country, address, coordinates }
  meetingSchedule: jsonb("meeting_schedule"), // { frequency, day, time, duration, timezone }
  maxMembers: integer("max_members"),
  isPrivate: boolean("is_private").default(false),
  creatorId: integer("creator_id").references(() => users.id),
  thumbnail: varchar("thumbnail", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support group membership table
export const supportGroupMembers = pgTable("support_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => supportGroups.id),
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).default("member"), // admin, moderator, member
  joinedAt: timestamp("joined_at").defaultNow(),
  status: varchar("status", { length: 20 }).default("active"), // active, pending, banned
});

// Support group events/meetings table
export const supportGroupEvents = pgTable("support_group_events", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => supportGroups.id),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  location: jsonb("location"), // Virtual or physical location details
  maxAttendees: integer("max_attendees"),
  creatorId: integer("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-to-user direct messaging table
export const directMessages = pgTable("direct_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  recipientId: integer("recipient_id").references(() => users.id),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

export const insertHealthAlertSchema = createInsertSchema(healthAlerts).omit({
  id: true,
  acknowledgedAt: true,
});

// Community feature insert schemas
export const insertForumCategorySchema = createInsertSchema(forumCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForumTopicSchema = createInsertSchema(forumTopics).omit({
  id: true,
  views: true,
  createdAt: true,
  updatedAt: true,
  lastReplyAt: true,
});

export const insertForumReplySchema = createInsertSchema(forumReplies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForumReactionSchema = createInsertSchema(forumReactions).omit({
  id: true,
  createdAt: true,
});

export const insertSupportGroupSchema = createInsertSchema(supportGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupportGroupMemberSchema = createInsertSchema(supportGroupMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertSupportGroupEventSchema = createInsertSchema(supportGroupEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({
  id: true,
  isRead: true,
  readAt: true,
  createdAt: true,
});

export const insertMedicationReminderSchema = createInsertSchema(medicationReminders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMedicalAppointmentSchema = createInsertSchema(medicalAppointments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

export type InsertHealthAlert = z.infer<typeof insertHealthAlertSchema>;
export type HealthAlert = typeof healthAlerts.$inferSelect;

// Community feature types
export type InsertForumCategory = z.infer<typeof insertForumCategorySchema>;
export type ForumCategory = typeof forumCategories.$inferSelect;

export type InsertForumTopic = z.infer<typeof insertForumTopicSchema>;
export type ForumTopic = typeof forumTopics.$inferSelect;

export type InsertForumReply = z.infer<typeof insertForumReplySchema>;
export type ForumReply = typeof forumReplies.$inferSelect;

export type InsertForumReaction = z.infer<typeof insertForumReactionSchema>;
export type ForumReaction = typeof forumReactions.$inferSelect;

export type InsertSupportGroup = z.infer<typeof insertSupportGroupSchema>;
export type SupportGroup = typeof supportGroups.$inferSelect;

export type InsertSupportGroupMember = z.infer<typeof insertSupportGroupMemberSchema>;
export type SupportGroupMember = typeof supportGroupMembers.$inferSelect;

export type InsertSupportGroupEvent = z.infer<typeof insertSupportGroupEventSchema>;
export type SupportGroupEvent = typeof supportGroupEvents.$inferSelect;

export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;

export type InsertMedicationReminder = z.infer<typeof insertMedicationReminderSchema>;
export type MedicationReminder = typeof medicationReminders.$inferSelect;

export type InsertMedicalAppointment = z.infer<typeof insertMedicalAppointmentSchema>;
export type MedicalAppointment = typeof medicalAppointments.$inferSelect;
