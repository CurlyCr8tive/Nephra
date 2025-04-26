import React from "react";
import { Switch, Route, Redirect } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import TrackPage from "@/pages/TrackPage";
import AIChatView from "@/pages/AIChatView";
import TransplantRoadmap from "@/pages/TransplantRoadmap";
import MedicalDocuments from "@/pages/MedicalDocuments";
import JournalPage from "@/pages/JournalPage";
import EducationHub from "@/pages/EducationHub";
import ProfilePage from "@/pages/ProfilePage";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/useAuth";
import { useUser } from "@/contexts/UserContext";
import { Loader2 } from "lucide-react";

// AppRoutes component handles all routing logic
const AppRoutes = () => {
  const { user, isLoading } = useUser();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      {/* Auth route - redirect to dashboard if logged in */}
      <Route path="/auth">
        {user ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>

      {/* Root route */}
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <LoginPage />}
      </Route>
      
      {/* Protected routes - show directly if logged in, otherwise redirect */}
      <Route path="/dashboard">
        {user ? <Dashboard /> : <LoginPage />}
      </Route>
      
      <Route path="/track">
        {user ? <TrackPage /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/log">
        {user ? <TrackPage /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/journal">
        {user ? <JournalPage /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/transplant">
        {user ? <TransplantRoadmap /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/trends">
        {user ? <TrackPage /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/documents">
        {user ? <MedicalDocuments /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/education">
        {user ? <EducationHub /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/profile">
        {user ? <ProfilePage /> : <Redirect to="/auth" />}
      </Route>
      
      <Route path="/chat">
        {user ? <AIChatView /> : <Redirect to="/auth" />}
      </Route>
      
      {/* 404 page - always last */}
      <Route component={NotFound} />
    </Switch>
  );
};

// Main App component - just provides context and renders AppRoutes
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