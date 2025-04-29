import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { Activity, Droplet, Heart } from "lucide-react";

export function HealthStatusCard() {
  const { user } = useUser();
  const { latestMetrics, isLoadingLatest } = useHealthData();

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

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center">
          <Activity className="mr-2 h-5 w-5 text-primary" />
          Health Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Kidney Stage */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Kidney Disease Stage:</span>
            <span className={`font-semibold text-sm ${getStageColor(user?.kidneyDiseaseStage || null)}`}>
              {user?.kidneyDiseaseStage ? getKidneyStageText(user.kidneyDiseaseStage) : "Not specified"}
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
              <span className={`text-sm ${isLoadingLatest ? 'animate-pulse' : ''}`}>
                {isLoadingLatest ? "Loading..." : formatGFR(latestMetrics?.estimatedGFR)}
              </span>
            </div>
            
            {/* Blood Pressure */}
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <Heart className="mr-1 h-4 w-4 text-red-500" />
                Blood Pressure:
              </span>
              <span className={`text-sm ${isLoadingLatest ? 'animate-pulse' : ''}`}>
                {isLoadingLatest ? "Loading..." : formatBP(latestMetrics?.systolicBP, latestMetrics?.diastolicBP)}
              </span>
            </div>
            
            {/* Hydration */}
            <div className="flex justify-between items-center">
              <span className="text-sm flex items-center">
                <Droplet className="mr-1 h-4 w-4 text-blue-500" />
                Hydration:
              </span>
              <span className={`text-sm ${isLoadingLatest ? 'animate-pulse' : ''}`}>
                {isLoadingLatest ? "Loading..." : formatHydration(latestMetrics?.hydration)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HealthStatusCard;