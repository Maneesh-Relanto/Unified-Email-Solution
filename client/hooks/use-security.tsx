import { createContext, useContext, useState } from "react";

interface SecurityContextType {
  isSecurityModeActive: boolean;
  toggleSecurityMode: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(
  undefined,
);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isSecurityModeActive, setIsSecurityModeActive] = useState(false);

  const toggleSecurityMode = () => {
    setIsSecurityModeActive((prev) => !prev);
  };

  return (
    <SecurityContext.Provider
      value={{ isSecurityModeActive, toggleSecurityMode }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurityMode() {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error("useSecurityMode must be used within a SecurityProvider");
  }
  return context;
}
