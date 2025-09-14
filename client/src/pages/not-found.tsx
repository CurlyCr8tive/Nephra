import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function NotFound() {
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  
  const handleBackToSafety = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mb-6 text-sm text-gray-600">
            Sorry, the page you are looking for doesn't exist or has been moved.
          </p>
          
          <Button 
            className="flex items-center gap-2" 
            onClick={handleBackToSafety}
          >
            <Home className="h-4 w-4" />
            Back to {user ? "Dashboard" : "Login"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
