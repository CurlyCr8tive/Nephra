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
        // Output auth status
        console.log(`📊 Auth status for health metrics request: ${document.cookie.includes('connect.sid') ? 'Has session cookie' : 'No session cookie'}`);
        
        // Make a fetch call with credentials and fallback API key
        // This uses the multi-auth approach that works with or without cookies
        const response = await fetch(
          `/api/health-metrics/${userId}?limit=1&apiKey=nephra-health-data-key`, 
          { 
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-API-Key': 'nephra-health-data-key' // API key also sent in header as fallback
            }
          }
        );
        
        console.log(`🔄 Health metrics API response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Error fetching latest metrics for user ${userId}:`, errorText);
          
          // Log details about the request for debugging
          console.error(`Request details: GET /api/health-metrics/${userId}?limit=1`);
          
          return []; // Return empty array instead of throwing
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
          console.log("⚠️ No health metrics found for this user. Adding a test log would help.");
          
          // Output a structured log about the empty data
          console.warn({
            issue: "missing_health_data",
            userId: userId,
            endpoint: `/api/health-metrics/${userId}?limit=1`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Make sure we always return an array, even if data is null or undefined
        return data || [];
      } catch (error) {
        console.error("❌ Exception while fetching latest health metrics:", error);
        // Return empty array instead of throwing to prevent UI errors
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: !!userId, // Only enabled when we have a valid user ID
    placeholderData: []
  });

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery<HealthMetrics[]>({
    queryKey: [`/api/health-metrics/${userId}/range`],
    queryFn: async () => {
      // Safety check - only proceed if we have a user ID
      if (!userId) {
        console.log("No authenticated user ID available, skipping weekly metrics fetch");
        return [];
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      console.log(`Fetching data for authenticated user ID ${userId} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      try {
        const response = await fetch(
          `/api/health-metrics/${userId}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}&apiKey=nephra-health-data-key`,
          { 
            credentials: "include",
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'X-API-Key': 'nephra-health-data-key' // API key also sent in header as fallback
            }
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error fetching weekly metrics:", errorText);
          return []; // Return empty array instead of throwing
        }
        
        const data = await response.json();
        console.log(`Retrieved ${data?.length || 0} health metrics for user ${userId}`);
        
        // Make sure we always return an array, even if data is null or undefined
        return data || [];
      } catch (error) {
        console.error("Exception while fetching health metrics:", error);
        // Return empty array instead of throwing to prevent UI errors
        return [];
      }
    },
    placeholderData: [],
    enabled: !!userId, // Only enabled when we have a valid user ID
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 1,
    staleTime: 60 * 1000, // 1 minute
  });

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
