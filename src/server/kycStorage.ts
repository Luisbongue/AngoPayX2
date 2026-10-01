import fs from 'node:fs';
import path from 'node:path';

const KYC_VAULT_DIR = path.resolve(process.cwd(), 'data', 'kyc-vault');

function ensureVaultDir() {
  if (!fs.existsSync(KYC_VAULT_DIR)) {
    fs.mkdirSync(KYC_VAULT_DIR, { recursive: true });
  }
}

export interface RawKycFile {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

export interface SavedKycPaths {
  biFrontPath: string;
  biBackPath: string;
  selfiePath: string;
  biFrontExt: string;
  biBackExt: string;
  selfieExt: string;
}

export function sanitizeExtension(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).toLowerCase().replace('.', '');
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export function getMimeTypeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Saves all 3 KYC files locally in the secure data/kyc-vault/{userId}/ directory.
 * Independent of Supabase Storage and Database.
 */
export function saveKycDocuments(
  userId: string,
  files: {
    biFront: RawKycFile;
    biBack: RawKycFile;
    selfie: RawKycFile;
  }
): SavedKycPaths {
  ensureVaultDir();
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userVaultDir = path.join(KYC_VAULT_DIR, safeUserId);

  if (!fs.existsSync(userVaultDir)) {
    fs.mkdirSync(userVaultDir, { recursive: true });
  }

  const biFrontExt = sanitizeExtension(files.biFront.fileName, files.biFront.contentType);
  const biBackExt = sanitizeExtension(files.biBack.fileName, files.biBack.contentType);
  const selfieExt = sanitizeExtension(files.selfie.fileName, files.selfie.contentType);

  const biFrontFile = path.join(userVaultDir, `bi-frente.${biFrontExt}`);
  const biBackFile = path.join(userVaultDir, `bi-verso.${biBackExt}`);
  const selfieFile = path.join(userVaultDir, `selfie.${selfieExt}`);

  fs.writeFileSync(biFrontFile, files.biFront.buffer);
  fs.writeFileSync(biBackFile, files.biBack.buffer);
  fs.writeFileSync(selfieFile, files.selfie.buffer);

  // Return API paths for authorized streaming
  return {
    biFrontPath: `/api/kyc/document/${safeUserId}/bi-frente`,
    biBackPath: `/api/kyc/document/${safeUserId}/bi-verso`,
    selfiePath: `/api/kyc/document/${safeUserId}/selfie`,
    biFrontExt,
    biBackExt,
    selfieExt,
  };
}

/**
 * Saves a single KYC document locally in the secure data/kyc-vault/{userId}/ directory.
 */
export function saveKycDocumentSingle(
  userId: string,
  docType: 'bi-frente' | 'bi-verso' | 'selfie',
  buffer: Buffer,
  fileName: string,
  mimeType: string
): { internalUrl: string; ext: string } {
  ensureVaultDir();
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userVaultDir = path.join(KYC_VAULT_DIR, safeUserId);
  if (!fs.existsSync(userVaultDir)) {
    fs.mkdirSync(userVaultDir, { recursive: true });
  }
  const ext = sanitizeExtension(fileName, mimeType);
  const targetFile = path.join(userVaultDir, `${docType}.${ext}`);
  fs.writeFileSync(targetFile, buffer);
  return {
    internalUrl: `/api/kyc/document/${safeUserId}/${docType}`,
    ext,
  };
}

/**
 * Resolves the absolute path and MIME type of a stored document.
 */
export function getKycDocument(
  userId: string,
  docType: 'bi-frente' | 'bi-verso' | 'selfie'
): { filePath: string; mimeType: string } | null {
  ensureVaultDir();
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userVaultDir = path.join(KYC_VAULT_DIR, safeUserId);

  if (!fs.existsSync(userVaultDir)) {
    return null;
  }

  const candidates = ['jpg', 'jpeg', 'png', 'webp'];
  for (const ext of candidates) {
    const candidatePath = path.join(userVaultDir, `${docType}.${ext}`);
    if (fs.existsSync(candidatePath)) {
      return {
        filePath: candidatePath,
        mimeType: getMimeTypeFromExt(ext),
      };
    }
  }

  return null;
}

/**
 * Removes KYC documents for a user during administrative cleanup.
 */
export function deleteKycDocuments(userId: string): boolean {
  ensureVaultDir();
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userVaultDir = path.join(KYC_VAULT_DIR, safeUserId);

  if (fs.existsSync(userVaultDir)) {
    try {
      fs.rmSync(userVaultDir, { recursive: true, force: true });
      return true;
    } catch (err) {
      console.error(`Erro ao remover documentos de ${safeUserId}:`, err);
      return false;
    }
  }
  return false;
}
