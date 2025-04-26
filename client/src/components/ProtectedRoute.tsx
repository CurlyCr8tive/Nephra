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

  useEffect(() => {
    if (!isLoading && !user) {
      const timer = setTimeout(() => {
        setShouldRedirect(true);
      }, 200); // small delay to wait for stable state

      return () => clearTimeout(timer);
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shouldRedirect) {
    return <Redirect to="/auth" />;
  }

  return <>{children}</>;
}