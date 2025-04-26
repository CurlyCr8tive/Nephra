import { ReactNode, useEffect } from "react";
import { useUser } from "@/contexts/UserContext";
import { useLocation, Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const [location] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      const hasSavedReturnTo = sessionStorage.getItem('nephra_return_to');
      if (!hasSavedReturnTo && location !== '/auth') {
        console.log("Saving return path:", location);
        sessionStorage.setItem('nephra_return_to', location);
      }
    }
  }, [user, isLoading]); // Remove location from dependencies to prevent infinite loop

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}