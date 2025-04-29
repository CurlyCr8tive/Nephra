import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * DirectApiConnectionTest Component
 * 
 * This component provides a simple way to test if the direct
 * API endpoint for health metrics is reachable.
 * 
 * It's useful for diagnosing connection issues when users
 * have trouble saving health data.
 */
export default function DirectApiConnectionTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    timestamp?: string;
  } | null>(null);
  
  const { toast } = useToast();
  
  const testDirectApi = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      // Prepare test data with minimal information
      const testResponse = await fetch("/api/direct-health-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          healthData: {
            systolicBP: 120,
            diastolicBP: 80,
            hydration: 1.0,
            painLevel: 0,
            stressLevel: 0,
            fatigueLevel: 0
          },
          userId: 3, // Sample user ID for testing
          apiKey: "nephra-health-data-key", // API key for validation
          testMode: true // Important: use test mode to avoid saving data
        }),
      });
      
      if (!testResponse.ok) {
        throw new Error(`API responded with status: ${testResponse.status}`);
      }
      
      const data = await testResponse.json();
      setResult({
        success: data.success,
        message: data.message,
        timestamp: data.timestamp
      });
      
      toast({
        title: "Connection Test " + (data.success ? "Successful" : "Failed"),
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Direct API test failed:", error);
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
      
      toast({
        title: "Connection Test Failed",
        description: "Unable to reach the API endpoint. Please check your internet connection.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 bg-slate-50 rounded-lg border shadow-sm">
      <h3 className="text-lg font-medium mb-2">Direct API Connection Test</h3>
      <p className="text-sm text-muted-foreground mb-4">
        If you're having trouble saving health data, use this tool to check if the API endpoint is reachable.
      </p>
      
      <Button 
        onClick={testDirectApi}
        disabled={isLoading}
        className="w-full mb-4"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Testing Connection...
          </>
        ) : (
          "Test API Connection"
        )}
      </Button>
      
      {result && (
        <div className={`p-3 rounded-md ${
          result.success 
            ? "bg-green-100 border border-green-200 text-green-800" 
            : "bg-red-100 border border-red-200 text-red-800"
        }`}>
          <div className="flex items-center mb-1">
            {result.success ? (
              <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 mr-2 text-red-600" />
            )}
            <span className="font-medium">
              {result.success ? "Connection Successful" : "Connection Failed"}
            </span>
          </div>
          <p className="text-sm">{result.message}</p>
          {result.timestamp && (
            <p className="text-xs mt-1 text-slate-600">Timestamp: {result.timestamp}</p>
          )}
        </div>
      )}
      
      <div className="mt-4 text-xs text-slate-500">
        <p>This test only checks connection and doesn't save any real health data.</p>
      </div>
    </div>
  );
}