import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { User } from "@shared/schema";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
  error: Error | null;
}

// Create context with default values to avoid undefined checks
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {
    console.warn("setUser called outside of UserProvider context. This operation won't have any effect.");
  },
  isLoading: false,
  error: null
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
  
  // Fetch user data on mount if not provided externally
  useEffect(() => {
    // Only attempt to fetch if not already provided
    if (value?.user === undefined) {
      const fetchUserData = async () => {
        try {
          setIsLoading(true);
          console.log("Fetching user from API in UserContext...");
          
          const response = await fetch('/api/user', {
            credentials: 'include',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log("User data fetched successfully in UserContext:", userData.username);
            setUser(userData);
            setError(null);
          } else if (response.status === 401) {
            // Not authenticated - expected case
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
  }, [value?.user]);
  
  // Combine provided values with internal state
  const contextValue: UserContextType = {
    user: value?.user !== undefined ? value.user : user,
    setUser: value?.setUser || setUser,
    isLoading,
    error
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
