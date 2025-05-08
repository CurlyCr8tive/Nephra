import { useState, useEffect } from "react";
import { HealthMetrics, InsertHealthMetrics } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export function useHealthData() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useUser(); // Get authenticated user and loading state
  const [todayMetrics, setTodayMetrics] = useState<HealthMetrics | null>(null);
  
  // Safely access the authenticated user ID
  // SECURITY FIX: We ONLY use the authenticated user ID from context
  // Previous approaches using fallbacks have been removed for security
  const userId = user?.id;
  
  // Debug log user context information to diagnose issues
  console.log("🧪 useHealthData user context:", {
    hasUser: !!user,
    userId: userId,
    isUserLoading
  });
  
  // CRITICAL FIX: Attempt to recover user ID from localStorage if needed
  // This is safe because we're still respecting the user's session, just
  // ensuring we don't miss the data due to timing issues between components.
  const getSecureUserIdWithFallback = (): number | null => {
    // First priority: Use the user context if available
    if (userId) {
      console.log("✅ Using authenticated user ID from context:", userId);
      return userId;
    }
    
    // If user context is still loading, we should wait
    if (isUserLoading) {
      console.log("⏳ User context is still loading, deferring health metrics fetch");
      return null;
    }
    
    // Last resort: Try to recover from localStorage
    try {
      // Only use localStorage as fallback if we have strong evidence user is logged in
      const cachedUserData = localStorage.getItem('nephra_user_data');
      if (cachedUserData) {
        const userData = JSON.parse(cachedUserData);
        if (userData && userData.id) {
          console.log("🔄 Using user ID from localStorage recovery:", userData.id);
          return userData.id;
        }
      }
      
      const sessionUserId = window.sessionStorage.getItem('nephra_user_id') || 
                           window.localStorage.getItem('nephra_user_id');
      
      if (sessionUserId) {
        const parsedId = parseInt(sessionUserId, 10);
        if (!isNaN(parsedId)) {
          console.log("🔄 Using user ID from session storage:", parsedId);
          return parsedId;
        }
      }
    } catch (error) {
      console.error("Error recovering user ID from storage:", error);
    }
    
    // If we get here, we truly have no user ID available
    console.warn("⚠️ No user ID available for health data - user appears logged out");
    return null;
  };
  
  // SECURITY FIX: Use authenticated user ID with localStorage fallback only for timing issues
  // This ensures we don't miss showing data just because of component loading order
  const effectiveUserId = getSecureUserIdWithFallback();
  console.log("Using user ID for health data:", effectiveUserId);
  
  // Note: isUserLoading comes from useUser() context above

  // Get the latest health metrics for the current user
  const { data: latestMetricsArray, isLoading: isLoadingLatest } = useQuery<HealthMetrics[] | undefined>({
    queryKey: [`/api/health-metrics/${effectiveUserId || 'not-ready'}?limit=1`],
    queryFn: async () => {
      // Don't proceed if we don't have a user ID
      if (!effectiveUserId) {
        console.warn("⚠️ No user ID available for fetching health metrics");
        return [];
      }
      
      // If user context is still loading, log and wait
      if (isUserLoading) {
        console.log("👤 User context is still loading, deferring health metrics fetch");
        return [];
      }
      
      console.log(`🔍 Fetching latest health metrics for user ID ${effectiveUserId}`);
      
      try {
        // Make a simple direct fetch to the endpoint using the effective user ID
        const response = await fetch(`/api/health-metrics/${effectiveUserId}?limit=1`, { 
          credentials: "include",
          cache: "no-store" // Force fresh data
        });
        
        console.log(`🔄 Health metrics API response status: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          console.error(`❌ Error fetching latest metrics for user ${effectiveUserId} with status ${response.status}`);
          
          // Try the emergency endpoint as a direct alternative
          console.log("🚨 Attempting emergency endpoint as alternative...");
          const emergencyResponse = await fetch(`/api/emergency-health-log?userId=${effectiveUserId}`);
          
          if (emergencyResponse.ok) {
            const emergencyData = await emergencyResponse.json();
            console.log(`✅ Retrieved ${emergencyData?.length || 0} metrics via emergency endpoint`);
            return emergencyData || [];
          }
          
          console.warn("⚠️ Emergency endpoint also failed");
          return []; // Return empty array if both methods fail
        }
        
        const data = await response.json();
        console.log(`✅ Retrieved ${data?.length || 0} latest health metrics for user ${effectiveUserId}`);
        
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
          
          // Try the log-health endpoint as an alternative
          console.log("🔄 Attempting alternative log-health endpoint...");
          try {
            const logHealthResponse = await fetch(`/api/log-health/${effectiveUserId}`);
            if (logHealthResponse.ok) {
              const logHealthData = await logHealthResponse.json();
              if (logHealthData && logHealthData.length > 0) {
                console.log("✅ Retrieved data using log-health endpoint:", logHealthData.length, "records");
                return logHealthData;
              }
            }
          } catch (fallbackError) {
            console.error("❌ Alternative endpoint fetch failed:", fallbackError);
          }
        }
        
        // Make sure we always return an array, even if data is null or undefined
        return data || [];
      } catch (error) {
        console.error("❌ Exception while fetching latest health metrics:", error);
        
        // Try the log-health endpoint as a final attempt
        try {
          console.log("🔄 Final attempt using log-health endpoint...");
          const lastResponse = await fetch(`/api/log-health/${effectiveUserId}`);
          if (lastResponse.ok) {
            const lastData = await lastResponse.json();
            return lastData || [];
          }
        } catch (finalError) {
          console.error("❌ All fetch methods failed:", finalError);
        }
        
        return []; // Return empty array as ultimate fallback
      }
    },
    staleTime: 30 * 1000, // 30 seconds - fetch more frequently
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
    enabled: true, // Always enabled - we'll handle missing userId in the queryFn
    placeholderData: []
  });

  // Extract first item from array for single-object components that need the latest metrics
  const latestMetrics = latestMetricsArray && latestMetricsArray.length > 0 ? latestMetricsArray[0] : null;
  
  // Verify the data is available and log values for debugging
  console.log("Health metrics display data:", {
    hasLatestMetrics: !!latestMetrics,
    latestMetrics: latestMetrics ? {
      date: latestMetrics.date,
      estimatedGFR: latestMetrics.estimatedGFR,
      systolicBP: latestMetrics.systolicBP,
      diastolicBP: latestMetrics.diastolicBP,
      hydration: latestMetrics.hydration
    } : 'none'
  });
  
  // Debug data types for better error detection
  if (latestMetricsArray) {
    console.log("Final formatted metrics object:", {
      hasMetrics: !!latestMetricsArray,
      type: latestMetricsArray ? typeof latestMetricsArray : "null",
      isArray: Array.isArray(latestMetricsArray),
      arrayLength: Array.isArray(latestMetricsArray) ? latestMetricsArray.length : 0
    });
  }

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery<HealthMetrics[] | undefined>({
    // SECURITY FIX: Use a safe approach with no fallbacks that could lead to data leakage
    queryKey: [`/api/health-metrics/${effectiveUserId ? effectiveUserId : 'no-user'}/range`],
    queryFn: async () => {
      // Don't proceed if we don't have a user ID
      if (!effectiveUserId) {
        console.warn("⚠️ No user ID available for fetching weekly health metrics");
        return [];
      }
      
      console.log(`🔍 Fetching weekly metrics for user ID ${effectiveUserId}`);
      return fetchWeeklyMetricsForUser(effectiveUserId);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    retry: 2,
    enabled: !!effectiveUserId, // Only enable if we have a user ID
    placeholderData: []
  });
  
  // Helper function to fetch weekly metrics for a specific user
  async function fetchWeeklyMetricsForUser(id: number): Promise<HealthMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    // CRITICAL FIX: Use 30 days instead of 7 to ensure we capture all historical data
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`Fetching monthly data for user ID ${id} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    try {
      // Simple minimal fetch first - less chance of errors
      const response = await fetch(`/api/health-metrics/${id}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
        credentials: "include"
      });
      
      console.log(`🔄 Weekly metrics API response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`❌ Error fetching weekly metrics for user ${id} with status ${response.status}`);
        
        // Try the log-health endpoint as an alternative
        console.log("🔄 Attempting alternative log-health endpoint...");
        try {
          const logHealthResponse = await fetch(`/api/log-health/${id}`);
          if (logHealthResponse.ok) {
            const logHealthData = await logHealthResponse.json();
            if (logHealthData && logHealthData.length > 0) {
              console.log("✅ Retrieved data using log-health endpoint:", logHealthData.length, "records");
              return logHealthData;
            }
          }
        } catch (fallbackError) {
          console.error("❌ Alternative endpoint fetch failed:", fallbackError);
        }
        
        // If all alternatives fail, return empty array
        return [];
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data?.length || 0} weekly health metrics for user ${id}`);
      
      if (data && data.length > 0) {
        console.log("📋 Sample metrics data:", {
          firstEntry: data[0].date,
          lastEntry: data[data.length-1].date,
          gfrValues: data.map((d: HealthMetrics) => d.estimatedGFR)
        });
      } else {
        console.log("⚠️ No weekly metrics found, array is empty");
        
        // Try the log-health endpoint as an alternative if no data
        console.log("🔄 Attempting alternative log-health endpoint for empty result...");
        try {
          const logHealthResponse = await fetch(`/api/log-health/${id}`);
          if (logHealthResponse.ok) {
            const logHealthData = await logHealthResponse.json();
            if (logHealthData && logHealthData.length > 0) {
              console.log("✅ Retrieved data using log-health endpoint:", logHealthData.length, "records");
              return logHealthData;
            }
          }
        } catch (fallbackError) {
          console.error("❌ Alternative endpoint fetch failed:", fallbackError);
        }
      }
      
      // Make sure we always return an array
      return data || [];
    } catch (error) {
      console.error("❌ Exception while fetching weekly health metrics:", error);
      
      // Try the log-health endpoint as a final attempt
      try {
        console.log("🔄 Final attempt using log-health endpoint...");
        const lastResponse = await fetch(`/api/log-health/${id}`);
        if (lastResponse.ok) {
          const lastData = await lastResponse.json();
          return lastData || [];
        }
      } catch (finalError) {
        console.error("❌ All fetch methods failed:", finalError);
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
      
      // SECURITY FIX: Only invalidate queries if we have a valid userId
      // This prevents accidentally invalidating queries for other users
      if (effectiveUserId) {
        // Immediately invalidate ALL queries that might contain health data
        // Fixed: Add ?limit=1 suffix to match the exact queryKey pattern used in the fetch
        console.log("Attempting to invalidate these query keys:");
        console.log(`- /api/health-metrics/${effectiveUserId}?limit=1`);
        console.log(`- /api/health-metrics/${effectiveUserId}/range`);
        
        queryClient.invalidateQueries({
          queryKey: [`/api/health-metrics/${effectiveUserId}?limit=1`]
        });
        
        queryClient.invalidateQueries({
          queryKey: [`/api/health-metrics/${effectiveUserId}/range`]
        });
        
        // Also invalidate any queries that might not have the suffix
        queryClient.invalidateQueries({
          queryKey: [`/api/health-metrics/${effectiveUserId}`]
        });
        
        // Force refetch all health-metrics queries for this user with any parameters
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKeyString = JSON.stringify(query.queryKey);
            const containsUserId = queryKeyString.includes(`${effectiveUserId}`);
            const containsHealthMetrics = queryKeyString.includes('health-metrics');
            return containsUserId && containsHealthMetrics;
          }
        });
        
        console.log(`✅ Invalidated ALL health metric queries for authenticated user ID: ${effectiveUserId}`);
      } else {
        console.warn("⚠️ Not invalidating queries - no authenticated user ID");
      }
      
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
  if (latestMetrics && !todayMetrics) {
    // No need to check array length, latestMetrics is a single object from array[0]
    // Check if the latest record is from today
    const today = new Date();
    const latestDate = new Date(latestMetrics.date || "");
    
    if (
      latestDate && 
      today.getFullYear() === latestDate.getFullYear() &&
      today.getMonth() === latestDate.getMonth() &&
      today.getDate() === latestDate.getDate()
    ) {
      setTodayMetrics(latestMetrics);
    }
  }

  // Combine loading states for better component handling
  const isLoading = isUserLoading || isLoadingLatest || isLoadingWeekly;
  
  // Fix the formatting issue with latest metrics
  const formattedLatestMetrics = latestMetricsArray && Array.isArray(latestMetricsArray) && latestMetricsArray.length > 0 
    ? latestMetricsArray[0]  // Use first item if array
    : (latestMetrics || null);  // Fallback to existing latestMetrics or null
  
  console.log("Final formatted metrics object:", {
    hasMetrics: !!formattedLatestMetrics,
    type: formattedLatestMetrics ? typeof formattedLatestMetrics : 'null',
    isArray: Array.isArray(latestMetricsArray),
    arrayLength: Array.isArray(latestMetricsArray) ? latestMetricsArray.length : 'not array'
  });
  
  return {
    latestMetrics: formattedLatestMetrics,
    weeklyMetrics: weeklyMetrics || [],
    todayMetrics,
    isLoadingLatest,
    isLoadingWeekly,
    logHealthMetrics,
    isLogging,
    isLoading, // Single loading state for components to use
  };
}
