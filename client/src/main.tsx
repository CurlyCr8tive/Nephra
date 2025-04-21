import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { UserProvider } from "./contexts/UserContext";
import { useState } from "react";
import { User } from "@shared/schema";

// Create a root-level provider that fixes the circular dependency with UserContext
function AppWithProviders() {
  // Initialize with a user directly here instead of in App.tsx
  const [user, setUser] = useState<User | null>({
    id: 1,
    username: "sarah_k",
    firstName: "Sarah",
    password: "", // We're not displaying this, just needed for the interface
    age: 42,
    gender: "female",
    weight: 70.5,
    race: "white",
    kidneyDiseaseType: "CKD",
    kidneyDiseaseStage: 3,
    createdAt: new Date()
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider value={{ user, setUser }}>
        <App />
      </UserProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
