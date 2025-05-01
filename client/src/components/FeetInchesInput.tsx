import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feetInchesToCm } from '@/lib/unit-conversions';

interface FeetInchesInputProps {
  className?: string;
  label?: string;
  value: number | null; // Value in cm
  onChange: (value: number) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

const FeetInchesInput: React.FC<FeetInchesInputProps> = ({
  className = "",
  label,
  value,
  onChange,
  error,
  required = false,
  disabled = false
}) => {
  // Convert value (in cm) to feet and inches
  const [feet, setFeet] = React.useState<number>(0);
  const [inches, setInches] = React.useState<number>(0);

  // Update feet/inches when the cm value changes
  React.useEffect(() => {
    if (value !== null) {
      // Convert from cm to feet/inches using local function
      const { feet: newFeet, inches: newInches } = calculateFeetInches(value);
      setFeet(newFeet);
      setInches(newInches);
    }
  }, [value]);
  
  function calculateFeetInches(cm: number) {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    
    // Handle case where inches rounds to 12
    if (inches === 12) {
      return { feet: feet + 1, inches: 0 };
    }
    
    return { feet, inches };
  }

  const handleFeetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFeet = parseInt(e.target.value) || 0;
    setFeet(newFeet);
    updateCmValue(newFeet, inches);
  };

  const handleInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newInches = parseInt(e.target.value) || 0;
    
    // If inches is 12 or more, convert to additional feet
    if (newInches >= 12) {
      const additionalFeet = Math.floor(newInches / 12);
      const remainingInches = newInches % 12;
      setFeet(feet + additionalFeet);
      setInches(remainingInches);
      updateCmValue(feet + additionalFeet, remainingInches);
    } else {
      setInches(newInches);
      updateCmValue(feet, newInches);
    }
  };

  const updateCmValue = (feet: number, inches: number) => {
    const cm = feetInchesToCm(feet, inches);
    onChange(cm);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <Label htmlFor="feet-input" className={error ? "text-destructive" : ""}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            id="feet-input"
            type="number"
            min={0}
            max={9}
            value={feet || ""}
            onChange={handleFeetChange}
            className={error ? "border-destructive" : ""}
            placeholder="Feet"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground mt-1 block">Feet</span>
        </div>
        <div className="flex-1">
          <Input
            id="inches-input"
            type="number"
            min={0}
            max={11}
            value={inches || ""}
            onChange={handleInchesChange}
            className={error ? "border-destructive" : ""}
            placeholder="Inches"
            disabled={disabled}
          />
          <span className="text-xs text-muted-foreground mt-1 block">Inches</span>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export { FeetInchesInput };
export default FeetInchesInput;