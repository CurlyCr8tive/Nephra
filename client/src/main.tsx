import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "@/hooks/use-auth";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "@/components/ui/toaster";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "sans-serif" }}>
          <h2 style={{ color: "#c00" }}>Something went wrong</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13, color: "#333" }}>
            {(this.state.error as Error).message}
            {"\n"}
            {(this.state.error as Error).stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Simple app with single auth system - uses PostgreSQL for all data
function AppWithProviders() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UserProvider>
            <App />
            <Toaster />
          </UserProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

createRoot(document.getElementById("root")!).render(<AppWithProviders />);
