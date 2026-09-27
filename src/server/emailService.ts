import nodemailer from 'nodemailer';

interface EmailResult {
  success: boolean;
  provider: string;
  code: string;
  messageId?: string;
  error?: string;
}

// Check configured email transports
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // Quick Gmail service shortcut if GMAIL_USER and GMAIL_APP_PASSWORD are provided
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }

  return null;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) ||
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
    process.env.RESEND_API_KEY
  );
}

/**
 * Send 6-digit OTP verification email for account registration
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  otpCode: string,
  userName?: string
): Promise<EmailResult> {
  const subject = `Código de Verificação: ${otpCode} - AngoPayX`;
  const appName = 'AngoPayX';
  const name = userName ? userName.split(' ')[0] : 'Estimado(a) Cliente';

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Verificação de Conta AngoPayX</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 520px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #047857; }
    .logo { display: inline-block; font-size: 26px; font-weight: 900; color: #34d399; letter-spacing: -0.5px; }
    .body-content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .lead { font-size: 14px; color: #94a3b8; margin-bottom: 24px; }
    .otp-box { background: #022c22; border: 2px dashed #10b981; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #6ee7b7; font-weight: 700; margin-bottom: 8px; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #10b981; margin: 0; }
    .info-box { background: #1e293b; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #cbd5e1; margin-bottom: 24px; }
    .footer { background: #090d16; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">ANGOPAYX</div>
      <p style="margin: 6px 0 0 0; color: #a7f3d0; font-size: 12px; font-weight: 600;">Intermediação Segura USDT & Kwanzas</p>
    </div>
    <div class="body-content">
      <div class="greeting">Olá, ${name}!</div>
      <p class="lead">Obrigado por se registar na plataforma AngoPayX. Para validar a sua conta e aceder às operações de compra, venda e carregamento de carteiras, utilize o código de confirmação abaixo:</p>
      
      <div class="otp-box">
        <div class="otp-label">Seu Código de Confirmação (OTP)</div>
        <div class="otp-code">${otpCode}</div>
      </div>

      <div class="info-box">
        ⏱️ <strong>Validade:</strong> Este código expira em <strong>15 minutos</strong>.<br/>
        🔒 <strong>Segurança:</strong> Nunca partilhe este código com ninguém. A equipa do AngoPayX nunca lhe pedirá a sua palavra-passe ou códigos por telefone.
      </div>

      <p style="font-size: 12px; color: #94a3b8; margin: 0;">Se não solicitou o registo desta conta, ignore este email com total segurança.</p>
    </div>
    <div class="footer">
      AngoPayX Angola • Luanda, Angola • Suporte: suporte@angopayx.ao
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `Olá ${name},\n\nO seu código de verificação para o AngoPayX é: ${otpCode}\n\nEste código é válido por 15 minutos.\nNunca partilhe este código com terceiros.\n\nEquipa AngoPayX`;

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddr = process.env.EMAIL_FROM || 'AngoPayX <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromAddr,
          to: toEmail,
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`[AngoPayX EMAIL] ✅ Email OTP enviado via Resend para ${toEmail}: [ ${otpCode} ] (ID: ${data.id})`);
        return { success: true, provider: 'resend', code: otpCode, messageId: data.id };
      } else {
        const errText = await res.text();
        console.warn(`[AngoPayX EMAIL] ⚠️ Resend falhou (${res.status}): ${errText}`);
      }
    } catch (err: any) {
      console.warn(`[AngoPayX EMAIL] ⚠️ Erro na chamada Resend: ${err.message}`);
    }
  }

  // 2. Try Nodemailer SMTP / Gmail
  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromAddr =
        process.env.SMTP_FROM ||
        process.env.GMAIL_USER ||
        process.env.SMTP_USER ||
        '"AngoPayX Oficial" <noreply@angopayx.ao>';

      const info = await transporter.sendMail({
        from: fromAddr,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });

      console.log(`[AngoPayX EMAIL] ✅ Email OTP enviado via SMTP para ${toEmail}: [ ${otpCode} ] (ID: ${info.messageId})`);
      return { success: true, provider: 'smtp', code: otpCode, messageId: info.messageId };
    } catch (err: any) {
      console.warn(`[AngoPayX EMAIL] ⚠️ Falha no envio SMTP para ${toEmail}:`, err.message);
    }
  }

  // 3. Fallback: Log clearly on server
  console.log(`\n==================================================`);
  console.log(`[AngoPayX EMAIL OTP GERADO]`);
  console.log(`Destinatário: ${toEmail}`);
  console.log(`Código OTP:   >>> ${otpCode} <<<`);
  console.log(`Validade:     15 minutos`);
  console.log(`Nota: Para envio automático via caixa de entrada, configure SMTP_HOST, SMTP_USER e SMTP_PASS (ou GMAIL_USER e GMAIL_APP_PASSWORD) no ficheiro .env.`);
  console.log(`==================================================\n`);

  return {
    success: false,
    provider: 'local_generator',
    code: otpCode,
    error: 'Servidor de envio SMTP não configurado no ambiente. O código gerado é válido para autenticação imediata.',
  };
}

/**
 * Send Password Reset OTP
 */
export async function sendPasswordResetOtpEmail(
  toEmail: string,
  resetCode: string,
  userName?: string
): Promise<EmailResult> {
  const subject = `Recuperação de Palavra-passe: ${resetCode} - AngoPayX`;
  const name = userName ? userName.split(' ')[0] : 'Estimado(a) Cliente';

  const htmlContent = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <title>Recuperação de Palavra-passe AngoPayX</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #f8fafc; }
    .card { max-width: 520px; margin: 0 auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 1px solid #1e293b; }
    .logo { font-size: 24px; font-weight: 900; color: #34d399; }
    .body-content { padding: 32px 28px; line-height: 1.6; }
    .otp-box { background: #1e1b4b; border: 2px dashed #6366f1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #818cf8; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">ANGOPAYX</div>
    </div>
    <div class="body-content">
      <h2 style="margin-top:0; color:#fff;">Recuperação de Conta</h2>
      <p style="color:#94a3b8; font-size:14px;">Olá ${name}, recebemos um pedido para redefinir a palavra-passe da sua conta AngoPayX. Utilize o código de recuperação abaixo:</p>
      
      <div class="otp-box">
        <div style="font-size:11px; text-transform:uppercase; color:#a5b4fc; font-weight:bold; margin-bottom:6px;">Código de Recuperação</div>
        <div class="otp-code">${resetCode}</div>
      </div>

      <p style="font-size:12px; color:#cbd5e1;">Este código expira em 15 minutos. Se não pediu a redefinição de palavra-passe, proteja a sua conta ignorando este email.</p>
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `Olá ${name},\n\nO seu código de recuperação de palavra-passe do AngoPayX é: ${resetCode}\n\nExpira em 15 minutos.\n\nEquipa AngoPayX`;

  if (process.env.RESEND_API_KEY) {
    try {
      const fromAddr = process.env.EMAIL_FROM || 'AngoPayX <onboarding@resend.dev>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromAddr,
          to: toEmail,
          subject,
          html: htmlContent,
          text: textContent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return { success: true, provider: 'resend', code: resetCode, messageId: data.id };
      }
    } catch (err: any) {
      console.warn('Resend reset password error:', err.message);
    }
  }

  const transporter = getTransporter();
  if (transporter) {
    try {
      const fromAddr = process.env.SMTP_FROM || process.env.GMAIL_USER || '"AngoPayX" <noreply@angopayx.ao>';
      const info = await transporter.sendMail({
        from: fromAddr,
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true, provider: 'smtp', code: resetCode, messageId: info.messageId };
    } catch (err: any) {
      console.warn('SMTP reset password error:', err.message);
    }
  }

  console.log(`[AngoPayX EMAIL RESET PASSWORD] Destinatário: ${toEmail} | Código: [ ${resetCode} ]`);

  return {
    success: false,
    provider: 'local_generator',
    code: resetCode,
    error: 'Servidor de email não configurado no ambiente.',
  };
}
