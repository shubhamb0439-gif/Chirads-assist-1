import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, User } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      loadUser(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      if (data) setUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingUser) {
        return { success: false, error: 'User not found' };
      }

      if (existingUser.password === null) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ password })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;

        const updatedUser = { ...existingUser, password };
        setUser(updatedUser);
        localStorage.setItem('userId', updatedUser.id);
        return { success: true };
      }

      if (existingUser.password === password) {
        setUser(existingUser);
        localStorage.setItem('userId', existingUser.id);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid password' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Login failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userId');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
