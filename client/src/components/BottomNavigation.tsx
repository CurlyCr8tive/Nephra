import { Link, useLocation } from "wouter";

export function BottomNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path || 
           (path === "/journal" && location === "/chat"); // Consider Chat part of Journal
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
        
        {/* Track - completely different implementation */}
        <Link
          href="/track"
          className={`w-1/5 text-center py-3 ${
            isActive("/track") || isActive("/trends") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <div className="flex flex-col items-center">
            <span className="material-icons">monitoring</span>
            {/* Custom alignment for Track text only */}
            <div className="w-full flex justify-center">
              <div className="text-xs mt-1 translate-x-[-4px]">T</div>
              <div className="text-xs mt-1 translate-x-[-4px]">r</div>
              <div className="text-xs mt-1 translate-x-[-4px]">a</div>
              <div className="text-xs mt-1 translate-x-[-4px]">c</div>
              <div className="text-xs mt-1 translate-x-[-4px]">k</div>
            </div>
          </div>
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
