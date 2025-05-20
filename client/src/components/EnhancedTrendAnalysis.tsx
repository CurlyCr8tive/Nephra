import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HealthTrendsCard from "@/components/HealthTrendsCard";
import SymptomPatternAnalyzer from "@/components/SymptomPatternAnalyzer";
import { useState } from "react";
import { TrendingUp, Activity } from "lucide-react";

export function EnhancedTrendAnalysis() {
  const [activeTab, setActiveTab] = useState<"gfr" | "symptoms">("gfr");

  return (
    <div className="mb-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "gfr" | "symptoms")}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="gfr" className="flex-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>GFR Trends</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="symptoms" className="flex-1">
            <span className="flex items-center gap-1">
              <Activity className="h-4 w-4" />
              <span>Symptom Patterns</span>
            </span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="gfr">
          <HealthTrendsCard />
        </TabsContent>
        
        <TabsContent value="symptoms">
          <SymptomPatternAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedTrendAnalysis;