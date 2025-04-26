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
import AuthPage from "@/pages/AuthPage";
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
  
  // FIXED: Completely restructured routing for proper auth flow
  return (
    <Switch>
      {/* Auth page - must come BEFORE the root route */}
      <Route path="/auth">
        {(user && !window.location.search.includes('forceLogin')) ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>
      
      {/* Protected routes - specific routes first */}
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/log" component={TrackPage} />
      <ProtectedRoute path="/track" component={TrackPage} />
      <ProtectedRoute path="/journal" component={JournalPage} />
      <ProtectedRoute path="/transplant" component={TransplantRoadmap} />
      <ProtectedRoute path="/trends" component={TrackPage} />
      <ProtectedRoute path="/documents" component={MedicalDocuments} />
      <ProtectedRoute path="/education" component={EducationHub} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      <ProtectedRoute path="/chat" component={AIChatView} />
      
      {/* Root route - must come AFTER specific routes but BEFORE 404 */}
      <Route path="/">
        {!user ? <Redirect to="/auth" /> : <Redirect to="/dashboard" />}
      </Route>
      
      {/* 404 page - always last */}
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
