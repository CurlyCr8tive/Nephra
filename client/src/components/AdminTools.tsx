import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Admin Tools Component
 * 
 * This component provides administrative functions for data management:
 * - Health data transfer between users
 * - System diagnostics
 * - Special operations needed by administrators
 */
export default function AdminTools() {
  const [sourceUserId, setSourceUserId] = useState<number>(3); // Default to user ID 3 which has sample data
  const [targetUserId, setTargetUserId] = useState<number>(0); 
  const [isTransferring, setIsTransferring] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  // SECURITY FIX: Removed localStorage fallback to prevent cross-user data access
  // Admin tools must only work with authenticated users

  // SECURITY FIX: Admin tools require proper authentication
  // No localStorage fallbacks to prevent cross-user data access
  React.useEffect(() => {
    // Admin tools should only be used by authenticated administrators
    // No automatic user ID setting from localStorage
  }, []);

  const handleTransferData = async () => {
    if (!sourceUserId || !targetUserId) {
      toast({
        title: "Missing User IDs",
        description: "Please specify both source and target user IDs",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    setResult(null);

    try {
      const response = await fetch('/api/transfer-health-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceUserId,
          targetUserId
        }),
        credentials: 'include'
      });

      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Data Transfer Complete",
          description: `Successfully transferred ${data.copied} health records`,
        });
      } else {
        toast({
          title: "Transfer Failed",
          description: data.error || "An error occurred during data transfer",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error transferring data:', error);
      toast({
        title: "Transfer Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Admin Tools</CardTitle>
        <CardDescription>
          Transfer health metrics data between users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Source User ID (Copy FROM)
            </label>
            <Input
              type="number" 
              value={sourceUserId || ''}
              onChange={(e) => setSourceUserId(parseInt(e.target.value) || 0)}
              placeholder="Source User ID"
            />
            <p className="text-xs text-muted-foreground">
              User ID to copy health data from (e.g., 3 for demo data)
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Target User ID (Copy TO)
            </label>
            <Input
              type="number" 
              value={targetUserId || ''}
              onChange={(e) => setTargetUserId(parseInt(e.target.value) || 0)}
              placeholder="Target User ID"
            />
            <p className="text-xs text-muted-foreground">
              Your user ID where data will be copied to
            </p>
          </div>

          <Button 
            onClick={handleTransferData} 
            disabled={isTransferring || !sourceUserId || !targetUserId}
            className="w-full"
          >
            {isTransferring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              "Transfer Health Data"
            )}
          </Button>

          {result && (
            <div className="mt-4 p-3 rounded-md bg-muted">
              <h4 className="font-medium mb-1">Transfer Results:</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}