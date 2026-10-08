import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/api';

interface User {
  id: number;
  email: string;
  display_name: string;
  avatar_url?: string;
  role: 'admin' | 'member';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, display_name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      api.get<{ user: User }>('/auth/me')
        .then(({ user }) => setUser(user))
        .catch((err) => {
          // Só desloga se o servidor REJEITOU o token (401).
          // Antes, qualquer falha — rate limit 429, queda de rede, 500 — apagava
          // o token do localStorage e jogava o aluno na tela de login com a
          // mensagem "sessão expirada", mesmo com o token perfeitamente válido.
          const status = err instanceof ApiError ? err.status : 0;
          if (status === 401) {
            api.setToken(null);
            setUser(null);
            return;
          }
          // Falha transitória: preserva o token e tenta de novo em 3s.
          setTimeout(() => {
            api.get<{ user: User }>('/auth/me')
              .then(({ user }) => setUser(user))
              .catch((e) => {
                if ((e instanceof ApiError ? e.status : 0) === 401) {
                  api.setToken(null);
                  setUser(null);
                }
              });
          }, 3000);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    api.setToken(data.token);
    setUser(data.user);
  };

  const signup = async (email: string, password: string, display_name: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/signup', { email, password, display_name });
    api.setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    api.setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAdmin: user?.role === 'admin', login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
