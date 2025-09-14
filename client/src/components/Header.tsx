import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [location] = useLocation();
  const isProfileActive = location === "/profile";
  const { logoutMutation } = useAuth();
  const { toast } = useToast();
  
  const handleLogout = async () => {
    try {
      console.log("Logging out...");
      
      // Simple logout - call the API endpoint and let the auth system handle it
      await logoutMutation.mutateAsync();
      
      // Force a navigation to auth page
      window.location.href = '/auth';
      
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="bg-white shadow-sm py-4 px-4 fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2">favorite</span>
          <h1 className="font-display font-bold text-xl text-primary">
            {title || "Nephra"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            className="text-neutral-600 hover:text-primary"
          >
            <span className="material-icons text-sm mr-1">logout</span>
            Logout
          </Button>

          <Link href="/profile">
            <div className={`w-10 h-10 rounded-full ${isProfileActive ? 'bg-primary' : 'bg-neutral-100'} flex items-center justify-center transition-colors cursor-pointer`}>
              <span className={`material-icons ${isProfileActive ? 'text-white' : 'text-neutral-600'}`}>account_circle</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
