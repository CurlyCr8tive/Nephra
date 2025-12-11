import { useState, useEffect } from "react";
import { HealthMetrics, InsertHealthMetrics } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  
  // SECURITY: Only use authenticated user context, absolutely NO fallbacks
  // This prevents any possibility of cross-user data access
  const getSecureUserId = (): number | null => {
    // CRITICAL: Only return user ID if we have a fully authenticated user
    if (userId && !isUserLoading) {
      return userId;
    }
    return null;
  };
  
  // SECURITY: Only use fully authenticated user ID, no fallbacks whatsoever
  const effectiveUserId = getSecureUserId();
  
  // Note: isUserLoading comes from useUser() context above

  // Get the latest health metrics for the current user
  const { data: latestMetricsArray, isLoading: isLoadingLatest } = useQuery<HealthMetrics[] | undefined>({
    // SECURITY: Never use fallback strings in query keys - only authenticated user ID
    queryKey: effectiveUserId ? [`health-metrics`, effectiveUserId, 'latest'] : ['no-user-authenticated'],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const response = await fetch(`/api/health-metrics/${effectiveUserId}?limit=1`, { 
        credentials: "include",
        cache: "no-store"
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch health metrics: ${response.status}`);
      }
      
      return response.json() as Promise<HealthMetrics[]>;
    },
    staleTime: 30 * 1000, // 30 seconds - fetch more frequently
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3, // Retry failed requests 3 times
    enabled: !!effectiveUserId && !isUserLoading, // SECURITY: Only enabled if we have authenticated user
    placeholderData: []
  });

  // Extract first item from array for single-object components that need the latest metrics
  const latestMetrics = latestMetricsArray?.[0] ?? null;

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery<HealthMetrics[] | undefined>({
    // SECURITY: Only use authenticated user ID in query key
    queryKey: effectiveUserId ? [`health-metrics`, effectiveUserId, 'range'] : ['no-user-authenticated-range'],
    queryFn: async () => {
      if (!effectiveUserId) return [];
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
  const fetchWeeklyMetricsForUser = async (id: number): Promise<HealthMetrics[]> => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 30 days of historical data
    
    const response = await fetch(
      `/api/health-metrics/${id}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
      { credentials: "include" }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch weekly metrics: ${response.status}`);
    }
    
    return response.json() as Promise<HealthMetrics[]>;
  };

  // Mutation for logging new health metrics
  const { mutate: logHealthMetrics, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      const secureUserId = getSecureUserId();
      
      if (!secureUserId) {
        throw new Error("You must be logged in to save health metrics");
      }
      
      // Ensure estimatedGFR is properly set
      if (data.estimatedGFR === null || data.estimatedGFR === undefined) {
        data.estimatedGFR = 60;
        data.gfrCalculationMethod = "fallback-estimation";
      }
      
      data.userId = secureUserId;
      
      const response = await fetch("/api/health-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }
      
      return response.json() as Promise<HealthMetrics>;
    },
    onSuccess: (data) => {
      if (effectiveUserId) {
        queryClient.invalidateQueries({
          predicate: (query) => {
            const [key, id] = query.queryKey;
            return key === 'health-metrics' && id === effectiveUserId;
          }
        });
      }
      
      setTodayMetrics(data);
      
      toast({
        title: "Health data logged",
        description: "Your health data has been successfully logged.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error logging health data",
        description: error.message || "Failed to log health data. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process latest metrics when they change - moved to useEffect to avoid side effects in render
  useEffect(() => {
    if (latestMetrics && !todayMetrics) {
      const today = new Date();
      const latestDate = new Date(latestMetrics.date || "");
      
      const isToday = latestDate &&
        today.getFullYear() === latestDate.getFullYear() &&
        today.getMonth() === latestDate.getMonth() &&
        today.getDate() === latestDate.getDate();
      
      if (isToday) {
        setTodayMetrics(latestMetrics);
      }
    }
  }, [latestMetrics, todayMetrics]);

  // Combine loading states for better component handling
  const isLoading = isUserLoading || isLoadingLatest || isLoadingWeekly;
  
  return {
    latestMetrics,
    weeklyMetrics: weeklyMetrics || [],
    todayMetrics,
    isLoadingLatest,
    isLoadingWeekly,
    logHealthMetrics,
    isLogging,
    isLoading,
  };
}
