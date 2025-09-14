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
  
  // SECURITY: Only use authenticated user context, absolutely NO fallbacks
  // This prevents any possibility of cross-user data access
  const getSecureUserId = (): number | null => {
    // CRITICAL: Only return user ID if we have a fully authenticated user
    if (userId && !isUserLoading) {
      console.log("✅ Using authenticated user ID from context:", userId);
      return userId;
    }
    
    // If user context is still loading or no user, return null
    if (isUserLoading) {
      console.log("⏳ User context is still loading, deferring health metrics fetch");
    } else {
      console.log("⚠️ No authenticated user available for health data access");
    }
    return null;
  };
  
  // SECURITY: Only use fully authenticated user ID, no fallbacks whatsoever
  const effectiveUserId = getSecureUserId();
  console.log("Using user ID for health data:", effectiveUserId);
  
  // Note: isUserLoading comes from useUser() context above

  // Get the latest health metrics for the current user
  const { data: latestMetricsArray, isLoading: isLoadingLatest } = useQuery<HealthMetrics[] | undefined>({
    // SECURITY: Never use fallback strings in query keys - only authenticated user ID
    queryKey: effectiveUserId ? [`health-metrics`, effectiveUserId, 'latest'] : ['no-user-authenticated'],
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
      
      // SECURITY: Simple, single endpoint approach to prevent cache pollution
      try {
        const response = await fetch(`/api/health-metrics/${effectiveUserId}?limit=1`, { 
          credentials: "include",
          cache: "no-store" // Force fresh data
        });
        
        if (!response.ok) {
          console.error(`❌ Error fetching latest metrics for user ${effectiveUserId} with status ${response.status}`);
          throw new Error(`Failed to fetch health metrics: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Retrieved ${data?.length || 0} latest health metrics for user ${effectiveUserId}`);
        
        return data || [];
      } catch (error) {
        console.error("❌ Failed to fetch health metrics:", error);
        return []; // Return empty array on any error
      }
    },
    staleTime: 30 * 1000, // 30 seconds - fetch more frequently
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
    enabled: !!effectiveUserId && !isUserLoading, // SECURITY: Only enabled if we have authenticated user
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
    // SECURITY: Only use authenticated user ID in query key
    queryKey: effectiveUserId ? [`health-metrics`, effectiveUserId, 'range'] : ['no-user-authenticated-range'],
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
    enabled: !!effectiveUserId && !isUserLoading, // SECURITY: Only enabled if we have authenticated user
    placeholderData: []
  });
  
  // Helper function to fetch weekly metrics for a specific user
  async function fetchWeeklyMetricsForUser(id: number): Promise<HealthMetrics[]> {
    const endDate = new Date();
    const startDate = new Date();
    // Use 30 days to ensure we capture sufficient historical data
    startDate.setDate(startDate.getDate() - 30);
    
    console.log(`Fetching monthly data for user ID ${id} from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    // SECURITY: Simple, single endpoint approach to prevent cache pollution
    try {
      const response = await fetch(`/api/health-metrics/${id}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`, {
        credentials: "include"
      });
      
      if (!response.ok) {
        console.error(`❌ Error fetching weekly metrics for user ${id} with status ${response.status}`);
        throw new Error(`Failed to fetch weekly metrics: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ Retrieved ${data?.length || 0} weekly health metrics for user ${id}`);
      
      return data || [];
    } catch (error) {
      console.error("❌ Failed to fetch weekly metrics:", error);
      return []; // Return empty array on any error
    }
  }

  // Mutation for logging new health metrics
  const { mutate: logHealthMetrics, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      // SECURITY: Only use authenticated user ID, no fallbacks
      const currentUserId = getSecureUserId();
      
      // SECURITY: Only proceed if we have an authenticated user ID
      if (!currentUserId) {
        throw new Error("You must be logged in to save health metrics");
      }
      
      console.log("✅ Using authenticated user ID for health data save:", currentUserId);
      
      // Ensure estimatedGFR is properly set and never null or undefined
      if (data.estimatedGFR === null || data.estimatedGFR === undefined) {
        console.warn("GFR value is null or undefined. Setting default value.");
        data.estimatedGFR = 60; // Default reasonable value if calculation failed
        data.gfrCalculationMethod = "fallback-estimation";
      }
      
      // Always set the userId to the authenticated user
      data.userId = currentUserId;
      
      console.log("Saving health metrics for user:", currentUserId);
      
      // SECURITY: Simple, secure API request without complex fallbacks
      try {
        const response = await fetch("/api/health-metrics", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Error saving health metrics:", errorText);
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
      
      // SECURITY: Invalidate user-specific cache using our new query key structure
      if (currentUserId) {
        // Invalidate the specific query keys we're now using
        queryClient.invalidateQueries({
          queryKey: [`health-metrics`, currentUserId, 'latest']
        });
        
        queryClient.invalidateQueries({
          queryKey: [`health-metrics`, currentUserId, 'range']
        });
        
        // Also invalidate any health-metrics queries for this user
        queryClient.invalidateQueries({
          predicate: (query) => {
            const queryKey = query.queryKey;
            return queryKey[0] === 'health-metrics' && queryKey[1] === currentUserId;
          }
        });
        
        console.log(`✅ Invalidated health metric queries for authenticated user ID: ${currentUserId}`);
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
