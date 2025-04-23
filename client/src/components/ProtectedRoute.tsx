import { ReactNode, ComponentType } from "react";
import { Route, Redirect, RouteProps } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps extends RouteProps {
  component: ComponentType<any>;
}

export function ProtectedRoute({ component: Component, ...rest }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  return (
    <Route
      {...rest}
      component={(props: any) => {
        if (!user) {
          return <Redirect to="/auth" />;
        }
        return <Component {...props} />;
      }}
    />
  );
}