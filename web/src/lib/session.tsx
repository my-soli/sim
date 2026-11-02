"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "auth_token";

interface SessionState {
  token: string | null;
  signedIn: boolean;
  signIn: (token: string) => void;
  signOut: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      setToken(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      /* storage unavailable: start signed out */
    }
    setRestored(true);
  }, []);

  const signIn = (t: string) => {
    setToken(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
  };

  const signOut = () => {
    setToken(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  // Avoid a flash of signed-out UI before localStorage is read on first mount.
  if (!restored) return null;

  return (
    <SessionContext.Provider value={{ token, signedIn: token != null, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
