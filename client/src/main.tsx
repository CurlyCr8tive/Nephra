import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { UserProvider } from "./contexts/UserContext";
import { useState, useEffect } from "react";
import { User } from "@shared/schema";
import { Toaster } from "@/components/ui/toaster";

// Create a root-level provider that fixes the circular dependency with UserContext
function AppWithProviders() {
  // Initialize with null user and let authentication system handle it
  const [user, setUser] = useState<User | null>(null);
  
  // Add an effect to sync user from authenticated login
  useEffect(() => {
    // Listen for changes to the user data in the auth system
    const syncAuthToUser = async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Syncing authenticated user to UserContext:', userData?.username);
          setUser(userData);
        } else if (response.status === 401) {
          // Not authenticated, clear user
          console.log('No authenticated user, clearing UserContext');
          setUser(null);
        }
      } catch (error) {
        console.error('Error syncing auth to user:', error);
      }
    };
    
    // Initial sync
    syncAuthToUser();
    
    // Add a timer to periodically check for user updates
    const interval = setInterval(syncAuthToUser, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider value={{ user, setUser }}>
        <App />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
