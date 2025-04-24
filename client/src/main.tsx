import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { UserProvider } from "./contexts/UserContext";
import { Toaster } from "@/components/ui/toaster";

// Create a root-level provider that fixes the circular dependency with UserContext
function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <App />
        <Toaster />
      </UserProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
