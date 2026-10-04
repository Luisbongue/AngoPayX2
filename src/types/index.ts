export type UserRole = 'client' | 'super_admin' | 'kyc_admin' | 'finance_admin' | 'auditor';

export type AccountStatus = 'Ativa' | 'Suspensa' | 'Bloqueada' | 'Em análise';

export type KycStatus = 
  | 'Não iniciado' 
  | 'Pendente' 
  | 'Em análise' 
  | 'Aprovado' 
  | 'Documentos adicionais necessários' 
  | 'Rejeitado';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  accountStatus: AccountStatus;
  status?: AccountStatus; // convenient alias
  kycStatus: KycStatus;
  documentNumber?: string;
  idNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  emailVerified: boolean;
  passwordHash: string;
  createdAt: string;
  lastLoginAt?: string;
  depositAddressTRC20: string;
  tronDepositAddress?: string; // convenient alias
  verificationCode?: string;
  verificationCodeExpiresAt?: string;
  resetCode?: string;
  resetCodeExpiresAt?: string;
}

export interface KycRecord {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  fullName: string;
  documentType: 'BI' | 'Passaporte';
  documentNumber: string;
  idNumber?: string; // alias
  nationality: string;
  dateOfBirth: string;
  status: KycStatus;
  statusSlug?: 'pending' | 'approved' | 'rejected';
  biFrontPath?: string;
  biBackPath?: string;
  selfiePath?: string;
  biFrontUrl: string;
  docFrontUrl?: string; // alias
  biBackUrl: string;
  docBackUrl?: string; // alias
  selfieUrl: string;
  biFrontSignedUrl?: string;
  biBackSignedUrl?: string;
  selfieSignedUrl?: string;
  adminNotes?: string;
  notes?: string; // alias
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedAt: string;
  updatedAt?: string;
}

export interface Balance {
  userId: string;
  availableBalance: number; // in USDT
  lockedBalance: number;    // in USDT
  totalBalance: number;     // availableBalance + lockedBalance
  updatedAt: string;
}

export type LedgerEntryType = 
  | 'Compra USDT'
  | 'Depósito USDT'
  | 'Venda USDT'
  | 'Saque USDT'
  | 'Ajuste administrativo'
  | 'Estorno'
  | string;

export type LedgerDirection = 'IN' | 'OUT';

export interface LedgerEntry {
  id: string;
  userId: string;
  userEmail?: string;
  type: LedgerEntryType;
  asset: 'USDT';
  amount: number;
  direction: LedgerDirection;
  relatedOperationId: string;
  balanceBefore: number;
  balanceAfter: number;
  timestamp: string;
  status: 'Confirmado' | 'Pendente' | 'Cancelado' | string;
  reference: string;
  txid?: string;
  metadata?: Record<string, any>;
}

export type PurchaseStatus = 
  | 'Aguardando pagamento' 
  | 'Comprovativo enviado' 
  | 'Em análise' 
  | 'Pagamento confirmado' 
  | 'USDT creditado' 
  | 'Rejeitado' 
  | 'Cancelado';

export type PurchaseTargetPlatform = 'ANGOPAYX' | 'BINANCE' | 'BYBIT' | 'REDOTPAY' | 'TRON';

export interface PurchaseTargetWallet {
  platform: PurchaseTargetPlatform;
  identifier?: string; // Email or UID or Address
  nickname?: string;
  txidOrProof?: string;
}

export interface PurchaseOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  usdtAmount: number;
  buyRateKz: number;
  subtotalKz: number;
  feeKz: number;
  totalKz: number;
  paymentMethodType: 'iban' | 'referencia';
  paymentMethodDetails: {
    title: string;
    bank: string;
    beneficiary: string;
    accountOrCode: string;
    instructions: string;
  };
  targetWallet?: PurchaseTargetWallet;
  receiptUrl?: string;
  receiptSubmittedAt?: string;
  status: PurchaseStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type SaleStatus = 
  | 'Solicitada' 
  | 'USDT aguardando confirmação' 
  | 'Em análise' 
  | 'Aprovada' 
  | 'Pagamento Kz em processamento' 
  | 'Concluída' 
  | 'Rejeitada' 
  | 'Cancelada';

export interface SaleOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  usdtAmount: number;
  sellRateKz: number;
  feeKz: number;
  totalKzToReceive: number;
  payoutMethod: {
    bankName: string;
    accountHolder: string;
    ibanOrAccount: string;
    phoneOrReference?: string;
  };
  status: SaleStatus;
  adminNotes?: string;
  payoutProofUrl?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type DepositStatus = 
  | 'Detectado' 
  | 'Confirmando' 
  | 'Creditado' 
  | 'Rejeitado';

export interface DepositOrder {
  id: string;
  userId: string;
  userEmail: string;
  txid: string;
  network: 'TRON TRC20';
  tokenContract: string;
  destinationAddress: string;
  amount: number;
  status: DepositStatus;
  confirmations: number;
  requiredConfirmations: number;
  detectedAt: string;
  creditedAt?: string;
}

export type WithdrawalStatus = 
  | 'Solicitado' 
  | 'Em análise' 
  | 'Processando' 
  | 'Enviado' 
  | 'Concluído' 
  | 'Rejeitado' 
  | 'Falhou';

export type WithdrawalPlatform = 'TRC20' | 'BINANCE' | 'BYBIT' | 'REDOTPAY';

export interface WithdrawalOrder {
  id: string;
  userId: string;
  userEmail: string;
  type: WithdrawalPlatform;
  destination: string;
  walletNickname?: string;
  amount: number;
  fee: number;
  netAmount: number;
  status: WithdrawalStatus;
  txid?: string;
  adminNotes?: string;
  operatorAdminId?: string;
  operatorAdminEmail?: string;
  createdAt: string;
  processedAt?: string;
}

export type WalletType = 'TRON' | 'BINANCE' | 'BYBIT' | 'REDOTPAY';

export interface ClientWallet {
  id: string;
  userId: string;
  type: WalletType;
  nickname: string;
  addressOrUid: string;
  createdAt: string;
}

export interface PaymentMethodConfig {
  id: 'iban' | 'referencia';
  name: string;
  isActive: boolean;
  bank: string;
  beneficiary: string;
  accountOrCode: string;
  instructions: string;
}

export interface ExchangeSettings {
  buyRateKz: number;
  sellRateKz: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FeeSettings {
  buyFeePercent: number;
  sellFeePercent: number;
  sellFeeKzFixed: number;
  trc20WithdrawalFeeUsdt: number;
  binanceWithdrawalFeeUsdt: number;
  updatedAt: string;
  updatedBy: string;
}

export interface LimitSettings {
  minBuyUsdt: number;
  maxBuyUsdt: number;
  minSellUsdt: number;
  maxSellUsdt: number;
  minDepositUsdt: number;
  minWithdrawUsdt: number;
  maxWithdrawUsdt: number;
  dailyLimitUsdt: number;
  monthlyLimitUsdt: number;
  updatedAt: string;
  updatedBy: string;
}

export interface TronOperationalStatus {
  vaultAddress: string;
  operationalAddress?: string; // alias
  usdtContract: string;
  trxBalance: number;
  usdtBalance: number;
  usdtHotWalletBalance?: number; // alias
  energyAvailable: number;
  energyTotal: number;
  bandwidthAvailable: number;
  bandwidthTotal: number;
  estimatedFeeTrxPerTx: number;
  isEnergySufficient: boolean;
  nodeHealth?: string; // alias
  lastCheckedAt: string;
}

export interface ReconciliationSummary {
  totalInternalClientUsdt: number;
  totalLedgerLiabilityUsdt?: number; // alias
  totalLockedClientUsdt: number;
  vaultBlockchainUsdt: number;
  totalHotWalletUsdt?: number; // alias
  divergenceUsdt: number;
  discrepanciesCount?: number; // alias
  totalKzDisbursed: number;
  totalKzReceived: number;
  hasDivergence: boolean;
  auditStatus?: string; // alias
  lastReconciliationAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  category: 'Compra' | 'Venda' | 'Depósito' | 'Saque' | 'KYC' | 'Geral' | string;
  relatedOrderId?: string;
  relatedOperationId?: string;
  status: 'Aberto' | 'Em atendimento' | 'Resolvido' | 'Fechado' | string;
  priority: 'Baixa' | 'Média' | 'Alta';
  messages: Array<{
    id: string;
    sender: 'client' | 'support';
    senderRole?: 'client' | 'support';
    senderName: string;
    text: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  operatorEmail?: string; // alias
  action: string;
  resource: string;
  relatedId?: string;
  targetId?: string; // alias
  timestamp: string;
  result: 'SUCCESS' | 'FAILURE';
  note?: string;
  ipAddress?: string;
}

// --- Publicidade & Monetização (Anúncios de Empresas) ---
export type AdPlacement = 'top_banner' | 'dashboard_native' | 'sidebar' | 'footer' | 'all';
export type AdStatus = 'active' | 'paused' | 'expired';

export interface Advertisement {
  id: string;
  title: string;
  destinationUrl: string;
  bannerUrl?: string;
  status: AdStatus;
  companyName?: string;
  description?: string;
  callToAction?: string;
  badgeText?: string;
  placement?: AdPlacement;
  priority?: number; // 1 to 10 (higher priority ads appear first/more frequently)
  category?: string;
  pricing?: {
    amountKz?: number;
    amountUsdt?: number;
    billingModel?: 'monthly' | 'weekly' | 'cpc' | 'fixed';
    isPaid?: boolean;
    notes?: string;
  };
  impressions?: number;
  clicks?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  contactEmail?: string;
  contactPhone?: string;
  inquiryId?: string;
}

export type AdInquiryStatus = 'pending' | 'contacted' | 'approved' | 'rejected';

export interface AdInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  budget: string;
  preferredPlacement: AdPlacement;
  message: string;
  status: AdInquiryStatus;
  createdAt: string;
  adminNotes?: string;
  convertedAdId?: string;
}

export interface AdMonetizationSummary {
  totalRevenueKz: number;
  totalRevenueUsdt: number;
  activeAdsCount: number;
  pausedAdsCount: number;
  pendingInquiriesCount: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtrPercent: number;
}
