import React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
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
import AdminPage from "@/pages/AdminPage";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";

// AppRoutes component handles all routing logic - HEAVILY SIMPLIFIED
const AppRoutes = () => {
  // Get auth state from the hook
  const { user, isLoading } = useAuth();
  
  // Get current URL path
  const [pathname] = useLocation();
  const isAuthPage = pathname === '/auth';
  
  // Check URL for forceLogin parameter (used after logout)
  const urlParams = new URLSearchParams(window.location.search);
  const forceLogin = urlParams.get('forceLogin') === 'true';
  
  // Show a loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // SIMPLIFIED AUTH FLOW:
  // 1. If on auth page and logged in (and not force login), redirect to dashboard
  if (isAuthPage && user && !forceLogin) {
    return <Redirect to="/dashboard" />;
  }
  
  // 2. If not on auth page and not logged in, redirect to auth
  if (!isAuthPage && !user) {
    return <Redirect to="/auth" />;
  }
  
  // Normal routing with simple Switch
  // Auth page doesn't need health alerts
  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
      </Switch>
    );
  }
  
  // All other routes are wrapped in the AppLayout with health alerts
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/track" component={TrackPage} />
        <Route path="/log" component={TrackPage} />
        <Route path="/journal" component={JournalPage} />
        <Route path="/transplant" component={TransplantRoadmap} />
        <Route path="/trends" component={TrackPage} />
        <Route path="/documents" component={MedicalDocuments} />
        <Route path="/education" component={EducationHub} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/chat" component={AIChatView} />
        <Route path="/admin" component={AdminPage} />
        <Route path="/">
          {user ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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