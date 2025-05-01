import React from 'react';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUser } from '@/contexts/UserContext';

interface UnitToggleProps {
  className?: string;
  showLabels?: boolean; // Whether to show text labels
  compact?: boolean; // Compact display for smaller spaces
}

const UnitToggle: React.FC<UnitToggleProps> = ({ 
  className = "",
  showLabels = true,
  compact = false
}) => {
  const { unitSystem, setUnitSystem } = useUser();
  
  const toggleUnitSystem = () => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystem(newSystem);
  };

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
      {showLabels && (
        <Label htmlFor="unit-system" className={`${unitSystem === 'metric' ? 'font-bold' : 'text-muted-foreground'}`}>
          Metric
        </Label>
      )}
      
      <Switch
        id="unit-system"
        checked={unitSystem === 'imperial'}
        onCheckedChange={toggleUnitSystem}
        aria-label="Toggle between metric and imperial units"
      />
      
      {showLabels && (
        <Label htmlFor="unit-system" className={`${unitSystem === 'imperial' ? 'font-bold' : 'text-muted-foreground'}`}>
          Imperial
        </Label>
      )}
    </div>
  );
};

export { UnitToggle };
export default UnitToggle;