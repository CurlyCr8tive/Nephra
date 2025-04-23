import { Link, useLocation } from "wouter";
import { useEffect, useRef } from "react";

export function BottomNavigation() {
  const [location] = useLocation();
  const trackLabelRef = useRef<HTMLSpanElement>(null);

  const isActive = (path: string) => {
    return location === path;
  };
  
  // Use CSS custom properties for icon-specific label positioning
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .track-label-fix {
        position: relative;
        left: -3px; /* More significant shift to the left */
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <nav className="bg-white shadow-lg fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200">
      <div className="grid grid-cols-5 w-full">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center py-3 ${
            isActive("/") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">home</span>
          <span className="text-xs mt-1">Home</span>
        </Link>
        
        {/* Track - with hardcoded fix */}
        <Link
          href="/trends"
          className={`flex flex-col items-center py-3 ${
            isActive("/trends") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">monitoring</span>
          <span ref={trackLabelRef} className="text-xs mt-1 track-label-fix">Track</span>
        </Link>
        
        {/* Journal */}
        <Link
          href="/journal"
          className={`flex flex-col items-center py-3 ${
            isActive("/journal") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">edit_note</span>
          <span className="text-xs mt-1">Journal</span>
        </Link>
        
        {/* Chat */}
        <Link
          href="/chat"
          className={`flex flex-col items-center py-3 ${
            isActive("/chat") ? "text-primary" : "text-neutral-500"
          }`}
        >
          <span className="material-icons">chat</span>
          <span className="text-xs mt-1">Chat</span>
        </Link>
        
        {/* Roadmap */}
        <Link
          href="/roadmap"
          className={`flex flex-col items-center py-3 ${
            isActive("/roadmap") ? "text-primary" : "text-neutral-500"
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
