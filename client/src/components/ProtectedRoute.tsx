import { ReactNode, useEffect, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  // Only attempt a redirect after loading is complete and user is confirmed to be missing
  useEffect(() => {
    // If we're not loading anymore and user is still null, schedule a redirect
    if (!isLoading && !user) {
      const timer = setTimeout(() => {
        console.log("ProtectedRoute: No user found after waiting, proceeding with redirect");
        setShouldRedirect(true);
      }, 200); // small delay to ensure user state is stable

      return () => clearTimeout(timer);
    }
    
    // If user becomes available, make sure we don't redirect
    if (user) {
      setShouldRedirect(false);
    }
  }, [user, isLoading]);

  // If still loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If we've determined we should redirect, do it once
  if (shouldRedirect) {
    // We use a direct browser redirect to avoid React rendering issues
    window.location.replace("/auth");
    
    // Show a loading message while the redirect happens
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Redirecting to login...</span>
      </div>
    );
  }

  // Only render children if we have a valid user and not redirecting
  return <>{children}</>;
}