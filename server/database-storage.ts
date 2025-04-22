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
import { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
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
    const query = db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(desc(healthMetrics.date));
    
    const result = limit ? await query.limit(limit) : await query;
    return result;
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
    const query = db.select()
      .from(emotionalCheckIns)
      .where(eq(emotionalCheckIns.userId, userId))
      .orderBy(desc(emotionalCheckIns.date));
    
    const result = limit ? await query.limit(limit) : await query;
    return result;
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
    const query = db.select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId))
      .orderBy(desc(aiChats.timestamp));
    
    const result = limit ? await query.limit(limit) : await query;
    return result;
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
    const steps = await db.select()
      .from(transplantSteps)
      .orderBy(transplantSteps.orderIndex);
    
    return steps;
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
    const query = db.select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, userId))
      .orderBy(desc(journalEntries.date));
    
    const result = limit ? await query.limit(limit) : await query;
    return result;
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
    if (documentType) {
      return await db.select()
        .from(medicalDocuments)
        .where(
          and(
            eq(medicalDocuments.userId, userId),
            eq(medicalDocuments.documentType, documentType)
          )
        )
        .orderBy(desc(medicalDocuments.uploadDate));
    } else {
      return await db.select()
        .from(medicalDocuments)
        .where(eq(medicalDocuments.userId, userId))
        .orderBy(desc(medicalDocuments.uploadDate));
    }
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
    if (category) {
      return await db.select()
        .from(educationResources)
        .where(eq(educationResources.category, category))
        .execute();
    } else {
      return await db.select().from(educationResources).execute();
    }
  }

  async createEducationResource(resource: InsertEducationResource): Promise<EducationResource> {
    const [educationResource] = await db
      .insert(educationResources)
      .values(resource)
      .returning();
    return educationResource;
  }

  // Initialize database with transplant steps if needed
  async initializeTransplantSteps(): Promise<void> {
    const existingSteps = await this.getTransplantSteps();
    if (existingSteps.length === 0) {
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

      for (const step of steps) {
        await this.createTransplantStep(step);
      }
    }
  }
}