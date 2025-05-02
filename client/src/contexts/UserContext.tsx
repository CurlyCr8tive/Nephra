import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { User } from "@shared/schema";
import { useLocation } from "wouter";
import { UnitSystem } from "@/components/UnitToggle";

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
  }
});

interface UserProviderProps {
  children: ReactNode;
  value?: Partial<UserContextType>;
}

export function UserProvider({ children, value }: UserProviderProps) {
  // Track current location to refresh data on route changes
  const [location] = useLocation();
  
  // Internal state management if not provided
  const [user, setUser] = useState<User | null>(() => {
    // Try to use value from props first
    if (value?.user !== undefined) return value.user;
    
    // Otherwise check if we have a user ID in storage
    const savedUserId = getFromStorage('nephra_user_id');
    if (savedUserId) {
      console.log("Found saved user ID in storage:", savedUserId);
    }
    
    return null;
  });
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch user data on mount and when forcedRefresh changes
  const [forcedRefresh, setForcedRefresh] = useState<number>(0);
  
  // Refresh on route changes if we have a user ID but no user data
  // Only refresh if we don't already have an ongoing request
  useEffect(() => {
    // Throttle refreshes and only do it if:
    // 1. We don't have user data
    // 2. We have a saved user ID (indicating we should be logged in)
    // 3. We are not already in a loading state
    if (!user && getFromStorage('nephra_user_id') && !isLoading) {
      console.log("Route changed, refreshing user data due to missing user object");
      
      // Check when we last refreshed to implement throttling
      const lastRefreshStr = getFromStorage('nephra_last_refresh');
      const now = Date.now();
      const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr) : 0;
      const timeSinceLastRefresh = now - lastRefresh;
      
      // Don't refresh more than once every 2 seconds (throttling)
      if (timeSinceLastRefresh < 2000) {
        console.log(`🛑 Throttling refresh (${Math.round(timeSinceLastRefresh)}ms since last refresh)`);
        return;
      }
      
      // Save current time as last refresh attempt
      saveToStorage('nephra_last_refresh', now.toString());
      
      // Wait a bit to avoid multiple rapid refreshes
      const timerId = setTimeout(() => {
        setForcedRefresh(prev => prev + 1);
      }, 200);
      return () => clearTimeout(timerId);
    }
  }, [location, user, isLoading]);
  
  // Expose the refresh function through context
  const refreshUserData = useCallback(() => {
    console.log("Forcing user data refresh in UserContext");
    
    // Track last refresh time
    saveToStorage('nephra_last_refresh', Date.now().toString());
    
    // Trigger refresh
    setForcedRefresh(prev => prev + 1);
  }, []);
  
  // Memoize the fetch user data function to avoid recreation on each render
  const fetchUserData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("Fetching user from API in UserContext...");
      
      const timestamp = Date.now(); // Add timestamp to prevent caching
      
      // Check if we need to recover a session
      const savedUserId = getFromStorage('nephra_user_id');
      const savedGenderBeforeFetch = getFromStorage('nephra_user_gender');
      
      if (savedGenderBeforeFetch) {
        console.log("Route changed - Found saved gender in storage:", savedGenderBeforeFetch);
      }
      
      const response = await fetch(`/api/user?t=${timestamp}`, {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log("User data fetched successfully in UserContext:", userData.username);
        
        // Save user ID to storage for persistence
        if (userData.id) {
          saveToStorage('nephra_user_id', userData.id.toString());
          
          // Save entire user object to localStorage for full persistence
          try {
            localStorage.setItem('nephra_user_data', JSON.stringify(userData));
            console.log("📦 Saved user data to localStorage during fetch");
          } catch (e) {
            console.error("Error saving user data to localStorage:", e);
          }
        }
        
        // CRITICAL: Enhanced gender handling - log debugging info
        console.log("User gender from API:", {
          hasGender: userData.gender !== null && userData.gender !== undefined,
          genderValue: userData.gender,
          genderType: typeof userData.gender
        });
        
        // ALWAYS check storage for a saved gender value
        const savedGender = getFromStorage('nephra_user_gender');
        
        if (savedGender) {
          console.log("📋 Found gender in storage:", savedGender);
          
          // If API returned no gender but we have one saved, use the saved value
          if (!userData.gender || userData.gender === '') {
            console.log("✓ Restoring missing gender from storage:", savedGender);
            userData.gender = savedGender;
          }
          // If API returned a different gender than what we have saved, log it
          else if (userData.gender !== savedGender) {
            console.log("⚠️ Gender mismatch - API:", userData.gender, "Storage:", savedGender);
            // Trust API value in this case, but log the discrepancy
          }
        } 
        // If we have no saved gender but have a user with gender already, preserve it
        else if (user && user.gender && (!userData.gender || userData.gender === '')) {
          console.log("✓ Preserving gender from previous user state:", user.gender);
          userData.gender = user.gender;
        }
        
        // ALWAYS save current gender to storage, even if it's the same
        // This ensures we have the most recent value and maintains persistence
        if (userData.gender && userData.gender !== '') {
          console.log("💾 Saving gender to storage:", userData.gender);
          saveToStorage('nephra_user_gender', userData.gender);
          
          // Double-check by reading it back immediately
          const verifyGender = getFromStorage('nephra_user_gender');
          console.log("✅ Verified gender in storage:", verifyGender);
        }
        
        setUser(userData);
        setError(null);
      } else if (response.status === 401) {
        // Not authenticated - expected case
        console.log("User not authenticated (401 response)");
        
        // No auto-login - this allows proper logout and returning to auth page
        setUser(null);
      } else {
        throw new Error(`Error fetching user: ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error in UserContext:", err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err : new Error(String(err)));
      
      // Try to recover from localStorage if server connection is lost
      if (err instanceof Error && 
          (err.message.includes("Failed to fetch") || 
           err.message.includes("Network error") || 
           err.message.includes("Bad Gateway"))) {
        console.log("🔄 Network error detected, attempting recovery from localStorage");
        
        try {
          // Try to load cached user data from localStorage
          const cachedUserData = localStorage.getItem('nephra_user_data');
          const savedUserId = getFromStorage('nephra_user_id');
          const savedGender = getFromStorage('nephra_user_gender');
          
          if (cachedUserData) {
            const userData = JSON.parse(cachedUserData);
            console.log("🔄 Recovered user data from cache:", userData.username);
            
            // Make sure gender is preserved from separate storage
            if (savedGender && (!userData.gender || userData.gender === '')) {
              userData.gender = savedGender;
            }
            
            // Set recovered user data
            setUser(userData);
            console.log("🔄 User session recovered from localStorage cache");
            return; // Skip clearing user state
          } else if (savedUserId && user) {
            // If we have user ID but no cached data, preserve current user
            console.log("🔄 Preserving current user session during network error");
            return; // Skip clearing user state
          }
        } catch (cacheError) {
          console.error("Error recovering from cache:", cacheError);
        }
      }
      
      // Only clear user state if recovery failed
      console.log("Network error in UserContext, clearing user state");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Fetch user data on mount if not provided externally
  useEffect(() => {
    // Check if we're on the auth page with forceLogin
    const isForceLoginAuth = window.location.pathname === '/auth' && 
                           window.location.search.includes('forceLogin');
                           
    // Only attempt to fetch if not already provided externally AND not on force login page
    if (value?.user === undefined && !isForceLoginAuth) {
      fetchUserData();
    }
  }, [value?.user, forcedRefresh, fetchUserData]);
  
  // Combine provided values with internal state
  // Implement the force update gender function
  const forceUpdateGender = useCallback((genderValue: string) => {
    console.log("🔄 Forcing gender update to:", genderValue);
    
    // First, save to session storage as backup
    if (genderValue) {
      saveToStorage('nephra_user_gender', genderValue);
    }
    
    // Then update the user object if it exists
    if (user) {
      const updatedUser = {
        ...user,
        gender: genderValue
      };
      
      console.log("📊 Updating user with forced gender:", updatedUser);
      setUser(updatedUser);
      
      // CRITICAL: Also update gender on the server
      if (user.id) {
        console.log("🔼 Sending gender update to server for user ID:", user.id);
        
        // Fire and forget server update
        fetch(`/api/users/${user.id}`, {
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
    }
  }, [user]);
  
  // Load gender from session storage if we have a user but missing gender
  useEffect(() => {
    if (user && (!user.gender || user.gender === '')) {
      const savedGender = getFromStorage('nephra_user_gender');
      if (savedGender) {
        console.log("Restoring gender from session storage:", savedGender);
        forceUpdateGender(savedGender);
      }
    } else if (user && user.gender) {
      // We have a gender, save it to session storage
      saveToStorage('nephra_user_gender', user.gender);
    }
  }, [user, forceUpdateGender]);

  const contextValue: UserContextType = {
    user: value?.user !== undefined ? value.user : user,
    setUser: value?.setUser || setUser,
    isLoading,
    error,
    refreshUserData,
    forceUpdateGender
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
