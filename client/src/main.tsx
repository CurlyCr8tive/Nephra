import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "@/components/ui/toaster";

// Simple app with single auth system - uses PostgreSQL for all data
function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <UserProvider>
          <App />
          <Toaster />
        </UserProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
