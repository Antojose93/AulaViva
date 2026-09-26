import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { FirebaseAuthService } from '../services/firebaseAuth';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<User>;
  register: (
    name: string,
    email: string,
    pass: string,
    role: 'mentor' | 'student',
    grade?: string
  ) => Promise<User>;
  logout: () => Promise<void>;
}

const AUTH_STORAGE_KEY = 'aula_viva_session_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Check if there is an existing validated session in storage
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as User;
      }
    } catch (e) {
      console.warn('Error reading saved session user', e);
    }
    return null;
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to Firebase Auth changes
    const unsubscribe = FirebaseAuthService.subscribeToAuth((appUser, fbUser) => {
      setFirebaseUser(fbUser);
      if (appUser && fbUser) {
        setUser(appUser);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(appUser));
          StorageService.setCurrentUser(appUser.id);
        } catch (e) {
          console.warn('Error saving session cache', e);
        }
      } else {
        const saved = localStorage.getItem(AUTH_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as User;
            setUser(parsed);
            StorageService.setCurrentUser(parsed.id);
          } catch {
            setUser(null);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            StorageService.clearCurrentUser();
          }
        } else {
          setUser(null);
          try {
            localStorage.removeItem(AUTH_STORAGE_KEY);
            StorageService.clearCurrentUser();
          } catch (e) {
            console.warn('Error clearing session cache', e);
          }
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const loggedUser = await FirebaseAuthService.loginWithEmail(email, pass);
      if (loggedUser) {
        setUser(loggedUser);
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
          StorageService.setCurrentUser(loggedUser.id);
        } catch (e) {
          console.warn('Error saving session cache', e);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    setLoading(true);
    try {
      const loggedUser = await FirebaseAuthService.loginWithGoogle();
      setUser(loggedUser);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
        StorageService.setCurrentUser(loggedUser.id);
      } catch (e) {
        console.warn('Error saving session cache', e);
      }
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    pass: string,
    role: 'mentor' | 'student',
    grade?: string
  ) => {
    setLoading(true);
    try {
      const newUser = await FirebaseAuthService.registerWithEmail(name, email, pass, role, grade);
      setUser(newUser);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
        StorageService.setCurrentUser(newUser.id);
      } catch (e) {
        console.warn('Error saving new registered user session', e);
      }
      return newUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await FirebaseAuthService.logout();
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      StorageService.clearCurrentUser();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        login,
        loginWithGoogle,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
