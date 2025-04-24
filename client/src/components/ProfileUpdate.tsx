import { useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ProfileUpdateProps {
  gender?: string;
  onSuccess?: () => void;
}

const updateProfileOnServer = async (userId: number, data: { gender: string }) => {
  const response = await fetch(`/api/users/${userId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Failed to update profile");
  }

  return response.json();
};

// This component handles updating the gender both in local context and on the server
// It can be used anywhere in the app where gender might be set
export function ProfileUpdate({ gender, onSuccess }: ProfileUpdateProps) {
  const { user, forceUpdateGender } = useUser();
  const { toast } = useToast();

  // Mutation for updating the profile on the server
  const updateMutation = useMutation({
    mutationFn: (data: { gender: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      
      // Return the server update promise
      return updateProfileOnServer(user.id, data);
    },
    onSuccess: (data) => {
      console.log("Server profile update successful:", data);
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      // Call the success callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error: Error) => {
      console.error("Server profile update failed:", error);
      toast({
        title: "Update Failed",
        description: "Your profile could not be updated on the server: " + error.message,
        variant: "destructive",
      });
    }
  });

  // When gender is provided as a prop, update it immediately
  useEffect(() => {
    if (gender !== undefined && gender !== null) {
      console.log("ProfileUpdate: Updating gender to", gender);
      
      // First update it in the local context
      forceUpdateGender(gender);
      
      // Then try to update it on the server
      if (user?.id) {
        updateMutation.mutate({ gender });
      } else {
        console.log("User not authenticated, only updating locally");
      }
    }
  }, [gender, user?.id, forceUpdateGender, updateMutation]);

  // This is an invisible component, it doesn't render anything
  return null;
}

// Utility function to normalize gender strings for consistent storage and use
export function normalizeGenderString(gender: string | null | undefined): string | null {
  if (!gender) return null;
  
  const normalized = gender.toLowerCase().trim();
  
  // Map various forms to standardized values
  if (['female', 'f', 'woman', 'girl', 'feminine', 'mujer'].includes(normalized)) {
    return 'female';
  }
  
  if (['male', 'm', 'man', 'boy', 'masculine', 'hombre'].includes(normalized)) {
    return 'male';
  }
  
  // For other values, just return the original but trimmed
  return normalized || null;
}