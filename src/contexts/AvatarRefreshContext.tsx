import { createContext, useContext, useState, ReactNode } from 'react';

type AvatarRefreshContextType = {
  refreshKey: number;
  triggerRefresh: () => void;
};

const AvatarRefreshContext = createContext<AvatarRefreshContextType | undefined>(undefined);

export function AvatarRefreshProvider({ children }: { children: ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <AvatarRefreshContext.Provider value={{ refreshKey, triggerRefresh }}>
      {children}
    </AvatarRefreshContext.Provider>
  );
}

export function useAvatarRefresh() {
  const context = useContext(AvatarRefreshContext);
  if (context === undefined) {
    throw new Error('useAvatarRefresh must be used within an AvatarRefreshProvider');
  }
  return context;
}
