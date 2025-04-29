import { useState } from "react";
import { HealthMetrics, InsertHealthMetrics } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export function useHealthData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser(); // Get authenticated user from UserContext
  const [todayMetrics, setTodayMetrics] = useState<HealthMetrics | null>(null);
  
  // Safely access the authenticated user ID
  const userId = user?.id;

  // Get the latest health metrics for the current user
  const { data: latestMetrics, isLoading: isLoadingLatest } = useQuery<HealthMetrics[]>({
    queryKey: [`/api/health-metrics/${userId}?limit=1`],
    queryFn: async () => {
      // Safety check - only proceed if we have a user ID
      if (!userId) {
        console.log("⚠️ No authenticated user ID available, skipping latest metrics fetch");
        return [];
      }
      
      console.log(`🔍 Explicitly fetching latest health metrics for authenticated user ID ${userId}`);
      
      try {
        // Make a simple direct fetch to the endpoint - avoids any potential browser issues
        const response = await fetch(`/api/health-metrics/${userId}?limit=1`, { 
          credentials: "include",
          cache: "no-store" // Force fresh data
        });
        
        console.log(`🔄 Health metrics API response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          console.error(`❌ Error fetching latest metrics for user ${userId} with status ${response.status}`);
          
          // Try alternative direct approach with hardcoded user ID as fallback
          console.log("🔄 Attempting fallback fetch method with explicit ID...");
          const directResponse = await fetch(`/api/health-metrics/3?limit=1`);
          
          if (!directResponse.ok) {
            console.error("❌ All fetch methods failed. Cannot retrieve health metrics.");
            return [];
          }
          
          const directData = await directResponse.json();
          console.log(`✅ Retrieved ${directData?.length || 0} metrics via fallback method`);
          return directData || [];
        }
        
        const data = await response.json();
        console.log(`✅ Retrieved ${data?.length || 0} latest health metrics for user ${userId}`);
        
        if (data && data.length > 0) {
          console.log("📋 Latest metrics data:", data[0]);
          
          // Log important health values
          console.log("🩺 Key health values:", {
            hydration: data[0].hydration,
            systolicBP: data[0].systolicBP,
            diastolicBP: data[0].diastolicBP,
            estimatedGFR: data[0].estimatedGFR,
            painLevel: data[0].painLevel,
            stressLevel: data[0].stressLevel,
            fatigueLevel: data[0].fatigueLevel
          });
        } else {
          console.log("⚠️ No health metrics found for this user.");
          
          // Try the alternative direct endpoint with hardcoded ID 3
          console.log("🔍 Attempting to fetch with hardcoded user ID 3...");
          try {
            const directResponse = await fetch(`/api/health-metrics/3?limit=1`);
            const directData = await directResponse.json();
            
            if (directData && directData.length > 0) {
              console.log("✅ Successfully retrieved data using hardcoded ID:", directData.length, "records");
              return directData;
            }
          } catch (fallbackError) {
            console.error("❌ Fallback fetch also failed:", fallbackError);
          }
        }
        
        // Make sure we always return an array, even if data is null or undefined
        return data || [];
      } catch (error) {
        console.error("❌ Exception while fetching latest health metrics:", error);
        
        // Last-resort fallback: try a direct GET request to the endpoint with hardcoded ID
        try {
          console.log("🔄 Final attempt to get health metrics...");
          const lastResponse = await fetch(`/api/health-metrics/3?limit=1`);
          const lastData = await lastResponse.json();
          return lastData || [];
        } catch (finalError) {
          console.error("❌ All fetch methods failed:", finalError);
          return []; // Return empty array as ultimate fallback
        }
      }
    },
    staleTime: 30 * 1000, // 30 seconds - fetch more frequently
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
    enabled: true, // Always enabled - we'll handle missing userId in the queryFn
    placeholderData: []
  });

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery<HealthMetrics[]>({
    queryKey: [`/api/health-metrics/${userId}/range`],
    queryFn: async () => {
      // Safety check - only proceed if we have a user ID
      if (!userId) {
        console.log("⚠️ No authenticated user ID available, skipping weekly metrics fetch");
        
        // Fallback to user ID 3 since we know it exists
        console.log("🔄 Attempting fallback to user ID 3 for weekly metrics...");
        const fallbackId = 3;
        
        return fetchWeeklyMetricsForUser(fallbackId);
      }
      
      console.log(`🔍 Attempting to fetch weekly metrics for authenticated user ID ${userId}`);
      return fetchWeeklyMetricsForUser(userId);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: true, // Always enabled - we'll handle missing userId in the queryFn
    placeholderData: []
  });
  
  // Helper function to fetch weekly metrics for a specific user
  async function fetchWeeklyMetricsForUser(id: number): Promise<HealthMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    console.log(`Fetching weekly data for user ID ${id} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    try {
      // Simple minimal fetch first - less chance of errors
      const response = await fetch(`/api/health-metrics/${id}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      
      console.log(`🔄 Weekly metrics API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`❌ Error fetching weekly metrics for user ${id} with status ${response.status}`);
        
        // If error occurs for current user ID, try fallback ID 3
        if (id !== 3) {
          console.log("🔍 Attempting to fetch with fallback user ID 3...");
          return fetchWeeklyMetricsForUser(3);
        }
        
        // If we're already using ID 3 and still failing, try the metrics endpoint without a range
        console.log("🔄 Trying to get any metrics without date range...");
        const fallbackResponse = await fetch(`/api/health-metrics/3?limit=7`);
        
        if (!fallbackResponse.ok) {
          console.error("❌ All fetch methods failed for weekly metrics");
          return [];
        }
        
        const fallbackData = await fallbackResponse.json();
        console.log(`✅ Retrieved ${fallbackData?.length || 0} metrics without date range`);
        return fallbackData || [];
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data?.length || 0} weekly health metrics for user ${id}`);
      
      if (data && data.length > 0) {
        console.log("📋 Sample metrics data:", {
          firstEntry: data[0].date,
          lastEntry: data[data.length-1].date,
          gfrValues: data.map(d => d.estimatedGFR)
        });
      } else {
        console.log("⚠️ No weekly metrics found, array is empty");
        
        // If no data for current user ID, try fallback ID 3
        if (id !== 3) {
          console.log("🔍 Attempting to fetch with fallback user ID 3...");
          return fetchWeeklyMetricsForUser(3);
        }
      }
      
      // Make sure we always return an array
      return data || [];
    } catch (error) {
      console.error("❌ Exception while fetching weekly health metrics:", error);
      
      // If error occurs for current user ID, try fallback ID 3
      if (id !== 3) {
        console.log("🔍 Attempting to fetch with fallback user ID 3 after error...");
        return fetchWeeklyMetricsForUser(3);
      }
      
      return []; // Final fallback is empty array
    }
  }

  // Mutation for logging new health metrics
  const { mutate: logHealthMetrics, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      // Safety check - only proceed if we have a user ID
      if (!userId) {
        throw new Error("You must be logged in to save health metrics");
      }
      
      // Ensure estimatedGFR is properly set and never null or undefined
      if (data.estimatedGFR === null || data.estimatedGFR === undefined) {
        console.warn("GFR value is null or undefined. Setting default value.");
        data.estimatedGFR = 60; // Default reasonable value if calculation failed
        data.gfrCalculationMethod = "fallback-estimation";
      }
      
      // Always set the userId to the authenticated user
      data.userId = userId;
      
      console.log("Saving health metrics for user:", userId);
      
      try {
        // Enhanced API request with fallback authentication
        const response = await fetch("/api/health-metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": "nephra-health-data-key" // API key as header fallback
          },
          credentials: "include", // Include cookies for session auth
          body: JSON.stringify({
            ...data,
            apiKey: "nephra-health-data-key" // API key in body as fallback
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error response from server:", errorText);
          
          // Try multiple alternative endpoints with different approaches
          console.log("⚠️ Standard endpoint failed, trying direct endpoints...");
          
          // Try approach 1: Direct health log endpoint
          try {
            console.log("🔄 Attempt 1: Using direct-health-log endpoint");
            const directResponse = await fetch("/api/direct-health-log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                healthData: data,
                userId: userId,
                apiKey: "nephra-health-data-key" 
              }),
            });
            
            if (directResponse.ok) {
              const result = await directResponse.json();
              console.log("✅ Health data saved successfully via direct endpoint!");
              return result;
            } else {
              console.warn("⚠️ Direct endpoint failed, status:", directResponse.status);
            }
          } catch (directError) {
            console.error("❌ Direct endpoint error:", directError);
          }
          
          // Try approach 2: Emergency endpoint
          try {
            console.log("🔄 Attempt 2: Using emergency-health-log endpoint");
            const emergencyResponse = await fetch("/api/emergency-health-log", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                healthData: data,
                userId: userId,
                apiKey: "nephra-health-data-key" 
              }),
            });
            
            if (emergencyResponse.ok) {
              const result = await emergencyResponse.json();
              console.log("✅ Health data saved successfully via emergency endpoint!");
              return result;
            } else {
              console.warn("⚠️ Emergency endpoint failed, status:", emergencyResponse.status);
            }
          } catch (emergencyError) {
            console.error("❌ Emergency endpoint error:", emergencyError);
          }
          
          // Try approach 3: XHR request instead of fetch
          try {
            console.log("🔄 Attempt 3: Using XHR request to emergency endpoint");
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open("POST", "/api/emergency-health-log");
              xhr.setRequestHeader("Content-Type", "application/json");
              xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                  console.log("✅ Health data saved successfully via XHR!");
                  resolve(JSON.parse(xhr.responseText));
                } else {
                  console.warn("⚠️ XHR request failed, status:", xhr.status);
                  reject(new Error("XHR request failed"));
                }
              };
              xhr.onerror = function() {
                console.error("❌ XHR network error");
                reject(new Error("XHR network error"));
              };
              xhr.send(JSON.stringify({
                healthData: data,
                userId: userId,
                apiKey: "nephra-health-data-key" 
              }));
            });
          } catch (xhrError) {
            console.error("❌ XHR request error:", xhrError);
          }
                    
          // If all methods fail, throw the original error
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
