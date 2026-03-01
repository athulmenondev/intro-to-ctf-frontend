import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authAPI, setToken, clearToken, isAuthenticated as checkAuth } from '../api';

interface AuthUser {
  id: string;
  username: string;
  email: string;
  points?: number;
  isAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    if (checkAuth()) {
      try {
        const token = localStorage.getItem('ctf_token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({
            id: payload.userId,
            username: payload.username,
            email: '',
            isAdmin: payload.isAdmin ?? false,
          });
        }
      } catch {
        clearToken();
      }
    }
    setIsLoading(false);

    const handleExpired = () => {
      clearToken();
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    try {
      const res = await authAPI.login(username, password);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    setError(null);
    try {
      const res = await authAPI.register(username, email, password);
      setToken(res.token);
      setUser(res.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: !!user?.isAdmin,
        isLoading,
        login,
        register,
        logout,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
