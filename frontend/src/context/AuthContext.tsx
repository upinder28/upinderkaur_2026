import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getMe } from '../api/services';

interface User { id: string; name: string; email: string; role: string; }
interface AuthCtx { user: User | null; token: string | null; login: (token: string, user: User) => void; logout: () => void; loading: boolean; }

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      getMe().then(setUser).catch(() => { setToken(null); localStorage.removeItem('token'); }).finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [token]);

  const login = (t: string, u: User) => { localStorage.setItem('token', t); setToken(t); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, token, login, logout, loading }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
