"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Shape of the user object the login flow writes to localStorage at
// frontend/app/login/page.tsx:48, plus the fields returned by PATCH /users/:id.
export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  role: "admin" | "worker";
  phone?: string | null;
};

type CurrentUserContextValue = {
  user: CurrentUser | null;
  setUser: (user: CurrentUser | null) => void;
  initials: string;
};

const STORAGE_KEY = "user";
// Fallback for the "remember me" off case — login writes to sessionStorage in that path.
const SESSION_STORAGE_KEY = "user";

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

function readStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CurrentUser> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.id || !parsed.fullName) {
      return null;
    }
    return {
      id: String(parsed.id),
      fullName: String(parsed.fullName),
      email: String(parsed.email ?? ""),
      role: (parsed.role === "admin" ? "admin" : "worker"),
      phone: parsed.phone ?? null,
    };
  } catch {
    return null;
  }
}

function writeStoredUser(user: CurrentUser | null) {
  if (typeof window === "undefined") return;
  const json = user ? JSON.stringify(user) : null;
  if (window.localStorage.getItem(STORAGE_KEY)) {
    if (json) window.localStorage.setItem(STORAGE_KEY, json);
    else window.localStorage.removeItem(STORAGE_KEY);
  }
  if (window.sessionStorage.getItem(SESSION_STORAGE_KEY)) {
    if (json) window.sessionStorage.setItem(SESSION_STORAGE_KEY, json);
    else window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function deriveInitials(name: string | undefined | null): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<CurrentUser | null>(null);

  // Hydrate once on mount; the auth flow writes the user blob to storage on
  // login and removes it on logout (see navbar handleLogout).
  useEffect(() => {
    setUserState(readStoredUser());
  }, []);

  const setUser = useCallback((next: CurrentUser | null) => {
    setUserState(next);
    writeStoredUser(next);
  }, []);

  const initials = useMemo(() => deriveInitials(user?.fullName), [user?.fullName]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({ user, setUser, initials }),
    [user, setUser, initials]
  );

  return (
    <CurrentUserContext.Provider value={value}>
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error("useCurrentUser must be used within a CurrentUserProvider");
  }
  return ctx;
}
