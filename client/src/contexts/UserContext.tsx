import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { User } from "@shared/schema";

type StorageKey = 'nephra_user_gender' | 'nephra_user_id';

// Helper functions for session storage to maintain critical data between page loads
const saveToStorage = (key: StorageKey, value: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, value);
    }
  } catch (e) {
    console.error(`Error saving ${key} to sessionStorage:`, e);
  }
};

const getFromStorage = (key: StorageKey): string | null => {
  try {
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(key);
    }
  } catch (e) {
    console.error(`Error getting ${key} from sessionStorage:`, e);
  }
  return null;
};

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  error: Error | null;
  refreshUserData: () => void;
  forceUpdateGender: (gender: string) => void; // New function to explicitly set gender
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
  // Internal state management if not provided
  const [user, setUser] = useState<User | null>(value?.user || null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch user data on mount and when forcedRefresh changes
  const [forcedRefresh, setForcedRefresh] = useState<number>(0);
  
  // Expose the refresh function through context
  const refreshUserData = () => {
    console.log("Forcing user data refresh in UserContext");
    setForcedRefresh(prev => prev + 1);
  };
  
  // Fetch user data on mount if not provided externally
  useEffect(() => {
    // Only attempt to fetch if not already provided
    if (value?.user === undefined) {
      const fetchUserData = async () => {
        try {
          setIsLoading(true);
          console.log("Fetching user from API in UserContext...");
          
          const timestamp = Date.now(); // Add timestamp to prevent caching
          
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
            
            // Ensure gender information is preserved - log for debugging
            console.log("User gender from API:", {
              hasGender: userData.gender !== null && userData.gender !== undefined,
              genderValue: userData.gender,
              genderType: typeof userData.gender
            });
            
            // If we already have a user and gender is missing in the new data, preserve it
            if (user && (!userData.gender || userData.gender === '') && user.gender) {
              console.log("Preserving gender information from previous user state:", user.gender);
              userData.gender = user.gender;
            }
            
            // Extra validation for gender to make sure it's never empty
            if (!userData.gender && userData.gender !== '') {
              console.log("Setting default gender as API returned empty value");
              // Don't set a default gender - we want to debug the issue properly
              // Just log the warning for now
            }
            
            setUser(userData);
            setError(null);
          } else if (response.status === 401) {
            // Not authenticated - expected case
            console.log("User not authenticated (401 response)");
            setUser(null);
          } else {
            throw new Error(`Error fetching user: ${response.statusText}`);
          }
        } catch (err) {
          console.error("Error in UserContext:", err);
          setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchUserData();
    }
  }, [value?.user, forcedRefresh]);
  
  // Combine provided values with internal state
  // Implement the force update gender function
  const forceUpdateGender = (genderValue: string) => {
    console.log("Forcing gender update to:", genderValue);
    
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
      
      console.log("Updating user with forced gender:", updatedUser);
      setUser(updatedUser);
      
      // Optionally, we could also update this on the server
      // But for now we'll just keep it in the client state
    }
  };
  
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
  }, [user]);

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
