import React from "react";
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
import { Button } from "@/components/ui/button";
import { Phone, Calendar, Heart, AlertTriangle, Check } from "lucide-react";
import { HealthAlert } from "@/hooks/useHealthMonitor";

export interface HealthAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alertType: 'critical' | 'warning' | 'insight';
  metrics?: {
    name: string;
    value: number | string;
    threshold?: number | string;
  }[];
  message?: string;
  onAcknowledge?: () => void;
  isLoading?: boolean;
  alertId?: number;
}

export function HealthAlertPopup({ 
  open, 
  onOpenChange, 
  alertType, 
  metrics = [], 
  message,
  onAcknowledge,
  isLoading = false,
  alertId
}: HealthAlertProps) {
  
  const getTitle = () => {
    switch (alertType) {
      case 'critical':
        return "⚠️ Urgent Health Alert";
      case 'warning':
        return "🔔 Health Warning";
      case 'insight':
        return "💡 AI Health Insight";
      default:
        return "Health Alert";
    }
  };

  const getDefaultMessage = () => {
    switch (alertType) {
      case 'critical':
        return "One or more of your recent logs suggest a critical health risk. Please contact your healthcare provider immediately or seek emergency care if necessary.";
      case 'warning':
        return "Your recent health metrics are showing concerning trends. Consider discussing these with your healthcare provider.";
      case 'insight':
        return "We've noticed repeated symptoms in your journal entries. Consider discussing these patterns with your doctor.";
      default:
        return "Please review your recent health data.";
    }
  };

  const displayMessage = message || getDefaultMessage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-xl w-[calc(100vw-2rem)]">
        <AlertDialogHeader>
          <AlertDialogTitle className={`${alertType === 'critical' ? 'text-red-600' : alertType === 'warning' ? 'text-amber-600' : 'text-blue-600'} flex items-center gap-2`}>
            {alertType === 'critical' && <AlertTriangle className="h-5 w-5" />}
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription className="pt-2">
            {displayMessage}
          </AlertDialogDescription>
          
          {metrics.length > 0 && (
            <div className="my-3 bg-slate-50 p-3 rounded-md space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Concerning metrics:</h4>
              <ul className="space-y-1">
                {metrics.map((metric, index) => (
                  <li key={index} className="text-sm flex justify-between">
                    <span className="text-slate-600">{metric.name}:</span>
                    <span className={`font-medium ${alertType === 'critical' ? 'text-red-600' : 'text-amber-600'}`}>
                      {metric.value} {metric.threshold ? `(Threshold: ${metric.threshold})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AlertDialogHeader>
        <div className="flex flex-wrap gap-2 pt-2 justify-end">
          {alertType === 'critical' && (
            <Button
              className="flex-1 min-w-[140px] bg-red-600 hover:bg-red-700 flex items-center gap-2"
              onClick={() => {
                window.open('tel:911');
                onOpenChange(false);
              }}
            >
              <Phone className="h-4 w-4" />
              Call Emergency
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 min-w-[160px] flex items-center gap-2"
            onClick={() => onOpenChange(false)}
          >
            <Calendar className="h-4 w-4" />
            Schedule Appointment
          </Button>
          <Button
            variant="outline"
            className="flex-1 min-w-[120px] flex items-center gap-2 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            onClick={() => {
              if (onAcknowledge) {
                onAcknowledge();
              } else {
                onOpenChange(false);
              }
            }}
            disabled={isLoading}
          >
            <Check className="h-4 w-4" />
            Acknowledge
          </Button>
          <AlertDialogCancel className="mt-0 flex-1 min-w-[100px]">Dismiss</AlertDialogCancel>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}