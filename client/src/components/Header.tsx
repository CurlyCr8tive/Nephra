import { Link, useLocation } from "wouter";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [location] = useLocation();
  const isProfileActive = location === "/profile";

  return (
    <header className="bg-white shadow-sm py-4 px-4 fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2">favorite</span>
          <h1 className="font-display font-bold text-xl text-primary">
            {title || "Nephra"}
          </h1>
        </div>
        <Link href="/profile">
          <div className={`w-10 h-10 rounded-full ${isProfileActive ? 'bg-primary' : 'bg-neutral-100'} flex items-center justify-center transition-colors cursor-pointer`}>
            <span className={`material-icons ${isProfileActive ? 'text-white' : 'text-neutral-600'}`}>account_circle</span>
          </div>
        </Link>
      </div>
    </header>
  );
}

export default Header;
