import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import axios from "axios";
import i18n from "../../app/i18n";
import { me, logout } from "../../features/auth/auth.api";

export type AuthUser = {
  id: number;
  login: string;
  role: string;
  roleLevel?: number;
  departmentId?: number | null;
  department?: string | null;
  name?: string | null;
  surname?: string | null;
  patronymic?: string | null;
  fullName?: string | null;
  mustChangePassword?: boolean;
  lang?: string | null;
  permissions?: string[];
  canSubmitFiles?: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  isInitialized: boolean;
  setAuth: (user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user?.lang) {
      i18n.changeLanguage(user.lang);
    }
  }, [user]);

  const setAuth = useCallback((newUser: AuthUser) => {
    setUser(newUser);
    if (newUser.lang) {
      localStorage.setItem("lang", newUser.lang);
      i18n.changeLanguage(newUser.lang);
    }
    setIsInitialized(true);
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (next.lang) {
        localStorage.setItem("lang", next.lang);
        i18n.changeLanguage(next.lang);
      }
      return next;
    });
  }, []);

  const clearAuth = useCallback(() => {
    logout().catch(() => undefined);
    setUser(null);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const refreshUser = async () => {
      try {
        const data = await me();
        if (cancelled || !data?.user) return;
        setAuth(data.user);
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401) {
            clearAuth();
          }
        }
      } finally {
        if (!cancelled) {
          setIsInitialized(true);
        }
      }
    };

    refreshUser();

    return () => {
      cancelled = true;
    };
  }, [setAuth, clearAuth]);

  useEffect(() => {
    if (!user || user.mustChangePassword) return;
    let cancelled = false;

    const refreshUser = async () => {
      try {
        const data = await me();
        if (cancelled || !data?.user) return;
        setAuth(data.user);
      } catch (error) {
        if (cancelled) return;
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status === 401) {
            clearAuth();
          }
        }
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshUser();
      }
    };
    window.addEventListener("focus", refreshUser);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = window.setInterval(refreshUser, 60000);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshUser);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(interval);
    };
  }, [user, setAuth, clearAuth]);

  const value = useMemo(
    () => ({ user, isInitialized, setAuth, updateUser, clearAuth }),
    [user, isInitialized, setAuth, updateUser, clearAuth]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
