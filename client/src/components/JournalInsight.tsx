import { Sparkles, Brain, Bot, Activity, FileText } from "lucide-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface JournalInsightProps {
  content: string;
  aiResponse?: string | null;
  painScore?: number | null;
  stressScore?: number | null;
  fatigueScore?: number | null;
  tags?: string[] | null;
  expanded?: boolean;
}

export function JournalInsight({
  content,
  aiResponse,
  painScore,
  stressScore,
  fatigueScore,
  tags,
  expanded = false
}: JournalInsightProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  
  // Generate AI insight if none was provided
  const generateInsight = (journalContent: string): string => {
    // In a real implementation, this would call the AI API
    // For now, we'll generate a simple insight based on the text content
    
    // Check for keywords related to specific symptoms
    const hasKidneyPain = /kidney|flank|back pain|side pain/i.test(journalContent);
    const hasSwelling = /swell|swelling|edema|puffy/i.test(journalContent);
    const hasFatigue = /tired|fatigue|exhausted|no energy/i.test(journalContent);
    const hasUrination = /urinat|pee|bathroom|frequent|blood|urine/i.test(journalContent);
    const hasHydration = /thirst|water|hydrate|fluid/i.test(journalContent);
    
    // Generate insights based on detected symptoms
    let insights = [];
    
    if (hasKidneyPain) {
      insights.push("I notice you mentioned kidney pain. Pain in the kidney area could be related to several conditions including kidney infection, stones, or inflammation. Consider tracking when this pain occurs and its intensity.");
    }
    
    if (hasSwelling) {
      insights.push("The swelling you mentioned could be related to fluid retention, which is common in kidney conditions. Monitoring your salt intake and elevating your legs when resting may help reduce swelling.");
    }
    
    if (hasFatigue) {
      insights.push("Fatigue is common with kidney conditions as they can affect red blood cell production. Consider gentle exercise and proper rest to manage energy levels.");
    }
    
    if (hasUrination) {
      insights.push("Changes in urination patterns are important to monitor. Keep track of frequency, color, and any discomfort to discuss with your healthcare provider.");
    }
    
    if (hasHydration) {
      insights.push("Staying properly hydrated is crucial for kidney health. Aim for the recommended fluid intake while following any specific restrictions your doctor has advised.");
    }
    
    // If no specific insights were generated, provide a general one
    if (insights.length === 0) {
      insights.push("Your journal entry has been recorded. Regular journaling helps track your kidney health journey and can reveal important patterns over time. Consider including specific details about symptoms, medications, and diet in future entries.");
    }
    
    // Combine insights into a coherent response
    return insights.join(" ");
  };
  
  // Use provided AI response or generate one
  const insightText = aiResponse || generateInsight(content);
  
  // Detect sentiment and advice in the AI response
  const hasSentimentAnalysis = /emotion|feeling|mood|stress|anxiety|depression/i.test(insightText);
  const hasHealthAdvice = /recommend|suggest|consider|try|monitor|track|watch|measure/i.test(insightText);
  const hasSymptomAnalysis = /symptom|pain|discomfort|swelling|fatigue|tired|energy|sleep/i.test(insightText);
  
  return (
    <div className="mt-3 pt-3 border-t border-border">
      <div 
        className="flex items-center text-sm font-medium mb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Sparkles className="h-4 w-4 mr-2 text-primary" />
        <span>AI Health Insights</span>
      </div>
      
      {isExpanded ? (
        <div className="space-y-3">
          <div className="px-3 py-2 bg-muted/50 rounded-md text-sm">
            {insightText}
          </div>
          
          {/* Show badges for types of insights */}
          <div className="flex flex-wrap gap-2">
            {hasSymptomAnalysis && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>Symptom Analysis</span>
              </Badge>
            )}
            
            {hasSentimentAnalysis && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                <span>Emotional Analysis</span>
              </Badge>
            )}
            
            {hasHealthAdvice && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                <span>Health Recommendations</span>
              </Badge>
            )}
          </div>
          
          {/* Health metrics summary if available */}
          {(painScore != null || stressScore != null || fatigueScore != null) && (
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              {painScore != null && (
                <div className={cn("p-2 rounded flex flex-col items-center", 
                  painScore > 7 ? "bg-red-100" : 
                  painScore > 4 ? "bg-amber-100" : 
                  "bg-green-100"
                )}>
                  <span className="font-medium">Pain</span>
                  <span className="text-lg font-bold">{painScore}/10</span>
                </div>
              )}
              
              {stressScore != null && (
                <div className={cn("p-2 rounded flex flex-col items-center", 
                  stressScore > 7 ? "bg-red-100" : 
                  stressScore > 4 ? "bg-amber-100" : 
                  "bg-green-100"
                )}>
                  <span className="font-medium">Stress</span>
                  <span className="text-lg font-bold">{stressScore}/10</span>
                </div>
              )}
              
              {fatigueScore != null && (
                <div className={cn("p-2 rounded flex flex-col items-center", 
                  fatigueScore > 7 ? "bg-red-100" : 
                  fatigueScore > 4 ? "bg-amber-100" : 
                  "bg-green-100"
                )}>
                  <span className="font-medium">Fatigue</span>
                  <span className="text-lg font-bold">{fatigueScore}/10</span>
                </div>
              )}
            </div>
          )}
          
          {/* Show tags if available */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground cursor-pointer" onClick={() => setIsExpanded(true)}>
          Click to view AI analysis and health insights for this journal entry
        </div>
      )}
    </div>
  );
}

export default JournalInsight;