import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Control } from "react-hook-form";
import { feetAndInchesToCm } from "@/lib/unit-conversions";

interface FeetInchesInputProps {
  control: Control<any>;
  onHeightChange?: (heightCm: number) => void;
  disabled?: boolean;
}

/**
 * A component for inputting height in feet and inches
 * Automatically converts to centimeters for the backend
 */
export function FeetInchesInput({ 
  control,
  onHeightChange,
  disabled = false 
}: FeetInchesInputProps) {
  // Handle changes to feet or inches and update the height in cm
  const handleInputChange = (feet: number, inches: number) => {
    if (onHeightChange && !isNaN(feet) && !isNaN(inches)) {
      const heightCm = feetAndInchesToCm(feet, inches);
      onHeightChange(heightCm);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="feet"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feet</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={9}
                  placeholder="5"
                  disabled={disabled}
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(value);
                    handleInputChange(value, control._formValues.inches || 0);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="inches"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Inches</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={11}
                  placeholder="10"
                  disabled={disabled}
                  {...field}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    field.onChange(value);
                    handleInputChange(control._formValues.feet || 0, value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <FormDescription className="text-xs text-muted-foreground">
        Your height in feet and inches (e.g., 5 feet 10 inches)
      </FormDescription>
    </div>
  );
}