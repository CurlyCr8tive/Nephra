/**
 * Startup migration — runs ALTER TABLE ... ADD COLUMN IF NOT EXISTS
 * for every column defined in the schema that may not exist in the
 * production database yet.  Safe to run on every boot (idempotent).
 *
 * Each statement is executed independently so a single failure never
 * blocks the rest, and the server never crashes due to a migration error.
 */
import { pool } from "./db";

const MIGRATIONS: string[] = [
  // ── health_metrics ──────────────────────────────────────────────────────────
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS hydration DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS systolic_bp INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS diastolic_bp INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS pulse INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS pain_level INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS stress_level INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS fatigue_level INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS estimated_gfr DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_calculation_method TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS creatinine_level DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS hydration_level INTEGER",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_trend TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_trend_description TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_change_percent DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_absolute_change DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_long_term_trend TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS gfr_stability TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ksls_score DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ksls_band TEXT",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ksls_factors JSONB",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ksls_bmi DOUBLE PRECISION",
  "ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ksls_confidence TEXT",

  // ── users ────────────────────────────────────────────────────────────────────
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS kidney_disease_stage INTEGER",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_hydration_unit TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS recommended_daily_hydration DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS height DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS weight DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS hydration DOUBLE PRECISION",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS \"timeOfDay\" VARCHAR(16)",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS race TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS kidney_disease_type TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS diagnosis_date TIMESTAMP",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS other_health_conditions TEXT[]",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_care_provider TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS nephrologist TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS other_specialists JSONB",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_provider TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS transplant_center TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS transplant_coordinator TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS transplant_coordinator_phone TEXT",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_unit_system TEXT DEFAULT 'metric'",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS target_blood_pressure_systolic INTEGER",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS target_blood_pressure_diastolic INTEGER",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS medications JSONB",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS replit_user_id VARCHAR",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local'",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS time_format TEXT DEFAULT '12h'",

  // ── journal_entries ──────────────────────────────────────────────────────────
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS ai_response TEXT",
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS sentiment TEXT",
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS tags TEXT[]",
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS stress_score INTEGER",
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS fatigue_score INTEGER",
  "ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS pain_score INTEGER",
];

export async function runMigrations(): Promise<void> {
  let ok = 0;
  let skipped = 0;

  for (const sql of MIGRATIONS) {
    try {
      await pool.query(sql);
      ok++;
    } catch (err: any) {
      // "already exists" errors are expected on repeat boots — ignore them
      if (err?.code === "42701") {
        skipped++;
      } else {
        console.warn(`⚠️  Migration skipped (${err?.code}): ${sql}\n   ${err?.message}`);
        skipped++;
      }
    }
  }

  console.log(`✅ Migrations complete: ${ok} applied, ${skipped} skipped`);
}
