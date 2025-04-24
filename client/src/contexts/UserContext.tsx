import { createContext, useContext, ReactNode } from "react";
import { User } from "@shared/schema";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

// Create context with default values to avoid undefined checks
const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {
    console.warn("setUser called outside of UserProvider context. This operation won't have any effect.");
  }
});

interface UserProviderProps {
  children: ReactNode;
  value: UserContextType;
}

export function UserProvider({ children, value }: UserProviderProps) {
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  return context;
}
