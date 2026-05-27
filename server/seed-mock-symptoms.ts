/**
 * Seed script: 90 days of realistic symptom tracking mock data for ChericeHeron
 *
 * Run from project root:
 *   npx tsx server/seed-mock-symptoms.ts
 */

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { ilike, or, eq, and, gte, lte } from "drizzle-orm";
import ws from "ws";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

dotenv.config();

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const db = drizzle({ client: pool, schema });

// ── helpers ──────────────────────────────────────────────────────────────────

function rand(min: number, max: number, decimals = 0): number {
  const v = Math.random() * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// ── realistic week-pattern generator ─────────────────────────────────────────
// Returns a multiplier to simulate "good week" vs "bad week" cycles
function weekModifier(dayIndex: number): number {
  const weekNum = Math.floor(dayIndex / 7);
  // Every 3rd week is a slightly harder week
  if (weekNum % 3 === 2) return 1.25;
  // Every 5th week is a better week
  if (weekNum % 5 === 0) return 0.8;
  return 1.0;
}

// ── KSLS mini-calculator (mirrors ksls-calculator.ts logic) ──────────────────
function quickKSLS(
  systolic: number,
  diastolic: number,
  hydration: number,
  fatigue: number,
  pain: number,
  stress: number,
  bmi: number
): { score: number; band: "stable" | "elevated" | "high" } {
  // BP norm
  let bp = systolic <= 120 ? 0 : systolic < 140 ? (systolic - 120) / 20 : 1.0;
  if (diastolic >= 90 && bp < 0.7) bp = 0.7;
  bp = clamp(bp, 0, 1);

  // Hydration norm (target = 2L)
  const ratio = hydration / 2.0;
  let hydro =
    ratio >= 0.9 && ratio <= 1.1
      ? 0
      : ratio >= 0.6 && ratio < 0.9
      ? (0.9 - ratio) / 0.3
      : ratio > 1.1 && ratio <= 1.5
      ? (ratio - 1.1) / 0.4
      : 1.0;
  hydro = clamp(hydro, 0, 1);

  // BMI norm (assume BMI ~26)
  const bmi_norm = clamp(bmi >= 20 && bmi <= 30 ? 0 : bmi > 30 ? (bmi - 30) / 10 : (20 - bmi) / 5, 0, 1);

  const f = clamp(fatigue / 10, 0, 1);
  const p = clamp(pain / 10, 0, 1);
  const s = clamp(stress / 10, 0, 1);

  const raw = 0.35 * bp + 0.15 * hydro + 0.15 * f + 0.10 * p + 0.10 * s + 0.15 * bmi_norm;
  const score = Math.round(clamp(raw, 0, 1) * 100);
  const band: "stable" | "elevated" | "high" = score <= 33 ? "stable" : score <= 66 ? "elevated" : "high";
  return { score, band };
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Find user ───────────────────────────────────────────────────────────────
  const matches = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, "cherice.heron@pursuit.org"));

  if (matches.length === 0) {
    // Broader fallback: list all users so we can pick the right one
    const all = await db.select({ id: schema.users.id, username: schema.users.username, email: schema.users.email, firstName: schema.users.firstName, lastName: schema.users.lastName }).from(schema.users);
    console.log("⚠️  Could not find ChericeHeron. All users in DB:");
    console.table(all);
    process.exit(1);
  }

  const user = matches[0];
  console.log(`✅ Found user: id=${user.id} username=${user.username} email=${user.email}`);

  // ── Wipe existing health metrics + emotional check-ins for clean re-seed ────
  const deleted = await db
    .delete(schema.healthMetrics)
    .where(eq(schema.healthMetrics.userId, user.id));
  console.log(`🗑️  Cleared existing health metrics for user ${user.id}`);

  await db
    .delete(schema.emotionalCheckIns)
    .where(eq(schema.emotionalCheckIns.userId, user.id));
  console.log(`🗑️  Cleared existing emotional check-ins for user ${user.id}`);

  // ── Generate 90 days of data ─────────────────────────────────────────────────
  const now = new Date();
  const DAYS = 90;

  // Stage 3b CKD profile: GFR starts at ~38, slowly drifts down ~3 pts over 90 days
  const BASE_GFR = 38;
  const BMI = 26.4; // stored for KSLS

  const entries: schema.InsertHealthMetrics[] = [];

  for (let i = DAYS - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const wm = weekModifier(DAYS - 1 - i);

    // GFR: slow linear decline + noise
    const gfrBase = BASE_GFR - (DAYS - 1 - i) * (3 / DAYS);
    const gfr = clamp(gfrBase + rand(-3, 3, 1), 20, 45);

    // Blood pressure: correlated to bad weeks
    const systolic = Math.round(clamp(138 + rand(-10, 18) * wm, 118, 162));
    const diastolic = Math.round(clamp(86 + rand(-8, 12) * wm, 72, 100));

    // Hydration (liters) — CKD patients often under-target
    const hydration = clamp(rand(1.3, 2.6, 2), 1.0, 3.0);

    // Symptoms (1-10) — positively correlated, worse on bad weeks
    const fatigue = Math.round(clamp(rand(3, 7) * wm, 1, 10));
    const pain = Math.round(clamp(rand(1, 5) * wm, 1, 10));
    const stress = Math.round(clamp(rand(2, 6) * wm, 1, 10));

    // Creatinine labs ~every 2 weeks (roughly)
    const hasLab = i % 14 < 2; // two consecutive days around each fortnight
    const creatinine = hasLab ? rand(1.9, 2.5, 2) : undefined;

    // KSLS
    const { score: kslsScore, band: kslsBand } = quickKSLS(systolic, diastolic, hydration, fatigue, pain, stress, BMI);

    // Hydration level scale (1-10) derived from liters
    const hydrationLevel = Math.round(clamp((hydration / 3.0) * 10, 1, 10));

    // GFR trend (compare to 7-day-ago entry — simplified)
    const gfrTrend = gfr < gfrBase - 1 ? "possible_decline" : gfr > gfrBase + 1 ? "possible_improvement" : "stable";

    entries.push({
      userId: user.id,
      date,
      hydration,
      systolicBP: systolic,
      diastolicBP: diastolic,
      painLevel: pain,
      stressLevel: stress,
      fatigueLevel: fatigue,
      estimatedGFR: gfr,
      gfrCalculationMethod: creatinine ? "creatinine-based" : "symptom-and-vital-based",
      creatinineLevel: creatinine ?? null,
      hydrationLevel,
      gfrTrend,
      gfrTrendDescription:
        gfrTrend === "stable"
          ? "Your GFR appears stable compared to your last reading"
          : gfrTrend === "possible_decline"
          ? "Your GFR shows a possible slight decline from your last reading"
          : "Your GFR shows a possible slight improvement from your last reading",
      gfrChangePercent: rand(-4, 4, 1),
      gfrAbsoluteChange: rand(-1.5, 1.5, 1),
      gfrLongTermTrend: i < 30 ? "declining" : "fluctuating",
      gfrStability:
        i < 30
          ? "Your GFR has been showing a consistent downward trend"
          : "Your GFR has been fluctuating",
      kslsScore,
      kslsBand,
      kslsFactors: {
        bp_norm: clamp(systolic <= 120 ? 0 : systolic < 140 ? (systolic - 120) / 20 : 1, 0, 1),
        hydro_norm: clamp((2.0 - hydration) / 2, 0, 1),
        fatigue_norm: fatigue / 10,
        pain_norm: pain / 10,
        stress_norm: stress / 10,
        weight_norm: 0.0,
      },
      kslsBmi: BMI,
      kslsConfidence: creatinine ? "high" : "moderate",
    });
  }

  // ── Insert in batches ────────────────────────────────────────────────────────
  console.log(`📝 Inserting ${entries.length} health metric records…`);
  let inserted = 0;
  for (const entry of entries) {
    await db.insert(schema.healthMetrics).values(entry);
    inserted++;
  }
  console.log(`✅ Done — inserted ${inserted} health metric records for user ${user.id}.`);

  // ── Emotional check-ins (every 3–4 days) ────────────────────────────────────
  const emotions = ["okay", "good", "down", "stressed", "okay", "good", "great", "down"];
  const emoEntries: schema.InsertEmotionalCheckIn[] = [];

  for (let i = DAYS - 1; i >= 0; i -= rand(3, 4)) {
    const date = new Date(now.getTime() - Math.floor(i) * 24 * 60 * 60 * 1000);
    const wm = weekModifier(DAYS - 1 - Math.floor(i));
    const emotionIdx = wm > 1.1 ? Math.floor(rand(2, 4)) : Math.floor(rand(0, 8));
    emoEntries.push({
      userId: user.id,
      date,
      emotion: emotions[emotionIdx % emotions.length],
      tags: wm > 1.1 ? ["tired", "dialysis"] : ["routine"],
      notes: null,
    });
  }

  console.log(`📝 Inserting ${emoEntries.length} emotional check-in records…`);
  for (const entry of emoEntries) {
    await db.insert(schema.emotionalCheckIns).values(entry);
  }
  console.log(`✅ Done — inserted ${emoEntries.length} emotional check-ins.`);

  await pool.end();
  console.log("\n🎉 Mock data seeding complete!");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
