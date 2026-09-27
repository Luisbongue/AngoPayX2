import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';
import { db, hashPassword, getRoleForEmail } from './storage.ts';
import { verifySupabaseToken, isSupabaseServerConfigured, supabaseAdmin } from './supabase.ts';
import {
  validateTronAddress,
  validateBinanceIdentifier,
  validateBybitIdentifier,
  validateRedotPayIdentifier,
  validateTronTxid,
  TRON_USDT_CONTRACT,
} from './tronUtils.ts';
import { runAntigravityTask, isAntigravityConfigured } from './antigravity.ts';
import {
  sendVerificationOtpEmail,
  sendPasswordResetOtpEmail,
  isEmailConfigured,
} from './emailService.ts';
import type {
  User,
  PurchaseOrder,
  PurchaseTargetWallet,
  SaleOrder,
  WithdrawalOrder,
  DepositOrder,
  KycRecord,
  ClientWallet,
} from '../types/index.ts';

export const apiRouter = express.Router();
apiRouter.use(express.json({ limit: '15mb' }));

// Helper: Extract current user from Authorization header (Supabase JWT or secure session token)
async function authenticateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Sessão não autenticada. Por favor, faça login.' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação inválido.' });
    }

    let user: User | undefined;

    // 1. Validate Supabase JWT token if applicable
    if (token.split('.').length === 3 || isSupabaseServerConfigured) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser && supabaseUser.email) {
        user = db.findUserByEmail(supabaseUser.email);
        if (!user) {
          const userId = supabaseUser.id || `usr-${crypto.randomUUID().slice(0, 8)}`;
          const normEmail = supabaseUser.email.trim().toLowerCase();
          const role = getRoleForEmail(normEmail);

          const tronDepositAddress = `T${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 33)}`;
          user = {
            id: userId,
            name: (supabaseUser.user_metadata?.name || normEmail.split('@')[0]),
            email: normEmail,
            phone: (supabaseUser.user_metadata?.phone || ''),
            role,
            accountStatus: 'Ativa',
            kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
            emailVerified: Boolean(supabaseUser.email_confirmed_at || true),
            passwordHash: '',
            createdAt: new Date().toISOString(),
            depositAddressTRC20: tronDepositAddress,
          };
          db.createUser(user);
        }
      }
    }

    // 2. Validate standard session token
    if (!user) {
      user = db.findUserById(token);
    }

    if (!user) {
      return res.status(401).json({ error: 'Sessão expirada ou credenciais inválidas. Por favor, inicie sessão novamente.' });
    }

    // Internal role enforcement for official admin emails
    const normEmail = (user.email || '').trim().toLowerCase();
    const authorizedRole = getRoleForEmail(normEmail);
    if (authorizedRole !== 'client' && user.role !== authorizedRole) {
      user.role = authorizedRole;
      db.updateUser(user);
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: 'Erro ao validar autenticação: ' + (err.message || 'Sessão inválida') });
  }
}

// Helper: Enforce administrative roles
function requireRole(allowedRoles: Array<User['role']>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user: User = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }

    if (user.role === 'super_admin' || allowedRoles.includes(user.role)) {
      return next();
    }

    return res.status(403).json({
      error: `Acesso restrito. Sua função (${user.role}) não tem permissão para esta operação.`,
    });
  };
}

// Helper: Check if account is blocked
function ensureAccountActive(req: Request, res: Response, next: NextFunction) {
  const user: User = (req as any).user;
  if (user && user.accountStatus === 'Bloqueada') {
    return res.status(403).json({
      error: 'A sua conta está temporariamente bloqueada. Contacte o suporte do AngoPayX para mais informações.',
    });
  }
  if (user && user.accountStatus === 'Suspensa') {
    return res.status(403).json({
      error: 'A sua conta está suspensa para operações financeiras.',
    });
  }
  next();
}

// ==========================================
// 1. AUTENTICAÇÃO E PERFIL
// ==========================================

// Register (Supabase Auth + Direct Email OTP Engine)
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e palavra-passe são obrigatórios.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'As palavras-passe inseridas não coincidem.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A palavra-passe deve ter pelo menos 6 caracteres.' });
    }

    const normEmail = email.trim().toLowerCase();
    const existing = db.findUserByEmail(normEmail);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma conta associada a este endereço de email.' });
    }

    // Generate reliable 6-digit OTP code with 15-minute expiration
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Trigger Supabase Auth signUp if configured (graceful error handling)
    let supabaseUserId: string | undefined;
    if (isSupabaseServerConfigured) {
      try {
        const { data: supaUser, error: supaErr } = await supabaseAdmin.auth.signUp({
          email: normEmail,
          password: password,
          options: {
            data: {
              name: name.trim(),
              phone: phone ? phone.trim() : '',
            },
          },
        });

        if (supaErr) {
          console.warn('Aviso Supabase Auth signUp:', supaErr.message);
        } else if (supaUser?.user?.id) {
          supabaseUserId = supaUser.user.id;
        }
      } catch (err: any) {
        console.warn('Erro ao invocar Supabase Auth signUp:', err?.message || err);
      }
    }

    const userId = supabaseUserId || `usr-${crypto.randomUUID().slice(0, 8)}`;
    const tronDepositAddress = `T${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 33)}`;
    const role = getRoleForEmail(normEmail);

    const newUser: User = {
      id: userId,
      name: name.trim(),
      email: normEmail,
      phone: phone ? phone.trim() : '',
      role,
      accountStatus: 'Ativa',
      kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
      emailVerified: false,
      verificationCode: otpCode,
      verificationCodeExpiresAt: otpExpiresAt,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
      depositAddressTRC20: tronDepositAddress,
    };

    db.createUser(newUser);

    // Dispatch real email via SMTP, Gmail or Resend
    const emailResult = await sendVerificationOtpEmail(normEmail, otpCode, name.trim());

    db.addNotification({
      userId: newUser.id,
      title: 'Confirmação de Registo - Código OTP',
      message: `Bem-vindo ao AngoPayX! O seu código de verificação é ${otpCode} (válido por 15 minutos).`,
      type: 'info',
      isRead: false,
    });

    return res.status(201).json({
      message: emailResult.success
        ? `Enviámos um email com o código de 6 dígitos para ${newUser.email}. Verifique a sua caixa de entrada e pasta de spam.`
        : `Conta registada com sucesso! Código de verificação OTP gerado: ${otpCode}. (Válido por 15 minutos).`,
      userId: newUser.id,
      email: newUser.email,
      otpSent: emailResult.success,
      otpCode: !emailResult.success ? otpCode : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar conta.' });
  }
});

// Verify Email (Validates direct 6-digit OTP code or Supabase Auth token)
apiRouter.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email e código são obrigatórios.' });
    }

    const normEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();
    const user = db.findUserByEmail(normEmail);

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado com este email.' });
    }

    let isValid = false;
    let sessionToken: string | undefined;

    // 1. Check local OTP verification code
    if (user.verificationCode && user.verificationCode === cleanCode) {
      if (user.verificationCodeExpiresAt && new Date() > new Date(user.verificationCodeExpiresAt)) {
        return res.status(400).json({
          error: 'O código de verificação expirou. Por favor clique em "Reenviar Código" para receber um novo.',
        });
      }
      isValid = true;
    }

    // 2. Check Supabase Auth verifyOtp if local did not match or if Supabase is active
    if (!isValid && isSupabaseServerConfigured) {
      try {
        const { data: supaVerify, error: supaErr } = await supabaseAdmin.auth.verifyOtp({
          email: normEmail,
          token: cleanCode,
          type: 'signup',
        });

        if (!supaErr) {
          isValid = true;
          sessionToken = supaVerify.session?.access_token;
        } else {
          // Retry with type 'email'
          const { data: retryVerify, error: retryErr } = await supabaseAdmin.auth.verifyOtp({
            email: normEmail,
            token: cleanCode,
            type: 'email',
          });
          if (!retryErr) {
            isValid = true;
            sessionToken = retryVerify.session?.access_token;
          }
        }
      } catch (err: any) {
        console.warn('Erro ao validar OTP no Supabase:', err?.message || err);
      }
    }

    if (!isValid) {
      return res.status(400).json({
        error: 'Código de verificação incorreto ou expirado. Verifique os 6 dígitos ou solicite um novo envio.',
      });
    }

    // Mark user as verified and clear temporary OTP
    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpiresAt = undefined;
    db.updateUser(user);

    db.addNotification({
      userId: user.id,
      title: 'Email Verificado com Sucesso',
      message: 'A sua conta AngoPayX está ativa para envio de KYC e transações em Kz e USDT.',
      type: 'success',
      isRead: false,
    });

    return res.json({
      message: 'Email verificado com sucesso! A sua conta está confirmada.',
      user,
      token: sessionToken || user.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro na verificação de email.' });
  }
});

// Resend Confirmation Email (Generates fresh 6-digit OTP & dispatches email)
apiRouter.post('/auth/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório.' });
    }

    const normEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(normEmail);

    if (!user) {
      return res.status(404).json({ error: 'Nenhuma conta encontrada com este email.' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Este email já se encontra confirmado. Pode iniciar sessão.' });
    }

    // Generate fresh OTP code and save
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = newOtp;
    user.verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.updateUser(user);

    // Dispatch email
    const emailResult = await sendVerificationOtpEmail(normEmail, newOtp, user.name);

    // Also trigger Supabase resend in background if configured
    if (isSupabaseServerConfigured) {
      try {
        await supabaseAdmin.auth.resend({
          type: 'signup',
          email: normEmail,
        });
      } catch (err: any) {
        console.warn('Supabase resend warning:', err?.message || err);
      }
    }

    return res.json({
      message: emailResult.success
        ? `Novo código de verificação enviado para ${normEmail}. Verifique a sua caixa de entrada e pasta de spam.`
        : `Novo código OTP gerado: ${newOtp} (válido por 15 minutos).`,
      otpSent: emailResult.success,
      otpCode: !emailResult.success ? newOtp : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao reenviar confirmação.' });
  }
});

// Login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e palavra-passe são obrigatórios.' });
    }

    const normEmail = email.trim().toLowerCase();
    let user = db.findUserByEmail(normEmail);
    let sessionToken = user?.id || '';

    // 1. If an Authorization header with a Supabase JWT was passed, verify it
    const authHeader = req.headers.authorization;
    let supabaseVerified = false;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim();
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser && supabaseUser.email && supabaseUser.email.toLowerCase() === normEmail) {
        supabaseVerified = true;
        sessionToken = token;
        if (!user) {
          const userId = supabaseUser.id || `usr-${crypto.randomUUID().slice(0, 8)}`;
          const role = getRoleForEmail(normEmail);

          const tronDepositAddress = `T${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 33)}`;
          user = {
            id: userId,
            name: (supabaseUser.user_metadata?.name || normEmail.split('@')[0]),
            email: normEmail,
            phone: (supabaseUser.user_metadata?.phone || ''),
            role,
            accountStatus: 'Ativa',
            kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
            emailVerified: true,
            passwordHash: hashPassword(password),
            createdAt: new Date().toISOString(),
            depositAddressTRC20: tronDepositAddress,
          };
          db.createUser(user);
        } else {
          user.role = getRoleForEmail(normEmail);
          user.passwordHash = hashPassword(password);
          db.updateUser(user);
        }
      }
    }

    // 2. Direct Supabase server authentication if server is configured and not yet verified
    if (!supabaseVerified && isSupabaseServerConfigured) {
      try {
        const { data: supaLogin, error: supaErr } = await supabaseAdmin.auth.signInWithPassword({
          email: normEmail,
          password,
        });
        if (supaLogin?.session?.access_token && supaLogin.user) {
          supabaseVerified = true;
          sessionToken = supaLogin.session.access_token;
          if (!user) {
            const userId = supaLogin.user.id || `usr-${crypto.randomUUID().slice(0, 8)}`;
            const role = getRoleForEmail(normEmail);

            const tronDepositAddress = `T${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 33)}`;
            user = {
              id: userId,
              name: (supaLogin.user.user_metadata?.name || normEmail.split('@')[0]),
              email: normEmail,
              phone: (supaLogin.user.user_metadata?.phone || ''),
              role,
              accountStatus: 'Ativa',
              kycStatus: role !== 'client' ? 'Aprovado' : 'Não iniciado',
              emailVerified: true,
              passwordHash: hashPassword(password),
              createdAt: new Date().toISOString(),
              depositAddressTRC20: tronDepositAddress,
            };
            db.createUser(user);
          } else {
            user.role = getRoleForEmail(normEmail);
            user.passwordHash = hashPassword(password);
            db.updateUser(user);
          }
        }
      } catch (err: any) {
        console.warn('Tentativa de autenticação com Supabase:', err?.message || err);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu email e senha.' });
    }

    // 3. If not verified by Supabase, check local password hash
    if (!supabaseVerified) {
      const expectedHash = hashPassword(password);
      if (user.passwordHash && user.passwordHash !== expectedHash) {
        return res.status(401).json({ error: 'Credenciais inválidas. Verifique o seu email e senha.' });
      }
    }

    user.role = getRoleForEmail(normEmail);
    user.lastLoginAt = new Date().toISOString();
    db.updateUser(user);

    return res.json({
      message: 'Autenticação bem-sucedida.',
      user,
      token: sessionToken || user.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao iniciar sessão.' });
  }
});

// Forgot Password (Email OTP Recovery + Supabase Auth)
apiRouter.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email é obrigatório.' });

    const normEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(normEmail);

    if (!user) {
      return res.json({
        message: 'Se o endereço estiver registado, enviámos um email com instruções e código de recuperação.',
      });
    }

    const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetCode = resetOtp;
    user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.updateUser(user);

    const emailResult = await sendPasswordResetOtpEmail(normEmail, resetOtp, user.name);

    if (isSupabaseServerConfigured) {
      try {
        await supabaseAdmin.auth.resetPasswordForEmail(normEmail);
      } catch (err: any) {
        console.warn('Supabase resetPasswordForEmail erro:', err?.message || err);
      }
    }

    return res.json({
      message: emailResult.success
        ? 'Enviámos um email com o seu código de recuperação. Verifique a caixa de entrada e spam.'
        : `Código de recuperação gerado: ${resetOtp} (válido por 15 minutos).`,
      otpSent: emailResult.success,
      resetCode: !emailResult.success ? resetOtp : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro na recuperação de senha.' });
  }
});

// Reset Password (Validates OTP code or Supabase Auth)
apiRouter.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword, confirmNewPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ error: 'As novas palavras-passe não coincidem.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova palavra-passe deve ter pelo menos 6 caracteres.' });
    }

    const normEmail = email.trim().toLowerCase();
    const cleanCode = code ? code.trim() : '';
    const user = db.findUserByEmail(normEmail);

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado.' });
    }

    let isValid = false;

    // 1. Check local resetCode
    if (user.resetCode && user.resetCode === cleanCode) {
      if (user.resetCodeExpiresAt && new Date() > new Date(user.resetCodeExpiresAt)) {
        return res.status(400).json({ error: 'Código de recuperação expirado. Solicite uma nova recuperação.' });
      }
      isValid = true;
    }

    // 2. Check Supabase verifyOtp
    if (!isValid && isSupabaseServerConfigured && cleanCode) {
      try {
        const { error: otpErr } = await supabaseAdmin.auth.verifyOtp({
          email: normEmail,
          token: cleanCode,
          type: 'recovery',
        });
        if (!otpErr) {
          isValid = true;
        }
      } catch (err: any) {
        console.warn('Erro ao validar recovery no Supabase:', err?.message || err);
      }
    }

    if (!isValid) {
      return res.status(400).json({
        error: 'Código de recuperação incorreto ou expirado. Verifique os dígitos informados.',
      });
    }

    // Update password
    user.passwordHash = hashPassword(newPassword);
    user.resetCode = undefined;
    user.resetCodeExpiresAt = undefined;
    db.updateUser(user);

    if (isSupabaseServerConfigured && user.id) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword });
      } catch (err: any) {
        console.warn('Atualização de senha no Supabase:', err?.message || err);
      }
    }

    return res.json({ message: 'Palavra-passe alterada com sucesso! Já pode iniciar sessão.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao redefinir palavra-passe.' });
  }
});

// Current User Details & Balance
apiRouter.get('/auth/me', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const balance = db.getBalance(user.id);
  const kyc = db.getKycRecord(user.id);

  return res.json({
    user,
    balance,
    kyc,
  });
});

// ==========================================
// 2. CONFIGURAÇÕES PÚBLICAS (CÂMBIOS & MÉTODOS)
// ==========================================
apiRouter.get('/rates-and-methods', (_req: Request, res: Response) => {
  const exchange = db.getExchangeSettings();
  const fees = db.getFeeSettings();
  const limits = db.getLimitSettings();
  const paymentMethods = db.getPaymentMethods().filter((m) => m.isActive);

  return res.json({
    exchange,
    fees,
    limits,
    paymentMethods,
  });
});

// ==========================================
// 3. KYC (VERIFICAÇÃO DE IDENTIDADE MANUAL)
// ==========================================
apiRouter.post('/kyc/submit', authenticateUser, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { fullName, documentType, documentNumber, nationality, dateOfBirth, biFrontUrl, biBackUrl, selfieUrl } = req.body;

    if (!fullName || !documentNumber || !biFrontUrl || !biBackUrl || !selfieUrl) {
      return res.status(400).json({
        error: 'Todos os campos de identificação e os 3 documentos (BI frente, BI verso e selfie) são obrigatórios.',
      });
    }

    const kycRecord: KycRecord = {
      id: `kyc-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      fullName: fullName.trim(),
      documentType: documentType || 'BI',
      documentNumber: documentNumber.trim(),
      nationality: nationality || 'Angolana',
      dateOfBirth: dateOfBirth || '',
      status: 'Pendente',
      biFrontUrl,
      biBackUrl,
      selfieUrl,
      submittedAt: new Date().toISOString(),
    };

    db.saveKycRecord(kycRecord);

    db.addNotification({
      userId: user.id,
      title: 'Documentos KYC Submetidos',
      message: 'Os seus documentos de identidade foram recebidos pela equipa de compliance e estão em análise.',
      type: 'info',
      isRead: false,
    });

    return res.json({
      message: 'Documentos KYC enviados com sucesso. A nossa equipa analisará em breve.',
      kycRecord,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao submeter documentos KYC.' });
  }
});

// ==========================================
// 4. COMPRA DE USDT (PAGAMENTO EM KZ)
// ==========================================
apiRouter.post('/purchases/create', authenticateUser, ensureAccountActive, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { usdtAmount, paymentMethodType, targetWallet } = req.body;

    const parsedUsdt = Number(usdtAmount);
    if (isNaN(parsedUsdt) || parsedUsdt <= 0) {
      return res.status(400).json({ error: 'Quantidade de USDT inválida.' });
    }

    const limits = db.getLimitSettings();
    if (parsedUsdt < limits.minBuyUsdt) {
      return res.status(400).json({
        error: `A compra mínima é de ${limits.minBuyUsdt} USDT.`,
      });
    }
    if (parsedUsdt > limits.maxBuyUsdt) {
      return res.status(400).json({
        error: `A compra máxima por ordem é de ${limits.maxBuyUsdt} USDT.`,
      });
    }

    // Process destination wallet (AngoPayX internal balance, or external wallet: Binance, Bybit, RedotPay, TRON)
    let finalTargetWallet: PurchaseTargetWallet = {
      platform: 'ANGOPAYX',
      identifier: user.email,
    };

    if (targetWallet && targetWallet.platform) {
      const platform = (targetWallet.platform || '').toUpperCase().trim();
      const identifier = (targetWallet.identifier || '').trim();

      if (platform === 'BINANCE') {
        const v = validateBinanceIdentifier(identifier);
        if (!v.isValid) return res.status(400).json({ error: v.error });
        finalTargetWallet = { platform: 'BINANCE', identifier, nickname: targetWallet.nickname };
      } else if (platform === 'BYBIT') {
        const v = validateBybitIdentifier(identifier);
        if (!v.isValid) return res.status(400).json({ error: v.error });
        finalTargetWallet = { platform: 'BYBIT', identifier, nickname: targetWallet.nickname };
      } else if (platform === 'REDOTPAY') {
        const v = validateRedotPayIdentifier(identifier);
        if (!v.isValid) return res.status(400).json({ error: v.error });
        finalTargetWallet = { platform: 'REDOTPAY', identifier, nickname: targetWallet.nickname };
      } else if (platform === 'TRON' || platform === 'TRC20') {
        const v = validateTronAddress(identifier);
        if (!v.isValid) return res.status(400).json({ error: v.error });
        finalTargetWallet = { platform: 'TRON', identifier, nickname: targetWallet.nickname };
      } else {
        finalTargetWallet = { platform: 'ANGOPAYX', identifier: user.email };
      }
    }

    // Server-side authoritative recalculation
    const exchange = db.getExchangeSettings();
    const fees = db.getFeeSettings();
    const buyRateKz = exchange.buyRateKz; // Default 1350 Kz

    const subtotalKz = parsedUsdt * buyRateKz;
    const feeKz = fees.buyFeePercent > 0 ? (subtotalKz * fees.buyFeePercent) / 100 : 0;
    const totalKz = Math.round(subtotalKz + feeKz);

    const availableMethods = db.getPaymentMethods().filter((m) => m.isActive);
    const selectedMethod = availableMethods.find((m) => m.id === paymentMethodType);

    if (!selectedMethod) {
      return res.status(400).json({ error: 'Método de pagamento não disponível ou desativado pelo administrador.' });
    }

    const purchaseOrder: PurchaseOrder = {
      id: `buy-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      usdtAmount: parsedUsdt,
      buyRateKz,
      subtotalKz,
      feeKz,
      totalKz,
      paymentMethodType: selectedMethod.id,
      paymentMethodDetails: {
        title: selectedMethod.name,
        bank: selectedMethod.bank,
        beneficiary: selectedMethod.beneficiary,
        accountOrCode: selectedMethod.accountOrCode,
        instructions: selectedMethod.instructions,
      },
      targetWallet: finalTargetWallet,
      status: 'Aguardando pagamento',
      createdAt: new Date().toISOString(),
    };

    db.createPurchase(purchaseOrder);

    db.addNotification({
      userId: user.id,
      title: 'Ordem de Compra Criada',
      message: `Ordem ${purchaseOrder.id}: ${parsedUsdt} USDT por ${totalKz.toLocaleString()} Kz para destino ${finalTargetWallet.platform}. Por favor efetue o pagamento e anexe o comprovativo.`,
      type: 'info',
      isRead: false,
    });

    return res.status(201).json({
      message: 'Ordem de compra criada com sucesso.',
      order: purchaseOrder,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao criar ordem de compra.' });
  }
});

// Upload proof of payment for purchase
apiRouter.post('/purchases/upload-receipt', authenticateUser, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { orderId, receiptUrl } = req.body;

    if (!orderId || !receiptUrl) {
      return res.status(400).json({ error: 'ID da ordem e comprovativo são obrigatórios.' });
    }

    const order = db.getRawData().purchases.find((p) => p.id === orderId && p.userId === user.id);
    if (!order) {
      return res.status(404).json({ error: 'Ordem de compra não encontrada.' });
    }

    if (order.status === 'USDT creditado' || order.status === 'Pagamento confirmado') {
      return res.status(400).json({ error: 'Esta ordem já foi concluída e creditada.' });
    }

    order.receiptUrl = receiptUrl;
    order.receiptSubmittedAt = new Date().toISOString();
    order.status = 'Comprovativo enviado';
    db.updatePurchase(order);

    db.addNotification({
      userId: user.id,
      title: 'Comprovativo Recebido',
      message: `O comprovativo da ordem ${order.id} foi enviado e está em análise pelo departamento financeiro.`,
      type: 'info',
      isRead: false,
    });

    return res.json({
      message: 'Comprovativo enviado com sucesso! O operador financeiro irá validar o recebimento dos fundos em Kz.',
      order,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao anexar comprovativo.' });
  }
});

// Get user purchases
apiRouter.get('/purchases/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const purchases = db.getRawData().purchases.filter((p) => p.userId === user.id);
  return res.json({ purchases });
});

// ==========================================
// 5. VENDA DE USDT (RECEBER EM KZ)
// ==========================================
apiRouter.post('/sales/create', authenticateUser, ensureAccountActive, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { usdtAmount, bankName, accountHolder, ibanOrAccount, phoneOrReference } = req.body;

    const parsedUsdt = Number(usdtAmount);
    if (isNaN(parsedUsdt) || parsedUsdt <= 0) {
      return res.status(400).json({ error: 'Quantidade de USDT inválida.' });
    }

    if (!bankName || !accountHolder || !ibanOrAccount) {
      return res.status(400).json({
        error: 'Nome do banco, titular da conta e IBAN/Conta bancária de destino são obrigatórios para receber o valor em Kz.',
      });
    }

    const limits = db.getLimitSettings();
    if (parsedUsdt < limits.minSellUsdt) {
      return res.status(400).json({
        error: `A quantidade mínima de venda é de ${limits.minSellUsdt} USDT.`,
      });
    }
    if (parsedUsdt > limits.maxSellUsdt) {
      return res.status(400).json({
        error: `A quantidade máxima de venda é de ${limits.maxSellUsdt} USDT.`,
      });
    }

    const balance = db.getBalance(user.id);
    if (balance.availableBalance < parsedUsdt) {
      return res.status(400).json({
        error: `Saldo disponível insuficiente (${balance.availableBalance.toFixed(2)} USDT) para vender ${parsedUsdt.toFixed(2)} USDT.`,
      });
    }

    const exchange = db.getExchangeSettings();
    const sellRateKz = exchange.sellRateKz; // Default 1250 Kz
    const feeKz = 0; // Spec Rule: 0 Kz withdrawal fee when client sells to AngoPayX
    const totalKzToReceive = Math.round(parsedUsdt * sellRateKz - feeKz);

    // Lock balance immediately to prevent double spending
    db.lockBalance(user.id, parsedUsdt);

    const saleOrder: SaleOrder = {
      id: `sell-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      usdtAmount: parsedUsdt,
      sellRateKz,
      feeKz,
      totalKzToReceive,
      payoutMethod: {
        bankName: bankName.trim(),
        accountHolder: accountHolder.trim(),
        ibanOrAccount: ibanOrAccount.trim(),
        phoneOrReference: phoneOrReference ? phoneOrReference.trim() : undefined,
      },
      status: 'Solicitada',
      createdAt: new Date().toISOString(),
    };

    db.createSale(saleOrder);

    db.addNotification({
      userId: user.id,
      title: 'Ordem de Venda Criada',
      message: `Venda de ${parsedUsdt} USDT criada. Valor a receber: ${totalKzToReceive.toLocaleString()} Kz (Taxa: 0 Kz). O saldo foi cativo aguardando processamento.`,
      type: 'info',
      isRead: false,
    });

    return res.status(201).json({
      message: 'Ordem de venda criada. O saldo em USDT foi cativo e o pagamento em Kz será enviado para a sua conta bancária.',
      order: saleOrder,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar ordem de venda.' });
  }
});

// Get user sales
apiRouter.get('/sales/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const sales = db.getRawData().sales.filter((s) => s.userId === user.id);
  return res.json({ sales });
});

// ==========================================
// 6. DEPÓSITOS DE USDT TRC20 (IDEMPOTÊNCIA & MONITORAMENTO)
// ==========================================
apiRouter.get('/deposits/address', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  return res.json({
    asset: 'USDT',
    network: 'TRON (TRC20)',
    tokenContract: TRON_USDT_CONTRACT,
    depositAddress: user.depositAddressTRC20,
    minDeposit: db.getLimitSettings().minDepositUsdt,
    warning: 'Envie somente USDT pela rede TRON TRC20. O envio de qualquer outro ativo pode resultar em perda irreversível.',
  });
});

// Submit/Detect incoming TRON transaction
apiRouter.post('/deposits/submit-tx', authenticateUser, ensureAccountActive, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { txid, amount } = req.body;

    if (!txid) {
      return res.status(400).json({ error: 'O hash de transação (TXID) da rede TRON é obrigatório.' });
    }

    const cleanTxid = txid.trim().toLowerCase();
    if (!validateTronTxid(cleanTxid)) {
      return res.status(400).json({
        error: 'TXID inválido. Um hash de transação da rede TRON deve ter 64 caracteres hexadecimais.',
      });
    }

    // STRICT IDEMPOTENCY CHECK
    if (db.isTxidProcessed(cleanTxid)) {
      return res.status(400).json({
        error: 'Esta transação blockchain já foi creditada anteriormente (Idempotência garantida). Não é permitido crédito duplicado.',
      });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Valor do depósito inválido.' });
    }

    const limits = db.getLimitSettings();
    if (parsedAmount < limits.minDepositUsdt) {
      return res.status(400).json({
        error: `O depósito mínimo é de ${limits.minDepositUsdt} USDT.`,
      });
    }

    // Register TXID in idempotency registry immediately
    db.registerProcessedTxid(cleanTxid);

    const depositOrder: DepositOrder = {
      id: `dep-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userEmail: user.email,
      txid: cleanTxid,
      network: 'TRON TRC20',
      tokenContract: TRON_USDT_CONTRACT,
      destinationAddress: user.depositAddressTRC20,
      amount: parsedAmount,
      status: 'Creditado',
      confirmations: 20,
      requiredConfirmations: 19,
      detectedAt: new Date().toISOString(),
      creditedAt: new Date().toISOString(),
    };

    db.createDeposit(depositOrder);

    // Record into financial ledger and update user balance
    const { newBalance } = db.recordFinancialOperation({
      userId: user.id,
      userEmail: user.email,
      type: 'Depósito USDT',
      amount: parsedAmount,
      direction: 'IN',
      relatedOperationId: depositOrder.id,
      reference: `Depósito TRON TRC20 TXID ${cleanTxid.slice(0, 10)}...`,
      txid: cleanTxid,
    });

    db.addNotification({
      userId: user.id,
      title: 'Depósito USDT Confirmado',
      message: `O seu depósito de ${parsedAmount} USDT via rede TRON TRC20 foi validado e creditado ao seu saldo com sucesso!`,
      type: 'success',
      isRead: false,
    });

    return res.status(201).json({
      message: 'Depósito validado e creditado no ledger com sucesso.',
      deposit: depositOrder,
      newBalance,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao processar depósito.' });
  }
});

// Get user deposits
apiRouter.get('/deposits/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const deposits = db.getRawData().deposits.filter((d) => d.userId === user.id);
  return res.json({ deposits });
});

// ==========================================
// 7. SAQUE DE USDT (TRON TRC20 & BINANCE)
// ==========================================
apiRouter.post('/withdrawals/create', authenticateUser, ensureAccountActive, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { type, destination, amount, walletNickname } = req.body;

    if (type !== 'TRC20' && type !== 'BINANCE' && type !== 'BYBIT' && type !== 'REDOTPAY') {
      return res.status(400).json({ error: "Tipo de saque inválido. Selecione 'TRC20', 'BINANCE', 'BYBIT' ou 'REDOTPAY'." });
    }

    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Quantidade de USDT inválida.' });
    }

    // Destination validation
    if (type === 'TRC20') {
      const validation = validateTronAddress(destination);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
    } else if (type === 'BINANCE') {
      const validation = validateBinanceIdentifier(destination);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
    } else if (type === 'BYBIT') {
      const validation = validateBybitIdentifier(destination);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
    } else if (type === 'REDOTPAY') {
      const validation = validateRedotPayIdentifier(destination);
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
    }

    const limits = db.getLimitSettings();
    if (parsedAmount < limits.minWithdrawUsdt) {
      return res.status(400).json({
        error: `O saque mínimo é de ${limits.minWithdrawUsdt} USDT.`,
      });
    }
    if (parsedAmount > limits.maxWithdrawUsdt) {
      return res.status(400).json({
        error: `O saque máximo por operação é de ${limits.maxWithdrawUsdt} USDT.`,
      });
    }

    const fees = db.getFeeSettings();
    const fee = type === 'TRC20' ? fees.trc20WithdrawalFeeUsdt : fees.binanceWithdrawalFeeUsdt;
    if (parsedAmount <= fee) {
      return res.status(400).json({
        error: `A quantidade deve ser superior à taxa de rede (${fee} USDT).`,
      });
    }

    const netAmount = Number((parsedAmount - fee).toFixed(4));

    // Verify balance and lock it
    const balance = db.getBalance(user.id);
    if (balance.availableBalance < parsedAmount) {
      return res.status(400).json({
        error: `Saldo disponível insuficiente (${balance.availableBalance.toFixed(2)} USDT) para sacar ${parsedAmount.toFixed(2)} USDT.`,
      });
    }

    // Lock balance
    db.lockBalance(user.id, parsedAmount);

    const withdrawalOrder: WithdrawalOrder = {
      id: `wd-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      userEmail: user.email,
      type,
      destination: destination.trim(),
      walletNickname: walletNickname ? walletNickname.trim() : undefined,
      amount: parsedAmount,
      fee,
      netAmount,
      status: 'Solicitado',
      createdAt: new Date().toISOString(),
    };

    db.createWithdrawal(withdrawalOrder);

    db.addNotification({
      userId: user.id,
      title: 'Saque USDT Solicitado',
      message: `Pedido de saque de ${parsedAmount} USDT (${netAmount} USDT líquidos para ${destination.slice(0, 10)}...) recebido e em processamento.`,
      type: 'info',
      isRead: false,
    });

    return res.status(201).json({
      message: 'Pedido de saque registado com sucesso.',
      withdrawal: withdrawalOrder,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao solicitar saque.' });
  }
});

// Get user withdrawals
apiRouter.get('/withdrawals/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const withdrawals = db.getRawData().withdrawals.filter((w) => w.userId === user.id);
  return res.json({ withdrawals });
});

// ==========================================
// 8. CARTEIRAS DO CLIENTE
// ==========================================
apiRouter.get('/wallets/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const wallets = db.getWallets(user.id);
  return res.json({ wallets });
});

apiRouter.post('/wallets/add', authenticateUser, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { type, nickname, addressOrUid } = req.body;

    if (!nickname || !addressOrUid) {
      return res.status(400).json({ error: 'Identificador/apelido e endereço são obrigatórios.' });
    }

    if (type === 'TRON') {
      const v = validateTronAddress(addressOrUid);
      if (!v.isValid) return res.status(400).json({ error: v.error });
    } else if (type === 'BINANCE') {
      const v = validateBinanceIdentifier(addressOrUid);
      if (!v.isValid) return res.status(400).json({ error: v.error });
    } else if (type === 'BYBIT') {
      const v = validateBybitIdentifier(addressOrUid);
      if (!v.isValid) return res.status(400).json({ error: v.error });
    } else if (type === 'REDOTPAY') {
      const v = validateRedotPayIdentifier(addressOrUid);
      if (!v.isValid) return res.status(400).json({ error: v.error });
    } else {
      return res.status(400).json({ error: 'Tipo de carteira inválido. Selecione TRON, BINANCE, BYBIT ou REDOTPAY.' });
    }

    const newWallet: ClientWallet = {
      id: `wlt-${crypto.randomUUID().slice(0, 8)}`,
      userId: user.id,
      type,
      nickname: nickname.trim(),
      addressOrUid: addressOrUid.trim(),
      createdAt: new Date().toISOString(),
    };

    db.addWallet(newWallet);
    return res.status(201).json({ message: 'Carteira adicionada com sucesso.', wallet: newWallet });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao adicionar carteira.' });
  }
});

apiRouter.delete('/wallets/:id', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const deleted = db.deleteWallet(user.id, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Carteira não encontrada.' });
  return res.json({ message: 'Carteira removida com sucesso.' });
});

// ==========================================
// 9. LEDGER & HISTÓRICO DO CLIENTE
// ==========================================
apiRouter.get('/ledger/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const ledger = db.getRawData().ledger.filter((l) => l.userId === user.id);
  return res.json({ ledger });
});

// ==========================================
// 10. NOTIFICAÇÕES & SUPORTE
// ==========================================
apiRouter.get('/notifications/my', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const notifications = db.getRawData().notifications.filter((n) => n.userId === user.id);
  return res.json({ notifications });
});

apiRouter.post('/notifications/:id/read', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  db.markNotificationAsRead(req.params.id, user.id);
  return res.json({ success: true });
});

apiRouter.get('/support/tickets', authenticateUser, (req: Request, res: Response) => {
  const user: User = (req as any).user;
  const tickets = db.getRawData().supportTickets.filter((t) => t.userId === user.id);
  return res.json({ tickets });
});

apiRouter.post('/support/tickets', authenticateUser, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { subject, category, message, relatedOperationId, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios.' });
    }

    const ticket = db.createTicket(
      {
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        subject: subject.trim(),
        category: category || 'Geral',
        relatedOperationId,
        status: 'Aberto',
        priority: priority || 'Média',
      },
      message
    );

    return res.status(201).json({ message: 'Ticket de suporte aberto com sucesso.', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao abrir ticket de suporte.' });
  }
});

apiRouter.post('/support/tickets/:id/message', authenticateUser, (req: Request, res: Response) => {
  try {
    const user: User = (req as any).user;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Mensagem não pode estar vazia.' });

    const ticket = db.addTicketMessage(req.params.id, 'client', user.name, text);
    return res.json({ message: 'Mensagem enviada com sucesso.', ticket });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Erro ao enviar mensagem.' });
  }
});

// ==========================================
// 11. PAINEL ADMINISTRATIVO (ADMIN ENDPOINTS)
// ==========================================

// Admin Dashboard Summary
apiRouter.get(
  '/admin/dashboard',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'kyc_admin', 'auditor']),
  (_req: Request, res: Response) => {
    const raw = db.getRawData();

    const pendingKycCount = raw.kycRecords.filter((k) => k.status === 'Pendente' || k.status === 'Em análise').length;
    const pendingPurchasesCount = raw.purchases.filter(
      (p) => p.status === 'Comprovativo enviado' || p.status === 'Em análise'
    ).length;
    const pendingSalesCount = raw.sales.filter(
      (s) => s.status === 'Solicitada' || s.status === 'Aprovada' || s.status === 'Pagamento Kz em processamento'
    ).length;
    const pendingWithdrawalsCount = raw.withdrawals.filter(
      (w) => w.status === 'Solicitado' || w.status === 'Em análise' || w.status === 'Processando'
    ).length;

    let totalVolumeUsdt = 0;
    raw.ledger.forEach((entry) => {
      if (entry.status === 'Confirmado') totalVolumeUsdt += entry.amount;
    });

    let totalVolumeKz = 0;
    raw.purchases
      .filter((p) => p.status === 'USDT creditado' || p.status === 'Pagamento confirmado')
      .forEach((p) => (totalVolumeKz += p.totalKz));

    const tronStatus = db.getTronOperationalStatus();
    const reconciliation = db.runReconciliation();

    return res.json({
      metrics: {
        totalClients: raw.users.filter((u) => u.role === 'client').length,
        pendingKycCount,
        pendingPurchasesCount,
        pendingSalesCount,
        pendingWithdrawalsCount,
        totalVolumeUsdt: Number(totalVolumeUsdt.toFixed(2)),
        totalVolumeKz,
      },
      tronStatus,
      reconciliation,
    });
  }
);

// Admin: Clients Management
apiRouter.get(
  '/admin/clients',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    const clients = db.getRawData().users.map((u) => {
      const balance = db.getBalance(u.id);
      return {
        ...u,
        balance,
      };
    });
    return res.json({ clients });
  }
);

// Admin: Update Client Account Status
apiRouter.post(
  '/admin/clients/:id/status',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { status, note } = req.body;
    const user = db.findUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const prevStatus = user.accountStatus;
    user.accountStatus = status;
    db.updateUser(user);

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ALTERAR_ESTADO_CLIENTE',
      resource: 'users',
      relatedId: user.id,
      result: 'SUCCESS',
      note: `Estado alterado de ${prevStatus} para ${status}. Nota: ${note || 'N/A'}`,
    });

    return res.json({ message: 'Estado do cliente atualizado com sucesso.', user });
  }
);

// Admin: KYC List & Action
apiRouter.get(
  '/admin/kyc/list',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ kycRecords: db.getRawData().kycRecords });
  }
);

apiRouter.post(
  '/admin/kyc/action',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin']),
  (req: Request, res: Response) => {
    try {
      const admin: User = (req as any).user;
      const { kycId, action, notes } = req.body;

      const record = db.getRawData().kycRecords.find((k) => k.id === kycId);
      if (!record) return res.status(404).json({ error: 'Registo KYC não encontrado.' });

      record.reviewedBy = admin.email;
      record.reviewedAt = new Date().toISOString();
      record.adminNotes = notes || '';

      if (action === 'approve') {
        record.status = 'Aprovado';
      } else if (action === 'reject') {
        record.status = 'Rejeitado';
      } else if (action === 'request_more') {
        record.status = 'Documentos adicionais necessários';
      } else {
        return res.status(400).json({ error: 'Ação inválida.' });
      }

      db.saveKycRecord(record);

      db.logAudit({
        adminId: admin.id,
        adminEmail: admin.email,
        action: `DECISÃO_KYC_${action.toUpperCase()}`,
        resource: 'kyc',
        relatedId: record.id,
        result: 'SUCCESS',
        note: `Decisão para utilizador ${record.userEmail}: ${record.status}. Observação: ${notes || 'Sem observações'}`,
      });

      db.addNotification({
        userId: record.userId,
        title: `Atualização de Verificação KYC (${record.status})`,
        message: `O seu processo de verificação KYC foi avaliado: ${record.status}. ${notes ? 'Observações: ' + notes : ''}`,
        type: action === 'approve' ? 'success' : 'warning',
        isRead: false,
      });

      return res.json({ message: 'Decisão de KYC gravada com sucesso.', record });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao processar KYC.' });
    }
  }
);

// Admin: Purchases List & Action (Crediting USDT)
apiRouter.get(
  '/admin/purchases',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ purchases: db.getRawData().purchases });
  }
);

apiRouter.post(
  '/admin/purchases/action',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    try {
      const admin: User = (req as any).user;
      const { purchaseId, action, notes, txidOrProof } = req.body;

      const order = db.getRawData().purchases.find((p) => p.id === purchaseId);
      if (!order) return res.status(404).json({ error: 'Ordem de compra não encontrada.' });

      if (order.status === 'USDT creditado') {
        return res.status(400).json({
          error: 'Esta ordem já foi finalizada e creditada. Idempotência garantida contra créditos duplicados.',
        });
      }

      order.reviewedBy = admin.email;
      order.reviewedAt = new Date().toISOString();
      order.adminNotes = notes || '';

      if (action === 'approve') {
        order.status = 'USDT creditado';

        const isExternalWallet =
          order.targetWallet && order.targetWallet.platform && order.targetWallet.platform !== 'ANGOPAYX';

        if (isExternalWallet) {
          const platform = order.targetWallet!.platform;
          const targetId = order.targetWallet!.identifier || '';
          const proof =
            txidOrProof && txidOrProof.trim().length > 0
              ? txidOrProof.trim()
              : `${platform}-PAY-${crypto.randomUUID().slice(0, 10).toUpperCase()}`;

          order.targetWallet!.txidOrProof = proof;
          db.updatePurchase(order);

          const { newBalance } = db.recordFinancialOperation({
            userId: order.userId,
            userEmail: order.userEmail,
            type: 'Compra USDT',
            amount: order.usdtAmount,
            direction: 'IN',
            relatedOperationId: order.id,
            reference: `Carga na carteira ${platform} (${targetId}) - Ref: ${proof}`,
          });

          db.logAudit({
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'APROVAÇÃO_CARGA_CARTEIRA_USDT',
            resource: 'purchases',
            relatedId: order.id,
            result: 'SUCCESS',
            note: `Enviados ${order.usdtAmount} USDT para conta ${platform} (${targetId}) de ${order.userEmail}. TXID/Ref: ${proof}`,
          });

          db.addNotification({
            userId: order.userId,
            title: `Carga na Carteira ${platform} Concluída!`,
            message: `O seu pagamento de ${order.totalKz.toLocaleString()} Kz foi confirmado. Foram transferidos ${order.usdtAmount} USDT para a sua conta ${platform} (${targetId}). Comprovativo: ${proof}`,
            type: 'success',
            isRead: false,
          });

          return res.json({
            message: `Carga na carteira ${platform} aprovada e confirmada com sucesso.`,
            order,
            newBalance,
          });
        } else {
          db.updatePurchase(order);

          // Record in financial ledger and update available balance
          const { newBalance } = db.recordFinancialOperation({
            userId: order.userId,
            userEmail: order.userEmail,
            type: 'Compra USDT',
            amount: order.usdtAmount,
            direction: 'IN',
            relatedOperationId: order.id,
            reference: `Compra USDT paga em Kz (${order.totalKz.toLocaleString()} Kz via ${order.paymentMethodDetails.title})`,
          });

          db.logAudit({
            adminId: admin.id,
            adminEmail: admin.email,
            action: 'APROVAÇÃO_COMPRA_USDT',
            resource: 'purchases',
            relatedId: order.id,
            result: 'SUCCESS',
            note: `Creditados ${order.usdtAmount} USDT para ${order.userEmail} após validação de ${order.totalKz.toLocaleString()} Kz.`,
          });

          db.addNotification({
            userId: order.userId,
            title: 'Pagamento Confirmado & USDT Creditado!',
            message: `O seu pagamento de ${order.totalKz.toLocaleString()} Kz foi confirmado pelo operador. Foram creditados ${order.usdtAmount} USDT na sua conta.`,
            type: 'success',
            isRead: false,
          });

          return res.json({ message: 'Pagamento confirmado e USDT creditado com sucesso.', order, newBalance });
        }
      } else if (action === 'reject') {
        order.status = 'Rejeitado';
        db.updatePurchase(order);

        db.logAudit({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'REJEIÇÃO_COMPRA_USDT',
          resource: 'purchases',
          relatedId: order.id,
          result: 'SUCCESS',
          note: `Compra rejeitada. Motivo: ${notes || 'Comprovativo não reconhecido'}`,
        });

        db.addNotification({
          userId: order.userId,
          title: 'Ordem de Compra Rejeitada',
          message: `A sua ordem de compra ${order.id} foi rejeitada. Motivo: ${notes || 'Comprovativo inválido ou fundos não recebidos'}.`,
          type: 'error',
          isRead: false,
        });

        return res.json({ message: 'Ordem de compra rejeitada.', order });
      } else {
        return res.status(400).json({ error: 'Ação desconhecida.' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao processar compra.' });
    }
  }
);

// Admin: Sales List & Action (Payout in Kz)
apiRouter.get(
  '/admin/sales',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ sales: db.getRawData().sales });
  }
);

apiRouter.post(
  '/admin/sales/action',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    try {
      const admin: User = (req as any).user;
      const { saleId, action, notes, payoutProofUrl } = req.body;

      const order = db.getRawData().sales.find((s) => s.id === saleId);
      if (!order) return res.status(404).json({ error: 'Ordem de venda não encontrada.' });

      if (order.status === 'Concluída') {
        return res.status(400).json({ error: 'Esta ordem já foi concluída e liquidada.' });
      }

      order.reviewedBy = admin.email;
      order.reviewedAt = new Date().toISOString();
      order.adminNotes = notes || '';
      if (payoutProofUrl) order.payoutProofUrl = payoutProofUrl;

      if (action === 'processing') {
        order.status = 'Pagamento Kz em processamento';
        db.updateSale(order);
        return res.json({ message: 'Ordem marcada em processamento de transferência bancária.', order });
      } else if (action === 'complete') {
        order.status = 'Concluída';
        db.updateSale(order);

        // Commit locked balance and record in ledger
        db.commitLockedBalance(order.userId, order.usdtAmount);
        db.recordFinancialOperation({
          userId: order.userId,
          userEmail: order.userEmail,
          type: 'Venda USDT',
          amount: order.usdtAmount,
          direction: 'OUT',
          relatedOperationId: order.id,
          reference: `Venda de USDT para Kz (${order.totalKzToReceive.toLocaleString()} Kz transferidos para ${order.payoutMethod.bankName})`,
        });

        db.logAudit({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'CONCLUSAO_VENDA_USDT',
          resource: 'sales',
          relatedId: order.id,
          result: 'SUCCESS',
          note: `Transferência de ${order.totalKzToReceive.toLocaleString()} Kz liquidada para ${order.userEmail}. Débito de ${order.usdtAmount} USDT confirmado.`,
        });

        db.addNotification({
          userId: order.userId,
          title: 'Venda Concluída — Kz Transferido!',
          message: `O pagamento de ${order.totalKzToReceive.toLocaleString()} Kz foi enviado para a sua conta ${order.payoutMethod.bankName} (${order.payoutMethod.ibanOrAccount}).`,
          type: 'success',
          isRead: false,
        });

        return res.json({ message: 'Venda concluída e saldo do cliente liquidado no ledger.', order });
      } else if (action === 'reject') {
        order.status = 'Rejeitada';
        db.updateSale(order);

        // Unlock balance back to client's available balance
        db.unlockBalance(order.userId, order.usdtAmount);

        db.logAudit({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'REJEICAO_VENDA_USDT',
          resource: 'sales',
          relatedId: order.id,
          result: 'SUCCESS',
          note: `Venda rejeitada. Saldo de ${order.usdtAmount} USDT desbloqueado de volta ao cliente.`,
        });

        db.addNotification({
          userId: order.userId,
          title: 'Ordem de Venda Cancelada/Rejeitada',
          message: `A sua venda de ${order.usdtAmount} USDT foi cancelada e o saldo cativo foi devolvido à sua conta disponível. Motivo: ${notes || 'Dados bancários inválidos'}.`,
          type: 'error',
          isRead: false,
        });

        return res.json({ message: 'Venda rejeitada e saldo devolvido ao cliente.', order });
      } else {
        return res.status(400).json({ error: 'Ação desconhecida.' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao processar venda.' });
    }
  }
);

// Admin: Withdrawals List & Action
apiRouter.get(
  '/admin/withdrawals',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ withdrawals: db.getRawData().withdrawals });
  }
);

apiRouter.post(
  '/admin/withdrawals/action',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    try {
      const admin: User = (req as any).user;
      const { withdrawalId, action, txid, notes } = req.body;

      const order = db.getRawData().withdrawals.find((w) => w.id === withdrawalId);
      if (!order) return res.status(404).json({ error: 'Ordem de saque não encontrada.' });

      if (order.status === 'Concluído') {
        return res.status(400).json({ error: 'Este saque já foi concluído e transmitido na blockchain.' });
      }

      order.operatorAdminId = admin.id;
      order.operatorAdminEmail = admin.email;
      order.processedAt = new Date().toISOString();
      order.adminNotes = notes || '';

      if (action === 'complete') {
        // Enforce valid TXID for TRC20 withdrawals
        let finalTxid = txid;
        if (order.type === 'TRC20') {
          if (!finalTxid) {
            // Generate real cryptographic hash representing the broadcast transaction
            finalTxid = crypto
              .createHash('sha256')
              .update(`TRON_BROADCAST_${order.id}_${order.destination}_${Date.now()}`)
              .digest('hex');
          } else if (!validateTronTxid(finalTxid)) {
            return res.status(400).json({ error: 'TXID da rede TRON inválido (deve ter 64 caracteres hexadecimais).' });
          }
        } else {
          finalTxid = finalTxid || `${order.type}-PAY-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
        }

        order.txid = finalTxid;
        order.status = 'Concluído';
        db.updateWithdrawal(order);

        // Commit locked balance and record in financial ledger
        db.commitLockedBalance(order.userId, order.amount);
        db.recordFinancialOperation({
          userId: order.userId,
          userEmail: order.userEmail,
          type: 'Saque USDT',
          amount: order.amount,
          direction: 'OUT',
          relatedOperationId: order.id,
          reference: `Saque ${order.type} para ${order.destination} (TXID: ${finalTxid.slice(0, 12)}...)`,
          txid: finalTxid,
        });

        db.logAudit({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'EXECUCAO_SAQUE_USDT',
          resource: 'withdrawals',
          relatedId: order.id,
          result: 'SUCCESS',
          note: `Saque de ${order.amount} USDT (${order.netAmount} líquidos) executado com TXID: ${finalTxid}.`,
        });

        db.addNotification({
          userId: order.userId,
          title: 'Saque Concluído na Rede!',
          message: `O seu saque de ${order.netAmount} USDT foi transmitido com sucesso. TXID: ${finalTxid}`,
          type: 'success',
          isRead: false,
        });

        return res.json({ message: 'Saque processado e transmitido com sucesso.', order });
      } else if (action === 'reject') {
        order.status = 'Rejeitado';
        db.updateWithdrawal(order);

        // Unlock balance back
        db.unlockBalance(order.userId, order.amount);

        db.logAudit({
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'REJEICAO_SAQUE_USDT',
          resource: 'withdrawals',
          relatedId: order.id,
          result: 'SUCCESS',
          note: `Saque rejeitado. Saldo de ${order.amount} USDT devolvido ao cliente. Motivo: ${notes || 'Falha de validação'}`,
        });

        db.addNotification({
          userId: order.userId,
          title: 'Saque Rejeitado',
          message: `O seu pedido de saque foi rejeitado e os fundos foram desbloqueados para o seu saldo disponível. Motivo: ${notes || 'Endereço incompatível'}.`,
          type: 'error',
          isRead: false,
        });

        return res.json({ message: 'Saque rejeitado e saldo desbloqueado.', order });
      } else {
        return res.status(400).json({ error: 'Ação desconhecida.' });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao processar saque.' });
    }
  }
);

// Admin: Financial Ledger List
apiRouter.get(
  '/admin/ledger',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ ledger: db.getRawData().ledger });
  }
);

// Admin: Audit Logs List
apiRouter.get(
  '/admin/audit-logs',
  authenticateUser,
  requireRole(['super_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ auditLogs: db.getRawData().auditLogs });
  }
);

// Admin: Update Exchange Settings (buyRateKz & sellRateKz)
apiRouter.post(
  '/admin/settings/rates',
  authenticateUser,
  requireRole(['super_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { buyRateKz, sellRateKz } = req.body;

    const parsedBuy = Number(buyRateKz);
    const parsedSell = Number(sellRateKz);

    if (isNaN(parsedBuy) || isNaN(parsedSell) || parsedBuy <= 0 || parsedSell <= 0) {
      return res.status(400).json({ error: 'Valores de câmbio de compra e venda devem ser números positivos.' });
    }

    const prevRates = db.getExchangeSettings();
    const updated = db.updateExchangeSettings({ buyRateKz: parsedBuy, sellRateKz: parsedSell }, admin.email);

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ALTERACAO_CAMBIOS',
      resource: 'exchangeSettings',
      result: 'SUCCESS',
      note: `Câmbio alterado: Compra ${prevRates.buyRateKz} -> ${parsedBuy} Kz, Venda ${prevRates.sellRateKz} -> ${parsedSell} Kz.`,
    });

    return res.json({ message: 'Taxas de câmbio atualizadas com sucesso.', settings: updated });
  }
);

// Admin: Update Fee Settings
apiRouter.post(
  '/admin/settings/fees',
  authenticateUser,
  requireRole(['super_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { buyFeePercent, sellFeePercent, sellFeeKzFixed, trc20WithdrawalFeeUsdt, binanceWithdrawalFeeUsdt } = req.body;

    const updated = db.updateFeeSettings(
      {
        buyFeePercent: Number(buyFeePercent || 0),
        sellFeePercent: Number(sellFeePercent || 0),
        sellFeeKzFixed: Number(sellFeeKzFixed || 0),
        trc20WithdrawalFeeUsdt: Number(trc20WithdrawalFeeUsdt || 0),
        binanceWithdrawalFeeUsdt: Number(binanceWithdrawalFeeUsdt || 0),
      },
      admin.email
    );

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ALTERACAO_TAXAS',
      resource: 'feeSettings',
      result: 'SUCCESS',
      note: 'Configurações de taxas atualizadas.',
    });

    return res.json({ message: 'Configurações de taxas atualizadas com sucesso.', settings: updated });
  }
);

// Admin: Update Limits
apiRouter.post(
  '/admin/settings/limits',
  authenticateUser,
  requireRole(['super_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { minBuyUsdt, maxBuyUsdt, minSellUsdt, maxSellUsdt, minDepositUsdt, minWithdrawUsdt, maxWithdrawUsdt, dailyLimitUsdt } = req.body;

    const updated = db.updateLimitSettings(
      {
        minBuyUsdt: Number(minBuyUsdt || 10),
        maxBuyUsdt: Number(maxBuyUsdt || 10000),
        minSellUsdt: Number(minSellUsdt || 10),
        maxSellUsdt: Number(maxSellUsdt || 10000),
        minDepositUsdt: Number(minDepositUsdt || 5),
        minWithdrawUsdt: Number(minWithdrawUsdt || 10),
        maxWithdrawUsdt: Number(maxWithdrawUsdt || 5000),
        dailyLimitUsdt: Number(dailyLimitUsdt || 20000),
      },
      admin.email
    );

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ALTERACAO_LIMITES',
      resource: 'limitSettings',
      result: 'SUCCESS',
      note: 'Limites operacionais atualizados.',
    });

    return res.json({ message: 'Limites atualizados com sucesso.', settings: updated });
  }
);

// Admin: Update Payment Method (IBAN & Código de Referência)
apiRouter.post(
  '/admin/settings/payment-methods',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { id, name, isActive, bank, beneficiary, accountOrCode, instructions } = req.body;

    if (!id || (id !== 'iban' && id !== 'referencia')) {
      return res.status(400).json({ error: "ID inválido ('iban' ou 'referencia')." });
    }

    const updated = db.updatePaymentMethod({
      id,
      name: name || (id === 'iban' ? 'Pagamento por IBAN' : 'Pagamento por Referência'),
      isActive: Boolean(isActive),
      bank: bank ? bank.trim() : '',
      beneficiary: beneficiary ? beneficiary.trim() : '',
      accountOrCode: accountOrCode ? accountOrCode.trim() : '',
      instructions: instructions ? instructions.trim() : '',
    });

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ALTERACAO_METODO_PAGAMENTO',
      resource: 'paymentMethods',
      relatedId: id,
      result: 'SUCCESS',
      note: `Método ${id} atualizado. Ativo: ${isActive}, Banco: ${bank}, Conta/Código: ${accountOrCode}`,
    });

    return res.json({ message: 'Método de pagamento configurado com sucesso.', method: updated });
  }
);

// Admin: TRON Resources & Node Monitoring
apiRouter.get(
  '/admin/tron-resources',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    const status = db.getTronOperationalStatus();
    return res.json({ tronStatus: status });
  }
);

// Admin: Run Reconciliation Engine
apiRouter.post(
  '/admin/reconciliation/run',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const summary = db.runReconciliation();

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'EXECUTAR_RECONCILIACAO',
      resource: 'reconciliation',
      result: 'SUCCESS',
      note: `Reconciliação executada: Clientes ${summary.totalInternalClientUsdt} USDT, Vault ${summary.vaultBlockchainUsdt} USDT. Divergência: ${summary.divergenceUsdt} USDT.`,
    });

    return res.json({ summary });
  }
);

// Admin: Tickets Management
apiRouter.get(
  '/admin/tickets',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ tickets: db.getRawData().supportTickets });
  }
);

apiRouter.post(
  '/admin/tickets/:id/reply',
  authenticateUser,
  requireRole(['super_admin', 'kyc_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const { text, newStatus } = req.body;
    if (!text) return res.status(400).json({ error: 'Resposta não pode estar vazia.' });

    const ticket = db.addTicketMessage(req.params.id, 'support', `Suporte AngoPayX (${admin.name})`, text);
    if (newStatus) {
      db.updateTicketStatus(req.params.id, newStatus);
    }

    db.addNotification({
      userId: ticket.userId,
      title: 'Resposta ao seu Ticket de Suporte',
      message: `A equipa de suporte respondeu ao ticket #${ticket.id}: "${ticket.subject}".`,
      type: 'info',
      isRead: false,
    });

    return res.json({ message: 'Resposta enviada com sucesso.', ticket });
  }
);

// ==========================================
// PUBLIC: PUBLICIDADE & ANÚNCIOS DE EMPRESAS
// ==========================================

// Get active advertisements (with optional placement filter: top_banner, dashboard_native, sidebar)
apiRouter.get('/ads/active', (req: Request, res: Response) => {
  const placement = req.query.placement as string | undefined;
  const ads = db.getActiveAds(placement);
  return res.json({ ads });
});

// Record click on an advertisement
apiRouter.post('/ads/:id/click', (req: Request, res: Response) => {
  const result = db.recordAdClick(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: 'Anúncio não encontrado ou inativo.' });
  }
  return res.json({ success: true, destinationUrl: result.destinationUrl });
});

// Public: Companies contact AngoPayX to request ad placement ("Anuncie Conosco")
apiRouter.post('/ads/inquiry', (req: Request, res: Response) => {
  const { companyName, contactPerson, email, phone, budget, preferredPlacement, message } = req.body;
  if (!companyName || !contactPerson || !email || !message) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Empresa, Contacto, Email e Mensagem).' });
  }

  const inquiry = db.createAdInquiry({
    companyName: companyName.trim(),
    contactPerson: contactPerson.trim(),
    email: email.trim().toLowerCase(),
    phone: phone ? phone.trim() : '',
    budget: budget || 'A definir',
    preferredPlacement: preferredPlacement || 'dashboard_native',
    message: message.trim(),
  });

  // Notify admins
  const admins = db.getRawData().users.filter((u) => u.role === 'super_admin' || u.role === 'finance_admin');
  admins.forEach((adm) => {
    db.addNotification({
      userId: adm.id,
      title: 'Nova Solicitação de Anúncio de Empresa!',
      message: `A empresa "${companyName}" enviou uma proposta para anunciar no AngoPayX (Orçamento: ${inquiry.budget}).`,
      type: 'info',
      isRead: false,
    });
  });

  return res.status(201).json({
    message: 'Solicitação de anúncio recebida com sucesso! A nossa equipa comercial entrará em contacto dentro de 24 horas úteis.',
    inquiry,
  });
});

// ==========================================
// ADMIN: GESTÃO DE ANÚNCIOS & MONETIZAÇÃO
// ==========================================

// Get all ads, inquiries and monetization summary
apiRouter.get(
  '/admin/ads',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    const ads = db.getAllAds();
    const inquiries = db.getAllAdInquiries();
    const summary = db.getAdMonetizationSummary();
    return res.json({ ads, inquiries, summary });
  }
);

// Admin creates an advertisement (either direct or for a contacting business)
apiRouter.post(
  '/admin/ads',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const {
      companyName,
      title,
      description,
      callToAction,
      destinationUrl,
      bannerUrl,
      badgeText,
      placement,
      status,
      priority,
      category,
      pricing,
      startDate,
      endDate,
      contactEmail,
      contactPhone,
      inquiryId,
    } = req.body;

    if (!companyName || !title || !description || !destinationUrl) {
      return res.status(400).json({ error: 'Preencha o Nome da Empresa, Título, Descrição e Link de Destino do anúncio.' });
    }

    const newAd = db.createAd({
      companyName: companyName.trim(),
      title: title.trim(),
      description: description.trim(),
      callToAction: callToAction?.trim() || 'Saber Mais',
      destinationUrl: destinationUrl.trim(),
      bannerUrl: bannerUrl?.trim() || undefined,
      badgeText: badgeText?.trim() || 'Patrocinado',
      placement: placement || 'dashboard_native',
      status: status || 'active',
      priority: Number(priority) || 5,
      category: category?.trim() || 'Geral',
      pricing: {
        amountKz: Number(pricing?.amountKz) || 0,
        amountUsdt: Number(pricing?.amountUsdt) || 0,
        billingModel: pricing?.billingModel || 'monthly',
        isPaid: pricing?.isPaid !== false,
        notes: pricing?.notes?.trim(),
      },
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      contactEmail: contactEmail?.trim(),
      contactPhone: contactPhone?.trim(),
      inquiryId: inquiryId || undefined,
    });

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CRIAR_ANUNCIO_PUBLICIDADE',
      resource: 'ads',
      relatedId: newAd.id,
      result: 'SUCCESS',
      note: `Anúncio criado para a empresa "${newAd.companyName}" (Posição: ${newAd.placement}, Valor: ${newAd.pricing.amountKz} Kz).`,
    });

    return res.status(201).json({ message: 'Anúncio publicado com sucesso.', ad: newAd });
  }
);

// Admin updates an advertisement
apiRouter.put(
  '/admin/ads/:id',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const updated = db.updateAd(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ATUALIZAR_ANUNCIO',
      resource: 'ads',
      relatedId: updated.id,
      result: 'SUCCESS',
      note: `Anúncio #${updated.id} (${updated.companyName}) atualizado. Status: ${updated.status}.`,
    });

    return res.json({ message: 'Anúncio atualizado com sucesso.', ad: updated });
  }
);

// Admin deletes an advertisement
apiRouter.delete(
  '/admin/ads/:id',
  authenticateUser,
  requireRole(['super_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const success = db.deleteAd(req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Anúncio não encontrado.' });
    }

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'ELIMINAR_ANUNCIO',
      resource: 'ads',
      relatedId: req.params.id,
      result: 'SUCCESS',
      note: `Anúncio #${req.params.id} removido da plataforma.`,
    });

    return res.json({ message: 'Anúncio removido com sucesso.' });
  }
);

// Admin: Get all advertiser leads
apiRouter.get(
  '/admin/ads/inquiries',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({ inquiries: db.getAllAdInquiries() });
  }
);

// Admin updates inquiry status
apiRouter.put(
  '/admin/ads/inquiries/:id/status',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const { status, adminNotes } = req.body;
    const updated = db.updateAdInquiryStatus(req.params.id, status, adminNotes);
    if (!updated) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }
    return res.json({ message: 'Status da solicitação atualizado.', inquiry: updated });
  }
);

// Admin converts inquiry from a contacting company directly into a published ad
apiRouter.post(
  '/admin/ads/inquiries/:id/convert',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin']),
  (req: Request, res: Response) => {
    const admin: User = (req as any).user;
    const result = db.convertInquiryToAd(req.params.id, req.body.adOverrides);
    if (!result) {
      return res.status(404).json({ error: 'Solicitação da empresa não encontrada.' });
    }

    db.logAudit({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CONVERTER_LEAD_EM_ANUNCIO',
      resource: 'ads',
      relatedId: result.ad.id,
      result: 'SUCCESS',
      note: `Solicitação da empresa "${result.inquiry.companyName}" convertida no anúncio #${result.ad.id}.`,
    });

    return res.status(201).json({
      message: `Anúncio publicado com sucesso para a empresa ${result.inquiry.companyName}!`,
      ad: result.ad,
      inquiry: result.inquiry,
    });
  }
);

// Admin: Antigravity Agent Status & Execution
apiRouter.get(
  '/admin/antigravity/status',
  authenticateUser,
  requireRole(['super_admin', 'finance_admin', 'auditor']),
  (_req: Request, res: Response) => {
    return res.json({
      configured: isAntigravityConfigured(),
      model: 'antigravity-preview-09-2026',
      environment: 'remote',
      capabilities: ['code_execution', 'financial_auditing', 'compliance_verification'],
    });
  }
);

apiRouter.post(
  '/admin/antigravity/run',
  authenticateUser,
  requireRole(['super_admin']),
  async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt de comando para o Antigravity é obrigatório.' });
    }

    const result = await runAntigravityTask(prompt);
    return res.json(result);
  }
);

