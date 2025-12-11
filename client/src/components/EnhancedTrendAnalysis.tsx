import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HealthTrendsCard from "@/components/HealthTrendsCard";
import SymptomPatternAnalyzer from "@/components/SymptomPatternAnalyzer";
import { KSLSTrendsAnalyzer } from "@/components/KSLSTrendsAnalyzer";
import { useState } from "react";
import { TrendingUp, Activity, Zap } from "lucide-react";

export function EnhancedTrendAnalysis() {
  const [activeTab, setActiveTab] = useState<"gfr" | "ksls" | "symptoms">("gfr");

  return (
    <div className="mb-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "gfr" | "ksls" | "symptoms")}>
        <TabsList className="w-full mb-4 grid grid-cols-3">
          <TabsTrigger value="gfr" className="flex-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>GFR Trends</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="ksls" className="flex-1">
            <span className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              <span>KSLS Trends</span>
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
        
        <TabsContent value="ksls">
          <KSLSTrendsAnalyzer />
        </TabsContent>
        
        <TabsContent value="symptoms">
          <SymptomPatternAnalyzer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnhancedTrendAnalysis;