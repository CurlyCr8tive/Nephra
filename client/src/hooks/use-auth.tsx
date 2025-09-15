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
  loginMutation: ReturnType<typeof useMutation>;
  logoutMutation: ReturnType<typeof useMutation>;
  registerMutation: ReturnType<typeof useMutation>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  
  // Query to get current user on app load
  const { data: userData, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    retry: false, // Don't retry if user is not authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update local user state when query data changes
  useEffect(() => {
    setUser(userData || null);
  }, [userData]);

  // Login mutation - SECURITY FIX: Use correct apiRequest signature
  const loginMutation = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await apiRequest('POST', '/api/login', data);
      return response.json();
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
    mutationFn: async (data: RegisterData) => {
      const response = await apiRequest('POST', '/api/register', data);
      return response.json();
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
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout', {});
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