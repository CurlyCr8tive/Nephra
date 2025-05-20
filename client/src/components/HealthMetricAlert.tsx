import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { HealthMetrics } from "@shared/schema";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface HealthMetricAlertProps {
  metrics: HealthMetrics;
  onDismiss?: () => void;
}

export function HealthMetricAlert({ metrics, onDismiss }: HealthMetricAlertProps) {
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState<'bp' | 'hydration' | 'gfr' | null>(null);
  const [alertMessage, setAlertMessage] = useState("");
  const [severity, setSeverity] = useState<'low' | 'moderate' | 'high'>('low');
  const [showFullDialog, setShowFullDialog] = useState(false);
  const [recommendation, setRecommendation] = useState("");
  
  // Check for dangerous values when metrics change
  useEffect(() => {
    if (!metrics) return;
    
    // Check metrics in order of priority (most critical first)
    
    // Check GFR - dangerously low values may indicate kidney failure
    if (metrics.estimatedGFR != null && metrics.estimatedGFR < 15) {
      setAlertType('gfr');
      setAlertMessage("Very low GFR detected. This may indicate severe kidney disease.");
      setSeverity('high');
      setRecommendation("Contact your healthcare provider immediately. This GFR level may require urgent medical attention.");
      setShowAlert(true);
      return;
    } else if (metrics.estimatedGFR != null && metrics.estimatedGFR < 30) {
      setAlertType('gfr');
      setAlertMessage("GFR below 30 detected. This indicates moderate to severe kidney disease.");
      setSeverity('moderate');
      setRecommendation("This GFR level should be discussed with your nephrologist at your next appointment. Monitor your blood pressure, fluid intake, and medication adherence carefully.");
      setShowAlert(true);
      return;
    }
    
    // Check blood pressure - very high values are a medical emergency
    if (metrics.systolicBP != null && metrics.diastolicBP != null && 
        (metrics.systolicBP > 180 || metrics.diastolicBP > 120)) {
      setAlertType('bp');
      setAlertMessage("Dangerously high blood pressure detected. This is a hypertensive crisis.");
      setSeverity('high');
      setRecommendation("This is considered a hypertensive crisis and requires immediate medical attention. Contact your healthcare provider or emergency services right away.");
      setShowAlert(true);
      return;
    } else if (metrics.systolicBP != null && metrics.diastolicBP != null && 
              (metrics.systolicBP > 160 || metrics.diastolicBP > 100)) {
      setAlertType('bp');
      setAlertMessage("Very high blood pressure detected.");
      setSeverity('moderate');
      setRecommendation("Contact your healthcare provider soon to discuss this blood pressure reading. Take your blood pressure medications as prescribed, reduce sodium intake, and avoid strenuous activity until your blood pressure is under control.");
      setShowAlert(true);
      return;
    } else if (metrics.systolicBP != null && metrics.diastolicBP != null && 
              (metrics.systolicBP < 90 || metrics.diastolicBP < 60)) {
      setAlertType('bp');
      setAlertMessage("Low blood pressure detected.");
      setSeverity('moderate');
      setRecommendation("If you're experiencing dizziness, weakness, or fainting, contact your healthcare provider. Stay hydrated and monitor your symptoms carefully.");
      setShowAlert(true);
      return;
    }
    
    // Check hydration - severe dehydration is dangerous for kidney patients
    if (metrics.hydration != null && metrics.hydration < 0.5) {
      setAlertType('hydration');
      setAlertMessage("Very low hydration levels detected. Risk of dehydration.");
      setSeverity('moderate');
      setRecommendation("Increase your fluid intake immediately. For kidney patients, dehydration can worsen kidney function. If you're experiencing severe symptoms like extreme thirst, dizziness, confusion, or rapid heartbeat, contact your healthcare provider.");
      setShowAlert(true);
      return;
    }
    
    // No alert conditions met
    setShowAlert(false);
    
  }, [metrics]);
  
  // Handle dismissing the alert
  const handleDismiss = () => {
    setShowAlert(false);
    if (onDismiss) {
      onDismiss();
    }
  };
  
  // Handle opening the full dialog
  const handleOpenFullDialog = () => {
    setShowFullDialog(true);
  };
  
  // Get appropriate icon colors based on severity
  const getSeverityColors = () => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-100',
          border: 'border-red-300',
          text: 'text-red-700',
          icon: 'text-red-500'
        };
      case 'moderate':
        return {
          bg: 'bg-amber-100',
          border: 'border-amber-300',
          text: 'text-amber-700',
          icon: 'text-amber-500'
        };
      default:
        return {
          bg: 'bg-blue-100',
          border: 'border-blue-300',
          text: 'text-blue-700',
          icon: 'text-blue-500'
        };
    }
  };
  
  // Don't render anything if no alert to show
  if (!showAlert) return null;
  
  const colors = getSeverityColors();
  
  return (
    <>
      <div 
        className={cn(
          "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 rounded-lg shadow-lg z-50 p-4 flex items-start gap-3",
          colors.bg,
          colors.border,
          "border animate-bounce-once"
        )}
      >
        <div className="flex-shrink-0">
          <AlertCircle className={colors.icon} size={24} />
        </div>
        <div className="flex-1">
          <h4 className={cn("font-semibold", colors.text)}>
            Health Alert
          </h4>
          <p className="text-sm mt-1 pr-6">{alertMessage}</p>
          <button 
            onClick={handleOpenFullDialog}
            className="text-xs underline mt-1 font-medium"
          >
            View recommendations
          </button>
        </div>
        <button 
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-black/5 rounded-full"
          aria-label="Dismiss"
        >
          <X size={18} />
        </button>
      </div>
      
      <AlertDialog open={showFullDialog} onOpenChange={setShowFullDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className={cn(colors.text)}>
              {alertType === 'bp' ? 'Blood Pressure Alert' : 
               alertType === 'gfr' ? 'Kidney Function Alert' : 
               'Hydration Alert'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-medium text-base">{alertMessage}</p>
              <div className={cn("p-3 rounded", colors.bg, "mt-2")}>
                <p className="font-medium">Recommendation:</p>
                <p>{recommendation}</p>
              </div>
              
              {alertType === 'bp' && (
                <div className="border-t border-gray-200 pt-2 mt-4">
                  <p className="text-sm font-medium">Your reading: {metrics.systolicBP != null && metrics.diastolicBP != null ? `${metrics.systolicBP}/${metrics.diastolicBP} mmHg` : 'N/A'}</p>
                  <div className="mt-2 text-xs">
                    <p>• Normal: Less than 120/80 mmHg</p>
                    <p>• Elevated: 120-129 / less than 80 mmHg</p>
                    <p>• Stage 1 Hypertension: 130-139 / 80-89 mmHg</p>
                    <p>• Stage 2 Hypertension: 140+ / 90+ mmHg</p>
                    <p>• Hypertensive Crisis: Higher than 180/120 mmHg</p>
                  </div>
                </div>
              )}
              
              {alertType === 'gfr' && (
                <div className="border-t border-gray-200 pt-2 mt-4">
                  <p className="text-sm font-medium">Your reading: {metrics.estimatedGFR != null ? `${Math.round(metrics.estimatedGFR)} mL/min/1.73m²` : 'N/A'}</p>
                  <div className="mt-2 text-xs">
                    <p>• Normal: 90 or higher</p>
                    <p>• Mildly decreased: 60-89</p>
                    <p>• Mild to moderate: 45-59</p>
                    <p>• Moderate to severe: 30-44</p>
                    <p>• Severely decreased: 15-29</p>
                    <p>• Kidney failure: Less than 15</p>
                  </div>
                </div>
              )}
              
              {alertType === 'hydration' && (
                <div className="border-t border-gray-200 pt-2 mt-4">
                  <p className="text-sm font-medium">Your hydration: {metrics.hydration != null ? `${metrics.hydration.toFixed(1)}L per day` : 'N/A'}</p>
                  <div className="mt-2 text-xs">
                    <p>• Target for kidney patients: 1.5-2L per day (consult your doctor)</p>
                    <p>• Low: Less than 1L per day</p>
                    <p>• Adequate: 1.5-2L per day</p>
                    <p>• Optimal: 2-3L per day</p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {severity === 'high' && (
              <AlertDialogAction className="bg-red-600 hover:bg-red-700">
                Call Emergency
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default HealthMetricAlert;