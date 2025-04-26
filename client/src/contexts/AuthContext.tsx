import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";

// Define user type
type User = {
  id: number;
  username: string;
  email?: string;
  gender?: string;
  [key: string]: any;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
}

// Create context with default value
const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  // Load user data from localStorage on initial render
  useEffect(() => {
    const loadUser = async () => {
      setIsLoading(true);
      try {
        // Try to get user from localStorage first
        const storedUser = localStorage.getItem('nephra_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        
        // Then verify with the server
        const response = await fetch('/api/user', {
          method: 'GET',
          credentials: 'include',
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          localStorage.setItem('nephra_user', JSON.stringify(userData));
          
          // If gender is available, also save it for calculations
          if (userData.gender) {
            localStorage.setItem('nephra_user_gender', userData.gender);
            console.log("💾 Saved gender to storage:", userData.gender);
          }
        } else if (response.status === 401) {
          // If not authenticated, clear user state but preserve gender
          const gender = localStorage.getItem('nephra_user_gender');
          setUser(null);
          localStorage.removeItem('nephra_user');
          
          // Restore gender information if we had it
          if (gender) {
            localStorage.setItem('nephra_user_gender', gender);
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // If network error but we have stored user, keep them logged in
        const storedUser = localStorage.getItem('nephra_user');
        if (storedUser && !user) {
          setUser(JSON.parse(storedUser));
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Failed to login');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('nephra_user', JSON.stringify(userData));
      
      // If gender is available, also save it for calculations
      if (userData.gender) {
        localStorage.setItem('nephra_user_gender', userData.gender);
        console.log("💾 Saved gender to storage:", userData.gender);
      }
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.username}!`,
      });
      
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Could not connect to the server',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text() || 'Registration failed');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('nephra_user', JSON.stringify(userData));
      
      toast({
        title: 'Registration successful',
        description: 'Your account has been created',
      });
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Could not connect to the server',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Preserve gender information for calculations
      const gender = localStorage.getItem('nephra_user_gender');
      
      // Call logout API
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      // Clear user state
      setUser(null);
      localStorage.removeItem('nephra_user');
      
      // Restore gender if we had it
      if (gender) {
        localStorage.setItem('nephra_user_gender', gender);
        console.log("✅ Restored gender after logout:", gender);
      }
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};