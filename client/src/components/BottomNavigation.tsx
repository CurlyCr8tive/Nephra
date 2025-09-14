import { Link, useLocation } from "wouter";

export function BottomNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path || 
           (path === "/journal" && location === "/chat") || // Consider Chat part of Journal
           (path === "/profile" && location === "/admin"); // Consider Admin part of Profile
  };
  
  return (
    <nav className="bg-white shadow-lg fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200">
      <div className="flex justify-around">
        {/* Home */}
        <Link
          href="/"
          className={`w-1/5 flex flex-col items-center py-3 ${
            isActive("/") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">home</span>
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        {/* Track */}
        <Link
          href="/track"
          className={`w-1/5 flex flex-col items-center py-3 ${
            isActive("/track") || isActive("/trends") ? "text-primary" : "text-neutral-500"
          }`}
          data-testid="nav-track"
        >
          <span className="material-icons">monitoring</span>
          <span className="text-xs mt-1">Track</span>
        </Link>
        
        {/* Journal (Chat is now part of Journal) */}
        <Link
          href="/journal"
          className={`w-1/5 flex flex-col items-center py-3 ${
            isActive("/journal") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">edit_note</span>
          <span className="text-xs mt-1">Journal</span>
        </Link>
        
        {/* Education Hub */}
        <Link
          href="/education"
          className={`w-1/5 flex flex-col items-center py-3 ${
            isActive("/education") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">school</span>
          <span className="text-xs mt-1">Education</span>
        </Link>
        
        {/* Roadmap */}
        <Link
          href="/transplant"
          className={`w-1/5 flex flex-col items-center py-3 ${
            isActive("/transplant") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">map</span>
          <span className="text-xs mt-1">Roadmap</span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNavigation;
