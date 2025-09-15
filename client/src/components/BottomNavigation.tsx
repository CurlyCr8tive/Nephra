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
          className={`w-1/5 flex flex-col items-center justify-center gap-1 py-3 h-16 ${
            isActive("/") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons text-2xl leading-none block" aria-hidden>home</span>
          <span className="text-[11px] leading-none text-center">Home</span>
        </Link>
        
        {/* Track */}
        <Link
          href="/track"
          className={`w-1/5 flex flex-col items-center justify-center gap-1 py-3 h-16 ${
            isActive("/track") || isActive("/trends") ? "text-primary" : "text-neutral-500"
          }`}
          data-testid="nav-track"
        >
          <span className="material-icons text-2xl leading-none block" aria-hidden>show_chart</span>
          <span className="text-[11px] leading-none text-center">Track</span>
        </Link>
        
        {/* Journal (Chat is now part of Journal) */}
        <Link
          href="/journal"
          className={`w-1/5 flex flex-col items-center justify-center gap-1 py-3 h-16 ${
            isActive("/journal") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons text-2xl leading-none block" aria-hidden>edit_note</span>
          <span className="text-[11px] leading-none text-center">Journal</span>
        </Link>
        
        {/* Education Hub */}
        <Link
          href="/education"
          className={`w-1/5 flex flex-col items-center justify-center gap-1 py-3 h-16 ${
            isActive("/education") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons text-2xl leading-none block" aria-hidden>school</span>
          <span className="text-[11px] leading-none text-center">Education</span>
        </Link>
        
        {/* Roadmap */}
        <Link
          href="/transplant"
          className={`w-1/5 flex flex-col items-center justify-center gap-1 py-3 h-16 ${
            isActive("/transplant") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons text-2xl leading-none block" aria-hidden>map</span>
          <span className="text-[11px] leading-none text-center">Roadmap</span>
        </Link>
      </div>
    </nav>
  );
}

export default BottomNavigation;
