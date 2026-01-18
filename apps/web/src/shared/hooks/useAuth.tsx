import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from "react";
import axios from "axios";
import i18n from "../../app/i18n";
import { me } from "../../features/auth/auth.api";

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
  token: string | null;
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user?.lang) {
      i18n.changeLanguage(user.lang);
    }
  }, [user]);

  const setAuth = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (newUser.lang) {
      localStorage.setItem("lang", newUser.lang);
      i18n.changeLanguage(newUser.lang);
    }
  }, []);

  const updateUser = useCallback((patch: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      if (next.lang) {
        localStorage.setItem("lang", next.lang);
        i18n.changeLanguage(next.lang);
      }
      return next;
    });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (user?.mustChangePassword) return;
    let cancelled = false;

    const refreshUser = async () => {
      try {
        const data = await me();
        if (cancelled || !data?.user) return;
        setAuth(token, data.user);
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

    refreshUser();
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
  }, [token, setAuth, clearAuth]);

  const value = useMemo(() => ({ token, user, setAuth, updateUser, clearAuth }), [token, user, setAuth, updateUser, clearAuth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
