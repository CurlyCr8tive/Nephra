from typing import Optional

def estimate_gfr_score(
    age: int,
    gender: str,
    weight_kg: float,
    height_cm: float,
    hydration_level: int,   # 1–10, 10 being well-hydrated
    systolic_bp: int,
    diastolic_bp: int,
    stress: int,            # 1–10, 10 being very high stress
    fatigue: int,           # 1–10, 10 being very fatigued
    pain: int,              # 1–10, 10 being severe pain
    creatinine: Optional[float] = None  # in mg/dL
) -> dict:
    """
    Estimate GFR or risk score based on inputs.
    """

    # Base factors
    gender_factor = 0.85 if gender.lower() == 'female' else 1.0
    bsa = 0.007184 * (height_cm**0.725) * (weight_kg**0.425)  # Du Bois formula

    # Optional creatinine-based GFR (CKD-EPI-like formula)
    if creatinine:
        # Simplified CKD-EPI style (not race-based)
        gfr = 141 * min(creatinine / 0.9, 1) ** -0.411 * max(creatinine / 0.9, 1) ** -1.209 * (0.993 ** age)
        gfr *= gender_factor
        return {
            "gfr_estimate": round(gfr, 2),
            "method": "creatinine-based"
        }

    # Symptom score method
    stress_factor = stress / 10
    fatigue_factor = fatigue / 10
    pain_factor = pain / 10
    hydration_penalty = max(0, (7 - hydration_level)) * 1.5  # mild dehydration penalty
    bp_penalty = (systolic_bp - 130) / 10 if systolic_bp > 130 else 0
    symptom_total = stress_factor + fatigue_factor + pain_factor + hydration_penalty + bp_penalty

    # Start from baseline GFR for age
    base_gfr = 100 - (age * 0.8)  # rough average expected
    score_adjusted = base_gfr - (symptom_total * 5)
    score_adjusted *= gender_factor
    score_adjusted = max(score_adjusted, 15)  # prevent underflow

    return {
        "gfr_estimate": round(score_adjusted, 2),
        "method": "symptom-and-vital-based"
    }

# CKD Stage interpretation function
def interpret_gfr(gfr: float) -> dict:
    """
    Get interpretation of GFR value according to CKD stages
    """
    if gfr >= 90:
        return {
            "stage": "G1",
            "description": "Normal or high kidney function"
        }
    elif gfr >= 60:
        return {
            "stage": "G2",
            "description": "Mildly decreased kidney function"
        }
    elif gfr >= 45:
        return {
            "stage": "G3a",
            "description": "Mild to moderately decreased kidney function"
        }
    elif gfr >= 30:
        return {
            "stage": "G3b",
            "description": "Moderately to severely decreased kidney function"
        }
    elif gfr >= 15:
        return {
            "stage": "G4",
            "description": "Severely decreased kidney function"
        }
    else:
        return {
            "stage": "G5",
            "description": "Kidney failure"
        }

# Function to get recommendations based on GFR value
def get_gfr_recommendation(gfr: float, method: str) -> str:
    """
    Get recommendations based on GFR value and calculation method
    """
    interpretation = interpret_gfr(gfr)
    
    # Add disclaimer for symptom-based method
    method_disclaimer = ""
    if method == "symptom-and-vital-based":
        method_disclaimer = "This is an estimated value based on your symptoms and vitals. For a more accurate measurement, please consult your healthcare provider for a blood test."
    
    if gfr >= 60:
        return f"Your kidney function appears to be in {interpretation['stage']} stage ({interpretation['description']}). {method_disclaimer} Continue to monitor your kidney health and follow a kidney-friendly lifestyle."
    elif gfr >= 30:
        return f"Your kidney function appears to be in {interpretation['stage']} stage ({interpretation['description']}). {method_disclaimer} Regular monitoring by a nephrologist is recommended."
    elif gfr >= 15:
        return f"Your kidney function appears to be in {interpretation['stage']} stage ({interpretation['description']}). {method_disclaimer} Close management by a nephrologist is important at this stage."
    else:
        return f"Your kidney function appears to be in {interpretation['stage']} stage ({interpretation['description']}). {method_disclaimer} Please consult with your healthcare team about treatment options, which may include dialysis or transplantation."

# Example with no creatinine (symptom-based)
print("Example 1: Female patient with no creatinine value (symptom-based estimation)")
result1 = estimate_gfr_score(
    age=45,
    gender='female',
    weight_kg=68,
    height_cm=165,
    hydration_level=6,
    systolic_bp=140,
    diastolic_bp=85,
    stress=7,
    fatigue=8,
    pain=4,
    creatinine=None
)
print(f"GFR Estimate: {result1['gfr_estimate']} ml/min/1.73m²")
print(f"Method: {result1['method']}")
interpretation1 = interpret_gfr(result1['gfr_estimate'])
print(f"Stage: {interpretation1['stage']} - {interpretation1['description']}")
print(f"Recommendation: {get_gfr_recommendation(result1['gfr_estimate'], result1['method'])}")
print()

# Example with creatinine (lab-based)
print("Example 2: Male patient with creatinine value (lab-based calculation)")
result2 = estimate_gfr_score(
    age=35,
    gender='male',
    weight_kg=70,
    height_cm=175,
    hydration_level=8,
    systolic_bp=125,
    diastolic_bp=80,
    stress=5,
    fatigue=6,
    pain=3,
    creatinine=1.3
)
print(f"GFR Estimate: {result2['gfr_estimate']} ml/min/1.73m²")
print(f"Method: {result2['method']}")
interpretation2 = interpret_gfr(result2['gfr_estimate'])
print(f"Stage: {interpretation2['stage']} - {interpretation2['description']}")
print(f"Recommendation: {get_gfr_recommendation(result2['gfr_estimate'], result2['method'])}")
print()

# Example for early stage CKD
print("Example 3: Elderly female with early CKD")
result3 = estimate_gfr_score(
    age=72,
    gender='female',
    weight_kg=65,
    height_cm=162,
    hydration_level=7,
    systolic_bp=145,
    diastolic_bp=82,
    stress=4,
    fatigue=6,
    pain=3,
    creatinine=1.1
)
print(f"GFR Estimate: {result3['gfr_estimate']} ml/min/1.73m²")
print(f"Method: {result3['method']}")
interpretation3 = interpret_gfr(result3['gfr_estimate'])
print(f"Stage: {interpretation3['stage']} - {interpretation3['description']}")
print(f"Recommendation: {get_gfr_recommendation(result3['gfr_estimate'], result3['method'])}")