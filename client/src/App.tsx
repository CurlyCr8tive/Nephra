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

// Main component for routing
const AppRoutes = () => {
  const { user, isLoading } = useAuth();
  
  // If loading, don't render routes yet
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  return (
    <Switch>
      {/* Auth page - always accessible */}
      <Route path="/auth" component={AuthPage} />
      
      {/* For all other routes - redirect to auth if not logged in */}
      {!user && <Route path="*"><Redirect to="/auth" /></Route>}
      
      {/* Protected routes - only available when logged in */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/log" component={TrackPage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/transplant" component={TransplantRoadmap} />
      <Route path="/trends" component={TrackPage} />
      <Route path="/documents" component={MedicalDocuments} />
      <Route path="/education" component={EducationHub} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/chat" component={AIChatView} />
      
      {/* Root route redirects to dashboard when logged in */}
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
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
