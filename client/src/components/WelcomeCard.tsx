import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";

interface WelcomeCardProps {
  onLogClick?: () => void;
}

export function WelcomeCard({ onLogClick }: WelcomeCardProps) {
  const { user } = useUser();
  const { latestMetrics, isLoadingLatest } = user ? useHealthData({ userId: user.id }) : { latestMetrics: null, isLoadingLatest: false };

  // Function to determine GFR classification
  const getGFRClass = (gfr: number | null | undefined) => {
    if (!gfr) return { text: "Unknown", color: "text-neutral-500" };
    if (gfr >= 90) return { text: "Normal", color: "text-success" };
    if (gfr >= 60) return { text: "Stage 2", color: "text-success" };
    if (gfr >= 30) return { text: "Stage 3", color: "text-warning" };
    if (gfr >= 15) return { text: "Stage 4", color: "text-error" };
    return { text: "Stage 5", color: "text-error" };
  };

  // Function to determine BP classification
  const getBPClass = (systolic?: number, diastolic?: number) => {
    if (!systolic || !diastolic) return { text: "Unknown", color: "text-neutral-500" };
    
    if (systolic < 120 && diastolic < 80) return { text: "Normal", color: "text-success" };
    if (systolic < 130 && diastolic < 80) return { text: "Elevated", color: "text-success" };
    if (systolic < 140 || diastolic < 90) return { text: "Stage 1", color: "text-warning" };
    return { text: "Stage 2", color: "text-error" };
  };

  // Get GFR classification
  const gfrClass = getGFRClass(latestMetrics?.estimatedGFR);
  
  // Get BP classification
  const bpClass = getBPClass(latestMetrics?.systolicBP, latestMetrics?.diastolicBP);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
      <div className="flex items-start gap-4">
        <div className="bg-primary-light bg-opacity-20 rounded-full p-3">
          <span className="material-icons text-primary">water_drop</span>
        </div>
        <div>
          <h2 className="font-display font-bold text-lg">
            Hi, {user?.firstName || "User"}
          </h2>
          <p className="text-neutral-600 text-sm">Remember to track your health today</p>
        </div>
      </div>
      
      {/* Today's summary */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="bg-neutral-100 rounded-lg p-3 text-center">
          <p className="text-neutral-600 text-xs">Hydration</p>
          <p className="font-bold text-lg text-primary">
            {isLoadingLatest ? (
              <span className="animate-pulse">...</span>
            ) : (
              `${latestMetrics?.hydration?.toFixed(1) || 0}L`
            )}
          </p>
          <p className="text-xs text-neutral-500">of 2.5L</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center">
          <p className="text-neutral-600 text-xs">Blood Pressure</p>
          <p className="font-bold text-lg">
            {isLoadingLatest ? (
              <span className="animate-pulse">...</span>
            ) : (
              latestMetrics?.systolicBP ? 
              `${latestMetrics.systolicBP}/${latestMetrics.diastolicBP || 80}` : 
              "--/--"
            )}
          </p>
          <p className={`text-xs ${bpClass.color}`}>{bpClass.text}</p>
        </div>
        <div className="bg-neutral-100 rounded-lg p-3 text-center">
          <p className="text-neutral-600 text-xs">Est. GFR</p>
          <p className="font-bold text-lg text-warning">
            {isLoadingLatest ? (
              <span className="animate-pulse">...</span>
            ) : (
              latestMetrics?.estimatedGFR?.toFixed(0) || "--"
            )}
          </p>
          <p className={`text-xs ${gfrClass.color}`}>{gfrClass.text}</p>
        </div>
      </div>
      
      <Button 
        className="mt-4 w-full"
        onClick={onLogClick}
      >
        <span className="material-icons mr-2">add_circle</span>
        Log Today's Health Data
      </Button>
    </div>
  );
}

export default WelcomeCard;
