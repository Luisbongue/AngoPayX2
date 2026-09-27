import React from 'react';

export const BinanceLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 126.6 126.6"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    fill="currentColor"
    aria-label="Binance"
  >
    <path
      fill="#F3BA2F"
      d="M38.4 50.8L63.3 25.9l24.9 24.9 14.8-14.8L63.3-3.6 23.6 36zM38.4 75.8L63.3 100.7l24.9-24.9 14.8 14.8L63.3 130.2 23.6 90.6zM63.3 75.8l12.5-12.5-12.5-12.5-12.5 12.5zM-3.6 63.3l14.8-14.8 14.8 14.8-14.8 14.8zM100.6 63.3l14.8-14.8 14.8 14.8-14.8 14.8z"
    />
  </svg>
);

export const BybitLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Bybit"
  >
    <rect width="100" height="100" rx="20" fill="#17181E" />
    <path
      fill="#F7A600"
      d="M26 30h18c7.7 0 14 6.3 14 14 0 5-2.6 9.4-6.6 11.9 5.3 2.1 9 7.3 9 13.4 0 8.1-6.6 14.7-14.7 14.7H26V30zm13.5 22.8c3.5 0 6.3-2.8 6.3-6.3s-2.8-6.3-6.3-6.3h-3.3v12.6h3.3zm2 21c4.1 0 7.4-3.3 7.4-7.4s-3.3-7.4-7.4-7.4h-5.3v14.8h5.3z"
    />
    <path
      fill="#FFFFFF"
      d="M66 54h10v30H66zM71 30c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6 2.7-6 6-6z"
    />
  </svg>
);

export const RedotPayLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="RedotPay"
  >
    <rect width="100" height="100" rx="22" fill="#E62C2C" />
    <circle cx="36" cy="50" r="16" fill="#FFFFFF" />
    <path
      d="M48 34h16c8.8 0 16 7.2 16 16s-7.2 16-16 16H48V34z"
      fill="#FFFFFF"
      fillOpacity="0.85"
    />
    <circle cx="36" cy="50" r="7" fill="#E62C2C" />
  </svg>
);

export const TronLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="TRON"
  >
    <rect width="100" height="100" rx="20" fill="#1C1D24" />
    <path
      fill="#EB0029"
      d="M18 24l62 14-29 44-33-58zm12.5 7.8l20.4 35.8 17.5-26.6-37.9-9.2zm39.7 7.7l-15.6 23.7 18.8-19.8-3.2-3.9zM26.4 32.5l2.4 4.3 22.8-5.5-25.2 1.2z"
    />
  </svg>
);

export const AngoPayXLogo: React.FC<{ className?: string; size?: number }> = ({ className = 'w-5 h-5', size }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="AngoPayX"
  >
    <rect width="100" height="100" rx="20" fill="#0F172A" />
    <path
      fill="#10B981"
      d="M30 65L50 25l20 40h-12l-8-17-8 17H30z"
    />
    <circle cx="50" cy="52" r="5" fill="#38BDF8" />
  </svg>
);

export type SupportedWalletPlatform = 'ANGOPAYX' | 'BINANCE' | 'BYBIT' | 'REDOTPAY' | 'TRON' | 'TRC20';

export function getWalletMeta(platform: string) {
  const norm = (platform || '').toUpperCase().trim();
  switch (norm) {
    case 'ANGOPAYX':
      return {
        id: 'ANGOPAYX' as const,
        name: 'AngoPayX',
        fullName: 'Saldo Interno AngoPayX',
        identifierLabel: 'Conta Interna AngoPayX',
        placeholder: 'Crédito no saldo da conta',
        instructions: 'Os USDT serão creditados diretamente na sua conta AngoPayX para vender, negociar ou transferir quando desejar.',
        color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/50 text-emerald-400',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        Logo: AngoPayXLogo,
      };
    case 'BINANCE':
      return {
        id: 'BINANCE' as const,
        name: 'Binance',
        fullName: 'Binance Pay / UID',
        identifierLabel: 'Email ou ID / UID da Binance',
        placeholder: 'ex: cliente@binance.com ou 184920482',
        instructions: 'Indique o seu Email registado na Binance ou o seu Binance UID (8 a 10 dígitos) para transferência via Binance Pay.',
        color: 'from-amber-500/20 to-amber-950/40 border-amber-500/50 text-amber-400',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        Logo: BinanceLogo,
      };
    case 'BYBIT':
      return {
        id: 'BYBIT' as const,
        name: 'Bybit',
        fullName: 'Bybit UID / Email',
        identifierLabel: 'UID ou Email da Conta Bybit',
        placeholder: 'ex: 48920194 ou user@bybit.com',
        instructions: 'Indique o seu Bybit UID (geralmente 7 a 9 dígitos) ou o e-mail da sua conta Bybit para liquidação interna.',
        color: 'from-yellow-500/20 to-yellow-950/40 border-yellow-500/50 text-yellow-400',
        badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
        Logo: BybitLogo,
      };
    case 'REDOTPAY':
      return {
        id: 'REDOTPAY' as const,
        name: 'RedotPay',
        fullName: 'RedotPay ID / Email',
        identifierLabel: 'ID ou Email da Conta RedotPay',
        placeholder: 'ex: 94820148 ou user@redotpay.com',
        instructions: 'Indique o seu ID de utilizador RedotPay ou o e-mail cadastrado na aplicação RedotPay para envio rápido.',
        color: 'from-rose-500/20 to-rose-950/40 border-rose-500/50 text-rose-400',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        Logo: RedotPayLogo,
      };
    case 'TRC20':
    case 'TRON':
    default:
      return {
        id: 'TRON' as const,
        name: 'TRON',
        fullName: 'Rede TRON (TRC20)',
        identifierLabel: 'Endereço TRON TRC20 (Inicia com T)',
        placeholder: 'ex: TNo4sUe2q3Z8wK6mQpRtYxVcB1nMa5D7Jh',
        instructions: 'Forneça o seu endereço público na rede TRON para envio automatizado de USDT TRC20.',
        color: 'from-cyan-500/20 to-cyan-950/40 border-cyan-500/50 text-cyan-400',
        badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        Logo: TronLogo,
      };
  }
}
