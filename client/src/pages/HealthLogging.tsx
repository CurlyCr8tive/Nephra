import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SliderWithLabel } from "@/components/SliderWithLabel";
import { useUser } from "@/contexts/UserContext";
import { useHealthData } from "@/hooks/useHealthData";
import { RouteComponentProps } from "wouter";

interface HealthLoggingProps extends RouteComponentProps {
  onClose?: () => void;
}

export default function HealthLogging(props: HealthLoggingProps) {
  const { onClose } = props;
  
  // Wrap in try/catch to handle case where UserProvider is not available
  let user = null;
  let healthDataHook: any = { logHealthMetrics: null, isLogging: false };
  let isLogging = false;
  
  try {
    const userContext = useUser();
    user = userContext.user;
    
    if (user) {
      healthDataHook = useHealthData({ userId: user.id });
      isLogging = healthDataHook.isLogging;
    }
  } catch (error) {
    console.error("UserContext not available:", error);
  }
  
  // Create a wrapper function for the mutation to handle the TypeScript error
  const logHealthMetrics = async (data: any) => {
    if (healthDataHook.logHealthMetrics) {
      return healthDataHook.logHealthMetrics(data);
    } else {
      console.log("No health data hook available");
      return Promise.resolve();
    }
  };
  
  const [hydration, setHydration] = useState(1.2);
  const [systolicBP, setSystolicBP] = useState<number | "">("");
  const [diastolicBP, setDiastolicBP] = useState<number | "">("");
  const [painLevel, setPainLevel] = useState(4);
  const [stressLevel, setStressLevel] = useState(6);
  const [fatigueLevel, setFatigueLevel] = useState(5);

  const handleSave = async () => {
    if (!user) return;
    
    try {
      await logHealthMetrics({
        userId: user.id,
        date: new Date(),
        hydration,
        systolicBP: systolicBP !== "" ? Number(systolicBP) : undefined,
        diastolicBP: diastolicBP !== "" ? Number(diastolicBP) : undefined,
        painLevel,
        stressLevel,
        fatigueLevel
      });
      
      if (onClose) onClose();
    } catch (error) {
      console.error("Error logging health data:", error);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-lg">Log Health Data</h2>
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="text-neutral-500"
            >
              <span className="material-icons">close</span>
            </Button>
          )}
        </div>
        
        {/* Hydration Input */}
        <div className="mb-6">
          <h3 className="font-medium text-sm mb-3">Hydration Tracking</h3>
          
          <div className="mb-4">
            <SliderWithLabel
              label="Water Intake"
              min={0}
              max={2.5}
              step={0.1}
              value={hydration}
              onChange={setHydration}
              unit="L"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="flex-1 bg-primary-light bg-opacity-20 text-primary"
              onClick={() => setHydration(Math.min(2.5, hydration + 0.25))}
            >
              <span className="material-icons mr-1">add</span>
              <span className="text-sm">Add 250ml</span>
            </Button>
            <Button 
              className="flex-1"
              onClick={() => handleSave()}
              disabled={isLogging}
            >
              Log intake
            </Button>
          </div>
        </div>
        
        {/* Blood Pressure Input */}
        <div className="mb-6">
          <h3 className="font-medium text-sm mb-3">Blood Pressure</h3>
          
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-sm text-neutral-600 block mb-1">Systolic</label>
              <input 
                type="number" 
                placeholder="120" 
                className="w-full border border-neutral-300 rounded-lg p-3 text-center text-lg"
                value={systolicBP}
                onChange={(e) => setSystolicBP(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="text-xs text-neutral-500 block text-center mt-1">mmHg</span>
            </div>
            <div className="flex items-center">
              <span className="text-xl font-light text-neutral-400">/</span>
            </div>
            <div className="flex-1">
              <label className="text-sm text-neutral-600 block mb-1">Diastolic</label>
              <input 
                type="number" 
                placeholder="80" 
                className="w-full border border-neutral-300 rounded-lg p-3 text-center text-lg"
                value={diastolicBP}
                onChange={(e) => setDiastolicBP(e.target.value === "" ? "" : Number(e.target.value))}
              />
              <span className="text-xs text-neutral-500 block text-center mt-1">mmHg</span>
            </div>
          </div>
        </div>
        
        {/* Pain Level Input */}
        <div className="mb-6">
          <SliderWithLabel
            label="Pain Level"
            min={0}
            max={10}
            step={1}
            value={painLevel}
            onChange={setPainLevel}
            unit="/10"
            leftLabel="No pain"
            centerLabel="Moderate"
            rightLabel="Severe"
            color="accent"
          />
        </div>
        
        {/* Stress Level Input */}
        <div className="mb-6">
          <SliderWithLabel
            label="Stress Level"
            min={0}
            max={10}
            step={1}
            value={stressLevel}
            onChange={setStressLevel}
            unit="/10"
            leftLabel="Relaxed"
            centerLabel="Moderate"
            rightLabel="Very stressed"
            color="accent"
          />
        </div>
        
        {/* Fatigue Level Input */}
        <div className="mb-6">
          <SliderWithLabel
            label="Fatigue Level"
            min={0}
            max={10}
            step={1}
            value={fatigueLevel}
            onChange={setFatigueLevel}
            unit="/10"
            leftLabel="Energetic"
            centerLabel="Moderate"
            rightLabel="Exhausted"
            color="accent"
          />
        </div>
        
        <div className="flex justify-between border-t border-neutral-200 pt-4">
          {onClose && (
            <Button
              variant="ghost"
              className="text-neutral-600"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}
          <Button
            className={onClose ? "" : "w-full"}
            onClick={handleSave}
            disabled={isLogging}
          >
            {isLogging ? "Saving..." : "Save Data"}
          </Button>
        </div>
      </div>
    </div>
  );
}
