import { Switch, Route, Redirect } from "wouter";
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
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useEffect } from "react";

// Main component for routing
const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
  // If loading, don't render routes yet
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Simpler routing to avoid circular redirects
  return (
    <Switch>
      {/* Auth page - accessible when logged out */}
      <Route path="/auth">
        {user ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>

      {/* Fixed landing page route */}
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <Redirect to="/dashboard" />}
      </Route>
      
      {/* Protected routes */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/log" component={HealthLogging} />
      <ProtectedRoute path="/track" component={HealthLogging} />
      <ProtectedRoute path="/journal" component={JournalPage} />
      <ProtectedRoute path="/transplant" component={TransplantRoadmap} /> {/* fixed path */}
      <ProtectedRoute path="/trends" component={HealthTrends} />
      <ProtectedRoute path="/documents" component={MedicalDocuments} />
      <ProtectedRoute path="/education" component={EducationHub} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/chat" component={AIChatView} />
      
      {/* 404 page - this should be last */}
      <Route component={NotFound} />
    </Switch>
  );
};

function App() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default App;
