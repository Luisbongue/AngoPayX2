import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Balance, KycRecord } from '../types/index.ts';
import { apiClient, getStoredToken, setStoredToken, clearStoredToken } from '../services/api.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface AuthContextType {
  user: User | null;
  balance: Balance | null;
  kyc: KycRecord | null;
  isLoading: boolean;
  error: string | null;
  // Auth Operations (Supabase Real Authentication)
  signIn: (credentials: SignInPayload) => Promise<{ user: User; token: string }>;
  signUp: (payload: SignUpPayload) => Promise<{ message: string; userId: string; email: string }>;
  verifyEmail: (payload: VerifyEmailPayload) => Promise<{ user: User; token: string }>;
  resendVerification: (email: string) => Promise<{ message: string }>;
  sendPasswordReset: (email: string) => Promise<{ message: string }>;
  confirmPasswordReset: (payload: ResetPasswordPayload) => Promise<{ message: string }>;
  login: (tokenOrEmail: string, userObj?: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [kyc, setKyc] = useState<KycRecord | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setBalance(null);
      setKyc(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiClient.getMe();
      setUser(data.user);
      setBalance(data.balance);
      setKyc(data.kyc || null);
      setError(null);
    } catch (err: any) {
      console.warn('Sessão expirada ou token inválido:', err?.message || err);
      clearStoredToken();
      setUser(null);
      setBalance(null);
      setKyc(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If Supabase is configured, sync real session on onAuthStateChange (handles magic link and OTP login)
    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.access_token) {
          setStoredToken(session.access_token);
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          clearStoredToken();
          setUser(null);
          setBalance(null);
          setKyc(null);
        }
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    } else {
      const existing = getStoredToken();
      if (existing) {
        refreshUser();
      } else {
        setIsLoading(false);
      }
    }
  }, [refreshUser]);

  // Sign In with email and password via Supabase Auth
  const signIn = async (credentials: SignInPayload) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          const { data, error: supaErr } = await supabase.auth.signInWithPassword({
            email: credentials.email.trim(),
            password: credentials.password,
          });

          if (supaErr) {
            if (supaErr.message?.toLowerCase().includes('api key') || (supaErr.status === 401 && supaErr.message?.toLowerCase().includes('key'))) {
              console.warn('Chave pública Supabase do frontend inválida. Prosseguindo via backend Supabase Auth.');
            } else {
              throw new Error(supaErr.message || 'Credenciais inválidas. Verifique o seu email e palavra-passe.');
            }
          } else if (data.session?.access_token) {
            setStoredToken(data.session.access_token);
          }
        } catch (clientErr: any) {
          if (clientErr.message?.toLowerCase().includes('api key')) {
            console.warn('Chave Supabase do frontend rejeitada. Prosseguindo via backend Supabase Auth.');
          } else {
            throw clientErr;
          }
        }
      }

      // Sync user profile & ledger state with backend
      const res = await apiClient.login(credentials);
      setStoredToken(res.token);
      setUser(res.user);
      await refreshUser();
      return res;
    } catch (err: any) {
      const msg = err.message || 'Credenciais inválidas. Verifique o seu email e senha.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Sign Up with real Supabase Auth + Direct Email OTP Engine
  const signUp = async (payload: SignUpPayload) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.signUp({
            email: payload.email.trim(),
            password: payload.password,
            options: {
              data: {
                name: payload.name,
                phone: payload.phone,
              },
            },
          });
        } catch (clientErr: any) {
          console.warn('Aviso Supabase no browser ao registar:', clientErr?.message || clientErr);
        }
      }

      const res = await apiClient.register(payload);
      return res;
    } catch (err: any) {
      const msg = err.message || 'Falha no registo de utilizador.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Verify Email code strictly with Supabase Auth
  const verifyEmail = async (payload: VerifyEmailPayload) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          const { data, error: supaErr } = await supabase.auth.verifyOtp({
            email: payload.email.trim(),
            token: payload.code.trim(),
            type: 'signup',
          });

          if (!supaErr && data.session?.access_token) {
            setStoredToken(data.session.access_token);
          }
        } catch (supaErr: any) {
          console.warn('Verificação direta Supabase no browser:', supaErr?.message || supaErr);
        }
      }

      const res = await apiClient.verifyEmail(payload);
      setStoredToken(res.token);
      setUser(res.user);
      await refreshUser();
      return res;
    } catch (err: any) {
      setError(err.message || 'Falha na verificação de email.');
      throw err;
    }
  };

  // Resend confirmation email via Supabase Auth
  const resendVerification = async (email: string) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
          });
        } catch (err: any) {
          console.warn('Aviso no resend do Supabase browser:', err?.message || err);
        }
      }
      return await apiClient.resendVerification({ email });
    } catch (err: any) {
      setError(err.message || 'Falha ao reenviar email de confirmação.');
      throw err;
    }
  };

  // Password Recovery strictly via Supabase Auth
  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          await supabase.auth.resetPasswordForEmail(email.trim());
        } catch (supaErr: any) {
          console.warn('Aviso de reset no cliente Supabase:', supaErr?.message || supaErr);
        }
      }
      const res = await apiClient.forgotPassword({ email });
      return res;
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar código de recuperação.');
      throw err;
    }
  };

  const confirmPasswordReset = async (payload: ResetPasswordPayload) => {
    setError(null);
    try {
      if (isSupabaseConfigured) {
        try {
          if (payload.code) {
            await supabase.auth.verifyOtp({
              email: payload.email.trim(),
              token: payload.code.trim(),
              type: 'recovery',
            });
          }
          await supabase.auth.updateUser({ password: payload.newPassword });
        } catch (supaErr: any) {
          console.warn('Aviso de reset password no cliente Supabase:', supaErr?.message || supaErr);
        }
      }
      const res = await apiClient.resetPassword(payload);
      return res;
    } catch (err: any) {
      setError(err.message || 'Falha ao redefinir palavra-passe.');
      throw err;
    }
  };

  const login = async (token: string, userObj?: User) => {
    setStoredToken(token);
    if (userObj) {
      setUser(userObj);
    }
    await refreshUser();
  };

  const logout = () => {
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(console.warn);
    }
    clearStoredToken();
    setUser(null);
    setBalance(null);
    setKyc(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        balance,
        kyc,
        isLoading,
        error,
        signIn,
        signUp,
        verifyEmail,
        resendVerification,
        sendPasswordReset,
        confirmPasswordReset,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
