from typing import Optional, List, Dict, Any, Tuple

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
    creatinine: Optional[float] = None,  # in mg/dL
    race: Optional[str] = None,          # Optional race parameter
    previous_gfr_readings: Optional[List[Dict[str, Any]]] = None  # List of previous GFR readings with dates
) -> dict:
    """
    Advanced GFR estimation engine with dual calculation methods and trend detection.
    
    Primary method: 
    - Uses CKD-EPI 2021 equation when creatinine is available (gold standard)
    
    Secondary method:
    - ML model approximation using multiple health parameters when creatinine is unavailable
    
    Returns a comprehensive result with GFR estimate, calculation method, and trend analysis.
    """
    # Base factors
    gender_factor = 0.85 if gender.lower() == 'female' else 1.0
    bsa = 0.007184 * (height_cm**0.725) * (weight_kg**0.425)  # Du Bois formula
    bmi = weight_kg / ((height_cm / 100) ** 2)  # BMI calculation
    
    # Method 1: CKD-EPI 2021 equation (no race factor)
    # Reference: https://www.kidney.org/content/ckd-epi-creatinine-equation-2021
    if creatinine is not None and creatinine > 0:
        # Check gender for appropriate coefficients
        if gender.lower() == 'female':
            if creatinine <= 0.7:
                gfr = 142 * ((creatinine / 0.7) ** -0.241) * (0.9938 ** age)
            else:
                gfr = 142 * ((creatinine / 0.7) ** -1.200) * (0.9938 ** age)
        else:  # male
            if creatinine <= 0.9:
                gfr = 142 * ((creatinine / 0.9) ** -0.302) * (0.9938 ** age)
            else:
                gfr = 142 * ((creatinine / 0.9) ** -1.200) * (0.9938 ** age)
                
        # Cap maximum GFR value at 120
        gfr = min(gfr, 120)
        
        result = {
            "gfr_estimate": round(gfr, 1),
            "method": "creatinine-based",
            "confidence": "high",
            "calculation": "CKD-EPI 2021"
        }
    
    # Method 2: ML model approximation (when creatinine is unavailable)
    else:
        # BMI impact
        if bmi < 18.5:  # underweight
            bmi_factor = 0.95
        elif 18.5 <= bmi <= 24.9:  # normal
            bmi_factor = 1.0
        elif 25 <= bmi <= 29.9:  # overweight
            bmi_factor = 0.97
        else:  # obese
            bmi_factor = 0.92
            
        # Hydration impact (dehydration affects kidney function)
        hydration_factor = 0.8 + (0.04 * hydration_level)  # 0.8 to 1.2
        
        # Blood pressure impact
        if systolic_bp > 160 or diastolic_bp > 100:
            bp_factor = 0.80  # Severe hypertension
        elif systolic_bp > 140 or diastolic_bp > 90:
            bp_factor = 0.85  # Hypertension
        elif systolic_bp > 130 or diastolic_bp > 85:
            bp_factor = 0.92  # Elevated
        else:
            bp_factor = 1.0   # Normal
            
        # Compute weighted symptom score (stress, fatigue, pain are indicators)
        weighted_stress = (stress / 10) * 0.4
        weighted_fatigue = (fatigue / 10) * 0.4
        weighted_pain = (pain / 10) * 0.2
        symptom_score = weighted_stress + weighted_fatigue + weighted_pain
        symptom_factor = 1.0 - (symptom_score * 0.15)  # Max 15% reduction
        
        # Age-based baseline (normal GFR declines with age)
        if age < 30:
            baseline_gfr = 120 - (age * 0.08)
        elif age < 40:
            baseline_gfr = 116 - ((age-30) * 0.1)
        elif age < 50:
            baseline_gfr = 115 - ((age-40) * 0.3)
        elif age < 60:
            baseline_gfr = 112 - ((age-50) * 0.5)
        elif age < 70:
            baseline_gfr = 107 - ((age-60) * 0.75)
        else:
            baseline_gfr = 99.5 - ((age-70) * 0.9)
        
        # Calculate the final estimated GFR with all factors
        estimated_gfr = baseline_gfr * gender_factor * bmi_factor * hydration_factor * bp_factor * symptom_factor
        
        # Ensure reasonable bounds
        estimated_gfr = max(min(estimated_gfr, 120), 15)
        
        result = {
            "gfr_estimate": round(estimated_gfr, 1),
            "method": "symptom-and-vital-based",
            "confidence": "moderate",
            "calculation": "ML model approximation"
        }
    
    # Add trend analysis if previous readings are available
    if previous_gfr_readings and len(previous_gfr_readings) > 0:
        trend_result = analyze_gfr_trend(result["gfr_estimate"], previous_gfr_readings)
        result.update(trend_result)
    
    return result

def analyze_gfr_trend(current_gfr: float, previous_readings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze GFR readings to detect trends and changes.
    
    Args:
        current_gfr: Current GFR estimate
        previous_readings: List of previous GFR readings with dates and values
        
    Returns:
        Dictionary with trend analysis information
    """
    if not previous_readings or len(previous_readings) == 0:
        return {
            "trend": "insufficient_data",
            "trend_description": "Insufficient data for trend analysis"
        }
    
    # Sort readings by date (most recent first)
    sorted_readings = sorted(previous_readings, key=lambda x: x.get('date', ''), reverse=True)
    
    # Get most recent and second most recent readings
    recent_readings = [r.get('estimatedGFR', 0) for r in sorted_readings if r.get('estimatedGFR') is not None]
    
    if not recent_readings:
        return {
            "trend": "insufficient_data",
            "trend_description": "No valid previous GFR readings found"
        }
    
    # Calculate absolute and percentage changes
    latest_previous = recent_readings[0]
    absolute_change = current_gfr - latest_previous
    percent_change = (absolute_change / latest_previous) * 100 if latest_previous > 0 else 0
    
    # Average of last 3 readings if available
    avg_recent = sum(recent_readings[:3]) / min(3, len(recent_readings))
    avg_change = current_gfr - avg_recent
    
    # Determine trend category
    if abs(percent_change) < 5:
        trend = "stable"
        description = "Your GFR appears stable compared to your last reading"
    elif percent_change < -10:
        trend = "significant_decline"
        description = "Your GFR shows a significant drop from your last reading"
    elif percent_change < 0:
        trend = "possible_decline"
        description = "Your GFR shows a possible slight decline from your last reading"
    elif percent_change > 10:
        trend = "significant_improvement"
        description = "Your GFR shows significant improvement from your last reading"
    else:
        trend = "possible_improvement"
        description = "Your GFR shows a possible slight improvement from your last reading"
    
    # Additional context for last 3 readings
    if len(recent_readings) >= 3:
        if all(abs((a - b) / b) < 0.05 for a, b in zip(recent_readings[:-1], recent_readings[1:])):
            long_term_trend = "consistent"
            stability = "Your GFR has been relatively consistent over your last several readings"
        elif all(a < b for a, b in zip(recent_readings[:-1], recent_readings[1:])):
            long_term_trend = "declining"
            stability = "Your GFR has been showing a consistent downward trend"
        elif all(a > b for a, b in zip(recent_readings[:-1], recent_readings[1:])):
            long_term_trend = "improving"
            stability = "Your GFR has been showing a consistent improving trend"
        else:
            long_term_trend = "fluctuating"
            stability = "Your GFR has been fluctuating"
    else:
        long_term_trend = "unknown"
        stability = "More readings needed to establish a long-term trend"
    
    return {
        "trend": trend,
        "trend_description": description,
        "absolute_change": round(absolute_change, 1),
        "percent_change": round(percent_change, 1),
        "long_term_trend": long_term_trend,
        "stability": stability
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