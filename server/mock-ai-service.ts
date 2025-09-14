/**
 * Mock AI Service for Testing
 * 
 * This service provides simulated AI responses when actual AI APIs are unavailable
 * or when working in a testing environment. Responses are evidence-based but pre-defined.
 */

import { supabase as supabaseClient } from './supabase-service';

/**
 * Interface for journal analysis responses
 */
export interface JournalAnalysis {
  stress: number;
  fatigue: number;
  response: string;
  link?: string;
}

/**
 * Interface for health information responses
 */
export interface HealthInfo {
  topic: string;
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  citations: string[];
}

/**
 * Analyze journal entry with mock AI
 * 
 * @param entry The journal entry text
 * @returns Analysis with stress, fatigue scores and supportive response
 */
export async function analyzeJournal(entry: string): Promise<JournalAnalysis> {
  console.log('Using mock AI service for journal analysis');
  
  // Extract stress and fatigue indicators from the journal entry text
  const stressIndicators = ['stress', 'anxious', 'worry', 'overwhelm', 'tension', 'pressure'];
  const fatigueIndicators = ['tired', 'exhausted', 'fatigue', 'no energy', 'worn out', 'drained'];
  
  // Calculate mock scores based on content
  const entryLower = entry.toLowerCase();
  const stressScore = calculateScore(entryLower, stressIndicators);
  const fatigueScore = calculateScore(entryLower, fatigueIndicators);
  
  // Generate a personalized response based on the scores
  const response = generateResponse(stressScore, fatigueScore, entry);
  
  return {
    stress: stressScore,
    fatigue: fatigueScore,
    response,
    link: "https://www.kidney.org/atoz/content/coping-effectively-kidney-disease"
  };
}

/**
 * Generate follow-up conversation responses
 * 
 * @param question The user's follow-up question
 * @param context Previous conversation context
 * @returns A supportive response
 */
export async function generateFollowUp(
  question: string, 
  context: { role: 'user' | 'ai', content: string }[]
): Promise<string> {
  console.log('Using mock AI service for follow-up conversation');
  
  // Common kidney-related questions and answers
  const responses: Record<string, string> = {
    'pain': "Flank pain can be concerning for kidney patients. It could indicate infection, stones, or other issues. It's important to contact your healthcare provider if you're experiencing pain, especially if it's severe or accompanied by fever, chills, or changes in urination. In the meantime, staying hydrated (within your fluid restrictions) and taking approved pain relievers may help. Always follow your doctor's specific guidance for your situation.",
    
    'medication': "Medications are a crucial part of kidney disease management. It's important to take all medications as prescribed by your healthcare team. If you're experiencing side effects or have concerns about your medications, contact your healthcare provider before making any changes. Keep a current medication list with you, including over-the-counter medications and supplements, and share this with all your healthcare providers.",
    
    'diet': "Dietary management is key for kidney health. Focus on controlling sodium, potassium, phosphorus, and protein based on your specific stage and needs. Stay well-hydrated within your fluid restrictions. Consider working with a registered dietitian who specializes in kidney disease to create a personalized meal plan. The DASH diet modified for kidney disease can be helpful for many patients.",
    
    'transplant': "A kidney transplant can offer improved quality of life and greater freedom from dialysis. The evaluation process includes comprehensive medical testing, psychological evaluation, and financial assessment. Living donation offers advantages of shorter wait times and potentially better outcomes. Connect with your transplant center for specific information about their process and requirements.",
    
    'dialysis': "Dialysis is a treatment that filters waste and excess fluid from your blood when your kidneys can no longer do so. There are different types of dialysis, including hemodialysis (which can be done in-center or at home) and peritoneal dialysis. Each has benefits and considerations. Discuss with your healthcare team which option might be best for your lifestyle and medical needs."
  };
  
  // Detect what the question is about
  const questionLower = question.toLowerCase();
  let bestResponse = "I'm here to support you. Please remember, I'm not a substitute for medical advice. Please share your concerns with your healthcare team who can provide personalized guidance for your specific situation.";
  
  // Find the most relevant response
  for (const [topic, response] of Object.entries(responses)) {
    if (questionLower.includes(topic)) {
      bestResponse = response;
      break;
    }
  }
  
  // If we have Supabase available, try to get more specific information
  if (supabaseClient) {
    try {
      // Search for related educational content
      const { data, error } = await supabaseClient
        .from('educational_content')
        .select('*')
        .textSearch('content', questionLower.split(' ').filter(word => word.length > 3).join(' '))
        .limit(1);
      
      if (data && data.length > 0 && !error) {
        // Append information from Supabase
        bestResponse += `\n\nYou might also find this helpful: ${data[0].title}. ${data[0].summary}`;
      }
    } catch (error) {
      console.log('Supabase query failed, continuing with static response');
    }
  }
  
  return bestResponse;
}

/**
 * Get evidence-based health information on a specific topic
 * 
 * @param topic The health topic to get information about
 * @returns Evidence-based health information
 */
export async function getHealthInfo(topic: string): Promise<HealthInfo> {
  console.log('Using mock AI service for health information');
  
  // Default response if we don't have specific information
  let result: HealthInfo = {
    topic,
    summary: "Information on this topic is currently being updated for accuracy.",
    keyPoints: [
      "Always consult with your nephrologist or healthcare team for personalized advice",
      "The National Kidney Foundation offers reliable resources on kidney health topics",
      "Consider joining a support group to connect with others who understand your experience"
    ],
    recommendations: [
      "Track your symptoms and bring questions to your medical appointments",
      "Follow your prescribed treatment plan consistently",
      "Stay informed through reputable sources like kidney.org"
    ],
    citations: [
      "National Kidney Foundation (kidney.org)",
      "American Association of Kidney Patients (aakp.org)",
      "National Institute of Diabetes and Digestive and Kidney Diseases (niddk.nih.gov)"
    ]
  };
  
  // Try to get real information from Supabase if available
  if (supabaseClient) {
    try {
      // Search for related educational content
      const { data, error } = await supabaseClient
        .from('educational_content')
        .select('*')
        .textSearch('title', topic)
        .limit(1);
      
      if (data && data.length > 0 && !error) {
        // Use real information from the database
        result = {
          topic: data[0].title,
          summary: data[0].summary || result.summary,
          keyPoints: data[0].key_points || result.keyPoints,
          recommendations: data[0].recommendations || result.recommendations,
          citations: data[0].citations || result.citations
        };
      }
    } catch (error) {
      console.log('Supabase query failed, continuing with static response');
    }
  }
  
  return result;
}

/**
 * Helper function to calculate a score based on indicators in text
 */
function calculateScore(text: string, indicators: string[]): number {
  let count = 0;
  indicators.forEach(indicator => {
    if (text.includes(indicator)) count++;
  });
  
  // Calculate score on 1-10 scale
  const baseScore = Math.max(1, Math.min(10, Math.floor(count * 2.5) + 3));
  
  // Add some randomness to make it feel more natural
  return Math.max(1, Math.min(10, baseScore + (Math.random() > 0.5 ? 1 : 0)));
}

/**
 * Generate a personalized response based on stress and fatigue scores
 */
function generateResponse(stress: number, fatigue: number, entry: string): string {
  // Base response templates
  const responses = [
    "I can see you're dealing with some challenges right now. It's important to acknowledge your feelings and take care of yourself. Many kidney patients experience similar emotions.",
    
    "Thank you for sharing how you're feeling. Living with kidney disease can be difficult, and it's completely normal to have ups and downs. Your resilience is commendable.",
    
    "I appreciate you taking the time to journal about your experiences. Tracking your emotional health is just as important as monitoring your physical symptoms.",
    
    "Your feelings are valid and important. Many people with kidney disease experience similar challenges. Remember that you're not alone in this journey.",
    
    "It sounds like you're navigating some difficult emotions. This is a normal part of the kidney disease journey, though that doesn't make it any easier."
  ];
  
  // Stress advice
  const stressAdvice = [
    "For managing stress, deep breathing exercises can be particularly helpful. Try breathing in slowly for a count of 4, holding for 2, and exhaling for 6. This activates your parasympathetic nervous system.",
    
    "Consider trying progressive muscle relaxation to reduce stress. Tense and then release each muscle group, working from your toes to your head. This can help release physical tension.",
    
    "Mindfulness meditation may help reduce stress. Even 5 minutes of focusing on your breath can make a difference in how you feel throughout the day.",
    
    "Gentle physical activity, approved by your healthcare provider, can help reduce stress. Even a short walk can release endorphins that improve your mood.",
    
    "Writing down your worries and concerns can help manage stress. Consider keeping a worry journal separate from this health journal."
  ];
  
  // Fatigue advice
  const fatigueAdvice = [
    "Fatigue is common with kidney disease. Consider scheduling rest periods throughout your day, even when you're feeling well. This proactive approach can help manage energy levels.",
    
    "Talk to your healthcare team about your fatigue levels. There may be medical factors like anemia or medication side effects that could be addressed.",
    
    "Prioritize your most important activities when your energy is highest. It's okay to say no to less important commitments to conserve energy.",
    
    "Gentle, regular physical activity as approved by your doctor can actually help combat fatigue over time, even though it seems counterintuitive.",
    
    "Staying well-nourished within your dietary guidelines is important for energy levels. Speak with your renal dietitian about foods that might help with your energy."
  ];
  
  // Build the response
  let response = responses[Math.floor(Math.random() * responses.length)];
  
  // Add stress advice for high stress
  if (stress >= 7) {
    response += " " + stressAdvice[Math.floor(Math.random() * stressAdvice.length)];
  }
  
  // Add fatigue advice for high fatigue
  if (fatigue >= 7) {
    response += " " + fatigueAdvice[Math.floor(Math.random() * fatigueAdvice.length)];
  }
  
  // Add an encouraging closing
  const closings = [
    "Remember that each day is different, and it's okay to have difficult moments. Be gentle with yourself.",
    
    "Your healthcare team is there to support you. Don't hesitate to share these feelings with them as well.",
    
    "Taking time to journal like this is a positive step in your health journey. I'm here whenever you need to share.",
    
    "Remember that you're not defined by kidney disease. You're a whole person with strengths and resilience.",
    
    "I'm here to support you through both the challenging and positive moments in your journey."
  ];
  
  response += " " + closings[Math.floor(Math.random() * closings.length)];
  
  return response;
}