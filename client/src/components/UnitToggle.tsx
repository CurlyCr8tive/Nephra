import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export type UnitSystem = "metric" | "imperial";

interface UnitToggleProps {
  value: UnitSystem;
  onChange: (system: UnitSystem) => void;
  label?: string;
  className?: string;
  tooltipText?: string;
}

/**
 * A switch component that allows toggling between metric and imperial units
 */
export function UnitToggle({
  value,
  onChange,
  label = "Unit System",
  className = "",
  tooltipText
}: UnitToggleProps) {
  const [isMetric, setIsMetric] = useState(value === "metric");

  useEffect(() => {
    setIsMetric(value === "metric");
  }, [value]);

  const handleToggleChange = (checked: boolean) => {
    const newSystem: UnitSystem = checked ? "metric" : "imperial";
    setIsMetric(checked);
    onChange(newSystem);
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Switch 
          id="unit-toggle" 
          checked={isMetric}
          onCheckedChange={handleToggleChange}
        />
        <Label htmlFor="unit-toggle" className="text-sm text-muted-foreground">
          {label}
        </Label>
        
        {tooltipText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      
      <div className="flex items-center space-x-2 text-xs">
        <span className={!isMetric ? "font-semibold text-primary" : "text-muted-foreground"}>
          Imperial (lb, ft/in)
        </span>
        <span>|</span>
        <span className={isMetric ? "font-semibold text-primary" : "text-muted-foreground"}>
          Metric (kg, cm)
        </span>
      </div>
    </div>
  );
}