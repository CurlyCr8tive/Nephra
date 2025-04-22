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
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center py-3 px-5 ${
              isActive(item.path) ? "text-primary" : "text-neutral-500"
            }`}
          >
            <span className="material-icons">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default BottomNavigation;
