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

    try {
      // 1. Recover user directly from Supabase Auth session
      if (isSupabaseConfigured) {
        const { data: { user: supaUser }, error: supaErr } = await supabase.auth.getUser();
        if (supaUser && !supaErr) {
          const role = (supaUser.email && ['luisbongue4@gmail.com'].includes(supaUser.email.toLowerCase()))
            ? 'super_admin'
            : ((supaUser.user_metadata?.role as any) || 'client');

          const currentU: User = {
            id: supaUser.id,
            name: supaUser.user_metadata?.name || supaUser.email?.split('@')[0] || 'Utilizador',
            email: supaUser.email || '',
            phone: supaUser.user_metadata?.phone || '',
            role,
            accountStatus: 'Ativa',
            kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
            emailVerified: Boolean(supaUser.email_confirmed_at),
            passwordHash: '',
            createdAt: supaUser.created_at,
            depositAddressTRC20: `T${supaUser.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 33)}`,
          };
          setUser(currentU);
        } else if (!token) {
          setUser(null);
          setBalance(null);
          setKyc(null);
          setIsLoading(false);
          return;
        }
      }

      // 2. Sync extended backend data (balance, kyc, ledger) if backend API is reachable
      if (token) {
        try {
          const data = await apiClient.getMe();
          if (data.user) setUser(data.user);
          if (data.balance) setBalance(data.balance);
          if (data.kyc) setKyc(data.kyc);
          setError(null);
        } catch (apiErr: any) {
          console.warn('API getMe em segundo plano:', apiErr?.message);
        }
      }
    } catch (err: any) {
      console.warn('Aviso ao sincronizar sessão de utilizador:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Sync real Supabase session on auth state changes (confirmations, magic links, logins)
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

      // Initial check on mount
      refreshUser();

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
        const { data, error: supaErr } = await supabase.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        if (supaErr) {
          throw new Error(supaErr.message || 'Credenciais inválidas. Verifique o seu email e palavra-passe.');
        }

        if (data.session?.access_token) {
          setStoredToken(data.session.access_token);
        }

        if (data.user) {
          const role = (data.user.email && ['luisbongue4@gmail.com'].includes(data.user.email.toLowerCase()))
            ? 'super_admin'
            : ((data.user.user_metadata?.role as any) || 'client');

          const localUser: User = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Utilizador',
            email: data.user.email || credentials.email.trim(),
            phone: data.user.user_metadata?.phone || '',
            role,
            accountStatus: 'Ativa',
            kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
            emailVerified: Boolean(data.user.email_confirmed_at),
            passwordHash: '',
            createdAt: data.user.created_at,
            depositAddressTRC20: `T${data.user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 33)}`,
          };
          setUser(localUser);
        }
      }

      // Sync user profile & ledger state with backend non-blockingly
      try {
        const res = await apiClient.login(credentials);
        if (res.token) setStoredToken(res.token);
        if (res.user) setUser(res.user);
      } catch (backendErr) {
        console.warn('Aviso backend login sync (não crítico):', backendErr);
      }

      await refreshUser();
      return {
        user: user!,
        token: getStoredToken() || '',
      };
    } catch (err: any) {
      const msg = err.message || 'Credenciais inválidas. Verifique o seu email e senha.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Sign Up with Supabase Auth (Direct, Clean, No external email dependency)
  const signUp = async (payload: SignUpPayload) => {
    setError(null);
    try {
      if (!payload.name || !payload.email || !payload.password) {
        throw new Error('Nome, email e palavra-passe são obrigatórios.');
      }
      if (payload.confirmPassword && payload.password !== payload.confirmPassword) {
        throw new Error('As palavras-passe inseridas não coincidem.');
      }
      if (payload.password.length < 6) {
        throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
      }

      if (!isSupabaseConfigured) {
        throw new Error('Configuração do Supabase ausente. Verifique as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.');
      }

      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin
          ? (window.location.origin.includes('localhost') ? window.location.origin : 'https://angopayx.vercel.app')
          : 'https://angopayx.vercel.app';

      const { data, error: supaErr } = await supabase.auth.signUp({
        email: payload.email.trim(),
        password: payload.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: payload.name.trim(),
            phone: payload.phone ? payload.phone.trim() : '',
          },
        },
      });

      if (supaErr) {
        throw new Error(supaErr.message || 'Falha ao criar conta no Supabase Auth.');
      }

      // Sync record to backend in background if backend is reachable (non-blocking)
      try {
        await apiClient.register(payload);
      } catch (backendErr) {
        console.warn('Aviso de sincronização backend de registo (não crítico):', backendErr);
      }

      return {
        message: `Conta criada com sucesso! Enviámos um email de confirmação oficial pelo Supabase para ${payload.email.trim()}. Verifique a sua caixa de entrada e clique no link de confirmação para ativar a sua conta.`,
        userId: data.user?.id || '',
        email: payload.email.trim(),
      };
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
      if (!payload.email || !payload.code) {
        throw new Error('Email e código de confirmação são obrigatórios.');
      }

      let sessionToken: string | undefined;
      let confirmedUser: User | null = null;

      if (isSupabaseConfigured) {
        let { data, error: supaErr } = await supabase.auth.verifyOtp({
          email: payload.email.trim(),
          token: payload.code.trim(),
          type: 'signup',
        });

        // Also attempt with type 'email' if signup type returns error
        if (supaErr) {
          const retry = await supabase.auth.verifyOtp({
            email: payload.email.trim(),
            token: payload.code.trim(),
            type: 'email',
          });
          if (!retry.error) {
            data = retry.data;
            supaErr = null;
          }
        }

        if (supaErr) {
          throw new Error(supaErr.message || 'Código de confirmação incorreto ou expirado.');
        }

        if (data?.session?.access_token) {
          sessionToken = data.session.access_token;
          setStoredToken(sessionToken);
        }

        if (data?.user) {
          const role = (data.user.email && ['luisbongue4@gmail.com'].includes(data.user.email.toLowerCase()))
            ? 'super_admin'
            : ((data.user.user_metadata?.role as any) || 'client');

          confirmedUser = {
            id: data.user.id,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Utilizador',
            email: data.user.email || payload.email.trim(),
            phone: data.user.user_metadata?.phone || '',
            role,
            accountStatus: 'Ativa',
            kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
            emailVerified: true,
            passwordHash: '',
            createdAt: data.user.created_at,
            depositAddressTRC20: `T${data.user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 33)}`,
          };
          setUser(confirmedUser);
        }
      }

      // Sync with backend if available
      try {
        const res = await apiClient.verifyEmail(payload);
        if (res.user) setUser(res.user);
        if (res.token) setStoredToken(res.token);
      } catch (backendErr) {
        console.warn('Aviso backend na verificação (não crítico):', backendErr);
      }

      await refreshUser();
      return {
        user: confirmedUser || user!,
        token: sessionToken || getStoredToken() || '',
      };
    } catch (err: any) {
      const msg = err.message || 'Falha na verificação de email.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Resend confirmation email via Supabase Auth
  const resendVerification = async (email: string) => {
    setError(null);
    try {
      if (!email || !email.trim()) {
        throw new Error('Por favor, informe o seu email para reenviar a confirmação.');
      }

      if (!isSupabaseConfigured) {
        throw new Error('Configuração do Supabase ausente.');
      }

      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin
          ? (window.location.origin.includes('localhost') ? window.location.origin : 'https://angopayx.vercel.app')
          : 'https://angopayx.vercel.app';

      const { error: supaErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (supaErr) {
        throw new Error(supaErr.message || 'Falha ao reenviar email no Supabase Auth.');
      }

      return {
        message: `Email de confirmação reenviado com sucesso para ${email.trim()}! Verifique a sua caixa de entrada e pasta de spam.`,
      };
    } catch (err: any) {
      const msg = err.message || 'Falha ao reenviar email de confirmação.';
      setError(msg);
      throw new Error(msg);
    }
  };

  // Password Recovery via Supabase Auth
  const sendPasswordReset = async (email: string) => {
    setError(null);
    try {
      if (!email || !email.trim()) {
        throw new Error('Email é obrigatório.');
      }

      if (!isSupabaseConfigured) {
        throw new Error('Configuração do Supabase ausente.');
      }

      const redirectUrl =
        typeof window !== 'undefined' && window.location.origin
          ? (window.location.origin.includes('localhost') ? window.location.origin : 'https://angopayx.vercel.app')
          : 'https://angopayx.vercel.app';

      const { error: supaErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (supaErr) {
        throw new Error(supaErr.message || 'Falha ao solicitar recuperação de palavra-passe no Supabase.');
      }

      return {
        message: 'Se o endereço estiver registado, o Supabase enviou um email com o link de recuperação.',
      };
    } catch (err: any) {
      const msg = err.message || 'Falha ao enviar código de recuperação.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const confirmPasswordReset = async (payload: ResetPasswordPayload) => {
    setError(null);
    try {
      if (!payload.newPassword) {
        throw new Error('A nova palavra-passe é obrigatória.');
      }
      if (payload.newPassword !== payload.confirmNewPassword) {
        throw new Error('As palavras-passe não coincidem.');
      }
      if (payload.newPassword.length < 6) {
        throw new Error('A palavra-passe deve ter pelo menos 6 caracteres.');
      }

      if (isSupabaseConfigured) {
        if (payload.code && payload.code.trim()) {
          const { error: otpErr } = await supabase.auth.verifyOtp({
            email: payload.email.trim(),
            token: payload.code.trim(),
            type: 'recovery',
          });
          if (otpErr) {
            throw new Error(otpErr.message || 'Código de recuperação inválido ou expirado.');
          }
        }
        const { error: updateErr } = await supabase.auth.updateUser({ password: payload.newPassword });
        if (updateErr) {
          throw new Error(updateErr.message || 'Falha ao atualizar palavra-passe no Supabase.');
        }
      }

      // Sync backend in background
      try {
        await apiClient.resetPassword(payload);
      } catch (backendErr) {
        console.warn('Aviso backend reset password:', backendErr);
      }

      return { message: 'Palavra-passe alterada com sucesso! Já pode iniciar sessão.' };
    } catch (err: any) {
      const msg = err.message || 'Falha ao redefinir palavra-passe.';
      setError(msg);
      throw new Error(msg);
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
