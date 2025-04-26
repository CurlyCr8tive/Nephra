import React from "react";
import { Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardV2 from "@/pages/DashboardV2";
import TrackPage from "@/pages/TrackPage";
import AIChatView from "@/pages/AIChatView";
import TransplantRoadmap from "@/pages/TransplantRoadmap";
import MedicalDocuments from "@/pages/MedicalDocuments";
import JournalPage from "@/pages/JournalPage";
import EducationHub from "@/pages/EducationHub";
import ProfilePage from "@/pages/ProfilePage";
import NewLoginPage from "@/pages/NewLoginPage";
import NotFoundV2 from "@/pages/not-found-v2";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

// Protected route component
const ProtectedRoute = ({ component: Component, ...rest }: { component: React.ComponentType, path: string }) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    // Redirect to login if not authenticated
    return <Redirect to="/login" />;
  }
  
  return <Component />;
};

// AppRoutes component handles all routing logic
const AppRoutes = () => {
  return (
    <Switch>
      {/* Auth routes */}
      <Route path="/login" component={NewLoginPage} />
      
      {/* Root route */}
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      {/* Protected routes */}
      <Route path="/dashboard">
        <ProtectedRoute path="/dashboard" component={DashboardV2} />
      </Route>
      
      <Route path="/track">
        <ProtectedRoute path="/track" component={TrackPage} />
      </Route>
      
      <Route path="/log">
        <ProtectedRoute path="/log" component={TrackPage} />
      </Route>
      
      <Route path="/journal">
        <ProtectedRoute path="/journal" component={JournalPage} />
      </Route>
      
      <Route path="/transplant">
        <ProtectedRoute path="/transplant" component={TransplantRoadmap} />
      </Route>
      
      <Route path="/trends">
        <ProtectedRoute path="/trends" component={TrackPage} />
      </Route>
      
      <Route path="/documents">
        <ProtectedRoute path="/documents" component={MedicalDocuments} />
      </Route>
      
      <Route path="/education">
        <ProtectedRoute path="/education" component={EducationHub} />
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute path="/profile" component={ProfilePage} />
      </Route>
      
      <Route path="/chat">
        <ProtectedRoute path="/chat" component={AIChatView} />
      </Route>
      
      {/* 404 page - always last */}
      <Route component={NotFoundV2} />
    </Switch>
  );
};

// Main App component
function AppV2() {
  return (
    <TooltipProvider>
      <AuthProvider>
        <AppRoutes />
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}

export default AppV2;