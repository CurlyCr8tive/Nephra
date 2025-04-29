import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Button component to migrate health data from one user to another
 * This is useful for transferring demo data to a real user account
 */
export function DataMigrationButton({ 
  sourceUserId, 
  targetUserId, 
  buttonText = "Import Health Data",
  className = "",
  variant = "default",
  disabled = false,
  onSuccess,
}: {
  sourceUserId: number;
  targetUserId: number;
  buttonText?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  disabled?: boolean;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleMigration = async () => {
    try {
      setIsLoading(true);
      
      // Call the data transfer API
      const response = await apiRequest("POST", "/api/transfer-health-data", {
        sourceUserId,
        targetUserId
      });
      
      // Check if the operation was successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || "Data migration failed");
      }
      
      // Retrieve result data
      const result = await response.json();
      
      // Show success message
      toast({
        title: "Data migration successful",
        description: `Successfully imported ${result.copied} health records from user ${sourceUserId}.`,
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Force reload the current page to refresh data views
      window.location.reload();
    } catch (error) {
      console.error("Data migration error:", error);
      
      toast({
        title: "Data migration failed",
        description: error instanceof Error ? error.message : "Failed to import health data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMigration}
      disabled={isLoading || disabled}
      className={className}
      variant={variant}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Importing...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}