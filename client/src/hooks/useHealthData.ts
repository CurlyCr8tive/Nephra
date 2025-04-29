import { useState } from "react";
import { HealthMetrics, InsertHealthMetrics } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseHealthDataProps {
  userId?: number;
}

export function useHealthData({ userId }: UseHealthDataProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [todayMetrics, setTodayMetrics] = useState<HealthMetrics | null>(null);

  // Get the latest health metrics for a user
  const { data: latestMetrics, isLoading: isLoadingLatest } = useQuery<HealthMetrics[]>({
    queryKey: [`/api/health-metrics/${userId || 1}?limit=1`],
    staleTime: 60 * 1000, // 1 minute
    enabled: true, // Always enabled with fallback to demo user (ID 1)
    placeholderData: []
  });

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery<HealthMetrics[]>({
    queryKey: [`/api/health-metrics/${userId || 1}/range`],
    queryFn: async () => {
      // Always use a valid ID (use demo user ID 1 as fallback)
      const safeUserId = userId || 1;
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      console.log(`Fetching data for user ID ${safeUserId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      try {
        const response = await fetch(
          `/api/health-metrics/${safeUserId}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
          { credentials: "include" }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching weekly metrics:", errorText);
          return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data?.length || 0} health metrics for user ${safeUserId}`);
        
        // Make sure we always return an array, even if data is null or undefined
        return data || [];
      } catch (error) {
        console.error("Exception while fetching health metrics:", error);
        // Return empty array instead of throwing to prevent UI errors
        return [];
      }
    },
    placeholderData: [],
    enabled: true, // Always enabled with fallback ID
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutation for logging new health metrics
  const { mutate: logHealthMetrics, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      // Ensure estimatedGFR is properly set and never null or undefined
      if (data.estimatedGFR === null || data.estimatedGFR === undefined) {
        console.warn("GFR value is null or undefined. Setting default value.");
        data.estimatedGFR = 60; // Default reasonable value if calculation failed
        data.gfrCalculationMethod = "fallback-estimation";
      }
      
      console.log("Saving health metrics to database:", data);
      
      // Make sure userId is correctly set
      if (!data.userId) {
        if (userId) {
          console.log("Setting userId from context:", userId);
          data.userId = userId;
        } else {
          console.error("No valid userId available to save health metrics");
          throw new Error("You must be logged in to save health metrics");
        }
      }
      
      try {
        const response = await apiRequest("POST", "/api/health-metrics", data);
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from server:", errorText);
          throw new Error(`Server error: ${errorText}`);
        }
        return response.json();
      } catch (error) {
        console.error("Exception in health metrics submission:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Successfully saved health metrics:", data);
      
      // Immediately invalidate queries to refresh data
      queryClient.invalidateQueries({
        queryKey: [`/api/health-metrics/${userId}`]
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/health-metrics/${userId}/range`]
      });
      
      setTodayMetrics(data);
      
      toast({
        title: "Health data logged",
        description: "Your health data has been successfully logged.",
      });
    },
    onError: (error) => {
      console.error("Error in health metrics mutation:", error);
      
      toast({
        title: "Error logging health data",
        description: error.message || "Failed to log health data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process latest metrics when they change
  if (latestMetrics && latestMetrics.length > 0 && !todayMetrics) {
    // Check if the latest record is from today
    const today = new Date();
    const latestDate = new Date(latestMetrics[0].date || "");
    
    if (
      latestDate && 
      today.getFullYear() === latestDate.getFullYear() &&
      today.getMonth() === latestDate.getMonth() &&
      today.getDate() === latestDate.getDate()
    ) {
      setTodayMetrics(latestMetrics[0]);
    }
  }

  return {
    latestMetrics: latestMetrics && latestMetrics.length > 0 ? latestMetrics[0] : null,
    weeklyMetrics: weeklyMetrics || [],
    todayMetrics,
    isLoadingLatest,
    isLoadingWeekly,
    logHealthMetrics,
    isLogging,
  };
}
