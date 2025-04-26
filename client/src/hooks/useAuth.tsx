import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Define the user schema
const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email().nullable(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  gender: z.string().nullable(),
  age: z.number().nullable(),
  weight: z.number().nullable(),
  race: z.string().nullable(),
  kidneyDiseaseType: z.string().nullable(),
  kidneyDiseaseStage: z.number().nullable(),
  diagnosisDate: z.string().or(z.date()).nullable(),
  createdAt: z.string().or(z.date()).nullable(),
  // Add other user fields as needed
});

export type User = z.infer<typeof userSchema>;

type LoginCredentials = {
  username: string;
  password: string;
};

type RegisterCredentials = LoginCredentials & {
  email: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginCredentials>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterCredentials>;
  refreshUserData: () => void; // Add refreshUserData to the context type
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [location, setLocation] = useLocation(); // Add location with navigation

  // Add a force refresh state
  const [forceRefresh, setForceRefresh] = useState(0);
  
  // Check for gender in storage on route change or component mount
  useEffect(() => {
    // Get saved gender from storage
    const tryGetGender = () => {
      try {
        if (typeof window !== 'undefined') {
          const sessionGender = window.sessionStorage.getItem('nephra_user_gender');
          if (sessionGender) return sessionGender;
          
          return window.localStorage.getItem('nephra_user_gender');
        }
      } catch (e) {
        console.error("Error reading gender from storage:", e);
      }
      return null;
    };
    
    const savedGender = tryGetGender();
    if (savedGender) {
      console.log("Route changed - Found saved gender in storage:", savedGender);
    }
  }, [location]);

  // Try to load user from localStorage first for quick start
  const [initialUser, setInitialUser] = useState<User | null>(() => {
    try {
      const savedUserData = localStorage.getItem('nephra_user_data');
      if (savedUserData) {
        const parsedUser = JSON.parse(savedUserData);
        console.log("🔄 Loading initial user data from localStorage:", parsedUser.username);
        return parsedUser;
      }
    } catch (e) {
      console.error("Error loading user data from localStorage:", e);
    }
    return null;
  });

  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["/api/user", forceRefresh], // Add forceRefresh to the key
    queryFn: async () => {
      try {
        console.log("Fetching user data...");
        
        // First check if we have the user data in localStorage for quick loading
        // This helps prevent flickering during page navigation
        const cachedUserData = localStorage.getItem('nephra_user_data');
        let cachedUser = null;
        
        if (cachedUserData) {
          try {
            cachedUser = JSON.parse(cachedUserData);
            console.log("Found cached user data in localStorage:", cachedUser.username);
          } catch (e) {
            console.error("Error parsing cached user data:", e);
          }
        }
        
        // Actual API call to fetch fresh user data
        const res = await fetch("/api/user", {
          credentials: "include", // Include cookies with the request
          headers: {
            "Cache-Control": "no-cache",  // Avoid caching issues
            "Pragma": "no-cache"
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) {
            console.log("User not authenticated");
            // Clear local storage if server says we're not authenticated
            try {
              // Don't clear gender though - always preserve gender
              const gender = localStorage.getItem('nephra_user_gender');
              localStorage.removeItem('nephra_user_data');
              localStorage.removeItem('nephra_user_id');
              
              // Restore gender after clearing
              if (gender) {
                localStorage.setItem('nephra_user_gender', gender);
              }
            } catch (e) {
              console.error("Error clearing localStorage:", e);
            }
            
            // Not authenticated, but not an error
            return null;
          }
          
          const errText = await res.text();
          console.error(`Failed to fetch user (${res.status}): ${errText}`);
          
          // If we have cached user data and there was just a network error, use that instead
          if (cachedUser && (res.status >= 500 || res.status === 0)) {
            console.log("Using cached user data due to server error");
            return cachedUser;
          }
          
          throw new Error(`Failed to fetch user: ${errText || res.statusText}`);
        }
        
        const userData = await res.json();
        console.log("User data retrieved from API:", userData?.username);
        
        // Check if we have gender in userData
        if (userData && (!userData.gender || userData.gender === '')) {
          // Try to get saved gender from storage
          const tryGetGender = () => {
            try {
              if (typeof window !== 'undefined') {
                const sessionGender = window.sessionStorage.getItem('nephra_user_gender');
                if (sessionGender) return sessionGender;
                
                return window.localStorage.getItem('nephra_user_gender');
              }
            } catch (e) {
              console.error("Error reading gender from storage:", e);
            }
            return null;
          };
          
          const savedGender = tryGetGender();
          if (savedGender) {
            console.log("Restoring gender from storage:", savedGender);
            userData.gender = savedGender;
          }
        }
        
        // If we have gender in userData, save it to storage
        if (userData && userData.gender && userData.gender !== '') {
          try {
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem('nephra_user_gender', userData.gender);
              window.localStorage.setItem('nephra_user_gender', userData.gender);
              console.log("Saved gender to storage:", userData.gender);
            }
          } catch (e) {
            console.error("Error saving gender to storage:", e);
          }
        }
        
        // Save the complete user data to localStorage for persistence
        if (userData) {
          try {
            localStorage.setItem('nephra_user_data', JSON.stringify(userData));
            console.log("✅ Saved full user data to localStorage");
          } catch (e) {
            console.error("Error saving user data to localStorage:", e);
          }
        }
        
        return userData;
      } catch (err) {
        console.error("Error fetching user:", err);
        
        // On network error, try to use cached data if available
        try {
          const cachedUserData = localStorage.getItem('nephra_user_data');
          if (cachedUserData) {
            const cachedUser = JSON.parse(cachedUserData);
            console.log("⚠️ Network error, using cached user data:", cachedUser.username);
            return cachedUser;
          }
        } catch (e) {
          console.error("Error loading cached user data:", e);
        }
        
        return null;
      }
    },
    retry: 1, // Retry once in case of network issues
    retryDelay: 1000,
    initialData: initialUser, // Use locally stored user data to avoid initial loading state
  });

  useEffect(() => {
    // Once the user query completes (successful or not), mark as initialized
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      console.log("Login attempt for:", credentials.username);
      
      // Try demo login first for quick testing (username: demouser, password: demopass)
      if (credentials.username === "demouser" && credentials.password === "demopass") {
        console.log("Using demo login shortcut");
        try {
          const demoRes = await fetch("/api/login-demo", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include" // Important: include cookies
          });
          
          if (demoRes.ok) {
            console.log("Demo login successful");
            return await demoRes.json();
          }
        } catch (e) {
          console.error("Demo login failed:", e);
        }
      }
      
      // Regular login as fallback
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Important: include cookies
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Login API error:", errorText);
        throw new Error(errorText || "Login failed");
      }

      return await res.json();
    },
    onSuccess: (userData: User) => {
      // Save the user data to the query cache
      queryClient.setQueryData(["/api/user"], userData);
      
      // Also save user ID to session/local storage for persistence
      try {
        if (typeof window !== 'undefined' && userData.id) {
          window.sessionStorage.setItem('nephra_user_id', userData.id.toString());
          window.localStorage.setItem('nephra_user_id', userData.id.toString());
          console.log("Saved user ID to storage:", userData.id);
          
          // If gender is available, also save it
          if (userData.gender) {
            window.sessionStorage.setItem('nephra_user_gender', userData.gender);
            window.localStorage.setItem('nephra_user_gender', userData.gender);
            console.log("Saved gender to storage:", userData.gender);
          }
        }
      } catch (e) {
        console.error("Error saving user data to storage:", e);
      }
      
      // Force a refresh of all user-related data
      setForceRefresh(prev => prev + 1);
      
      // Show success toast
      toast({
        title: "Login successful",
        description: `Welcome back, ${userData.username}!`,
      });
      
      // Redirect to dashboard after successful login
      if (location === '/auth') {
        console.log("Redirecting to dashboard after login");
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      console.error("Login mutation error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Could not connect to the server",
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Registration failed");
      }

      return await res.json();
    },
    onSuccess: (userData: User) => {
      queryClient.setQueryData(["/api/user"], userData);
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
      
      // Redirect to dashboard after successful registration
      if (location === '/auth') {
        console.log("Redirecting to dashboard after registration");
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include", // Include cookies for auth
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Logout failed");
      }
    },
    onSuccess: () => {
      // Clear user data from query cache
      queryClient.setQueryData(["/api/user"], null);
      
      // Do NOT clear the gender from storage - we want to preserve it
      // for accurate GFR calculations even after logout
      try {
        if (typeof window !== 'undefined') {
          // Get gender before clearing
          const gender = window.localStorage.getItem('nephra_user_gender');
          console.log("Preserving gender during logout:", gender);
          
          // Clear ALL user data except gender
          window.sessionStorage.removeItem('nephra_user_id');
          window.localStorage.removeItem('nephra_user_id');
          window.localStorage.removeItem('nephra_user_data');
          
          // Restore gender after clearing
          if (gender) {
            window.localStorage.setItem('nephra_user_gender', gender);
            window.sessionStorage.setItem('nephra_user_gender', gender);
            console.log("✅ Restored gender after logout:", gender);
          }
        }
      } catch (e) {
        console.error("Error managing storage during logout:", e);
      }
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // IMPORTANT: Add forceLogin parameter to prevent immediate redirect
      // back to home if there's cached data
      console.log("Redirecting to login page with forceLogin parameter");
      setLocation('/auth?forceLogin=true');
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Function to refresh user data
  const refreshUserData = async () => {
    console.log("Manually refreshing user data from API");
    try {
      // Save any existing gender information to storage before refresh
      if (user?.gender) {
        try {
          // Use the same storage functions from UserContext
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('nephra_user_gender', user.gender);
            window.localStorage.setItem('nephra_user_gender', user.gender);
            console.log("Saved gender to storage before refresh:", user.gender);
          }
        } catch (e) {
          console.error("Error saving gender to storage:", e);
        }
      }
      
      // Increment the force refresh counter to trigger a new query
      setForceRefresh(prev => prev + 1);
      
      // Also call the refetch function directly
      await refetchUser();
    } catch (err) {
      console.error("Error refreshing user data:", err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        error: error as Error | null,
        loginMutation,
        logoutMutation,
        registerMutation,
        refreshUserData, // Add the refresh function to the context
      }}
    >
      {isInitialized ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      )}
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