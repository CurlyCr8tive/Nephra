import { useState } from "react";
import { HealthMetrics, InsertHealthMetrics } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseHealthDataProps {
  userId: number;
}

export function useHealthData({ userId }: UseHealthDataProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [todayMetrics, setTodayMetrics] = useState<HealthMetrics | null>(null);

  // Get the latest health metrics for a user
  const { data: latestMetrics, isLoading: isLoadingLatest } = useQuery({
    queryKey: [`/api/health-metrics/${userId}?limit=1`],
    onSuccess: (data) => {
      if (data && data.length > 0) {
        // Check if the latest record is from today
        const today = new Date();
        const latestDate = new Date(data[0].date);
        
        if (
          today.getFullYear() === latestDate.getFullYear() &&
          today.getMonth() === latestDate.getMonth() &&
          today.getDate() === latestDate.getDate()
        ) {
          setTodayMetrics(data[0]);
        }
      }
    },
    enabled: !!userId,
  });

  // Get a week of health metrics for trends
  const { data: weeklyMetrics, isLoading: isLoadingWeekly } = useQuery({
    queryKey: [`/api/health-metrics/${userId}/range`],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const response = await fetch(
        `/api/health-metrics/${userId}/range?start=${startDate.toISOString()}&end=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch weekly metrics");
      }
      
      return response.json();
    },
    enabled: !!userId,
  });

  // Mutation for logging new health metrics
  const { mutate: logHealthMetrics, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertHealthMetrics) => {
      const response = await apiRequest("POST", "/api/health-metrics", data);
      return response.json();
    },
    onSuccess: (data) => {
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
      toast({
        title: "Error logging health data",
        description: error.message || "Failed to log health data. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    latestMetrics: latestMetrics?.[0] || null,
    weeklyMetrics,
    todayMetrics,
    isLoadingLatest,
    isLoadingWeekly,
    logHealthMetrics,
    isLogging,
  };
}
