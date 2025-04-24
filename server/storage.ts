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

import session from "express-session";
import createMemoryStore from "memorystore";

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
  getHealthMetricsForUser(userId: number, limit?: number): Promise<HealthMetrics[]>;
  saveHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics>;

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
  
  // Session storage
  sessionStore: session.Store;
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
  
  // Session store for express-session
  public sessionStore: session.Store;

  constructor() {
    // Initialize collections
    this.users = new Map();
    this.healthMetrics = new Map();
    this.emotionalCheckIns = new Map();
    this.aiChats = new Map();
    this.transplantSteps = new Map();
    this.userTransplantProgress = new Map();
    this.journalEntries = new Map();
    this.medicalDocuments = new Map();
    this.educationResources = new Map();

    // Initialize IDs
    this.userId = 1;
    this.healthMetricsId = 1;
    this.emotionalCheckInId = 1;
    this.aiChatId = 1;
    this.transplantStepId = 1;
    this.userTransplantProgressId = 1;
    this.journalEntryId = 1;
    this.medicalDocumentId = 1;
    this.educationResourceId = 1;
    
    // Initialize session store
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });

    // Initialize with some transplant steps
    this.initializeTransplantSteps();
    
    // Initialize a demo user with profile information
    this.initializeDemoUser();
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
  
  // Initialize demo user with profile information
  private initializeDemoUser() {
    // The password "password123" was hashed with the same algorithm used in auth.ts
    // This ensures demo users can log in right away for testing
    const demoUser: User = {
      id: this.userId++,
      username: "demouser",
      password: "bb67a0593d5da4a97c3826d02a66e8a4e8d5d2d4fc61864b5666a681250983f23ffac33ae75ffd6111a65fc4d36880cb5e0cd8140547f45295aad5adc5d5b26.6b2e27c91ad33936",
      firstName: "Alex",
      lastName: "Johnson",
      email: "alex.johnson@example.com",
      age: 42,
      gender: "Male",
      weight: 175,
      race: "White",
      kidneyDiseaseType: "IgA Nephropathy",
      kidneyDiseaseStage: 3,
      diagnosisDate: new Date("2022-03-15"),
      otherHealthConditions: [],
      primaryCareProvider: "Dr. Sarah Williams",
      nephrologist: "Dr. Michael Chen",
      otherSpecialists: [],
      insuranceProvider: "Blue Cross Blue Shield",
      insurancePolicyNumber: "BCBS12345678",
      transplantCenter: "University Medical Center",
      transplantCoordinator: "Jessica Adams, RN",
      transplantCoordinatorPhone: "(555) 123-4567",
      createdAt: new Date()
    };
    
    this.users.set(demoUser.id, demoUser);
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
    
    // Create user with default values for null fields
    const user: User = {
      id,
      username: insertUser.username,
      password: insertUser.password,
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      age: insertUser.age || null,
      gender: insertUser.gender || null,
      weight: insertUser.weight || null,
      race: insertUser.race || null,
      kidneyDiseaseType: insertUser.kidneyDiseaseType || null,
      kidneyDiseaseStage: insertUser.kidneyDiseaseStage || null,
      diagnosisDate: insertUser.diagnosisDate || null,
      otherHealthConditions: insertUser.otherHealthConditions || [],
      primaryCareProvider: insertUser.primaryCareProvider || null,
      nephrologist: insertUser.nephrologist || null,
      otherSpecialists: insertUser.otherSpecialists || null,
      insuranceProvider: insertUser.insuranceProvider || null,
      insurancePolicyNumber: insertUser.insurancePolicyNumber || null,
      transplantCenter: insertUser.transplantCenter || null,
      transplantCoordinator: insertUser.transplantCoordinator || null,
      transplantCoordinatorPhone: insertUser.transplantCoordinatorPhone || null,
      createdAt: new Date()
    };
    
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    // Process the update data to ensure fields have proper format
    const sanitizedData: Partial<User> = { ...userData };
    
    // Handle special field transformations
    
    // Make sure dates are Date objects
    if (sanitizedData.diagnosisDate && !(sanitizedData.diagnosisDate instanceof Date)) {
      try {
        sanitizedData.diagnosisDate = new Date(sanitizedData.diagnosisDate);
      } catch (e) {
        console.error("Invalid date format for diagnosisDate:", sanitizedData.diagnosisDate);
        sanitizedData.diagnosisDate = null;
      }
    }
    
    // Ensure arrays are handled properly
    if (sanitizedData.otherHealthConditions !== undefined && 
        !Array.isArray(sanitizedData.otherHealthConditions)) {
      sanitizedData.otherHealthConditions = [];
    }
    
    // Handle specialists array properly
    if (sanitizedData.otherSpecialists !== undefined && 
        !Array.isArray(sanitizedData.otherSpecialists)) {
      sanitizedData.otherSpecialists = [];
    }

    console.log("Sanitized update data:", sanitizedData);
    
    // Create updated user with proper defaults for null values
    const updatedUser = { 
      ...user,
      ...sanitizedData,
      // Ensure these fields never become undefined
      otherHealthConditions: sanitizedData.otherHealthConditions !== undefined
        ? sanitizedData.otherHealthConditions 
        : (user.otherHealthConditions || []),
      otherSpecialists: sanitizedData.otherSpecialists !== undefined
        ? sanitizedData.otherSpecialists
        : (user.otherSpecialists || [])
    };
    
    console.log("Final updated user:", updatedUser);
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Health metrics methods
  async getHealthMetrics(userId: number, limit?: number): Promise<HealthMetrics[]> {
    const metrics = Array.from(this.healthMetrics.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => {
        const dateA = a.date ? a.date.getTime() : 0;
        const dateB = b.date ? b.date.getTime() : 0;
        return dateB - dateA;
      });

    return limit ? metrics.slice(0, limit) : metrics;
  }

  async getHealthMetricsByDate(userId: number, startDate: Date, endDate: Date): Promise<HealthMetrics[]> {
    return Array.from(this.healthMetrics.values())
      .filter(m => m.userId === userId && 
               (m.date ? m.date >= startDate : false) && 
               (m.date ? m.date <= endDate : false))
      .sort((a, b) => {
        const dateA = a.date ? a.date.getTime() : 0;
        const dateB = b.date ? b.date.getTime() : 0;
        return dateA - dateB;
      });
  }

  async createHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    const id = this.healthMetricsId++;
    const healthMetric: HealthMetrics = { ...metrics, id };
    this.healthMetrics.set(id, healthMetric);
    console.log(`Created health metrics with ID ${id} for user ${metrics.userId}`);
    return healthMetric;
  }
  
  async getHealthMetricsForUser(userId: number, limit?: number): Promise<HealthMetrics[]> {
    console.log(`Getting health metrics for user ${userId} with limit ${limit || 'unlimited'}`);
    // This is functionally the same as getHealthMetrics, but added for consistency 
    // with the health-log-router expected interface
    return this.getHealthMetrics(userId, limit);
  }
  
  async saveHealthMetrics(metrics: InsertHealthMetrics): Promise<HealthMetrics> {
    console.log(`Saving health metrics for user ${metrics.userId}`);
    // This is functionally the same as createHealthMetrics, but added for consistency
    // with the health-log-router expected interface
    const id = this.healthMetricsId++;
    const healthMetric: HealthMetrics = { ...metrics, id };
    this.healthMetrics.set(id, healthMetric);
    console.log(`Saved health metrics with ID ${id}`);
    return healthMetric;
  }

  // Emotional check-in methods
  async getEmotionalCheckIns(userId: number, limit?: number): Promise<EmotionalCheckIn[]> {
    const checkIns = Array.from(this.emotionalCheckIns.values())
      .filter(e => e.userId === userId)
      .sort((a, b) => {
        const dateA = a.date ? a.date.getTime() : 0;
        const dateB = b.date ? b.date.getTime() : 0;
        return dateB - dateA;
      });

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
      .sort((a, b) => {
        const timestampA = a.timestamp ? a.timestamp.getTime() : 0;
        const timestampB = b.timestamp ? b.timestamp.getTime() : 0;
        return timestampB - timestampA;
      });

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
      .sort((a, b) => {
        const orderA = a.orderIndex || 0;
        const orderB = b.orderIndex || 0;
        return orderA - orderB;
      });
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

// Use the in-memory storage implementation for now
export const storage = new MemStorage();