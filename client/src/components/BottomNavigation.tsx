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
            className={`flex flex-col items-center justify-center py-3 ${
              isActive(item.path) ? "text-primary" : "text-neutral-500"
            }`}
            style={{ width: '20%', textAlign: 'center' }}
          >
            <span className="material-icons flex justify-center">{item.icon}</span>
            <span className="text-xs mt-1 text-center w-full">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default BottomNavigation;
