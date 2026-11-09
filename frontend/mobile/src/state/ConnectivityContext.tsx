import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

const Ctx = createContext<{ online: boolean }>({ online: true });

/** Advisory only: a device marked online can still fail to reach the server. */
export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    return unsubscribe;
  }, []);
  return <Ctx.Provider value={{ online }}>{children}</Ctx.Provider>;
}

export const useConnectivity = () => useContext(Ctx);
