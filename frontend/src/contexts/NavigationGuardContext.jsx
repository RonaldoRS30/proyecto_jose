import {
  createContext, useCallback, useContext, useMemo, useRef,
} from 'react';

const NavigationGuardContext = createContext(null);

export function NavigationGuardProvider({ children }) {
  const guardsRef = useRef([]);

  const registerGuard = useCallback((guardFn) => {
    guardsRef.current.push(guardFn);
    return () => {
      guardsRef.current = guardsRef.current.filter((g) => g !== guardFn);
    };
  }, []);

  const runGuards = useCallback(async () => {
    for (const guard of guardsRef.current) {
      const canLeave = await guard();
      if (!canLeave) return false;
    }
    return true;
  }, []);

  const value = useMemo(() => ({ registerGuard, runGuards }), [registerGuard, runGuards]);

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  const ctx = useContext(NavigationGuardContext);
  if (!ctx) {
    return {
      registerGuard: () => () => {},
      runGuards: async () => true,
    };
  }
  return ctx;
}
