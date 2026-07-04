"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { API_BASE } from "@/lib/adminConfig";

type AdminCtx = {
  ready: boolean; // sessionStorage 읽기 완료(하이드레이션 미스매치 방지)
  loggedIn: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  api: (path: string, opts?: RequestInit) => Promise<Response>;
};

const Ctx = createContext<AdminCtx | null>(null);
const STORE_KEY = "admin-pw";

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [pw, setPw] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORE_KEY);
    if (saved) setPw(saved);
    setReady(true);
  }, []);

  const login = useCallback(async (candidate: string) => {
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: candidate }),
    });
    if (!res.ok) return false;
    sessionStorage.setItem(STORE_KEY, candidate);
    setPw(candidate);
    return true;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORE_KEY);
    setPw(null);
  }, []);

  const api = useCallback(
    (path: string, opts: RequestInit = {}) =>
      fetch(`${API_BASE}${path}`, {
        ...opts,
        headers: { ...(opts.headers || {}), "x-admin-password": pw ?? "" },
      }),
    [pw],
  );

  return (
    <Ctx.Provider value={{ ready, loggedIn: !!pw, login, logout, api }}>{children}</Ctx.Provider>
  );
}

export function useAdmin(): AdminCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used within AdminProvider");
  return c;
}
