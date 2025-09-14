import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { User } from "@shared/schema";
import { UnitSystem } from "@/components/UnitToggle";
import { useAuth } from "@/hooks/use-auth";

// SECURITY FIX: Only use sessionStorage for non-sensitive UI preferences
// Never store user data, health data, or identifying information in any browser storage
type StorageKey = 'nephra_unit_system'; // Only store non-sensitive UI preferences

// Helper function for session storage - ONLY for non-sensitive UI preferences
const saveUIPreference = (key: StorageKey, value: string) => {
  try {
    if (typeof window !== 'undefined') {
      // SECURITY: Only use sessionStorage for non-sensitive UI preferences
      // No localStorage to prevent cross-user data sharing
      window.sessionStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Error saving UI preference ${key}:`, e);
  }
};

const getUIPreference = (key: StorageKey): string | null => {
  try {
    if (typeof window !== 'undefined') {
      // SECURITY: Only check sessionStorage for UI preferences
      return window.sessionStorage.getItem(key);
    }
  } catch (e) {
    console.error(`Error getting UI preference ${key}:`, e);
  }
  return null;
};

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  error: Error | null;
  refreshUserData: () => void;
  forceUpdateGender: (gender: string) => void; // Function to explicitly set gender
  unitSystem: UnitSystem; // User's preferred unit system
  setUnitSystem: (system: UnitSystem) => void; // Function to update unit system preference
}

// Create context with default values to avoid undefined checks
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {
    console.warn("setUser called outside of UserProvider context. This operation won't have any effect.");
  },
  isLoading: false,
  error: null,
  refreshUserData: () => {
    console.warn("refreshUserData called outside of UserProvider context. This operation won't have any effect.");
  },
  forceUpdateGender: () => {
    console.warn("forceUpdateGender called outside of UserProvider context. This operation won't have any effect.");
  },
  unitSystem: "metric", // Default to metric units
  setUnitSystem: () => {
    console.warn("setUnitSystem called outside of UserProvider context. This operation won't have any effect.");
  }
});

interface UserProviderProps {
  children: ReactNode;
  value?: Partial<UserContextType>;
}

export function UserProvider({ children, value }: UserProviderProps) {
  // Use the simple auth system instead of making our own API calls
  const { user: authUser, isLoading: authLoading, error: authError } = useAuth();
  
  // Unit system preference state - SECURITY: Only store UI preferences, never user data
  const [unitSystem, setUnitSystemInternal] = useState<UnitSystem>(() => {
    // Try to use value from props first
    if (value?.unitSystem !== undefined) return value.unitSystem;
    
    // Otherwise check if we have a unit system preference in session storage
    const savedUnitSystem = getUIPreference('nephra_unit_system');
    if (savedUnitSystem && (savedUnitSystem === 'metric' || savedUnitSystem === 'imperial')) {
      console.log("Found saved unit system preference in session:", savedUnitSystem);
      return savedUnitSystem as UnitSystem;
    }
    
    // Default to metric if nothing found
    return "metric";
  });
  
  // Function to update unit system preference
  const setUnitSystem = useCallback((newUnitSystem: UnitSystem) => {
    console.log("Updating unit system preference to:", newUnitSystem);
    
    // Save to session storage for UI preference only
    saveUIPreference('nephra_unit_system', newUnitSystem);
    
    // Update state
    setUnitSystemInternal(newUnitSystem);
    
    // Could add server update here if we want to persist this in the user profile
  }, []);
  
  // Simple refresh function that doesn't make its own API calls
  const refreshUserData = useCallback(() => {
    console.log("UserContext refresh requested - handled by simple auth system");
    // The simple auth system handles refreshing automatically via React Query
  }, []);
  
  // SECURITY FIX: Gender update function - no localStorage storage
  const forceUpdateGender = useCallback((genderValue: string) => {
    console.log("🔄 Forcing gender update to:", genderValue);
    
    // SECURITY: Never store sensitive user data in browser storage
    // All gender data must come from and be stored on the server only
    
    // Update on the server if we have a user
    if (authUser?.id) {
      console.log("🔼 Sending gender update to server for user ID:", authUser.id);
      
      // Fire and forget server update
      fetch(`/api/users/${authUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gender: genderValue }),
      })
      .then(response => {
        if (response.ok) {
          console.log("✅ Server gender update successful");
        } else {
          console.error("❌ Server gender update failed:", response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log("📥 Server response:", data);
      })
      .catch(error => {
        console.error("⚠️ Error updating gender on server:", error);
      });
    }
  }, [authUser]);
  
  // SECURITY FIX: No localStorage usage for gender data
  // All user data including gender must come from authenticated server sessions only
  useEffect(() => {
    if (authUser && (!authUser.gender || authUser.gender === '')) {
      console.log("User missing gender data - should be updated via server profile update");
      // No localStorage fallback - all data must come from server
    }
    // No storing of gender data in browser storage
  }, [authUser, forceUpdateGender]);

  const contextValue: UserContextType = {
    user: value?.user !== undefined ? value.user : authUser,
    setUser: value?.setUser || (() => console.log("setUser: Using simple auth system - no direct user setting")),
    isLoading: authLoading,
    error: authError,
    refreshUserData,
    forceUpdateGender,
    unitSystem: value?.unitSystem !== undefined ? value.unitSystem : unitSystem,
    setUnitSystem: value?.setUnitSystem || setUnitSystem
  };
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}
