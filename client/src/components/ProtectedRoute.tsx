import { ReactNode, useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [location] = useLocation();

  // Only trigger redirect when loading is done and we know there's no user
  useEffect(() => {
    if (!isLoading && !user) {
      // Fixed delay timer to wait for stable state
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 300); // longer delay to ensure stable state
      
      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  // Clear loading state for debugging
  useEffect(() => {
    if (user) {
      console.log("ProtectedRoute: User authenticated, rendering protected content");
    }
  }, [user]);

  // Show loading state while determining user status
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Verifying authentication...</span>
      </div>
    );
  }

  // Redirect if needed (and show loading state)
  if (shouldRedirect) {
    return <Redirect to="/auth" />;
  }

  // Only render children if we have a valid user
  return <>{children}</>;
}