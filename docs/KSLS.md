# Kidney Stress Load Score (KSLS) Documentation

## Overview

The **Kidney Stress Load Score (KSLS)** is a 0-100 wellness index that helps users understand the cumulative stress on their kidneys from daily health metrics. It is **NOT** a measure of kidney function (GFR), **NOT** a diagnostic tool, and **NOT** a replacement for medical testing.

**Purpose**: Empower users to track day-to-day wellness patterns and identify modifiable factors that may impact kidney health.

## What KSLS Measures

KSLS combines six health factors into a single score:

1. **Blood Pressure** (35% weight)
2. **Hydration Status** (15% weight)
3. **Fatigue Level** (15% weight when reported)
4. **Pain Level** (10% weight when reported)
5. **Stress Level** (10% weight when reported)
6. **Body Mass Index (BMI)** (15% weight)

**Higher scores = more kidney stress**  
**Lower scores = less kidney stress**

## Score Bands

| Band | Score Range | Meaning |
|------|-------------|---------|
| **Stable** | 0-33 | Kidney stress is low today. Metrics are in target ranges. |
| **Elevated** | 34-66 | Some factors are elevated. Consider adjusting hydration, BP management, or stress. |
| **High** | 67-100 | Multiple factors are elevated. Contact your healthcare team if this persists. |

## How KSLS is Calculated

### 1. Blood Pressure Normalization (35% weight)

Based on JNC 8 guidelines:

- **Systolic BP**:
  - < 120 mmHg → 0 stress
  - 120-140 mmHg → Linear increase (0 to 1)
  - ≥ 140 mmHg → Maximum stress (1.0)

- **Diastolic BP**:
  - < 90 mmHg → Uses systolic calculation
  - ≥ 90 mmHg → Minimum stress of 0.7

### 2. Hydration Normalization (15% weight)

Compares actual fluid intake to prescribed target:

- **Optimal**: 90-110% of target → 0 stress
- **Mild deviation**: 60-90% or 110-150% → Linear stress
- **Severe deviation**: < 60% or > 150% → Maximum stress (1.0)
- **No target prescribed**: Any intake accepted (0 stress)

Based on KDOQI fluid management guidelines.

### 3. Symptom Normalization (15% + 10% + 10% weights)

User-reported scores (0-10 scale):

- **Fatigue**: score / 10.0
- **Pain**: score / 10.0
- **Stress**: score / 10.0

If a symptom is not reported (null), its weight is redistributed among other factors.

### 4. BMI Normalization (15% weight)

Based on NKF healthy weight recommendations:

- **BMI 20-30**: 0 stress (healthy range)
- **BMI 30-40**: Linear increase (overweight to obese)
- **BMI > 40**: Maximum stress (severe obesity)
- **BMI < 20**: Reverse linear increase (underweight)

BMI is calculated as: weight_kg / (height_m)²

### 5. Weighted Score Calculation

```
KSLS = (BP_norm × 0.35) + (Hydro_norm × 0.15) + (Fatigue_norm × 0.15) + 
       (Pain_norm × 0.10) + (Stress_norm × 0.10) + (BMI_norm × 0.15)
```

If symptoms are missing, weights are dynamically re-normalized:
- Missing all symptoms → Weights: BP 0.58, Hydro 0.25, BMI 0.25
- Missing some symptoms → Remaining factors proportionally increased

Final KSLS is multiplied by 100 to produce a 0-100 score.

## Demographics and KSLS

### Critical Principle: Demographics NEVER Affect the Score

**The KSLS number is calculated using ONLY health measurements**. Age, sex, race/ethnicity, and CKD stage are **never** used in the formula.

### Why This Matters (Equity)

Historical medical algorithms have embedded racial and gender biases (e.g., the old eGFR formula using race modifiers). KSLS explicitly rejects this approach:

- **Race/ethnicity**: Used ONLY to provide educational context about social determinants of health (access to care, food security, environmental stressors). Never implies biological differences.
- **Sex**: Used ONLY to explain symptom presentation patterns (e.g., fatigue appearing earlier in women, BP being a stronger signal in men). Score calculation is identical.
- **Age**: Used ONLY for age-appropriate guidance (e.g., older adults prioritizing BP/hydration management). Score calculation is identical.

### Demographic-Informed Interpretation Layer (DIL)

While the KSLS score is demographic-agnostic, the **interpretation text** uses demographics to provide:

1. **Age-specific guidance**:
   - Age 60+: Emphasize BP and hydration management
   - Younger adults: Focus on long-term prevention

2. **Sex-specific education**:
   - Women: Fatigue and pain may appear earlier as warning signs
   - Men: BP often becomes a key driver over time

3. **Race/ethnicity equity messaging**:
   - Acknowledges higher CKD prevalence due to **social factors** (not biology)
   - Encourages advocacy for quality, personalized care
   - References systemic barriers (food access, healthcare quality, environmental stress)

4. **CKD stage context**:
   - Advanced CKD: Small daily changes have larger impact
   - Early CKD: Focus on prevention and stability

**Example**: Two users with identical health metrics will get the **same KSLS score** but different interpretation text based on their demographics.

## What KSLS is NOT

❌ **NOT a measure of kidney function (GFR)**  
GFR measures filtration rate via blood tests. KSLS measures daily wellness factors.

❌ **NOT a diagnostic tool**  
Only a healthcare provider can diagnose kidney disease.

❌ **NOT a replacement for medical testing**  
Continue all prescribed lab work and doctor visits.

❌ **NOT predictive of future kidney function**  
KSLS reflects current day stress, not long-term outcomes.

## When to Use KSLS

✅ **Track daily wellness patterns**  
See how hydration, stress, and BP management affect your score over time.

✅ **Identify modifiable factors**  
KSLS shows which factors contribute most to stress today.

✅ **Prepare for healthcare visits**  
Share KSLS trends with your care team to discuss lifestyle adjustments.

✅ **Stay motivated between lab tests**  
KSLS provides daily feedback when you can't get frequent blood work.

## When to Contact Your Healthcare Team

- KSLS in "high" band for multiple days in a row
- Blood pressure consistently elevated (≥140/90)
- Severe symptoms (pain, fatigue, stress scores > 7)
- Significant changes in KSLS trend
- Any new or worsening symptoms

**Remember**: KSLS is based on the information you enter. Always discuss concerns with your healthcare provider.

## Evidence Base

KSLS is designed using evidence-based guidelines from:

- **JNC 8** (Eighth Joint National Committee): Blood pressure management guidelines
- **KDIGO** (Kidney Disease: Improving Global Outcomes): CKD management and BP targets
- **KDOQI** (Kidney Disease Outcomes Quality Initiative): Fluid management and nutrition
- **NKF** (National Kidney Foundation): Healthy weight recommendations and CKD education
- **NIDDK** (National Institute of Diabetes and Digestive and Kidney Diseases): Patient education resources

## Technical Implementation

### API Endpoint
```typescript
POST /api/ksls/calculate
{
  "systolic_bp": 130,
  "diastolic_bp": 85,
  "fluid_intake_liters": 1.8,
  "fluid_target_liters": 2.0,
  "fatigue_score": 5,      // Optional
  "pain_score": 3,          // Optional
  "stress_score": 4,        // Optional
  "height_cm": 170,
  "weight_kg": 75,
  "demographics": {         // Optional
    "age": 55,
    "sex_assigned_at_birth": "female",
    "race_ethnicity": "Hispanic / Latino",
    "ckd_stage": 3
  }
}
```

### Response
```typescript
{
  "result": {
    "ksls": 42.5,
    "band": "elevated",
    "bmi": 26.0,
    "factors": {
      "bp_norm": 0.5,
      "hydro_norm": 0.2,
      "fatigue_norm": 0.5,
      "pain_norm": 0.3,
      "stress_norm": 0.4,
      "weight_norm": 0.2
    }
  },
  "interpretation": {
    "summary": "Your kidney stress is elevated today.",
    "detail": "Your blood pressure and fatigue levels are the main contributors...",
    "safety_note": "KSLS is NOT a measure of kidney function (GFR) or a diagnosis...",
    "top_factors": ["blood pressure", "fatigue"],
    "personalized_context": "For women in midlife, fatigue can appear as an early warning..."
  }
}
```

## Future Enhancements

Potential features under consideration:

1. **Trend Analysis**: Compare today's KSLS to 7-day, 30-day, and 90-day averages
2. **Journal Integration**: Estimate stress/fatigue from journal emotion keywords
3. **AI Insights**: Detect patterns ("KSLS spikes on Mondays") and suggest interventions
4. **Goal Setting**: Set targets for specific factors (e.g., "Reduce BP stress below 0.5")
5. **Medication Correlation**: Track how medications affect KSLS (never suggest changes, only observe)

## FAQ

**Q: Why is my KSLS high even though I feel okay?**  
A: KSLS may detect elevated metrics (like BP) before symptoms appear. This is valuable early feedback.

**Q: Can I compare my KSLS to someone else's?**  
A: No. KSLS is personal to your entered data. Two people with the same score may have different factor breakdowns.

**Q: Does KSLS replace GFR monitoring?**  
A: Absolutely not. GFR measures actual kidney function via blood tests. KSLS measures daily wellness factors. Both are valuable but serve different purposes.

**Q: How often should I calculate KSLS?**  
A: Daily tracking is useful for identifying patterns, but even weekly tracking can provide insights. Find what works for your routine.

**Q: My KSLS changes a lot day-to-day. Is that normal?**  
A: Yes. KSLS reflects daily variations in BP, hydration, and symptoms. Look for trends over time rather than single-day scores.

**Q: Why doesn't KSLS use my race in the calculation?**  
A: To avoid perpetuating biased algorithms. KSLS uses your race/ethnicity only to provide educational context about social determinants of health.

## References

1. James PA, et al. 2014 Evidence-Based Guideline for the Management of High Blood Pressure in Adults: Report From the Panel Members Appointed to the Eighth Joint National Committee (JNC 8). JAMA. 2014;311(5):507-520.
2. KDIGO 2021 Clinical Practice Guideline for the Management of Blood Pressure in Chronic Kidney Disease. Kidney International. 2021;99(3S):S1-S87.
3. National Kidney Foundation. KDOQI Clinical Practice Guidelines for Nutrition in Chronic Kidney Disease: 2020 Update. Am J Kidney Dis. 2020;76(3 Suppl 1):S1-S107.
4. National Kidney Foundation. Kidney Disease: A Guide for Patients and Families. https://www.kidney.org
5. NIDDK. Kidney Disease Statistics for the United States. https://www.niddk.nih.gov

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintained By**: Nephra Development Team
