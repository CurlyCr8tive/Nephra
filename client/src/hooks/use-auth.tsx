import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";

type LoginData = {
  username: string;
  password: string;
};

type RegisterData = LoginData & {
  firstName: string;
  lastName?: string;
  email?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: ReturnType<typeof useMutation<User, Error, LoginData>>;
  logoutMutation: ReturnType<typeof useMutation<void, Error, void>>;
  registerMutation: ReturnType<typeof useMutation<User, Error, RegisterData>>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Query to get current user on app load
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        console.log('🔍 AuthProvider: Fetching user data...');
        const res = await fetch('/api/user', {
          credentials: 'include',
        });
        console.log(`🔍 AuthProvider: Got response status ${res.status}`);
        
        if (res.status === 401) {
          console.log('🔍 AuthProvider: User not authenticated (401)');
          return null; // User not authenticated
        }
        if (!res.ok) {
          throw new Error(`${res.status}: ${res.statusText}`);
        }
        
        const userData = await res.json();
        console.log('🔍 AuthProvider: Parsed user data:', userData);
        return userData;
      } catch (error) {
        console.error('🔍 AuthProvider: Error fetching user:', error);
        return null;
      }
    },
    retry: false, // Don't retry if user is not authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update local user state when query data changes
  useEffect(() => {
    // Ensure userData is a valid User object or null
    if (userData && typeof userData === 'object' && 'id' in userData) {
      setUser(userData as User);
    } else {
      setUser(null);
    }
  }, [userData]);

  // Login mutation - SECURITY FIX: Use correct apiRequest signature
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData): Promise<User> => {
      const response = await apiRequest('POST', '/api/login', data);
      return await response.json();
    },
    onSuccess: (userData: User) => {
      setUser(userData);
      queryClient.setQueryData(['/api/user'], userData);
      // Force refresh the user query to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
    },
  });

  // Register mutation - SECURITY FIX: Use correct apiRequest signature
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData): Promise<User> => {
      const response = await apiRequest('POST', '/api/register', data);
      return await response.json();
    },
    onSuccess: (userData: User) => {
      setUser(userData);
      queryClient.setQueryData(['/api/user'], userData);
      // Force refresh the user query to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: any) => {
      console.error('Registration failed:', error);
    },
  });

  // Logout mutation - SECURITY FIX: Use correct apiRequest signature
  const logoutMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await apiRequest('POST', '/api/logout');
    },
    onSuccess: () => {
      setUser(null);
      queryClient.setQueryData(['/api/user'], null);
      queryClient.clear(); // Clear all cached data on logout
    },
    onError: (error: any) => {
      console.error('Logout failed:', error);
      // Even if logout fails, clear local state
      setUser(null);
      queryClient.setQueryData(['/api/user'], null);
    },
  });

  const contextValue = {
    user,
    isLoading,
    error: error as Error | null,
    loginMutation,
    logoutMutation,
    registerMutation,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  
  return context;
}