import { createContext, useContext, ReactNode, useState, useCallback, useEffect } from "react";
import { User } from "@shared/schema";
import { UnitSystem } from "@/components/UnitToggle";
import { useAuth } from "@/hooks/use-auth";

type StorageKey = 'nephra_user_gender' | 'nephra_user_id' | 'nephra_last_refresh' | 'nephra_unit_system';

// Helper functions for session storage to maintain critical data between page loads
const saveToStorage = (key: StorageKey, value: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
      window.localStorage.setItem(key, value); // Also save to localStorage for persistence
    }
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
};

const getFromStorage = (key: StorageKey): string | null => {
  try {
    if (typeof window !== 'undefined') {
      // Try session first, fall back to local
      const sessionValue = window.sessionStorage.getItem(key);
      if (sessionValue) return sessionValue;
      
      // Check localStorage as backup
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.error(`Error getting ${key} from storage:`, e);
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
  
  // Unit system preference state
  const [unitSystem, setUnitSystemInternal] = useState<UnitSystem>(() => {
    // Try to use value from props first
    if (value?.unitSystem !== undefined) return value.unitSystem;
    
    // Otherwise check if we have a unit system preference in storage
    const savedUnitSystem = getFromStorage('nephra_unit_system');
    if (savedUnitSystem && (savedUnitSystem === 'metric' || savedUnitSystem === 'imperial')) {
      console.log("Found saved unit system preference in storage:", savedUnitSystem);
      return savedUnitSystem as UnitSystem;
    }
    
    // Default to metric if nothing found
    return "metric";
  });
  
  // Function to update unit system preference
  const setUnitSystem = useCallback((newUnitSystem: UnitSystem) => {
    console.log("Updating unit system preference to:", newUnitSystem);
    
    // Save to storage for persistence
    saveToStorage('nephra_unit_system', newUnitSystem);
    
    // Update state
    setUnitSystemInternal(newUnitSystem);
    
    // Could add server update here if we want to persist this in the user profile
  }, []);
  
  // Simple refresh function that doesn't make its own API calls
  const refreshUserData = useCallback(() => {
    console.log("UserContext refresh requested - handled by simple auth system");
    // The simple auth system handles refreshing automatically via React Query
  }, []);
  
  // Implement the force update gender function
  const forceUpdateGender = useCallback((genderValue: string) => {
    console.log("🔄 Forcing gender update to:", genderValue);
    
    // First, save to session storage as backup
    if (genderValue) {
      saveToStorage('nephra_user_gender', genderValue);
    }
    
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
  
  // Load gender from session storage if we have a user but missing gender
  useEffect(() => {
    if (authUser && (!authUser.gender || authUser.gender === '')) {
      const savedGender = getFromStorage('nephra_user_gender');
      if (savedGender) {
        console.log("Restoring gender from session storage:", savedGender);
        forceUpdateGender(savedGender);
      }
    } else if (authUser && authUser.gender) {
      // We have a gender, save it to session storage
      saveToStorage('nephra_user_gender', authUser.gender);
    }
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
