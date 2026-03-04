import {
  aiChats,
  emotionalCheckIns,
  healthAlerts,
  healthMetrics,
  journalEntries,
  medicalAppointments,
  medicationReminders,
  transplantSteps,
  userTransplantProgress,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../db";

export const PORTFOLIO_DEMO_USERNAME = "portfolio_demo";

export const portfolioDemoProfile = {
  username: PORTFOLIO_DEMO_USERNAME,
  email: "demo@nephra.app",
  firstName: "Maya",
  lastName: "Reynolds",
  age: 34,
  gender: "Female",
  weight: 68,
  height: 168,
  race: "Black",
  kidneyDiseaseType: "Lupus Nephritis",
  kidneyDiseaseStage: 3,
  diagnosisDate: new Date("2022-04-18T12:00:00.000Z"),
  otherHealthConditions: ["Hypertension", "Anemia"],
  primaryCareProvider: "Dr. Lena Ortiz",
  nephrologist: "Dr. Samuel Brooks",
  otherSpecialists: [
    { name: "Dr. Priya Shah", specialty: "Rheumatology", phone: "(555) 014-2281" },
  ],
  medications: [
    { name: "Losartan", dosage: "50 mg", frequency: "Daily", time: "08:00", notes: "Take with breakfast" },
    { name: "Prednisone", dosage: "5 mg", frequency: "Daily", time: "09:00", notes: "Monitor swelling and appetite" },
    { name: "Iron supplement", dosage: "325 mg", frequency: "Daily", time: "18:00", notes: "Avoid taking with coffee" },
  ],
  insuranceProvider: "Aetna Choice POS II",
  insurancePolicyNumber: "AET-4839201",
  transplantCenter: "Emory Transplant Center",
  transplantCoordinator: "Nicole Carter",
  transplantCoordinatorPhone: "(555) 014-9003",
  preferredUnitSystem: "imperial",
  preferredHydrationUnit: "fl oz",
  recommendedDailyHydration: 84,
  targetBloodPressureSystolic: 120,
  targetBloodPressureDiastolic: 80,
} as const;

type DemoMetricSeed = {
  daysAgo: number;
  hydration: number;
  systolicBP: number;
  diastolicBP: number;
  pulse: number;
  painLevel: number;
  stressLevel: number;
  fatigueLevel: number;
  estimatedGFR: number;
  creatinineLevel: number;
  hydrationLevel: number;
  kslsScore: number;
  kslsBand: "stable" | "elevated" | "high";
};

const demoMetricSeeds: DemoMetricSeed[] = [
  { daysAgo: 27, hydration: 2.1, systolicBP: 132, diastolicBP: 84, pulse: 76, painLevel: 3, stressLevel: 5, fatigueLevel: 4, estimatedGFR: 49, creatinineLevel: 1.42, hydrationLevel: 7, kslsScore: 46, kslsBand: "elevated" },
  { daysAgo: 24, hydration: 2.3, systolicBP: 128, diastolicBP: 82, pulse: 74, painLevel: 2, stressLevel: 4, fatigueLevel: 4, estimatedGFR: 50, creatinineLevel: 1.39, hydrationLevel: 8, kslsScore: 42, kslsBand: "elevated" },
  { daysAgo: 21, hydration: 2.0, systolicBP: 130, diastolicBP: 83, pulse: 79, painLevel: 3, stressLevel: 5, fatigueLevel: 5, estimatedGFR: 48, creatinineLevel: 1.45, hydrationLevel: 7, kslsScore: 48, kslsBand: "elevated" },
  { daysAgo: 18, hydration: 2.4, systolicBP: 126, diastolicBP: 80, pulse: 73, painLevel: 2, stressLevel: 3, fatigueLevel: 3, estimatedGFR: 51, creatinineLevel: 1.37, hydrationLevel: 8, kslsScore: 38, kslsBand: "elevated" },
  { daysAgo: 15, hydration: 2.2, systolicBP: 124, diastolicBP: 79, pulse: 71, painLevel: 2, stressLevel: 3, fatigueLevel: 3, estimatedGFR: 52, creatinineLevel: 1.35, hydrationLevel: 8, kslsScore: 35, kslsBand: "elevated" },
  { daysAgo: 12, hydration: 2.5, systolicBP: 122, diastolicBP: 78, pulse: 70, painLevel: 1, stressLevel: 3, fatigueLevel: 2, estimatedGFR: 53, creatinineLevel: 1.31, hydrationLevel: 9, kslsScore: 31, kslsBand: "stable" },
  { daysAgo: 9, hydration: 2.1, systolicBP: 129, diastolicBP: 82, pulse: 75, painLevel: 2, stressLevel: 4, fatigueLevel: 3, estimatedGFR: 51, creatinineLevel: 1.36, hydrationLevel: 7, kslsScore: 39, kslsBand: "elevated" },
  { daysAgo: 6, hydration: 2.4, systolicBP: 123, diastolicBP: 78, pulse: 72, painLevel: 1, stressLevel: 3, fatigueLevel: 2, estimatedGFR: 54, creatinineLevel: 1.28, hydrationLevel: 8, kslsScore: 29, kslsBand: "stable" },
  { daysAgo: 3, hydration: 2.3, systolicBP: 121, diastolicBP: 77, pulse: 71, painLevel: 1, stressLevel: 2, fatigueLevel: 2, estimatedGFR: 55, creatinineLevel: 1.25, hydrationLevel: 8, kslsScore: 26, kslsBand: "stable" },
  { daysAgo: 0, hydration: 2.6, systolicBP: 118, diastolicBP: 76, pulse: 69, painLevel: 1, stressLevel: 2, fatigueLevel: 2, estimatedGFR: 56, creatinineLevel: 1.22, hydrationLevel: 9, kslsScore: 24, kslsBand: "stable" },
];

function dateDaysAgo(daysAgo: number, hour = 9) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

export async function seedPortfolioDemoData(userId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(userTransplantProgress).where(eq(userTransplantProgress.userId, userId));
    await tx.delete(medicalAppointments).where(eq(medicalAppointments.userId, userId));
    await tx.delete(medicationReminders).where(eq(medicationReminders.userId, userId));
    await tx.delete(healthAlerts).where(eq(healthAlerts.userId, userId));
    await tx.delete(aiChats).where(eq(aiChats.userId, userId));
    await tx.delete(emotionalCheckIns).where(eq(emotionalCheckIns.userId, userId));
    await tx.delete(journalEntries).where(eq(journalEntries.userId, userId));
    await tx.delete(healthMetrics).where(eq(healthMetrics.userId, userId));

    await tx.insert(healthMetrics).values(
      demoMetricSeeds.map((entry) => ({
        userId,
        date: dateDaysAgo(entry.daysAgo),
        hydration: entry.hydration,
        systolicBP: entry.systolicBP,
        diastolicBP: entry.diastolicBP,
        pulse: entry.pulse,
        painLevel: entry.painLevel,
        stressLevel: entry.stressLevel,
        fatigueLevel: entry.fatigueLevel,
        estimatedGFR: entry.estimatedGFR,
        gfrCalculationMethod: "creatinine-based",
        creatinineLevel: entry.creatinineLevel,
        hydrationLevel: entry.hydrationLevel,
        gfrTrend: entry.daysAgo === 0 ? "improving" : "stable",
        gfrTrendDescription: "Gradual improvement with steadier hydration and blood pressure.",
        gfrChangePercent: 3.2,
        gfrAbsoluteChange: 2.1,
        gfrLongTermTrend: "improving",
        gfrStability: "Kidney function has remained relatively stable over the past month.",
        kslsScore: entry.kslsScore,
        kslsBand: entry.kslsBand,
        kslsFactors: {
          bloodPressure: Number((entry.systolicBP / 140).toFixed(2)),
          hydration: Number((entry.hydration / 2.7).toFixed(2)),
          pain: Number((entry.painLevel / 10).toFixed(2)),
          stress: Number((entry.stressLevel / 10).toFixed(2)),
          fatigue: Number((entry.fatigueLevel / 10).toFixed(2)),
        },
        kslsBmi: 24.1,
        kslsConfidence: "high",
      })),
    );

    await tx.insert(emotionalCheckIns).values([
      { userId, date: dateDaysAgo(8, 19), emotion: "good", tags: ["rested", "hopeful"], notes: "Energy was noticeably better after sticking to my hydration target." },
      { userId, date: dateDaysAgo(4, 20), emotion: "okay", tags: ["work stress", "monitoring"], notes: "Busy day at work, but blood pressure stayed manageable." },
      { userId, date: dateDaysAgo(1, 21), emotion: "great", tags: ["encouraged", "routine"], notes: "Felt in control today and ready for my next nephrology check-in." },
    ]);

    await tx.insert(journalEntries).values([
      {
        userId,
        date: dateDaysAgo(10, 18),
        content: "I am getting more consistent with hydration and sodium tracking. My swelling has been milder this week.",
        aiResponse: "You are building a repeatable routine, which is exactly what helps kidney care feel sustainable over time.",
        sentiment: "positive",
        tags: ["hydration", "symptom tracking"],
        stressScore: 4,
        fatigueScore: 3,
        painScore: 2,
      },
      {
        userId,
        date: dateDaysAgo(5, 20),
        content: "Had a rheumatology appointment today. We talked about balancing lupus flares with kidney protection.",
        aiResponse: "That is an important connection to document. Coordinating both specialists is a strong self-advocacy move.",
        sentiment: "neutral",
        tags: ["appointments", "lupus nephritis"],
        stressScore: 5,
        fatigueScore: 4,
        painScore: 2,
      },
      {
        userId,
        date: dateDaysAgo(1, 20),
        content: "My blood pressure trend looks steadier than last month. I still want to keep an eye on fatigue.",
        aiResponse: "That is a good sign. The next useful step is watching whether the fatigue improves alongside the blood pressure trend.",
        sentiment: "positive",
        tags: ["blood pressure", "fatigue"],
        stressScore: 3,
        fatigueScore: 3,
        painScore: 1,
      },
    ]);

    await tx.insert(aiChats).values([
      {
        userId,
        timestamp: dateDaysAgo(3, 13),
        userMessage: "What questions should I ask my nephrologist if my eGFR improves but fatigue stays the same?",
        aiResponse: "Ask whether anemia, medication timing, sleep quality, or lupus activity could explain the fatigue even with stable kidney labs.",
      },
      {
        userId,
        timestamp: dateDaysAgo(0, 11),
        userMessage: "Can you summarize what is going well in my recent trends?",
        aiResponse: "Your hydration is more consistent, blood pressure is trending toward goal, and your estimated GFR has been stable to slightly improved.",
      },
    ]);

    await tx.insert(healthAlerts).values([
      {
        userId,
        timestamp: dateDaysAgo(6, 8),
        type: "insight",
        message: "Your blood pressure has stayed closer to target for the past week.",
        metrics: [
          { name: "Average systolic BP", value: "123", threshold: "120-130 target range" },
        ],
        isAcknowledged: false,
      },
      {
        userId,
        timestamp: dateDaysAgo(2, 8),
        type: "warning",
        message: "Fatigue remains mildly elevated compared with hydration and BP improvements.",
        metrics: [
          { name: "Fatigue", value: "3/10", threshold: "<=2 preferred" },
        ],
        isAcknowledged: false,
      },
    ]);

    await tx.insert(medicationReminders).values([
      {
        userId,
        medicationName: "Losartan",
        dosage: "50 mg",
        frequency: "daily",
        times: ["08:00"],
        startDate: new Date("2024-01-01T08:00:00.000Z"),
        notes: "Take after breakfast.",
        isActive: true,
      },
      {
        userId,
        medicationName: "Prednisone",
        dosage: "5 mg",
        frequency: "daily",
        times: ["09:00"],
        startDate: new Date("2024-01-01T09:00:00.000Z"),
        notes: "Track swelling and appetite changes.",
        isActive: true,
      },
    ]);

    await tx.insert(medicalAppointments).values([
      {
        userId,
        title: "Nephrology follow-up",
        appointmentType: "specialist",
        doctorName: "Dr. Samuel Brooks",
        location: "Emory Renal Clinic",
        appointmentDate: dateDaysAgo(-7, 14),
        duration: 45,
        notes: "Review BP trend, creatinine, and fatigue pattern.",
        reminderSet: true,
        reminderTime: 24,
        isCompleted: false,
      },
      {
        userId,
        title: "Monthly lab panel",
        appointmentType: "lab",
        doctorName: "Lab Services",
        location: "Quest Diagnostics",
        appointmentDate: dateDaysAgo(-3, 9),
        duration: 30,
        notes: "CMP, CBC, creatinine, urine protein.",
        reminderSet: true,
        reminderTime: 24,
        isCompleted: false,
      },
    ]);

    const steps = await tx.select().from(transplantSteps).orderBy(transplantSteps.orderIndex);
    if (steps.length > 0) {
      await tx.insert(userTransplantProgress).values(
        steps.slice(0, 4).map((step, index) => ({
          userId,
          stepId: step.id,
          status: index < 2 ? "completed" : index === 2 ? "in_progress" : "pending",
          completedDate: index < 2 ? dateDaysAgo(40 - index * 10, 10) : null,
        })),
      );
    }
  });
}
