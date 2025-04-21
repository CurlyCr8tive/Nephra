import { useUser } from "@/contexts/UserContext";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { user } = useUser();

  return (
    <header className="bg-white shadow-sm py-4 px-4 fixed top-0 left-0 right-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-primary mr-2">favorite</span>
          <h1 className="font-display font-bold text-xl text-primary">
            {title || "KidneyCompanion"}
          </h1>
        </div>
        <button aria-label="User profile" className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
          <span className="material-icons text-neutral-600">account_circle</span>
        </button>
      </div>
    </header>
  );
}

export default Header;
