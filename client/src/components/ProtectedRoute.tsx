import { ReactNode, useEffect, useRef } from "react";
import { useUser } from "@/contexts/UserContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const redirectAttemptedRef = useRef(false);
  
  // Use a direct window.location approach instead of Redirect component
  // This bypasses the React rendering cycle and avoids infinite loops
  useEffect(() => {
    // Only attempt redirect if:
    // 1. We're not currently loading user data
    // 2. No user is found after checking
    // 3. We haven't already tried redirecting
    if (!isLoading && !user && !redirectAttemptedRef.current) {
      // Set flag to prevent multiple redirects
      redirectAttemptedRef.current = true;
      
      console.log("ProtectedRoute: No user found, redirecting to /auth");
      
      // Use a longer timeout to ensure state has fully stabilized
      // This prevents race conditions with localStorage and API calls
      setTimeout(() => {
        // If after timeout we still have no user, proceed with redirect
        if (!sessionStorage.getItem('nephra_auth_redirect_pending')) {
          sessionStorage.setItem('nephra_auth_redirect_pending', 'true');
          window.location.replace("/auth");
        }
      }, 500);
    }
  }, [user, isLoading]);

  // Reset the redirect flag if user is present
  useEffect(() => {
    if (user) {
      redirectAttemptedRef.current = false;
      sessionStorage.removeItem('nephra_auth_redirect_pending');
    }
  }, [user]);

  // Show loading spinner while authenticating
  if (isLoading || (!user && !redirectAttemptedRef.current)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="ml-3 text-primary">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}