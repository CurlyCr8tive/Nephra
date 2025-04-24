import { createContext, useContext, ReactNode } from "react";
import { User } from "@shared/schema";

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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

// Default mock user for development purposes
const defaultUser: User = {
  id: 1,
  username: "demouser",
  email: "demo@example.com",
  firstName: "Demo",
  lastName: "User",
  age: 42,
  gender: "Male",
  weight: 175,
  kidneyDiseaseType: "IgA Nephropathy",
  kidneyDiseaseStage: 3,
  diagnosisDate: new Date("2022-03-15"),
  otherHealthConditions: [],
  primaryCareProvider: "Dr. Sarah Williams",
  nephrologist: "Dr. Michael Chen",
  otherSpecialists: null,
  insuranceProvider: "Blue Cross Blue Shield",
  insurancePolicyNumber: "BCBS12345678",
  transplantCenter: "University Medical Center",
  transplantCoordinator: "Jessica Adams, RN",
  transplantCoordinatorPhone: "(555) 123-4567",
  createdAt: new Date()
};

export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    console.warn("useUser called outside of UserProvider. Using fallback user data. This is not recommended for production.");
    
    // Return fallback context with mock user instead of throwing an error
    return {
      user: defaultUser,
      setUser: () => {
        console.warn("setUser called outside of UserProvider context. This operation won't have any effect.");
      }
    };
  }
  
  return context;
}
