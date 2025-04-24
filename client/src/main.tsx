import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { UserProvider } from "./contexts/UserContext";
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
    // First check if we can login
    const loginResp = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ 
        username: 'demouser', 
        password: 'demopassword' 
      })
    });
    
    if (loginResp.ok) {
      console.log("💚 Demo user login successful");
      return true;
    }
    
    // If login fails, try to register
    console.log("Demo login failed, attempting to register...");
    const registerResp = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: 'demouser',
        password: 'demopassword',
        email: 'demo@example.com',
        firstName: 'Demo',
        lastName: 'User',
        age: 45,
        gender: 'Female',
        race: 'Caucasian',
        weight: 65,
        height: 170,
        kidneyDiseaseStage: 3,
        diagnosisDate: new Date().toISOString(),
        primaryNephrologistName: 'Dr. Smith',
        primaryNephrologistContact: '555-123-4567',
        transplantCandidate: true,
        transplantStatus: 'Waiting',
        dialysisType: 'Hemodialysis',
        dialysisSchedule: 'MWF',
        medications: ['Medication 1', 'Medication 2'],
        otherHealthConditions: ['Hypertension', 'Diabetes'],
        otherSpecialists: [{
          name: 'Dr. Johnson',
          specialty: 'Cardiology',
          contact: '555-987-6543'
        }]
      })
    });
    
    if (registerResp.ok) {
      console.log("💚 Demo user registration successful");
      return true;
    } else {
      console.warn("⚠️ Demo user setup failed:", await registerResp.text());
      return false;
    }
  } catch (err) {
    console.error("Error setting up demo user:", err);
    return false;
  }
};

// Run these checks before mounting the app
async function initializeApp() {
  const apiStatus = await checkApiConnection();
  console.log("API connection status:", apiStatus);
  
  if (!apiStatus.authenticated) {
    console.log("No authenticated user, attempting demo setup...");
    await setupDemoUser();
  }
  
  // Create a root-level provider that fixes the circular dependency with UserContext
  function AppWithProviders() {
    return (
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <App />
          <Toaster />
        </UserProvider>
      </QueryClientProvider>
    );
  }
  
  createRoot(document.getElementById("root")!).render(<AppWithProviders />);
}

// Start the app initialization process
initializeApp();
