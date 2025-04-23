import { Link, useLocation } from "wouter";

export function BottomNavigation() {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  const navItems = [
    { path: "/", icon: "home", label: "Home" },
    { path: "/trends", icon: "monitoring", label: "Track" },
    { path: "/journal", icon: "edit_note", label: "Journal" },
    { path: "/chat", icon: "chat", label: "Chat" },
    { path: "/roadmap", icon: "map", label: "Roadmap" },
  ];

  return (
    <nav className="bg-white shadow-lg fixed bottom-0 left-0 right-0 z-10 border-t border-neutral-200">
      <div className="grid grid-cols-5 w-full">
        {navItems.map((item) => {
          const isTrackItem = item.path === "/trends";
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex flex-col items-center justify-center py-3 ${
                isActive(item.path) ? "text-primary" : "text-neutral-500"
              }`}
            >
              <span className="material-icons flex justify-center">{item.icon}</span>
              {isTrackItem ? (
                <span 
                  className="text-xs mt-1 text-center"
                  style={{ 
                    letterSpacing: '-0.03em', 
                    marginLeft: '-0.1em' 
                  }}
                >
                  {item.label}
                </span>
              ) : (
                <span className="text-xs mt-1 text-center">{item.label}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
