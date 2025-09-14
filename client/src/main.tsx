import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { SupabaseProvider } from "./hooks/useSupabase";
import { Toaster } from "@/components/ui/toaster";

// Simple app with single auth system - no pre-mount checks
function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SupabaseProvider>
          <App />
          <Toaster />
        </SupabaseProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
