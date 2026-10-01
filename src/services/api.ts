import {
  User,
  Balance,
  KycRecord,
  LedgerEntry,
  PurchaseOrder,
  PurchaseTargetWallet,
  SaleOrder,
  DepositOrder,
  WithdrawalOrder,
  WithdrawalPlatform,
  ClientWallet,
  WalletType,
  ExchangeSettings,
  FeeSettings,
  LimitSettings,
  PaymentMethodConfig,
  NotificationItem,
  SupportTicket,
  AuditLog,
  TronOperationalStatus,
  ReconciliationSummary,
  Advertisement,
  AdInquiry,
  AdMonetizationSummary,
  AdPlacement,
} from '../types/index.ts';

const TOKEN_KEY = 'angopayx_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // AbortController with generous timeout for file uploads (90s for FormData, 40s for others)
  const controller = new AbortController();
  const timeoutMs = isFormData ? 90000 : 40000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = options.signal || controller.signal;

  try {
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
      signal,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg =
        data.error ||
        data.message ||
        (res.status === 404
          ? `Serviço não encontrado (404) em ${endpoint}.`
          : res.status === 401
          ? 'Não autorizado (401). Sessão expirada ou credenciais inválidas.'
          : res.status === 403
          ? 'Acesso negado (403).'
          : res.status === 500
          ? 'Erro interno do servidor (500).'
          : `Erro de comunicação HTTP ${res.status} ao contactar o servidor.`);
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('O pedido excedeu o tempo limite (40s). Verifique a sua ligação à internet.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  // Auth (Supabase Real Integration)
  register: (payload: any) =>
    request<{ message: string; userId: string; email: string; otpSent?: boolean; otpCode?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyEmail: (payload: { email: string; code: string }) =>
    request<{ message: string; user: User; token: string }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resendVerification: (payload: { email: string }) =>
    request<{ message: string; otpSent?: boolean; otpCode?: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<{ message: string; user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  forgotPassword: (payload: { email: string }) =>
    request<{ message: string; otpSent?: boolean; resetCode?: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  resetPassword: (payload: any) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMe: () => request<{ user: User; balance: Balance; kyc?: KycRecord }>('/auth/me'),

  // Public config
  getRatesAndMethods: () => request<{
    exchange: ExchangeSettings;
    fees: FeeSettings;
    limits: LimitSettings;
    paymentMethods: PaymentMethodConfig[];
  }>('/rates-and-methods'),

  // Profile Identity (Validação de Dados de Identidade sem envio de fotos)
  updateProfileIdentity: (payload: {
    fullName: string;
    documentNumber: string;
    dateOfBirth: string;
    phone?: string;
    nationality?: string;
  }) =>
    request<{ success: boolean; message: string; user: User; kycRecord: KycRecord }>('/profile/identity', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // KYC (Submissão e envio de dados com conformidade)
  uploadKycDocument: (payload: {
    documentType: 'bi-frente' | 'bi-verso' | 'selfie';
    fileName: string;
    contentType: string;
    base64Data: string;
  }) =>
    request<{ success: boolean; message: string; path: string }>('/kyc/upload-document', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getKycSignedUrls: (payload: { paths: string[] }) =>
    request<{ signedUrls: Record<string, string> }>('/kyc/signed-urls', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  submitKyc: (payload: FormData | any) => {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
    return request<{ success: boolean; message: string; kycRecord: KycRecord }>('/kyc/submit', {
      method: 'POST',
      body: isFormData ? payload : JSON.stringify(payload),
    });
  },

  deleteKycStorageFiles: (payload: { kycId?: string; paths?: string[] }) =>
    request<{ success: boolean; message: string; deletedFiles?: string[] }>('/admin/kyc/delete-storage-files', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Purchases
  createPurchase: (payload: {
    usdtAmount: number;
    paymentMethodType: 'iban' | 'referencia';
    targetWallet?: PurchaseTargetWallet;
  }) =>
    request<{ message: string; order: PurchaseOrder }>('/purchases/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  uploadPurchaseReceipt: (payload: { orderId: string; receiptUrl: string }) =>
    request<{ message: string; order: PurchaseOrder }>('/purchases/upload-receipt', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyPurchases: () => request<{ purchases: PurchaseOrder[] }>('/purchases/my'),

  // Sales
  createSale: (payload: any) =>
    request<{ message: string; order: SaleOrder }>('/sales/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMySales: () => request<{ sales: SaleOrder[] }>('/sales/my'),

  // Deposits
  getDepositAddress: () =>
    request<{
      asset: string;
      network: string;
      tokenContract: string;
      depositAddress: string;
      minDeposit: number;
      warning: string;
    }>('/deposits/address'),
  submitDepositTx: (payload: { txid: string; amount: number }) =>
    request<{ message: string; deposit: DepositOrder; newBalance: Balance }>('/deposits/submit-tx', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyDeposits: () => request<{ deposits: DepositOrder[] }>('/deposits/my'),

  // Withdrawals
  createWithdrawal: (payload: { type: WithdrawalPlatform; destination: string; amount: number; walletNickname?: string }) =>
    request<{ message: string; withdrawal: WithdrawalOrder }>('/withdrawals/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getMyWithdrawals: () => request<{ withdrawals: WithdrawalOrder[] }>('/withdrawals/my'),

  // Wallets
  getMyWallets: () => request<{ wallets: ClientWallet[] }>('/wallets/my'),
  addWallet: (payload: { type: WalletType; nickname: string; addressOrUid: string }) =>
    request<{ message: string; wallet: ClientWallet }>('/wallets/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteWallet: (walletId: string) =>
    request<{ message: string }>(`/wallets/${walletId}`, {
      method: 'DELETE',
    }),

  // Ledger
  getMyLedger: () => request<{ ledger: LedgerEntry[] }>('/ledger/my'),

  // Notifications
  getMyNotifications: () => request<{ notifications: NotificationItem[] }>('/notifications/my'),
  markNotificationRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' }),

  // Support
  getMyTickets: () => request<{ tickets: SupportTicket[] }>('/support/tickets'),
  createTicket: (payload: any) =>
    request<{ message: string; ticket: SupportTicket }>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  sendTicketMessage: (ticketId: string, text: string) =>
    request<{ message: string; ticket: SupportTicket }>(`/support/tickets/${ticketId}/message`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // ADMIN
  getAdminDashboard: () =>
    request<{
      metrics: {
        totalClients: number;
        pendingKycCount: number;
        pendingPurchasesCount: number;
        pendingSalesCount: number;
        pendingWithdrawalsCount: number;
        totalVolumeUsdt: number;
        totalVolumeKz: number;
      };
      tronStatus: TronOperationalStatus;
      reconciliation: ReconciliationSummary;
    }>('/admin/dashboard'),
  getAdminClients: () => request<{ clients: (User & { balance: Balance })[] }>('/admin/clients'),
  updateClientStatus: (clientId: string, status: string, note?: string) =>
    request<{ message: string; user: User }>(`/admin/clients/${clientId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, note }),
    }),
  getAdminKycList: () => request<{ kycRecords: KycRecord[] }>('/admin/kyc/list'),
  actionKyc: (payload: { kycId: string; action: 'approve' | 'reject' | 'request_more' | 'in_review'; notes?: string }) =>
    request<{ message: string; record: KycRecord }>('/admin/kyc/action', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminPurchases: () => request<{ purchases: PurchaseOrder[] }>('/admin/purchases'),
  actionPurchase: (payload: { purchaseId: string; action: 'approve' | 'reject'; notes?: string; txidOrProof?: string }) =>
    request<{ message: string; order: PurchaseOrder; newBalance?: Balance }>('/admin/purchases/action', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminSales: () => request<{ sales: SaleOrder[] }>('/admin/sales'),
  actionSale: (payload: { saleId: string; action: 'processing' | 'complete' | 'reject'; notes?: string; payoutProofUrl?: string }) =>
    request<{ message: string; order: SaleOrder }>('/admin/sales/action', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminWithdrawals: () => request<{ withdrawals: WithdrawalOrder[] }>('/admin/withdrawals'),
  actionWithdrawal: (payload: { withdrawalId: string; action: 'complete' | 'reject'; txid?: string; notes?: string }) =>
    request<{ message: string; order: WithdrawalOrder }>('/admin/withdrawals/action', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminLedger: () => request<{ ledger: LedgerEntry[] }>('/admin/ledger'),
  getAdminAuditLogs: () => request<{ auditLogs: AuditLog[] }>('/admin/audit-logs'),
  updateRates: (payload: { buyRateKz: number; sellRateKz: number }) =>
    request<{ message: string; settings: ExchangeSettings }>('/admin/settings/rates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateFees: (payload: any) =>
    request<{ message: string; settings: FeeSettings }>('/admin/settings/fees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLimits: (payload: any) =>
    request<{ message: string; settings: LimitSettings }>('/admin/settings/limits', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updatePaymentMethod: (payload: any) =>
    request<{ message: string; method: PaymentMethodConfig }>('/admin/settings/payment-methods', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getAdminTronResources: () => request<{ tronStatus: TronOperationalStatus }>('/admin/tron-resources'),
  runReconciliation: () => request<{ summary: ReconciliationSummary }>('/admin/reconciliation/run', { method: 'POST' }),
  getAdminTickets: () => request<{ tickets: SupportTicket[] }>('/admin/tickets'),
  replyAdminTicket: (ticketId: string, payload: { text: string; newStatus?: string }) =>
    request<{ message: string; ticket: SupportTicket }>(`/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Public Advertising & Monetization
  getActiveAds: (placement?: AdPlacement | string) =>
    request<{ ads: Advertisement[] }>(`/ads/active${placement ? `?placement=${encodeURIComponent(placement)}` : ''}`),
  clickAd: (id: string) =>
    request<{ success: boolean; destinationUrl?: string }>(`/ads/${id}/click`, { method: 'POST' }),
  submitAdInquiry: (payload: {
    companyName: string;
    contactPerson: string;
    email: string;
    phone?: string;
    budget?: string;
    preferredPlacement?: string;
    message: string;
  }) =>
    request<{ message: string; inquiry: AdInquiry }>('/ads/inquiry', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Admin Advertising & Monetization
  getAdminAds: () =>
    request<{ ads: Advertisement[]; inquiries: AdInquiry[]; summary: AdMonetizationSummary }>('/admin/ads'),
  createAdminAd: (payload: any) =>
    request<{ message: string; ad: Advertisement }>('/admin/ads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminAd: (id: string, payload: any) =>
    request<{ message: string; ad: Advertisement }>(`/admin/ads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteAdminAd: (id: string) =>
    request<{ message: string }>(`/admin/ads/${id}`, {
      method: 'DELETE',
    }),
  getAdminAdInquiries: () =>
    request<{ inquiries: AdInquiry[] }>('/admin/ads/inquiries'),
  updateAdminAdInquiryStatus: (id: string, status: string, adminNotes?: string) =>
    request<{ message: string; inquiry: AdInquiry }>(`/admin/ads/inquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    }),
  convertInquiryToAd: (inquiryId: string, adOverrides?: any) =>
    request<{ message: string; ad: Advertisement; inquiry: AdInquiry }>(`/admin/ads/inquiries/${inquiryId}/convert`, {
      method: 'POST',
      body: JSON.stringify({ adOverrides }),
    }),
};
