import { useState } from "react";
import { EmotionalCheckIn, InsertEmotionalCheckIn } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UseEmotionalCheckInProps {
  userId: number;
}

export function useEmotionalCheckIn({ userId }: UseEmotionalCheckInProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [todayCheckIn, setTodayCheckIn] = useState<EmotionalCheckIn | null>(null);

  // Get the latest emotional check-in
  const { data: latestCheckIn, isLoading: isLoadingLatest } = useQuery({
    queryKey: [`/api/emotional-check-in/${userId}?limit=1`],
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
          setTodayCheckIn(data[0]);
        }
      }
    },
    enabled: !!userId,
  });

  // Get recent emotional check-ins
  const { data: recentCheckIns, isLoading: isLoadingRecent } = useQuery({
    queryKey: [`/api/emotional-check-in/${userId}?limit=5`],
    enabled: !!userId,
  });

  // Mutation for creating a new emotional check-in
  const { mutate: logEmotionalCheckIn, isPending: isLogging } = useMutation({
    mutationFn: async (data: InsertEmotionalCheckIn) => {
      const response = await apiRequest("POST", "/api/emotional-check-in", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [`/api/emotional-check-in/${userId}`]
      });
      
      setTodayCheckIn(data);
      
      toast({
        title: "Emotional check-in logged",
        description: "Your emotional check-in has been recorded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error logging emotional check-in",
        description: error.message || "Failed to log emotional check-in. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get all emotions for selection
  const emotionOptions = [
    { value: "great", label: "Great", emoji: "😃" },
    { value: "good", label: "Good", emoji: "🙂" },
    { value: "okay", label: "Okay", emoji: "😐" },
    { value: "down", label: "Down", emoji: "🙁" },
    { value: "stressed", label: "Stressed", emoji: "😫" },
  ];

  // Common emotion tags for selection
  const emotionTags = [
    { value: "anxious", label: "Anxious", color: "accent" },
    { value: "tired", label: "Tired", color: "neutral" },
    { value: "hopeful", label: "Hopeful", color: "primary" },
    { value: "frustrated", label: "Frustrated", color: "neutral" },
    { value: "optimistic", label: "Optimistic", color: "neutral" },
    { value: "worried", label: "Worried", color: "neutral" },
    { value: "grateful", label: "Grateful", color: "primary" },
    { value: "sad", label: "Sad", color: "neutral" },
    { value: "motivated", label: "Motivated", color: "primary" },
    { value: "confused", label: "Confused", color: "neutral" },
  ];

  return {
    latestCheckIn: latestCheckIn?.[0] || null,
    recentCheckIns,
    todayCheckIn,
    isLoadingLatest,
    isLoadingRecent,
    logEmotionalCheckIn,
    isLogging,
    emotionOptions,
    emotionTags,
  };
}
