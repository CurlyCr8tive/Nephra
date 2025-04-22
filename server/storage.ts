import {
  users, type User, type InsertUser,
  healthMetrics, type HealthMetrics, type InsertHealthMetrics,
  emotionalCheckIns, type EmotionalCheckIn, type InsertEmotionalCheckIn,
  aiChats, type AiChat, type InsertAiChat,
  transplantSteps, type TransplantStep, type InsertTransplantStep,
  userTransplantProgress, type UserTransplantProgress, type InsertUserTransplantProgress,
  journalEntries, type JournalEntry, type InsertJournalEntry,
  medicalDocuments, type MedicalDocument, type InsertMedicalDocument,
  educationResources, type EducationResource, type InsertEducationResource
} from "@shared/schema";

import { db } from "./db";
import { eq, and, desc, lte, gte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Health metrics methods
  getHealthMetrics(userId: number, limit?: number): Promise<HealthMetrics[]>;
  getHealthMetricsByDate(userId: number, startDate: Date, endDate: Date): Promise<HealthMetrics[]>;
  createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics>;

  // Emotional check-in methods
  getEmotionalCheckIns(userId: number, limit?: number): Promise<EmotionalCheckIn[]>;
  createEmotionalCheckIn(checkIn: InsertEmotionalCheckIn): Promise<EmotionalCheckIn>;

  // AI chat methods
  getAiChats(userId: number, limit?: number): Promise<AiChat[]>;
  createAiChat(chat: InsertAiChat): Promise<AiChat>;

  // Transplant roadmap methods
  getTransplantSteps(): Promise<TransplantStep[]>;
  createTransplantStep(step: InsertTransplantStep): Promise<TransplantStep>;
  getUserTransplantProgress(userId: number): Promise<UserTransplantProgress[]>;
  updateUserTransplantProgress(id: number, progress: Partial<InsertUserTransplantProgress>): Promise<UserTransplantProgress | undefined>;
  createUserTransplantProgress(progress: InsertUserTransplantProgress): Promise<UserTransplantProgress>;
  
  // Journal entries methods
  getJournalEntries(userId: number, limit?: number): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  updateJournalEntry(id: number, entry: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined>;
  
  // Medical documents methods
  getMedicalDocuments(userId: number, documentType?: string): Promise<MedicalDocument[]>;
  createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument>;
  updateMedicalDocument(id: number, document: Partial<InsertMedicalDocument>): Promise<MedicalDocument | undefined>;
  
  // Education resources methods
  getEducationResources(category?: string): Promise<EducationResource[]>;
  createEducationResource(resource: InsertEducationResource): Promise<EducationResource>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private healthMetrics: Map<number, HealthMetrics>;
  private emotionalCheckIns: Map<number, EmotionalCheckIn>;
  private aiChats: Map<number, AiChat>;
  private transplantSteps: Map<number, TransplantStep>;
  private userTransplantProgress: Map<number, UserTransplantProgress>;
  private journalEntries: Map<number, JournalEntry>;
  private medicalDocuments: Map<number, MedicalDocument>;
  private educationResources: Map<number, EducationResource>;

  private userId: number;
  private healthMetricsId: number;
  private emotionalCheckInId: number;
  private aiChatId: number;
  private transplantStepId: number;
  private userTransplantProgressId: number;
  private journalEntryId: number;
  private medicalDocumentId: number;
  private educationResourceId: number;

  constructor() {
    this.users = new Map();
    this.healthMetrics = new Map();
    this.emotionalCheckIns = new Map();
    this.aiChats = new Map();
    this.transplantSteps = new Map();
    this.userTransplantProgress = new Map();
    this.journalEntries = new Map();
    this.medicalDocuments = new Map();
    this.educationResources = new Map();

    this.userId = 1;
    this.healthMetricsId = 1;
    this.emotionalCheckInId = 1;
    this.aiChatId = 1;
    this.transplantStepId = 1;
    this.userTransplantProgressId = 1;
    this.journalEntryId = 1;
    this.medicalDocumentId = 1;
    this.educationResourceId = 1;

    // Initialize with some transplant steps
    this.initializeTransplantSteps();
  }

  // Initialize common transplant steps
  private initializeTransplantSteps() {
    const steps = [
      { title: "Initial Evaluation", description: "Complete medical history, physical examination, and lab tests.", orderIndex: 1 },
      { title: "Transplant Center Selection", description: "Research and choose transplant centers to apply to.", orderIndex: 2 },
      { title: "Waitlist Placement", description: "Get placed on the national transplant waiting list.", orderIndex: 3 },
      { title: "Living Donor Evaluation", description: "Identify and evaluate potential living donors.", orderIndex: 4 },
      { title: "Pre-Transplant Preparation", description: "Complete final tests and preparations before surgery.", orderIndex: 5 },
      { title: "Transplant Surgery", description: "Undergo kidney transplant surgery.", orderIndex: 6 },
      { title: "Post-Transplant Care", description: "Follow post-surgery care plan and medication regimen.", orderIndex: 7 },
      { title: "Long-term Follow-up", description: "Regular check-ups and ongoing care to maintain kidney health.", orderIndex: 8 },
    ];

    steps.forEach((step) => {
      const id = this.transplantStepId++;
      this.transplantSteps.set(id, { ...step, id });
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Health metrics methods
  async getHealthMetrics(userId: number, limit?: number): Promise<HealthMetrics[]> {
    const metrics = Array.from(this.healthMetrics.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return limit ? metrics.slice(0, limit) : metrics;
  }

  async getHealthMetricsByDate(userId: number, startDate: Date, endDate: Date): Promise<HealthMetrics[]> {
    return Array.from(this.healthMetrics.values())
      .filter(m => m.userId === userId && 
               m.date >= startDate && 
               m.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  async createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    const id = this.healthMetricsId++;
    const healthMetric: HealthMetrics = { ...metrics, id };
    this.healthMetrics.set(id, healthMetric);
    return healthMetric;
  }

  // Emotional check-in methods
  async getEmotionalCheckIns(userId: number, limit?: number): Promise<EmotionalCheckIn[]> {
    const checkIns = Array.from(this.emotionalCheckIns.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    return limit ? checkIns.slice(0, limit) : checkIns;
  }

  async createEmotionalCheckIn(checkIn: InsertEmotionalCheckIn): Promise<EmotionalCheckIn> {
    const id = this.emotionalCheckInId++;
    const emotionalCheckIn: EmotionalCheckIn = { ...checkIn, id };
    this.emotionalCheckIns.set(id, emotionalCheckIn);
    return emotionalCheckIn;
  }

  // AI chat methods
  async getAiChats(userId: number, limit?: number): Promise<AiChat[]> {
    const chats = Array.from(this.aiChats.values())
      .filter(c => c.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return limit ? chats.slice(0, limit) : chats;
  }

  async createAiChat(chat: InsertAiChat): Promise<AiChat> {
    const id = this.aiChatId++;
    const aiChat: AiChat = { ...chat, id };
    this.aiChats.set(id, aiChat);
    return aiChat;
  }

  // Transplant roadmap methods
  async getTransplantSteps(): Promise<TransplantStep[]> {
    return Array.from(this.transplantSteps.values())
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  async createTransplantStep(step: InsertTransplantStep): Promise<TransplantStep> {
    const id = this.transplantStepId++;
    const transplantStep: TransplantStep = { ...step, id };
    this.transplantSteps.set(id, transplantStep);
    return transplantStep;
  }

  async getUserTransplantProgress(userId: number): Promise<UserTransplantProgress[]> {
    return Array.from(this.userTransplantProgress.values())
      .filter(p => p.userId === userId);
  }

  async updateUserTransplantProgress(id: number, progressData: Partial<InsertUserTransplantProgress>): Promise<UserTransplantProgress | undefined> {
    const progress = this.userTransplantProgress.get(id);
    if (!progress) return undefined;

    const updatedProgress = { ...progress, ...progressData };
    this.userTransplantProgress.set(id, updatedProgress);
    return updatedProgress;
  }

  async createUserTransplantProgress(progress: InsertUserTransplantProgress): Promise<UserTransplantProgress> {
    const id = this.userTransplantProgressId++;
    const userProgress: UserTransplantProgress = { ...progress, id };
    this.userTransplantProgress.set(id, userProgress);
    return userProgress;
  }
  
  // Journal entries methods
  async getJournalEntries(userId: number, limit?: number): Promise<JournalEntry[]> {
    const entries = Array.from(this.journalEntries.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    
    return limit ? entries.slice(0, limit) : entries;
  }
  
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const id = this.journalEntryId++;
    const journalEntry: JournalEntry = { ...entry, id };
    this.journalEntries.set(id, journalEntry);
    return journalEntry;
  }
  
  async updateJournalEntry(id: number, entryData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const entry = this.journalEntries.get(id);
    if (!entry) return undefined;
    
    const updatedEntry = { ...entry, ...entryData };
    this.journalEntries.set(id, updatedEntry);
    return updatedEntry;
  }
  
  // Medical documents methods
  async getMedicalDocuments(userId: number, documentType?: string): Promise<MedicalDocument[]> {
    let documents = Array.from(this.medicalDocuments.values())
      .filter(d => d.userId === userId);
    
    if (documentType) {
      documents = documents.filter(d => d.documentType === documentType);
    }
    
    return documents.sort((a, b) => (b.uploadDate?.getTime() || 0) - (a.uploadDate?.getTime() || 0));
  }
  
  async createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument> {
    const id = this.medicalDocumentId++;
    const medicalDocument: MedicalDocument = { ...document, id };
    this.medicalDocuments.set(id, medicalDocument);
    return medicalDocument;
  }
  
  async updateMedicalDocument(id: number, documentData: Partial<InsertMedicalDocument>): Promise<MedicalDocument | undefined> {
    const document = this.medicalDocuments.get(id);
    if (!document) return undefined;
    
    const updatedDocument = { ...document, ...documentData };
    this.medicalDocuments.set(id, updatedDocument);
    return updatedDocument;
  }
  
  // Education resources methods
  async getEducationResources(category?: string): Promise<EducationResource[]> {
    let resources = Array.from(this.educationResources.values());
    
    if (category) {
      resources = resources.filter(r => r.category === category);
    }
    
    return resources.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  
  async createEducationResource(resource: InsertEducationResource): Promise<EducationResource> {
    const id = this.educationResourceId++;
    const educationResource: EducationResource = { ...resource, id };
    this.educationResources.set(id, educationResource);
    return educationResource;
  }
}

import { db } from "./db";
import { eq, and, desc, lte, gte } from "drizzle-orm";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({...insertUser, createdAt: new Date()})
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Health metrics methods
  async getHealthMetrics(userId: number, limit?: number): Promise<HealthMetrics[]> {
    let query = db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.date));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async getHealthMetricsByDate(userId: number, startDate: Date, endDate: Date): Promise<HealthMetrics[]> {
    return await db.select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.userId, userId),
          gte(healthMetrics.date, startDate),
          lte(healthMetrics.date, endDate)
        )
      )
      .orderBy(desc(healthMetrics.date));
  }

  async createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    const [healthMetric] = await db
      .insert(healthMetrics)
      .values(metrics)
      .returning();
    return healthMetric;
  }

  // Emotional check-in methods
  async getEmotionalCheckIns(userId: number, limit?: number): Promise<EmotionalCheckIn[]> {
    let query = db.select()
      .from(emotionalCheckIns)
      .where(eq(emotionalCheckIns.userId, userId))
      .orderBy(desc(emotionalCheckIns.date));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createEmotionalCheckIn(checkIn: InsertEmotionalCheckIn): Promise<EmotionalCheckIn> {
    const [emotionalCheckIn] = await db
      .insert(emotionalCheckIns)
      .values(checkIn)
      .returning();
    return emotionalCheckIn;
  }

  // AI chat methods
  async getAiChats(userId: number, limit?: number): Promise<AiChat[]> {
    let query = db.select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId))
      .orderBy(desc(aiChats.timestamp));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createAiChat(chat: InsertAiChat): Promise<AiChat> {
    const [aiChat] = await db
      .insert(aiChats)
      .values(chat)
      .returning();
    return aiChat;
  }

  // Transplant roadmap methods
  async getTransplantSteps(): Promise<TransplantStep[]> {
    return await db.select()
      .from(transplantSteps)
      .orderBy(transplantSteps.orderIndex);
  }

  async createTransplantStep(step: InsertTransplantStep): Promise<TransplantStep> {
    const [transplantStep] = await db
      .insert(transplantSteps)
      .values(step)
      .returning();
    return transplantStep;
  }

  async getUserTransplantProgress(userId: number): Promise<UserTransplantProgress[]> {
    return await db.select()
      .from(userTransplantProgress)
      .where(eq(userTransplantProgress.userId, userId));
  }

  async updateUserTransplantProgress(id: number, progressData: Partial<InsertUserTransplantProgress>): Promise<UserTransplantProgress | undefined> {
    const [updatedProgress] = await db
      .update(userTransplantProgress)
      .set(progressData)
      .where(eq(userTransplantProgress.id, id))
      .returning();
    return updatedProgress;
  }

  async createUserTransplantProgress(progress: InsertUserTransplantProgress): Promise<UserTransplantProgress> {
    const [userProgress] = await db
      .insert(userTransplantProgress)
      .values(progress)
      .returning();
    return userProgress;
  }
  
  // Journal entries methods
  async getJournalEntries(userId: number, limit?: number): Promise<JournalEntry[]> {
    let query = db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.date));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [journalEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return journalEntry;
  }

  async updateJournalEntry(id: number, entryData: Partial<InsertJournalEntry>): Promise<JournalEntry | undefined> {
    const [updatedEntry] = await db
      .update(journalEntries)
      .set(entryData)
      .where(eq(journalEntries.id, id))
      .returning();
    return updatedEntry;
  }
  
  // Medical documents methods
  async getMedicalDocuments(userId: number, documentType?: string): Promise<MedicalDocument[]> {
    let query = db.select().from(medicalDocuments);
    
    if (userId) {
      query = query.where(eq(medicalDocuments.userId, userId));
    }
    
    if (documentType) {
      query = query.where(eq(medicalDocuments.documentType, documentType));
    }
    
    return await query.orderBy(desc(medicalDocuments.uploadDate));
  }

  async createMedicalDocument(document: InsertMedicalDocument): Promise<MedicalDocument> {
    const [medicalDocument] = await db
      .insert(medicalDocuments)
      .values(document)
      .returning();
    return medicalDocument;
  }

  async updateMedicalDocument(id: number, documentData: Partial<InsertMedicalDocument>): Promise<MedicalDocument | undefined> {
    const [updatedDocument] = await db
      .update(medicalDocuments)
      .set(documentData)
      .where(eq(medicalDocuments.id, id))
      .returning();
    return updatedDocument;
  }
  
  // Education resources methods
  async getEducationResources(category?: string): Promise<EducationResource[]> {
    let query = db.select().from(educationResources);
    
    if (category) {
      query = query.where(eq(educationResources.category, category));
    }
    
    return await query;
  }

  async createEducationResource(resource: InsertEducationResource): Promise<EducationResource> {
    const [educationResource] = await db
      .insert(educationResources)
      .values(resource)
      .returning();
    return educationResource;
  }
}

// Use the database storage implementation
export const storage = new DatabaseStorage();
