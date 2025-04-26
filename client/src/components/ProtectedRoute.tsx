import { ReactNode, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  
  // Use a direct window.location approach instead of Redirect component
  // This bypasses the React rendering cycle and avoids infinite loops
  useEffect(() => {
    if (!isLoading && !user) {
      console.log("ProtectedRoute: No user found, redirecting to /auth");
      // Add a small timeout to ensure state is stable
      setTimeout(() => {
        window.location.href = "/auth";
      }, 100);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirection will happen via useEffect)
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}