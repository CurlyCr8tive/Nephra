import { createRoot } from "react-dom/client";
import AppV2 from "./AppV2";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
// We no longer need UserProvider - using AuthProvider in AppV2 instead
import { SupabaseProvider } from "./hooks/useSupabase";
import { Toaster } from "@/components/ui/toaster";

// Verify connection and environment setup
const checkApiConnection = async () => {
  try {
    console.log("Fetching user data...");
    const resp = await fetch('/api/user', { 
      credentials: 'include',
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    if (resp.ok) {
      const userData = await resp.json();
      console.log("💚 User is authenticated:", userData.username);
      return { authenticated: true, user: userData };
    } else if (resp.status === 401) {
      console.log("User not authenticated");
      return { authenticated: false };
    } else {
      console.warn("API error:", resp.status, resp.statusText);
      return { error: resp.statusText };
    }
  } catch (err) {
    console.error("API connectivity error:", err);
    return { error: String(err) };
  }
};

// Create a demo user if none exists for testing purposes
const setupDemoUser = async () => {
  try {
    console.log("🔑 Using login-demo endpoint for one-click auth...");
    const demoLoginResp = await fetch('/api/login-demo', {
      method: 'POST',
      credentials: 'include',
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (demoLoginResp.ok) {
      const userData = await demoLoginResp.json();
      console.log("💚 Demo login successful:", userData.username);
      return true;
    } else {
      const errorText = await demoLoginResp.text();
      console.warn("⚠️ Demo login failed:", errorText);
      
      // Try the regular login path as fallback
      console.log("Trying regular login path as fallback...");
      const loginResp = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          username: 'demouser', 
          password: 'demopass' 
        })
      });
      
      if (loginResp.ok) {
        console.log("💚 Regular demo login successful");
        return true;
      } else {
        console.warn("❌ All login attempts failed for demo user");
        return false;
      }
    }
  } catch (err) {
    console.error("Error setting up demo user:", err);
    return false;
  }
};

// Simplified initialization - just render our new AppV2
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SupabaseProvider>
      <AppV2 />
    </SupabaseProvider>
  </QueryClientProvider>
);
