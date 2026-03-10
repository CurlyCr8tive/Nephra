/**
 * Startup migration — runs ALTER TABLE ... ADD COLUMN IF NOT EXISTS
 * for every column defined in the schema that may not exist in the
 * production database yet.  Safe to run on every boot (idempotent).
 */
import { pool } from "./db";

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── health_metrics ────────────────────────────────────────────────────────
    const healthMetricsCols: [string, string][] = [
      ["hydration",              "DOUBLE PRECISION"],
      ["systolic_bp",            "INTEGER"],
      ["diastolic_bp",           "INTEGER"],
      ["pulse",                  "INTEGER"],
      ["pain_level",             "INTEGER"],
      ["stress_level",           "INTEGER"],
      ["fatigue_level",          "INTEGER"],
      ["estimated_gfr",          "DOUBLE PRECISION"],
      ["gfr_calculation_method", "TEXT"],
      ["creatinine_level",       "DOUBLE PRECISION"],
      ["hydration_level",        "INTEGER"],
      ["gfr_trend",              "TEXT"],
      ["gfr_trend_description",  "TEXT"],
      ["gfr_change_percent",     "DOUBLE PRECISION"],
      ["gfr_absolute_change",    "DOUBLE PRECISION"],
      ["gfr_long_term_trend",    "TEXT"],
      ["gfr_stability",          "TEXT"],
      ["ksls_score",             "DOUBLE PRECISION"],
      ["ksls_band",              "TEXT"],
      ["ksls_factors",           "JSONB"],
      ["ksls_bmi",               "DOUBLE PRECISION"],
      ["ksls_confidence",        "TEXT"],
    ];

    for (const [col, type] of healthMetricsCols) {
      await client.query(
        `ALTER TABLE health_metrics ADD COLUMN IF NOT EXISTS ${col} ${type}`
      );
    }

    // ── users ─────────────────────────────────────────────────────────────────
    const userCols: [string, string][] = [
      ["kidney_disease_stage",        "INTEGER"],
      ["preferred_hydration_unit",    "TEXT DEFAULT 'fl oz'"],
      ["recommended_daily_hydration", "DOUBLE PRECISION"],
      ["height",                      "DOUBLE PRECISION"],
      ["weight",                      "DOUBLE PRECISION"],
      ["age",                         "INTEGER"],
      ["gender",                      "TEXT"],
    ];

    for (const [col, type] of userCols) {
      await client.query(
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col} ${type}`
      );
    }

    // ── journal_entries ───────────────────────────────────────────────────────
    const journalCols: [string, string][] = [
      ["ai_response",  "TEXT"],
      ["sentiment",    "TEXT"],
      ["tags",         "TEXT[]"],
      ["stress_score", "INTEGER"],
      ["fatigue_score","INTEGER"],
      ["pain_score",   "INTEGER"],
    ];

    for (const [col, type] of journalCols) {
      await client.query(
        `ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS ${col} ${type}`
      );
    }

    await client.query("COMMIT");
    console.log("✅ Database migrations applied successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    throw err;
  } finally {
    client.release();
  }
}
