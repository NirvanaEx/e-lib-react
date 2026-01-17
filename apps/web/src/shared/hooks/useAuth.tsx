import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import i18n from "../../app/i18n";

export type AuthUser = {
  id: number;
  login: string;
  role: string;
  departmentId?: number | null;
  department?: string | null;
  mustChangePassword?: boolean;
  lang?: string | null;
  permissions?: string[];
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

  const setAuth = (newToken: string, newUser: AuthUser) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    if (newUser.lang) {
      localStorage.setItem("lang", newUser.lang);
      i18n.changeLanguage(newUser.lang);
    }
  };

  const updateUser = (patch: Partial<AuthUser>) => {
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
  };

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ token, user, setAuth, updateUser, clearAuth }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
