import { estimateSymptomsFromText, shouldSuggestKSLS } from './server/utils/symptom-extractor.js';

console.log("\n🧪 Testing Symptom Extractor Integration\n");

// Test 1: High fatigue journal entry
const journalText1 = "I'm feeling completely exhausted today. Can't even get out of bed. My lower back is aching too.";
console.log("=== Test 1: High Fatigue Journal ===");
console.log("Text:", journalText1);
const result1 = estimateSymptomsFromText(journalText1);
console.log("✓ Fatigue:", result1.fatigue_score, "Pain:", result1.pain_score, "Stress:", result1.stress_score);
console.log("✓ Confidence:", result1.confidence);
console.log("✓ Triggers:", result1.detected_triggers.join(", "));
const suggestion1 = shouldSuggestKSLS(result1);
if (suggestion1) console.log("✓ KSLS Suggestion:", suggestion1.message);
console.log("");

// Test 2: Moderate stress chat message
const chatText = "I've been feeling really stressed and anxious lately, having trouble sleeping";
console.log("=== Test 2: Stress Chat Message ===");
console.log("Text:", chatText);
const result2 = estimateSymptomsFromText(chatText);
console.log("✓ Fatigue:", result2.fatigue_score, "Pain:", result2.pain_score, "Stress:", result2.stress_score);
console.log("✓ Confidence:", result2.confidence);
console.log("✓ Triggers:", result2.detected_triggers.join(", "));
const suggestion2 = shouldSuggestKSLS(result2);
if (suggestion2) console.log("✓ KSLS Suggestion:", suggestion2.message);
console.log("");

// Test 3: Low symptoms - should not trigger KSLS
const normalText = "Feeling pretty good today! Had a nice walk in the park.";
console.log("=== Test 3: Normal Day ===");
console.log("Text:", normalText);
const result3 = estimateSymptomsFromText(normalText);
console.log("✓ Fatigue:", result3.fatigue_score, "Pain:", result3.pain_score, "Stress:", result3.stress_score);
console.log("✓ Confidence:", result3.confidence);
const suggestion3 = shouldSuggestKSLS(result3);
console.log("✓ KSLS Suggestion:", suggestion3 ? suggestion3.message : "None - symptoms not significant");
console.log("");

console.log("✅ All symptom extraction tests complete!\n");
