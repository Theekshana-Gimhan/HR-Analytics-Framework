import { useEffect, useState } from 'react';

/**
 * useNetworkStatus
 * - Returns current online status and timestamp of last change.
 * - Listens to window 'online' and 'offline' events.
 */
export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [lastChangedAt, setLastChangedAt] = useState<number>(Date.now());

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setLastChangedAt(Date.now());
    };
    const handleOffline = () => {
      setOnline(false);
      setLastChangedAt(Date.now());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { online, lastChangedAt } as const;
}

export default useNetworkStatus;
