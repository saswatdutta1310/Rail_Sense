import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  station_id: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Bypass auth entirely
      setUser({
        id: '123',
        email: 'admin@railsense.ai',
        full_name: 'Admin User',
        role: 'superadmin',
        station_id: null
      });
      setToken('dummy-token');
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (newToken: string) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}


// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
