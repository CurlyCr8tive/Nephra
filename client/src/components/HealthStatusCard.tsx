import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { Activity, Droplet, Heart, RefreshCw } from "lucide-react";

export function HealthStatusCard() {
  const { user } = useUser();
  const { latestMetrics, isLoadingLatest, weeklyMetrics } = useHealthData();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Debug log to check what data we're receiving
  useEffect(() => {
    console.log("DEBUG HealthStatusCard - User ID:", user?.id);
    console.log("DEBUG HealthStatusCard - Latest Metrics:", latestMetrics);
    console.log("DEBUG HealthStatusCard - Weekly Metrics:", weeklyMetrics?.length || 0);
    
    // Try to determine where we're getting data from
    if (latestMetrics) {
      console.log("DEBUG HealthStatusCard - Latest metrics available");
      setMetrics(latestMetrics);
    } else if (weeklyMetrics && weeklyMetrics.length > 0) {
      console.log("DEBUG HealthStatusCard - Using most recent weekly metric as fallback");
      // Use the most recent weekly metric as fallback
      setMetrics(weeklyMetrics[0]);
    }
    
    // Stop loading state even if no data is available
    setLoading(false);
    
    // Manual fetch for testing
    const manualFetchData = async () => {
      try {
        console.log("DEBUG HealthStatusCard - Manual fetch attempt for latest health data");
        const response = await fetch(`/api/health-metrics/${user?.id || 3}?limit=1`);
        const data = await response.json();
        console.log("DEBUG HealthStatusCard - Manual fetch result:", data);
        if (data && data.length > 0) {
          setMetrics(data[0]);
        }
      } catch (error) {
        console.error("DEBUG HealthStatusCard - Manual fetch error:", error);
      }
    };
    
    // Only run manual fetch if other methods failed
    if (!latestMetrics && (!weeklyMetrics || weeklyMetrics.length === 0)) {
      manualFetchData();
    }
  }, [user, latestMetrics, weeklyMetrics]);

  // Function to get kidney stage description
  const getKidneyStageText = (stage: number | null) => {
    if (!stage) return "Unknown";
    switch (stage) {
      case 1: return "Stage 1 (Normal GFR with kidney damage)";
      case 2: return "Stage 2 (Mild decrease in GFR)";
      case 3: return "Stage 3 (Moderate decrease in GFR)";
      case 4: return "Stage 4 (Severe decrease in GFR)";
      case 5: return "Stage 5 (Kidney failure/ESRD)";
      default: return `Stage ${stage}`;
    }
  };

  // Function to get stage color
  const getStageColor = (stage: number | null) => {
    if (!stage) return "text-gray-500";
    switch (stage) {
      case 1: return "text-green-500";
      case 2: return "text-green-400";
      case 3: return "text-yellow-500";
      case 4: return "text-orange-500";
      case 5: return "text-red-500";
      default: return "text-gray-500";
    }
  };

  // Function to format blood pressure text
  const formatBP = (systolic: number | null | undefined, diastolic: number | null | undefined) => {
    if (systolic === null || systolic === undefined || diastolic === null || diastolic === undefined) 
      return "Not recorded";
    return `${systolic}/${diastolic} mmHg`;
  };
  
  // Function to format hydration text
  const formatHydration = (hydration: number | null | undefined) => {
    if (hydration === null || hydration === undefined) return "Not recorded";
    return `${hydration.toFixed(1)}L`;
  };
  
  // Function to format GFR text
  const formatGFR = (gfr: number | null | undefined) => {
    if (gfr === null || gfr === undefined) return "Not recorded";
    return `${gfr.toFixed(0)} mL/min/1.73m²`;
  };

  // Determine kidney stage from GFR if user data doesn't have it
  const determineKidneyStage = (gfr: number | null | undefined) => {
    if (gfr === null || gfr === undefined) return null;
    if (gfr >= 90) return 1;
    if (gfr >= 60) return 2;
    if (gfr >= 30) return 3;
    if (gfr >= 15) return 4;
    return 5;
  };

  // Use metrics-based kidney stage if user profile doesn't have it
  const kidneyStage = user?.kidneyDiseaseStage || 
    (metrics ? determineKidneyStage(metrics.estimatedGFR) : null);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center justify-between">
          <span className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            Health Status
          </span>
          {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Kidney Stage */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Kidney Disease Stage:</span>
            <span className={`font-semibold text-sm ${getStageColor(kidneyStage)}`}>
              {kidneyStage ? getKidneyStageText(kidneyStage) : "Not specified"}
            </span>
          </div>
          
          <div className="h-px bg-gray-200 my-2" />
          
          <div className="text-sm font-medium">Latest Recorded Metrics:</div>
          
          {/* Latest Metrics */}
          <div className="grid grid-cols-1 gap-2 mt-1">
            {/* GFR */}
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <Activity className="mr-1 h-4 w-4 text-primary" />
                Estimated GFR:
              </span>
              <span className={`text-sm ${loading ? 'animate-pulse' : ''}`}>
                {loading ? "Loading..." : formatGFR(metrics?.estimatedGFR)}
              </span>
            </div>
            
            {/* Blood Pressure */}
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <Heart className="mr-1 h-4 w-4 text-red-500" />
                Blood Pressure:
              </span>
              <span className={`text-sm ${loading ? 'animate-pulse' : ''}`}>
                {loading ? "Loading..." : formatBP(metrics?.systolicBP, metrics?.diastolicBP)}
              </span>
            </div>
            
            {/* Hydration */}
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <Droplet className="mr-1 h-4 w-4 text-blue-500" />
                Hydration:
              </span>
              <span className={`text-sm ${loading ? 'animate-pulse' : ''}`}>
                {loading ? "Loading..." : formatHydration(metrics?.hydration)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HealthStatusCard;