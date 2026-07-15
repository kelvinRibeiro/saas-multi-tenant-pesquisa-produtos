import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { getToken, setToken, clearToken } from "../api/client";
import type { AuthUser, AuthCompany } from "../types";

interface Session {
  user: AuthUser;
  company: AuthCompany;
}

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => void;
}

const SESSION_KEY = "saas_session";

function loadStoredSession(): Session | null {
  if (!getToken()) return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadStoredSession);

  // Sincroniza sessão entre abas: se outra aba fizer login/logout, esta aba
  // reflete o mesmo estado em vez de continuar exibindo o usuário antigo
  // enquanto já busca dados com o token novo (localStorage é compartilhado).
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SESSION_KEY || e.key === null) {
        setSession(loadStoredSession());
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const applySession = useCallback((token: string, user: AuthUser, company: AuthCompany) => {
    setToken(token);
    localStorage.setItem(SESSION_KEY, JSON.stringify({ user, company }));
    setSession({ user, company });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      applySession(res.token, res.user, res.company);
    },
    [applySession],
  );

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const res = await authApi.register(payload);
      applySession(res.token, res.user, res.company);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isAuthenticated: !!session, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
