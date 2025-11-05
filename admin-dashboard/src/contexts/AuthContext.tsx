import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import type { User, IdTokenResult } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  role: 'admin' | 'analyst' | 'support' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [role, setRole] = useState<'admin' | 'analyst' | 'support' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get ID token to check custom claims
        const tokenResult: IdTokenResult = await firebaseUser.getIdTokenResult();
        const claims = tokenResult.claims;

        // Check if user has admin claim
        const hasAdminClaim = claims.admin === true;
        const userRole = claims.role as 'admin' | 'analyst' | 'support' | undefined;

        if (!hasAdminClaim) {
          // Not an admin, sign them out
          console.error('User does not have admin access');
          await firebaseSignOut(auth);
          setUser(null);
          setIsAdmin(false);
          setRole(null);
        } else {
          setUser(firebaseUser);
          setIsAdmin(true);
          setRole(userRole || 'admin');
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Force token refresh to get latest custom claims
      await userCredential.user.getIdToken(true);
      
      // Check admin claim
      const tokenResult = await userCredential.user.getIdTokenResult();
      if (!tokenResult.claims.admin) {
        await firebaseSignOut(auth);
        throw new Error('Access denied. Admin privileges required.');
      }
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAdmin,
    role,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

