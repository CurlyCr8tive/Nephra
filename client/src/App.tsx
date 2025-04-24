import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import HealthLogging from "@/pages/HealthLogging";
import AIChatView from "@/pages/AIChatView";
import TransplantRoadmap from "@/pages/TransplantRoadmap";
import HealthTrends from "@/pages/HealthTrends";
import MedicalDocuments from "@/pages/MedicalDocuments";
import JournalPage from "@/pages/JournalPage";
import EducationHub from "@/pages/EducationHub";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";

// Hardcoded user ID for testing purposes
export const TEST_USER_ID = 1;

function App() {
  // Try to log in with demo account automatically when the app loads
  useEffect(() => {
    const tryDemoLogin = async () => {
      try {
        console.log("🔑 Attempting auto-login with demo account...");
        const demoResponse = await fetch('/api/login-demo', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (demoResponse.ok) {
          console.log("✅ Auto-login successful");
        } else {
          console.warn("⚠️ Auto-login failed:", await demoResponse.text());
        }
      } catch (error) {
        console.error("❌ Auto-login error:", error);
      }
    };
    
    tryDemoLogin();
  }, []);

  return (
    <TooltipProvider>
      <AuthProvider>
        <Switch>
          {/* Public routes */}
          <Route path="/auth" component={AuthPage} />
          <Route path="/health-tracking" component={HealthLogging} />
          <Route path="/chat" component={AIChatView} />
          
          {/* Protected routes */}
          <ProtectedRoute path="/" component={Dashboard} />
          <ProtectedRoute path="/log" component={HealthLogging} />
          <ProtectedRoute path="/track" component={HealthLogging} />
          <ProtectedRoute path="/journal" component={JournalPage} />
          <ProtectedRoute path="/roadmap" component={TransplantRoadmap} />
          <ProtectedRoute path="/trends" component={HealthTrends} />
          <ProtectedRoute path="/documents" component={MedicalDocuments} />
          <ProtectedRoute path="/education" component={EducationHub} />
          <ProtectedRoute path="/profile" component={ProfilePage} />
          
          {/* 404 page */}
          <Route component={NotFound} />
        </Switch>
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
