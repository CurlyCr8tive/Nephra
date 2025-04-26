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
import ProtectedRoute from "@/components/ProtectedRoute";

// Main component for routing
const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
  // Don't render routes until we know the auth state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Auth page - if logged in, redirect to dashboard */}
      <Route path="/auth">
        {user ? <Redirect to="/dashboard" /> : <AuthPage />}
      </Route>
      
      {/* Root route */}
      <Route path="/">
        <Redirect to={user ? "/dashboard" : "/auth"} />
      </Route>
      
      {/* Protected routes - using ProtectedRoute component */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/log">
        <ProtectedRoute>
          <TrackPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/track">
        <ProtectedRoute>
          <TrackPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/journal">
        <ProtectedRoute>
          <JournalPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/transplant">
        <ProtectedRoute>
          <TransplantRoadmap />
        </ProtectedRoute>
      </Route>
      
      <Route path="/trends">
        <ProtectedRoute>
          <TrackPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/documents">
        <ProtectedRoute>
          <MedicalDocuments />
        </ProtectedRoute>
      </Route>
      
      <Route path="/education">
        <ProtectedRoute>
          <EducationHub />
        </ProtectedRoute>
      </Route>
      
      <Route path="/profile">
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/chat">
        <ProtectedRoute>
          <AIChatView />
        </ProtectedRoute>
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
