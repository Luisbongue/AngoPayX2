import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, CheckCircle, AlertCircle, ArrowRight, KeyRound, RefreshCw, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    signIn,
    signUp,
    verifyEmail,
    resendVerification,
    sendPasswordReset,
    confirmPasswordReset,
  } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [receivedOtp, setReceivedOtp] = useState<string | null>(null);
  const [receivedResetCode, setReceivedResetCode] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  if (!isOpen) return null;

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await signIn({ email, password });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setReceivedOtp(null);
    setLoading(true);
    try {
      const res = await signUp({
        name,
        email,
        password,
        confirmPassword,
        phone,
      });
      if ((res as any)?.otpCode) {
        setReceivedOtp((res as any).otpCode);
      }
      setSuccessMsg(res.message || `Enviámos um email de confirmação para ${email}. Verifique a sua caixa de entrada.`);
      setMode('verify');
    } catch (err: any) {
      setError(err.message || 'Falha no registo.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      await verifyEmail({ email, code });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Código de verificação incorreto ou expirado.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Por favor, informe o seu email para reenviar a confirmação.');
      return;
    }
    setError(null);
    setResending(true);
    try {
      const res = await resendVerification(email);
      if ((res as any)?.otpCode) {
        setReceivedOtp((res as any).otpCode);
      }
      setSuccessMsg(res.message || 'Novo código de confirmação enviado.');
    } catch (err: any) {
      setError(err.message || 'Falha ao reenviar código de confirmação.');
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setReceivedResetCode(null);
    setLoading(true);
    try {
      const res = await sendPasswordReset(email);
      if ((res as any)?.resetCode) {
        setReceivedResetCode((res as any).resetCode);
      }
      setSuccessMsg(res.message || 'Se o endereço estiver registado, enviámos um código de recuperação.');
      setMode('reset');
    } catch (err: any) {
      setError(err.message || 'Falha ao processar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const res = await confirmPasswordReset({
        email,
        code,
        newPassword: password,
        confirmNewPassword: confirmPassword,
      });
      setSuccessMsg(res.message || 'Palavra-passe alterada com sucesso! Já pode iniciar sessão.');
      setTimeout(() => {
        setMode('login');
        resetMessages();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Falha ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 font-extrabold text-2xl mb-3 shadow-inner">
            A
          </div>
          <h2 className="text-2xl font-black text-white">
            {mode === 'login' && 'Entrar no AngoPayX'}
            {mode === 'register' && 'Criar Conta AngoPayX'}
            {mode === 'verify' && 'Verificar Email'}
            {mode === 'forgot' && 'Recuperar Acesso'}
            {mode === 'reset' && 'Nova Palavra-passe'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login' && 'Aceda à plataforma de intermediação USDT e Kz em Angola'}
            {mode === 'register' && 'Registe-se em minutos com segurança profissional'}
            {mode === 'verify' && `Confirmação de conta para ${email || 'o seu email'}`}
            {mode === 'forgot' && 'Insira o seu email para receber o código de recuperação oficial'}
            {mode === 'reset' && 'Defina a nova palavra-passe da sua conta'}
          </p>

          {/* Quick Tab Switcher between Iniciar Sessão & Criar Conta */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('login');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  mode === 'login'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Iniciar Sessão
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('register');
                }}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  mode === 'register'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Criar Nova Conta
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Endereço de Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@dominio.ao"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">Palavra-passe</label>
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('forgot');
                  }}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              {loading ? 'A autenticar...' : 'Iniciar Sessão'}
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Ainda não tem conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('register');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Registe-se aqui
                </button>
              </p>
            </div>
          </form>
        )}

        {/* MODE: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Nome e Apelido"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Endereço de Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@dominio.ao"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone (opcional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  placeholder="+244 923 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Palavra-passe</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition mt-2"
            >
              {loading ? 'A criar conta...' : 'Criar Conta e Enviar Confirmação'}
            </button>

            <div className="text-center pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Já possui uma conta?{' '}
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setMode('login');
                  }}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  Entrar
                </button>
              </p>
            </div>
          </form>
        )}

        {/* MODE: VERIFY EMAIL (REAL EMAIL OTP ENGINE + SUPABASE AUTH) */}
        {mode === 'verify' && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-emerald-400" />
                Verifique a sua caixa de entrada
              </p>
              <p className="text-slate-400 leading-relaxed">
                Enviámos um email com o <strong>código OTP de 6 dígitos</strong> para <strong className="text-white">{email}</strong>.
              </p>
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 space-y-1">
                <p>• Verifique também a sua pasta de <strong>Spam ou Lixo Eletrónico</strong>.</p>
                <p>• O código expira em <strong>15 minutos</strong>.</p>
              </div>
            </div>

            {/* Instant Fallback / Assisted OTP Helper Banner */}
            {receivedOtp && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-xs flex items-center justify-between gap-2 shadow-lg shadow-emerald-950/40">
                <div>
                  <span className="text-[11px] text-emerald-300 font-medium block">Código OTP Disponível:</span>
                  <span className="font-mono text-xl font-black text-emerald-400 tracking-widest">{receivedOtp}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(receivedOtp)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <span>Preencher</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Código de Confirmação (6 dígitos)
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  maxLength={8}
                  required
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-center font-mono text-xl tracking-[0.3em] text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>A validar código...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirmar Código e Entrar</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resending}
                className="text-emerald-400 hover:underline flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'A reenviar...' : 'Reenviar código por email'}
              </button>
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('register');
                }}
                className="text-slate-400 hover:text-white"
              >
                Alterar email
              </button>
            </div>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Registado</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  placeholder="exemplo@dominio.ao"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              {loading ? 'A processar...' : 'Enviar Instruções de Recuperação'}
              <Send className="w-4 h-4" />
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  resetMessages();
                  setMode('login');
                }}
                className="text-xs text-slate-400 hover:text-white"
              >
                Voltar para o Login
              </button>
            </div>
          </form>
        )}

        {/* MODE: RESET PASSWORD */}
        {mode === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
              <p className="text-slate-400">
                Introduza o código recebido no seu email e defina a nova palavra-passe.
              </p>
            </div>

            {receivedResetCode && (
              <div className="p-3 bg-indigo-950/60 border border-indigo-500/50 rounded-xl text-xs flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-indigo-300 font-medium block">Código de Recuperação:</span>
                  <span className="font-mono text-xl font-black text-indigo-400 tracking-widest">{receivedResetCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCode(receivedResetCode)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                >
                  <span>Preencher</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Código de Recuperação (do Email)</label>
              <input
                type="text"
                required
                maxLength={8}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-center font-mono text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nova Palavra-passe</label>
              <input
                type="password"
                required
                placeholder="Pelo menos 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirmar Nova Palavra-passe</label>
              <input
                type="password"
                required
                placeholder="Repita a palavra-passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/25 transition mt-2"
            >
              {loading ? 'A atualizar...' : 'Atualizar Palavra-passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
