import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import HealthLogging from "@/pages/HealthLogging";
import AIChatView from "@/pages/AIChatView";
import TransplantRoadmap from "@/pages/TransplantRoadmap";
import HealthTrends from "@/pages/HealthTrends";
import MedicalDocuments from "@/pages/MedicalDocuments";
import NotFound from "@/pages/not-found";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";

// Wrapped components for protected routes
const HealthLoggingPage = () => {
  const userContext = useUser();
  return <HealthLogging />;
};

function App() {
  // Use direct props from AppWithProviders instead of useUser hook
  const [appInitialized, setAppInitialized] = useState(true);

  if (!appInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Toaster />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/log" component={HealthLoggingPage} />
        <Route path="/chat" component={AIChatView} />
        <Route path="/roadmap" component={TransplantRoadmap} />
        <Route path="/trends" component={HealthTrends} />
        <Route path="/documents" component={MedicalDocuments} />
        <Route component={NotFound} />
      </Switch>
    </TooltipProvider>
  );
}

export default App;
