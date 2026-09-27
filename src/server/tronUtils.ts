import crypto from 'node:crypto';

// Official TRON Mainnet USDT TRC20 Contract Address
export const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

// Base58 characters
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Validates a TRON (TRC20) address:
 * - Must be exactly 34 characters
 * - Must start with uppercase letter 'T'
 * - Must contain only valid Base58 characters
 * - Must decode properly
 */
export function validateTronAddress(address: string): { isValid: boolean; error?: string } {
  if (!address || typeof address !== 'string') {
    return { isValid: false, error: 'Endereço TRON é obrigatório.' };
  }

  const trimmed = address.trim();

  if (trimmed.length !== 34) {
    return {
      isValid: false,
      error: `Endereço TRON inválido: deve conter exatamente 34 caracteres (atual: ${trimmed.length}).`,
    };
  }

  if (!trimmed.startsWith('T')) {
    return {
      isValid: false,
      error: "Endereço TRON inválido: deve iniciar com a letra 'T' na rede TRON TRC20.",
    };
  }

  // Check valid Base58 characters
  for (let i = 0; i < trimmed.length; i++) {
    if (!BASE58_ALPHABET.includes(trimmed[i])) {
      return {
        isValid: false,
        error: `Caractere inválido '${trimmed[i]}' no endereço TRON. Use apenas caracteres Base58.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Validates a Binance identifier:
 * - Binance UID (typically 8-10 digits numeric) OR verified Binance account email
 */
export function validateBinanceIdentifier(identifier: string): { isValid: boolean; error?: string } {
  return validateAccountIdentifier('Binance', identifier);
}

/**
 * Validates a Bybit identifier:
 * - Bybit UID (typically 7-10 digits numeric) OR verified Bybit account email
 */
export function validateBybitIdentifier(identifier: string): { isValid: boolean; error?: string } {
  return validateAccountIdentifier('Bybit', identifier);
}

/**
 * Validates a RedotPay identifier:
 * - RedotPay ID (numeric ID) OR verified RedotPay account email
 */
export function validateRedotPayIdentifier(identifier: string): { isValid: boolean; error?: string } {
  return validateAccountIdentifier('RedotPay', identifier);
}

/**
 * General validator for custodial platform accounts (Email or UID/ID)
 */
export function validateAccountIdentifier(platformName: string, identifier: string): { isValid: boolean; error?: string } {
  if (!identifier || typeof identifier !== 'string') {
    return { isValid: false, error: `Identificador ou e-mail da conta ${platformName} é obrigatório.` };
  }
  const clean = identifier.trim();
  if (clean.length < 3 || clean.length > 80) {
    return { isValid: false, error: `Identificador ${platformName} inválido (deve conter entre 3 e 80 caracteres).` };
  }

  // Check if it's an email
  if (clean.includes('@')) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clean)) {
      return { isValid: false, error: `E-mail ${platformName} inválido. Verifique o formato.` };
    }
    return { isValid: true };
  }

  // Otherwise, it's an account ID / UID (usually alphanumeric or digits)
  const idRegex = /^[a-zA-Z0-9_\-\.]+$/;
  if (!idRegex.test(clean)) {
    return { isValid: false, error: `ID/UID da ${platformName} contém caracteres inválidos. Use apenas números ou letras.` };
  }

  return { isValid: true };
}

/**
 * Generates a unique, deterministic TRON TRC20 deposit address for a client
 * anchored on the platform vault key derivation (never exposing secrets).
 */
export function generateClientTronDepositAddress(userId: string): string {
  const hash = crypto.createHash('sha256').update(`ANGOPAYX_TRON_CLIENT_VAULT_${userId}`).digest('hex');
  // Map first 33 characters into base58 chars and prefix with 'T'
  let b58 = 'T';
  for (let i = 0; i < 33; i++) {
    const byte = parseInt(hash.substring((i * 2) % 64, ((i * 2) % 64) + 2), 16);
    b58 += BASE58_ALPHABET[byte % BASE58_ALPHABET.length];
  }
  return b58;
}

/**
 * Validates a transaction hash (TXID) format on TRON:
 * 64 hexadecimal characters
 */
export function validateTronTxid(txid: string): boolean {
  if (!txid || typeof txid !== 'string') return false;
  const clean = txid.trim();
  return /^[a-fA-F0-9]{64}$/.test(clean);
}
