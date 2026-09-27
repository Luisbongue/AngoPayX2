import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  User,
  UserRole,
  KycRecord,
  Balance,
  LedgerEntry,
  PurchaseOrder,
  SaleOrder,
  DepositOrder,
  WithdrawalOrder,
  ClientWallet,
  PaymentMethodConfig,
  ExchangeSettings,
  FeeSettings,
  LimitSettings,
  NotificationItem,
  SupportTicket,
  AuditLog,
  TronOperationalStatus,
  ReconciliationSummary,
  Advertisement,
  AdInquiry,
  AdMonetizationSummary,
  AdPlacement,
  AdStatus,
  AdInquiryStatus,
} from '../types/index.ts';
import { generateClientTronDepositAddress, TRON_USDT_CONTRACT } from './tronUtils.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'angopayx-database.json');

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`ANGOPAYX_SALT_${password}`).digest('hex');
}

export interface DatabaseSchema {
  users: User[];
  kycRecords: KycRecord[];
  balances: Record<string, Balance>; // userId -> Balance
  ledger: LedgerEntry[];
  purchases: PurchaseOrder[];
  sales: SaleOrder[];
  deposits: DepositOrder[];
  withdrawals: WithdrawalOrder[];
  wallets: ClientWallet[];
  paymentMethods: PaymentMethodConfig[];
  exchangeSettings: ExchangeSettings;
  feeSettings: FeeSettings;
  limitSettings: LimitSettings;
  notifications: NotificationItem[];
  supportTickets: SupportTicket[];
  auditLogs: AuditLog[];
  processedTxids: string[]; // Idempotency set
  reconciliationHistory: ReconciliationSummary[];
  advertisements: Advertisement[];
  adInquiries: AdInquiry[];
}

// Mapping of Authorized Administrative Emails (Role Recognized by the System upon Manual Registration)
export const ADMINISTRATIVE_EMAILS: Record<string, UserRole> = {
  'luisbongue4@gmail.com': 'super_admin',
  'luisbongue5@gmail.com': 'finance_admin',
  'boavidabongue6@gmail.com': 'kyc_admin',
};

export function getRoleForEmail(email: string): UserRole {
  const norm = email.trim().toLowerCase();
  return ADMINISTRATIVE_EMAILS[norm] || 'client';
}

// Initial Seed Data (Clean Production Baseline - No fake users or mock credentials)
function getInitialDatabase(): DatabaseSchema {
  const defaultPaymentMethods: PaymentMethodConfig[] = [
    {
      id: 'iban',
      name: 'Depósito via Kwik / IBAN Bancário',
      isActive: true,
      bank: 'Kwik / Rede Interbancária EMIS',
      beneficiary: 'PayPal',
      accountOrCode: '0420 0000 0000 1098 3557 1',
      instructions: 'Transfira o valor exato em Kwanzas via Kwik ou por IBAN para a conta gerada pela empresa PayPal (0420 0000 0000 1098 3557 1) e anexe o comprovativo da operação.',
    },
    {
      id: 'referencia',
      name: 'Pagamento por Código de Referência (Multicaixa / Kwik)',
      isActive: true,
      bank: 'Multicaixa Express / Kwik / Rede EMIS',
      beneficiary: 'Entidade: 10116 (PayPal / AngoPayX)',
      accountOrCode: '935 531 547',
      instructions: 'Aceda ao Multicaixa Express ou Kwik > Pagamentos por Referência > Insira a Entidade: 10116 e a Referência ou ID: 935 531 547. Efetue o pagamento do valor exato em Kz e anexe o comprovativo.',
    },
  ];

  return {
    users: [],
    kycRecords: [],
    balances: {},
    ledger: [],
    purchases: [],
    sales: [],
    deposits: [],
    withdrawals: [],
    wallets: [],
    paymentMethods: defaultPaymentMethods,
    exchangeSettings: {
      buyRateKz: 1350,
      sellRateKz: 1250,
      updatedAt: '2026-01-10T00:00:00.000Z',
      updatedBy: 'Sistema Inicial',
    },
    feeSettings: {
      buyFeePercent: 0,
      sellFeePercent: 0,
      sellFeeKzFixed: 0, // Zero fee rule as required
      trc20WithdrawalFeeUsdt: 1.5,
      binanceWithdrawalFeeUsdt: 0.5,
      updatedAt: '2026-01-10T00:00:00.000Z',
      updatedBy: 'Sistema Inicial',
    },
    limitSettings: {
      minBuyUsdt: 10,
      maxBuyUsdt: 10000,
      minSellUsdt: 10,
      maxSellUsdt: 10000,
      minDepositUsdt: 5,
      minWithdrawUsdt: 10,
      maxWithdrawUsdt: 5000,
      dailyLimitUsdt: 20000,
      monthlyLimitUsdt: 100000,
      updatedAt: '2026-01-10T00:00:00.000Z',
      updatedBy: 'Sistema Inicial',
    },
    notifications: [],
    supportTickets: [],
    auditLogs: [],
    processedTxids: [],
    reconciliationHistory: [],
    advertisements: [
      {
        id: 'ad-unitel-001',
        companyName: 'Unitel Money Angola',
        title: 'Recargas & Pagamentos em Kwanza sem Taxa Adicional',
        description: 'Transfira saldo para a sua carteira digital ou pague no comércio com a maior rede móvel de Angola.',
        callToAction: 'Saber Mais',
        destinationUrl: 'https://www.unitel.ao/unitel-money/',
        bannerUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
        badgeText: 'Patrocinador Oficial',
        placement: 'top_banner',
        status: 'active',
        priority: 10,
        category: 'Telecom & Finanças',
        pricing: {
          amountKz: 450000,
          amountUsdt: 333,
          billingModel: 'monthly',
          isPaid: true,
          notes: 'Contrato corporativo trimestral (Renovação automática)',
        },
        impressions: 1420,
        clicks: 184,
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-12-31T23:59:59.000Z',
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
        contactEmail: 'parcerias@unitelmoney.ao',
        contactPhone: '+244 923 111 222',
      },
      {
        id: 'ad-bai-002',
        companyName: 'Banco BAI Directo',
        title: 'Conta Digital BAI para Câmbio e Operações de Negócios',
        description: 'Abra a sua conta digital BAI em minutos e movimente Kwanza com máxima conformidade bancária.',
        callToAction: 'Abrir Conta Online',
        destinationUrl: 'https://www.bancobai.ao/',
        bannerUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
        badgeText: 'Destaque Bancário',
        placement: 'dashboard_native',
        status: 'active',
        priority: 8,
        category: 'Banca Comercial',
        pricing: {
          amountKz: 600000,
          amountUsdt: 444,
          billingModel: 'monthly',
          isPaid: true,
          notes: 'Campanha de expansão de contas bancárias digitais',
        },
        impressions: 2190,
        clicks: 312,
        startDate: '2026-02-10T00:00:00.000Z',
        endDate: '2026-11-30T23:59:59.000Z',
        createdAt: '2026-02-10T08:00:00.000Z',
        updatedAt: '2026-02-10T08:00:00.000Z',
        contactEmail: 'empresas@bancobai.ao',
        contactPhone: '+244 222 696 900',
      },
      {
        id: 'ad-kwanzapay-003',
        companyName: 'KwanzaPay Gateway',
        title: 'Receba Pagamentos Online na sua Loja Virtual em Luanda',
        description: 'A API de pagamentos angolana mais simples para e-commerce. Aceite Multicaixa Express e USDT.',
        callToAction: 'Integrar API',
        destinationUrl: 'https://kwanzapay.ao',
        bannerUrl: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
        badgeText: 'Parceiro Tecnológico',
        placement: 'sidebar',
        status: 'active',
        priority: 5,
        category: 'E-commerce & TI',
        pricing: {
          amountKz: 300000,
          amountUsdt: 222,
          billingModel: 'monthly',
          isPaid: true,
          notes: 'Plano de visibilidade para desenvolvedores e lojistas',
        },
        impressions: 980,
        clicks: 145,
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.000Z',
        createdAt: '2026-03-01T12:00:00.000Z',
        updatedAt: '2026-03-01T12:00:00.000Z',
        contactEmail: 'devs@kwanzapay.ao',
        contactPhone: '+244 944 888 999',
      },
    ],
    adInquiries: [
      {
        id: 'inq-001',
        companyName: 'Angola Express Logística Lda',
        contactPerson: 'Carlos Vandúnem',
        email: 'marketing@angolaexpress.co.ao',
        phone: '+244 923 456 789',
        budget: '400.000 Kz / mês',
        preferredPlacement: 'dashboard_native',
        message: 'Gostaríamos de colocar um banner promovendo o nosso serviço de entregas rápidas de encomendas e documentos em Luanda e Benguela para os vossos clientes empresariais.',
        status: 'pending',
        createdAt: '2026-03-15T14:30:00.000Z',
      },
      {
        id: 'inq-002',
        companyName: 'Tchilar Facturação Certificada AGT',
        contactPerson: 'Engª Nádia Morais',
        email: 'comercial@tchilar.ao',
        phone: '+244 945 112 334',
        budget: '250 USDT / mês',
        preferredPlacement: 'top_banner',
        message: 'Pretendemos anunciar o nosso software na nuvem com emissão de faturas certificadas pela AGT para comerciantes de criptoactivos e cambistas.',
        status: 'pending',
        createdAt: '2026-03-18T09:15:00.000Z',
      },
    ],
  };
}

class StorageEngine {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadDatabase();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const initial = getInitialDatabase();
        // Ensure new collections are populated if older database file exists
        if (!parsed.advertisements || parsed.advertisements.length === 0) {
          parsed.advertisements = initial.advertisements;
        }
        if (!parsed.adInquiries || parsed.adInquiries.length === 0) {
          parsed.adInquiries = initial.adInquiries;
        }
        this.saveDatabase(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Error reading database file, using seed:', err);
    }
    const initial = getInitialDatabase();
    this.saveDatabase(initial);
    return initial;
  }

  private saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const payload = JSON.stringify(dataToSave || this.data, null, 2);
      fs.writeFileSync(DB_FILE, payload, 'utf-8');
    } catch (err) {
      console.error('Failed to persist database file:', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- Users & Auth ---
  public findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(user: User): User {
    this.data.users.push(user);
    // Initialize balance
    this.data.balances[user.id] = {
      userId: user.id,
      availableBalance: 0,
      lockedBalance: 0,
      totalBalance: 0,
      updatedAt: new Date().toISOString(),
    };
    this.saveDatabase();
    return user;
  }

  public updateUser(user: User): User {
    const idx = this.data.users.findIndex((u) => u.id === user.id);
    if (idx !== -1) {
      this.data.users[idx] = user;
      this.saveDatabase();
    }
    return user;
  }

  // --- Balances & Ledger ---
  public getBalance(userId: string): Balance {
    if (!this.data.balances[userId]) {
      this.data.balances[userId] = {
        userId,
        availableBalance: 0,
        lockedBalance: 0,
        totalBalance: 0,
        updatedAt: new Date().toISOString(),
      };
      this.saveDatabase();
    }
    return this.data.balances[userId];
  }

  /**
   * Adds entry to the financial ledger and updates available/locked balances atomically.
   */
  public recordFinancialOperation(params: {
    userId: string;
    type: LedgerEntry['type'];
    amount: number;
    direction: 'IN' | 'OUT';
    relatedOperationId: string;
    reference: string;
    txid?: string;
    userEmail?: string;
  }): { ledgerEntry: LedgerEntry; newBalance: Balance } {
    const balance = this.getBalance(params.userId);
    const balanceBefore = balance.availableBalance;
    let newAvailable = balance.availableBalance;

    if (params.direction === 'IN') {
      newAvailable += params.amount;
    } else {
      if (newAvailable < params.amount) {
        throw new Error('Saldo insuficiente para realizar esta movimentação no ledger.');
      }
      newAvailable -= params.amount;
    }

    balance.availableBalance = Number(newAvailable.toFixed(4));
    balance.totalBalance = Number((balance.availableBalance + balance.lockedBalance).toFixed(4));
    balance.updatedAt = new Date().toISOString();

    const ledgerEntry: LedgerEntry = {
      id: `ledg-${crypto.randomUUID()}`,
      userId: params.userId,
      userEmail: params.userEmail,
      type: params.type,
      asset: 'USDT',
      amount: params.amount,
      direction: params.direction,
      relatedOperationId: params.relatedOperationId,
      balanceBefore,
      balanceAfter: balance.availableBalance,
      timestamp: new Date().toISOString(),
      status: 'Confirmado',
      reference: params.reference,
      txid: params.txid,
    };

    this.data.ledger.unshift(ledgerEntry);
    this.saveDatabase();

    return { ledgerEntry, newBalance: balance };
  }

  /**
   * Locks balance during a pending withdrawal or pending sale
   */
  public lockBalance(userId: string, amount: number): Balance {
    const balance = this.getBalance(userId);
    if (balance.availableBalance < amount) {
      throw new Error(`Saldo disponível insuficiente (${balance.availableBalance.toFixed(2)} USDT) para bloquear ${amount.toFixed(2)} USDT.`);
    }
    balance.availableBalance = Number((balance.availableBalance - amount).toFixed(4));
    balance.lockedBalance = Number((balance.lockedBalance + amount).toFixed(4));
    balance.totalBalance = Number((balance.availableBalance + balance.lockedBalance).toFixed(4));
    balance.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return balance;
  }

  /**
   * Unlocks balance when an order is cancelled or rejected
   */
  public unlockBalance(userId: string, amount: number): Balance {
    const balance = this.getBalance(userId);
    const unlockAmt = Math.min(balance.lockedBalance, amount);
    balance.lockedBalance = Number((balance.lockedBalance - unlockAmt).toFixed(4));
    balance.availableBalance = Number((balance.availableBalance + unlockAmt).toFixed(4));
    balance.totalBalance = Number((balance.availableBalance + balance.lockedBalance).toFixed(4));
    balance.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return balance;
  }

  /**
   * Finalizes locked balance deduction when withdrawal/sale completes
   */
  public commitLockedBalance(userId: string, amount: number): Balance {
    const balance = this.getBalance(userId);
    balance.lockedBalance = Number(Math.max(0, balance.lockedBalance - amount).toFixed(4));
    balance.totalBalance = Number((balance.availableBalance + balance.lockedBalance).toFixed(4));
    balance.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return balance;
  }

  // --- Idempotency ---
  public isTxidProcessed(txid: string): boolean {
    return this.data.processedTxids.includes(txid.toLowerCase());
  }

  public registerProcessedTxid(txid: string) {
    this.data.processedTxids.push(txid.toLowerCase());
    this.saveDatabase();
  }

  // --- Purchases ---
  public createPurchase(order: PurchaseOrder) {
    this.data.purchases.unshift(order);
    this.saveDatabase();
    return order;
  }

  public updatePurchase(order: PurchaseOrder) {
    const idx = this.data.purchases.findIndex((p) => p.id === order.id);
    if (idx !== -1) {
      this.data.purchases[idx] = order;
      this.saveDatabase();
    }
    return order;
  }

  // --- Sales ---
  public createSale(order: SaleOrder) {
    this.data.sales.unshift(order);
    this.saveDatabase();
    return order;
  }

  public updateSale(order: SaleOrder) {
    const idx = this.data.sales.findIndex((s) => s.id === order.id);
    if (idx !== -1) {
      this.data.sales[idx] = order;
      this.saveDatabase();
    }
    return order;
  }

  // --- Deposits ---
  public createDeposit(deposit: DepositOrder) {
    this.data.deposits.unshift(deposit);
    this.saveDatabase();
    return deposit;
  }

  public updateDeposit(deposit: DepositOrder) {
    const idx = this.data.deposits.findIndex((d) => d.id === deposit.id);
    if (idx !== -1) {
      this.data.deposits[idx] = deposit;
      this.saveDatabase();
    }
    return deposit;
  }

  // --- Withdrawals ---
  public createWithdrawal(w: WithdrawalOrder) {
    this.data.withdrawals.unshift(w);
    this.saveDatabase();
    return w;
  }

  public updateWithdrawal(w: WithdrawalOrder) {
    const idx = this.data.withdrawals.findIndex((x) => x.id === w.id);
    if (idx !== -1) {
      this.data.withdrawals[idx] = w;
      this.saveDatabase();
    }
    return w;
  }

  // --- Wallets ---
  public getWallets(userId: string): ClientWallet[] {
    return this.data.wallets.filter((w) => w.userId === userId);
  }

  public addWallet(wallet: ClientWallet): ClientWallet {
    this.data.wallets.unshift(wallet);
    this.saveDatabase();
    return wallet;
  }

  public deleteWallet(userId: string, walletId: string): boolean {
    const prevLen = this.data.wallets.length;
    this.data.wallets = this.data.wallets.filter((w) => !(w.id === walletId && w.userId === userId));
    const deleted = this.data.wallets.length < prevLen;
    if (deleted) this.saveDatabase();
    return deleted;
  }

  // --- KYC ---
  public getKycRecord(userId: string): KycRecord | undefined {
    return this.data.kycRecords.find((k) => k.userId === userId);
  }

  public saveKycRecord(record: KycRecord) {
    const idx = this.data.kycRecords.findIndex((k) => k.userId === record.userId);
    if (idx !== -1) {
      this.data.kycRecords[idx] = record;
    } else {
      this.data.kycRecords.unshift(record);
    }
    // Update user kycStatus
    const user = this.findUserById(record.userId);
    if (user) {
      user.kycStatus = record.status;
      this.updateUser(user);
    }
    this.saveDatabase();
    return record;
  }

  // --- Settings ---
  public getExchangeSettings(): ExchangeSettings {
    return this.data.exchangeSettings;
  }

  public updateExchangeSettings(rates: Partial<ExchangeSettings>, adminEmail: string): ExchangeSettings {
    this.data.exchangeSettings = {
      ...this.data.exchangeSettings,
      ...rates,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    };
    this.saveDatabase();
    return this.data.exchangeSettings;
  }

  public getFeeSettings(): FeeSettings {
    return this.data.feeSettings;
  }

  public updateFeeSettings(fees: Partial<FeeSettings>, adminEmail: string): FeeSettings {
    this.data.feeSettings = {
      ...this.data.feeSettings,
      ...fees,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    };
    this.saveDatabase();
    return this.data.feeSettings;
  }

  public getLimitSettings(): LimitSettings {
    return this.data.limitSettings;
  }

  public updateLimitSettings(limits: Partial<LimitSettings>, adminEmail: string): LimitSettings {
    this.data.limitSettings = {
      ...this.data.limitSettings,
      ...limits,
      updatedAt: new Date().toISOString(),
      updatedBy: adminEmail,
    };
    this.saveDatabase();
    return this.data.limitSettings;
  }

  public getPaymentMethods(): PaymentMethodConfig[] {
    return this.data.paymentMethods;
  }

  public updatePaymentMethod(method: PaymentMethodConfig): PaymentMethodConfig {
    const idx = this.data.paymentMethods.findIndex((m) => m.id === method.id);
    if (idx !== -1) {
      this.data.paymentMethods[idx] = method;
    } else {
      this.data.paymentMethods.push(method);
    }
    this.saveDatabase();
    return method;
  }

  // --- Notifications ---
  public addNotification(notif: Omit<NotificationItem, 'id' | 'createdAt'>): NotificationItem {
    const item: NotificationItem = {
      ...notif,
      id: `notif-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(item);
    this.saveDatabase();
    return item;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (notif) {
      notif.isRead = true;
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Support Tickets ---
  public createTicket(ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'updatedAt' | 'messages'>, initialMessage: string): SupportTicket {
    const item: SupportTicket = {
      ...ticket,
      id: `tkt-${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${crypto.randomUUID().slice(0, 6)}`,
          sender: 'client',
          senderName: ticket.userName,
          text: initialMessage,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    this.data.supportTickets.unshift(item);
    this.saveDatabase();
    return item;
  }

  public addTicketMessage(ticketId: string, sender: 'client' | 'support', senderName: string, text: string): SupportTicket {
    const ticket = this.data.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket não encontrado');
    ticket.messages.push({
      id: `msg-${crypto.randomUUID().slice(0, 6)}`,
      sender,
      senderName,
      text,
      timestamp: new Date().toISOString(),
    });
    ticket.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return ticket;
  }

  public updateTicketStatus(ticketId: string, status: SupportTicket['status']): SupportTicket {
    const ticket = this.data.supportTickets.find((t) => t.id === ticketId);
    if (!ticket) throw new Error('Ticket não encontrado');
    ticket.status = status;
    ticket.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return ticket;
  }

  // --- Audit Logs ---
  public logAudit(params: {
    adminId: string;
    adminEmail: string;
    action: string;
    resource: string;
    relatedId?: string;
    result: 'SUCCESS' | 'FAILURE';
    note?: string;
    ipAddress?: string;
  }): AuditLog {
    const entry: AuditLog = {
      id: `audit-${crypto.randomUUID()}`,
      timestamp: new Date().toISOString(),
      ...params,
    };
    this.data.auditLogs.unshift(entry);
    this.saveDatabase();
    return entry;
  }

  // --- TRON Operational & Reconciliation ---
  public getTronOperationalStatus(): TronOperationalStatus {
    return {
      vaultAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
      usdtContract: TRON_USDT_CONTRACT,
      trxBalance: 14850.5,
      usdtBalance: 85200.0,
      energyAvailable: 924500,
      energyTotal: 1000000,
      bandwidthAvailable: 49800,
      bandwidthTotal: 50000,
      estimatedFeeTrxPerTx: 13.8,
      isEnergySufficient: true,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  public runReconciliation(): ReconciliationSummary {
    let totalInternalClientUsdt = 0;
    let totalLockedClientUsdt = 0;

    Object.values(this.data.balances).forEach((b) => {
      totalInternalClientUsdt += b.availableBalance;
      totalLockedClientUsdt += b.lockedBalance;
    });

    const vaultBlockchainUsdt = 85200.0;
    const requiredCoverage = totalInternalClientUsdt + totalLockedClientUsdt;
    const divergenceUsdt = vaultBlockchainUsdt - requiredCoverage;

    let totalKzReceived = 0;
    this.data.purchases
      .filter((p) => p.status === 'USDT creditado' || p.status === 'Pagamento confirmado')
      .forEach((p) => (totalKzReceived += p.totalKz));

    let totalKzDisbursed = 0;
    this.data.sales
      .filter((s) => s.status === 'Concluída' || s.status === 'Pagamento Kz em processamento')
      .forEach((s) => (totalKzDisbursed += s.totalKzToReceive));

    const summary: ReconciliationSummary = {
      totalInternalClientUsdt: Number(totalInternalClientUsdt.toFixed(4)),
      totalLockedClientUsdt: Number(totalLockedClientUsdt.toFixed(4)),
      vaultBlockchainUsdt,
      divergenceUsdt: Number(divergenceUsdt.toFixed(4)),
      totalKzDisbursed,
      totalKzReceived,
      hasDivergence: divergenceUsdt < 0,
      lastReconciliationAt: new Date().toISOString(),
    };

    this.data.reconciliationHistory.unshift(summary);
    this.saveDatabase();
    return summary;
  }

  // --- Publicidade, Parcerias & Monetização com Anúncios ---
  public getActiveAds(placement?: string): Advertisement[] {
    const now = new Date().toISOString();
    let ads = this.data.advertisements
      .filter((ad) => {
        if (ad.status !== 'active') return false;
        if (ad.startDate && ad.startDate > now) return false;
        if (ad.endDate && ad.endDate < now) return false;
        if (placement && placement !== 'all' && ad.placement !== 'all' && ad.placement !== placement) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.priority ?? 5) - (a.priority ?? 5));

    // Increment impressions
    let changed = false;
    ads.forEach((ad) => {
      ad.impressions = (ad.impressions || 0) + 1;
      changed = true;
    });

    if (changed) {
      this.saveDatabase();
    }

    return ads;
  }

  public recordAdClick(id: string): { success: boolean; destinationUrl?: string } {
    const ad = this.data.advertisements.find((a) => a.id === id);
    if (!ad) return { success: false };
    ad.clicks = (ad.clicks || 0) + 1;
    this.saveDatabase();
    return { success: true, destinationUrl: ad.destinationUrl };
  }

  public getAllAds(): Advertisement[] {
    return [...this.data.advertisements].sort(
      (a, b) => (b.priority ?? 5) - (a.priority ?? 5) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public createAd(adData: Omit<Advertisement, 'id' | 'createdAt' | 'updatedAt' | 'impressions' | 'clicks'>): Advertisement {
    const id = `ad-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newAd: Advertisement = {
      ...adData,
      priority: Number(adData.priority) || 5,
      id,
      impressions: 0,
      clicks: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.advertisements.unshift(newAd);
    this.saveDatabase();
    return newAd;
  }

  public updateAd(id: string, patch: Partial<Advertisement>): Advertisement | null {
    const idx = this.data.advertisements.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    const existing = this.data.advertisements[idx];
    const updated: Advertisement = {
      ...existing,
      ...patch,
      pricing: patch.pricing ? { ...existing.pricing, ...patch.pricing } : existing.pricing,
      updatedAt: new Date().toISOString(),
    };
    this.data.advertisements[idx] = updated;
    this.saveDatabase();
    return updated;
  }

  public deleteAd(id: string): boolean {
    const initialLen = this.data.advertisements.length;
    this.data.advertisements = this.data.advertisements.filter((a) => a.id !== id);
    if (this.data.advertisements.length !== initialLen) {
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Solicitações de Empresas (Leads de Anúncios) ---
  public getAllAdInquiries(): AdInquiry[] {
    return [...this.data.adInquiries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createAdInquiry(inquiry: Omit<AdInquiry, 'id' | 'createdAt' | 'status'>): AdInquiry {
    const id = `inq-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newInquiry: AdInquiry = {
      ...inquiry,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    this.data.adInquiries.unshift(newInquiry);
    this.saveDatabase();
    return newInquiry;
  }

  public updateAdInquiryStatus(id: string, status: AdInquiryStatus, adminNotes?: string): AdInquiry | null {
    const item = this.data.adInquiries.find((i) => i.id === id);
    if (!item) return null;
    item.status = status;
    if (adminNotes !== undefined) {
      item.adminNotes = adminNotes;
    }
    this.saveDatabase();
    return item;
  }

  public convertInquiryToAd(inquiryId: string, adOverrides?: Partial<Advertisement>): { ad: Advertisement; inquiry: AdInquiry } | null {
    const inquiry = this.data.adInquiries.find((i) => i.id === inquiryId);
    if (!inquiry) return null;

    const adId = `ad-comp-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const ad: Advertisement = {
      id: adId,
      companyName: inquiry.companyName,
      title: adOverrides?.title || `${inquiry.companyName} - Soluções em Angola`,
      description: adOverrides?.description || inquiry.message.slice(0, 160),
      callToAction: adOverrides?.callToAction || 'Contactar Empresa',
      destinationUrl: adOverrides?.destinationUrl || (inquiry.phone ? `https://wa.me/${inquiry.phone.replace(/[^0-9]/g, '')}` : 'https://angopayx.ao'),
      bannerUrl: adOverrides?.bannerUrl || 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
      badgeText: adOverrides?.badgeText || 'Parceiro Verificado',
      placement: adOverrides?.placement || inquiry.preferredPlacement || 'dashboard_native',
      status: 'active',
      priority: adOverrides?.priority || 5,
      category: adOverrides?.category || 'Negócios & Serviços',
      pricing: {
        amountKz: adOverrides?.pricing?.amountKz || 350000,
        amountUsdt: adOverrides?.pricing?.amountUsdt || 260,
        billingModel: 'monthly',
        isPaid: true,
        notes: `Anúncio aprovado a partir da solicitação #${inquiry.id}`,
      },
      impressions: 0,
      clicks: 0,
      startDate: now,
      endDate: nextMonth,
      createdAt: now,
      updatedAt: now,
      contactEmail: inquiry.email,
      contactPhone: inquiry.phone,
      inquiryId: inquiry.id,
    };

    this.data.advertisements.unshift(ad);
    inquiry.status = 'approved';
    inquiry.convertedAdId = ad.id;
    this.saveDatabase();

    return { ad, inquiry };
  }

  public getAdMonetizationSummary(): AdMonetizationSummary {
    let totalRevenueKz = 0;
    let totalRevenueUsdt = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let activeAdsCount = 0;
    let pausedAdsCount = 0;

    this.data.advertisements.forEach((ad) => {
      if (ad.pricing && ad.pricing.isPaid) {
        totalRevenueKz += ad.pricing.amountKz || 0;
        totalRevenueUsdt += ad.pricing.amountUsdt || 0;
      }
      totalImpressions += ad.impressions || 0;
      totalClicks += ad.clicks || 0;
      if (ad.status === 'active') activeAdsCount++;
      if (ad.status === 'paused') pausedAdsCount++;
    });

    const pendingInquiriesCount = this.data.adInquiries.filter((i) => i.status === 'pending').length;
    const averageCtrPercent = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    return {
      totalRevenueKz,
      totalRevenueUsdt,
      activeAdsCount,
      pausedAdsCount,
      pendingInquiriesCount,
      totalImpressions,
      totalClicks,
      averageCtrPercent,
    };
  }
}

export const db = new StorageEngine();
