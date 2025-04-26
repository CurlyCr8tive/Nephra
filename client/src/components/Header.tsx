import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
      
      // Clear user data from cache first
      if (logoutMutation && typeof logoutMutation.mutateAsync === 'function') {
        await logoutMutation.mutateAsync();
      }
      
      // Then make direct API call to ensure server session is cleared
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache"
        }
      });
      
      if (!res.ok) {
        throw new Error("Logout request failed");
      }
      
      console.log("Logout API call successful");
      
      // Clear all storage except gender
      try {
        if (typeof window !== 'undefined') {
          console.log("Clearing session data");
          
          // Save gender before clearing
          const gender = window.localStorage.getItem('nephra_user_gender');
          console.log("Preserved gender during logout:", gender);
          
          // Clear all user data
          window.sessionStorage.removeItem('nephra_user_id');
          window.localStorage.removeItem('nephra_user_id');
          
          // Clear any test flags
          window.sessionStorage.removeItem('test_account');
          
          // Clear auth cookies
          document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          
          // Restore gender if it existed
          if (gender) {
            window.localStorage.setItem('nephra_user_gender', gender);
            window.sessionStorage.setItem('nephra_user_gender', gender);
          }
        }
      } catch (e) {
        console.error("Error managing storage during logout:", e);
      }
      
      // Success toast
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      
      // Force a hard navigation to auth page
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
