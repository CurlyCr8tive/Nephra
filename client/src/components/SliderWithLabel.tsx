import { useState, useEffect } from "react";

interface SliderWithLabelProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  leftLabel?: string;
  centerLabel?: string;
  rightLabel?: string;
  color?: string;
}

export function SliderWithLabel({
  label,
  min,
  max,
  step,
  value,
  onChange,
  unit = "",
  leftLabel = "",
  centerLabel = "",
  rightLabel = "",
  color = "primary"
}: SliderWithLabelProps) {
  const [internalValue, setInternalValue] = useState(value);
  const progressPercentage = ((internalValue - min) / (max - min)) * 100;
  
  // Get the right color style for the progress bar
  const getProgressColor = () => {
    switch (color) {
      case "accent":
        return "bg-accent";
      default:
        return "bg-primary";
    }
  };

  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setInternalValue(newValue);
    onChange(newValue);
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-neutral-600">{label}</span>
        <span className="text-sm font-medium">
          {internalValue}
          {unit}
        </span>
      </div>
      
      <div className="relative mb-2">
        <div className="slider-track">
          <div 
            className={`slider-progress ${getProgressColor()}`} 
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step} 
          value={internalValue} 
          onChange={handleChange}
          className="w-full"
        />
      </div>
      
      {(leftLabel || centerLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-neutral-500">
          {leftLabel && <span>{leftLabel}</span>}
          {centerLabel && <span className="mx-auto">{centerLabel}</span>}
          {rightLabel && <span>{rightLabel}</span>}
        </div>
      )}
    </div>
  );
}

export default SliderWithLabel;
