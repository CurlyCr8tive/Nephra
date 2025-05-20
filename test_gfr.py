from main import estimate_gfr_score, interpret_gfr

# Create sample historical GFR data for trend analysis
previous_readings = [
    {"date": "2025-04-01T10:00:00Z", "estimatedGFR": 65.3},
    {"date": "2025-04-08T10:00:00Z", "estimatedGFR": 64.1},
    {"date": "2025-04-15T10:00:00Z", "estimatedGFR": 63.2},
    {"date": "2025-04-22T10:00:00Z", "estimatedGFR": 62.6},
    {"date": "2025-05-01T10:00:00Z", "estimatedGFR": 61.9},
]

# Scenario 1: Patient with moderate symptoms, borderline blood pressure
print("\n=== SCENARIO 1: Moderate Symptoms Patient ===")
result1 = estimate_gfr_score(
    age=58,
    gender='female',
    weight_kg=78,
    height_cm=162,
    hydration_level=5,
    systolic_bp=138,
    diastolic_bp=85,
    stress=6,
    fatigue=7,
    pain=4,
    previous_gfr_readings=previous_readings
)

print(f"GFR Estimate: {result1['gfr_estimate']} ml/min/1.73m²")
print(f"Method: {result1['method']}")
print(f"Confidence: {result1['confidence']}")
print(f"Confidence Score: {result1.get('confidence_score', 'N/A')}%")
interpretation = interpret_gfr(result1['gfr_estimate'])
print(f"Stage: {interpretation['stage']} - {interpretation['description']}")

# Print trend analysis details
print("\nTrend Analysis:")
print(f"Trend: {result1.get('trend')}")
print(f"Description: {result1.get('trend_description')}")
print(f"Absolute Change: {result1.get('absolute_change', 'N/A')}")
print(f"Percent Change: {result1.get('percent_change', 'N/A')}%")
print(f"Long-term Trend: {result1.get('long_term_trend', 'N/A')}")
print(f"Pattern: {result1.get('pattern', 'N/A')}")
print(f"Pattern Confidence: {result1.get('pattern_confidence', 'N/A')}%")
print(f"Clinical Significance: {result1.get('clinical_significance', 'N/A')}")

# Scenario 2: Patient with extreme values
print("\n=== SCENARIO 2: Edge Case Patient ===")
result2 = estimate_gfr_score(
    age=72,
    gender='male',
    weight_kg=110,
    height_cm=175,
    hydration_level=2,
    systolic_bp=165,
    diastolic_bp=95,
    stress=9,
    fatigue=8,
    pain=7,
    previous_gfr_readings=None  # No previous readings
)

print(f"GFR Estimate: {result2['gfr_estimate']} ml/min/1.73m²")
print(f"Method: {result2['method']}")
print(f"Confidence: {result2['confidence']}")
print(f"Confidence Score: {result2.get('confidence_score', 'N/A')}%")
interpretation = interpret_gfr(result2['gfr_estimate'])
print(f"Stage: {interpretation['stage']} - {interpretation['description']}")
