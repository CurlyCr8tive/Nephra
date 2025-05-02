import React from "react";
import { Input } from "@/components/ui/input";

interface SimpleFeetInchesInputProps {
  feet: number;
  inches: number;
  onChange: (feet: number, inches: number) => void;
  disabled?: boolean;
}

/**
 * A simplified component for inputting height in feet and inches
 * without dependency on react-hook-form
 */
export function SimpleFeetInchesInput({
  feet,
  inches,
  onChange,
  disabled = false
}: SimpleFeetInchesInputProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Input
          type="number"
          min={0}
          max={9}
          placeholder="5"
          disabled={disabled}
          value={feet}
          onChange={(e) => {
            const value = e.target.value === "" ? 0 : parseInt(e.target.value);
            onChange(value, inches);
          }}
          className="text-center"
        />
        <span className="text-xs text-muted-foreground block text-center mt-1">feet</span>
      </div>
      <div className="flex-1">
        <Input
          type="number"
          min={0}
          max={11}
          placeholder="10"
          disabled={disabled}
          value={inches}
          onChange={(e) => {
            const value = e.target.value === "" ? 0 : parseInt(e.target.value);
            onChange(feet, value);
          }}
          className="text-center"
        />
        <span className="text-xs text-muted-foreground block text-center mt-1">inches</span>
      </div>
    </div>
  );
}