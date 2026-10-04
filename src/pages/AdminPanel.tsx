import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Users,
  ShieldCheck,
  PlusCircle,
  MinusCircle,
  Upload,
  Layers,
  Settings,
  Cpu,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  MessageSquare,
  Eye,
  X,
  Send,
  Building,
  Lock,
  Megaphone,
  Trash2,
  Play,
  Pause,
  Plus,
  ExternalLink,
  Edit3,
  Calendar,
  Building2,
  Sparkles,
  PhoneCall,
  Copy,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient, getStoredToken } from '../services/api.ts';
import { supabase } from '../lib/supabase.ts';
import { getWalletMeta } from '../components/WalletLogos.tsx';
import {
  User,
  Balance,
  KycRecord,
  PurchaseOrder,
  SaleOrder,
  WithdrawalOrder,
  LedgerEntry,
  AuditLog,
  ExchangeSettings,
  FeeSettings,
  LimitSettings,
  PaymentMethodConfig,
  TronOperationalStatus,
  ReconciliationSummary,
  SupportTicket,
  Advertisement,
  AdPlacement,
} from '../types/index.ts';

type AdminTab =
  | 'dashboard'
  | 'clients'
  | 'kyc'
  | 'purchases'
  | 'sales'
  | 'withdrawals'
  | 'ledger'
  | 'exchange'
  | 'fees'
  | 'limits'
  | 'methods'
  | 'tron'
  | 'reconciliation'
  | 'audit'
  | 'tickets'
  | 'ads';

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [metrics, setMetrics] = useState<any>(null);
  const [tronStatus, setTronStatus] = useState<TronOperationalStatus | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null);
  const [clients, setClients] = useState<(User & { balance: Balance })[]>([]);
  const [kycRecords, setKycRecords] = useState<KycRecord[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [sales, setSales] = useState<SaleOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalOrder[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Settings states
  const [exchange, setExchange] = useState<ExchangeSettings>({ buyRateKz: 1350, sellRateKz: 1250, updatedAt: '', updatedBy: '' });
  const [fees, setFees] = useState<FeeSettings>({ buyFeePercent: 0, sellFeePercent: 0, sellFeeKzFixed: 0, trc20WithdrawalFeeUsdt: 1.5, binanceWithdrawalFeeUsdt: 0.5, updatedAt: '', updatedBy: '' });
  const [limits, setLimits] = useState<LimitSettings>({ minBuyUsdt: 10, maxBuyUsdt: 10000, minSellUsdt: 10, maxSellUsdt: 10000, minDepositUsdt: 5, minWithdrawUsdt: 10, maxWithdrawUsdt: 5000, dailyLimitUsdt: 20000, monthlyLimitUsdt: 100000, updatedAt: '', updatedBy: '' });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);

  // Modals / Inspectors
  const [inspectKyc, setInspectKyc] = useState<KycRecord | null>(null);
  const [realtimeKycNotification, setRealtimeKycNotification] = useState<{
    userName: string;
    userEmail: string;
    time: string;
    bi_frente_path?: string;
    bi_verso_path?: string;
    selfie_path?: string;
  } | null>(null);
  const [inspectPurchase, setInspectPurchase] = useState<PurchaseOrder | null>(null);
  const [inspectSale, setInspectSale] = useState<SaleOrder | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState('');

  // Advertising States
  const [adsList, setAdsList] = useState<Advertisement[]>([]);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [adToDelete, setAdToDelete] = useState<Advertisement | null>(null);
  const [copiedDestId, setCopiedDestId] = useState<string | null>(null);
  const [purchaseProofTxid, setPurchaseProofTxid] = useState('');

  // Ad Form state (ADM defines Image, Title, and Link)
  const [adForm, setAdForm] = useState({
    title: '',
    bannerUrl: '',
    destinationUrl: '',
    status: 'active' as 'active' | 'paused',
  });

  useEffect(() => {
    loadDashboard();
    apiClient.getAdminAds().then((res) => {
      setAdsList(res.ads);
    }).catch(() => {});

    // Inscrição Supabase Realtime Broadcast no canal 'kyc-admin' (Req #3 e #4)
    const kycChannel = supabase.channel('kyc-admin');
    kycChannel
      .on('broadcast', { event: 'new_kyc_submission' }, (event: any) => {
        console.log('[Admin Realtime KYC Recebido]:', event?.payload);
        showSuccess('Nova solicitação KYC recebida.');
        const p = event?.payload;
        if (p) {
          setRealtimeKycNotification({
            userName: p.user_name || 'Utilizador',
            userEmail: p.user_email || '',
            time: new Date().toLocaleTimeString('pt-AO'),
            bi_frente_path: p.bi_frente_path,
            bi_verso_path: p.bi_verso_path,
            selfie_path: p.selfie_path,
          });

          // Atualizar lista imediatamente
          apiClient.getAdminKycList().then((res) => {
            if (res.kycRecords) setKycRecords(res.kycRecords);
          }).catch(() => {});
        }
      })
      .subscribe();

    // Auto-refresh when on KYC tab or purchases tab
    let interval: NodeJS.Timeout | null = null;
    if (activeTab === 'kyc' || activeTab === 'purchases' || activeTab === 'dashboard') {
      interval = setInterval(() => {
        if (!inspectKyc && !inspectPurchase) {
          if (activeTab === 'kyc') {
            apiClient.getAdminKycList().then((res) => {
              if (res.kycRecords) setKycRecords(res.kycRecords);
            }).catch(() => {});
          } else if (activeTab === 'purchases') {
            apiClient.getAdminPurchases().then((res) => {
              if (res.purchases) setPurchases(res.purchases);
            }).catch(() => {});
          }
        }
      }, 10000);
    }

    return () => {
      supabase.removeChannel(kycChannel);
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await apiClient.getAdminDashboard();
        setMetrics(res.metrics);
        setTronStatus(res.tronStatus);
        setReconciliation(res.reconciliation);
      } else if (activeTab === 'ads') {
        const res = await apiClient.getAdminAds();
        setAdsList(res.ads);
      } else if (activeTab === 'clients') {
        const res = await apiClient.getAdminClients();
        setClients(res.clients);
      } else if (activeTab === 'kyc') {
        const res = await apiClient.getAdminKycList();
        setKycRecords(res.kycRecords);
      } else if (activeTab === 'purchases') {
        const res = await apiClient.getAdminPurchases();
        setPurchases(res.purchases);
      } else if (activeTab === 'sales') {
        const res = await apiClient.getAdminSales();
        setSales(res.sales);
      } else if (activeTab === 'withdrawals') {
        const res = await apiClient.getAdminWithdrawals();
        setWithdrawals(res.withdrawals);
      } else if (activeTab === 'ledger') {
        const res = await apiClient.getAdminLedger();
        setLedger(res.ledger);
      } else if (activeTab === 'audit') {
        const res = await apiClient.getAdminAuditLogs();
        setAuditLogs(res.auditLogs);
      } else if (activeTab === 'tickets') {
        const res = await apiClient.getAdminTickets();
        setTickets(res.tickets);
      } else if (activeTab === 'exchange' || activeTab === 'fees' || activeTab === 'limits' || activeTab === 'methods') {
        const res = await apiClient.getRatesAndMethods();
        if (res.exchange) setExchange(res.exchange);
        if (res.fees) setFees(res.fees);
        if (res.limits) setLimits(res.limits);
        if (res.paymentMethods) setPaymentMethods(res.paymentMethods);
      } else if (activeTab === 'tron') {
        const res = await apiClient.getAdminTronResources();
        setTronStatus(res.tronStatus);
      } else if (activeTab === 'reconciliation') {
        const res = await apiClient.getAdminDashboard();
        setReconciliation(res.reconciliation);
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erro ao carregar dados administrativos.' });
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (text: string) => {
    setMsg({ type: 'success', text });
    setTimeout(() => setMsg(null), 3000);
  };

  const showError = (text: string) => {
    setMsg({ type: 'error', text });
  };

  // --- Actions ---

  const handleUpdateClientStatus = async (clientId: string, status: string) => {
    try {
      await apiClient.updateClientStatus(clientId, status, 'Atualizado via painel admin.');
      showSuccess('Estado da conta do cliente atualizado com sucesso.');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleKycAction = async (action: 'approve' | 'reject' | 'request_more' | 'in_review') => {
    if (!inspectKyc) return;
    try {
      await apiClient.actionKyc({
        kycId: inspectKyc.id,
        action,
        notes: actionNotes.trim() || undefined,
      });
      showSuccess(
        `KYC ${
          action === 'approve'
            ? 'aprovado'
            : action === 'reject'
            ? 'rejeitado'
            : action === 'in_review'
            ? 'colocado em análise'
            : 'marcado com pendência'
        } com sucesso.`
      );
      setInspectKyc(null);
      setActionNotes('');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleDeleteKycFiles = async () => {
    if (!inspectKyc) return;
    if (!window.confirm('Tem a certeza que deseja eliminar permanentemente os ficheiros desta solicitação do cofre de conformidade?')) {
      return;
    }
    try {
      await apiClient.deleteKycStorageFiles({ kycId: inspectKyc.id });
      showSuccess('Documentos eliminados do cofre com sucesso (Limpeza de conformidade).');
      setInspectKyc(null);
      loadDashboard();
    } catch (err: any) {
      showError(err.message || 'Erro ao eliminar ficheiros do cofre.');
    }
  };

  const handlePurchaseAction = async (action: 'approve' | 'reject') => {
    if (!inspectPurchase) return;
    try {
      const res = await apiClient.actionPurchase({
        purchaseId: inspectPurchase.id,
        action,
        notes: actionNotes.trim() || undefined,
        txidOrProof: purchaseProofTxid.trim() || undefined,
      });
      showSuccess(res.message);
      setInspectPurchase(null);
      setActionNotes('');
      setPurchaseProofTxid('');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaleAction = async (action: 'processing' | 'complete' | 'reject') => {
    if (!inspectSale) return;
    try {
      const res = await apiClient.actionSale({
        saleId: inspectSale.id,
        action,
        notes: actionNotes.trim() || undefined,
        payoutProofUrl: action === 'complete' ? 'https://angopayx.ao/proofs/payout_emis_success.pdf' : undefined,
      });
      showSuccess(res.message);
      setInspectSale(null);
      setActionNotes('');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'complete' | 'reject') => {
    try {
      const res = await apiClient.actionWithdrawal({
        withdrawalId,
        action,
        txid: action === 'complete' ? 'f4a9b8c7d6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9' : undefined,
        notes: 'Processado pelo operador no painel administrativo.',
      });
      showSuccess(res.message);
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.updateRates({
        buyRateKz: Number(exchange.buyRateKz),
        sellRateKz: Number(exchange.sellRateKz),
      });
      showSuccess('Cotações oficiais de compra e venda atualizadas com sucesso.');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.updateFees({
        ...fees,
        trc20WithdrawalFeeUsdt: Number(fees.trc20WithdrawalFeeUsdt),
        binanceWithdrawalFeeUsdt: Number(fees.binanceWithdrawalFeeUsdt),
        sellFeeKzFixed: Number(fees.sellFeeKzFixed),
      });
      showSuccess('Estrutura de taxas operacionais atualizada.');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.updateLimits({
        ...limits,
        minBuyUsdt: Number(limits.minBuyUsdt),
        maxBuyUsdt: Number(limits.maxBuyUsdt),
        minSellUsdt: Number(limits.minSellUsdt),
        maxSellUsdt: Number(limits.maxSellUsdt),
        minWithdrawUsdt: Number(limits.minWithdrawUsdt),
        maxWithdrawUsdt: Number(limits.maxWithdrawUsdt),
      });
      showSuccess('Limites de conformidade e transação atualizados.');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleSavePaymentMethod = async (method: PaymentMethodConfig) => {
    try {
      await apiClient.updatePaymentMethod(method);
      showSuccess(`Método "${method.name}" atualizado.`);
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleRunReconciliation = async () => {
    setLoading(true);
    try {
      const res = await apiClient.runReconciliation();
      setReconciliation(res.summary);
      showSuccess('Motor de reconciliação executado com sucesso. Todos os saldos auditados.');
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReplyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;
    try {
      const res = await apiClient.replyAdminTicket(selectedTicket.id, {
        text: ticketReplyText.trim(),
        newStatus: 'Resolvido',
      });
      setSelectedTicket(res.ticket);
      setTicketReplyText('');
      showSuccess('Resposta enviada ao cliente com sucesso.');
      loadDashboard();
    } catch (err: any) {
      showError(err.message);
    }
  };

  // --- Advertising & Monetization Handlers ---
  const [adImageLoading, setAdImageLoading] = useState(false);

  const handleAdImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Por favor selecione um arquivo de imagem válido (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showError('O tamanho da imagem não deve exceder 15MB.');
      return;
    }

    setAdImageLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAdForm((prev) => ({ ...prev, bannerUrl: result }));
        showSuccess('Imagem do produto carregada com sucesso!');
      }
      setAdImageLoading(false);
    };
    reader.onerror = () => {
      showError('Erro ao processar ficheiro de imagem.');
      setAdImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreateAd = () => {
    setEditingAd(null);
    setAdForm({
      title: '',
      bannerUrl: '',
      destinationUrl: 'https://',
      status: 'active',
    });
    setIsAdModalOpen(true);
  };

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setAdForm({
      title: ad.title,
      bannerUrl: ad.bannerUrl || '',
      destinationUrl: ad.destinationUrl,
      status: ad.status === 'expired' ? 'paused' : ad.status,
    });
    setIsAdModalOpen(true);
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adForm.title.trim()) {
      showError('Por favor preencha o título do anúncio ou produto.');
      return;
    }
    if (!adForm.destinationUrl.trim() || !adForm.destinationUrl.startsWith('http')) {
      showError('Por favor preencha um link válido (começando com http:// ou https://) para a página ou produto.');
      return;
    }

    try {
      const payload = {
        title: adForm.title.trim(),
        destinationUrl: adForm.destinationUrl.trim(),
        bannerUrl: adForm.bannerUrl.trim() || undefined,
        status: adForm.status,
        companyName: adForm.title.trim(),
        description: adForm.title.trim(),
        callToAction: 'Ver Produto',
        badgeText: 'Destaque',
        placement: 'all' as AdPlacement,
        priority: 10,
      };

      if (editingAd) {
        await apiClient.updateAdminAd(editingAd.id, payload);
        showSuccess(`Anúncio "${adForm.title}" atualizado com sucesso.`);
      } else {
        await apiClient.createAdminAd(payload);
        showSuccess(`Anúncio "${adForm.title}" publicado com sucesso!`);
      }

      setIsAdModalOpen(false);
      setEditingAd(null);
      const res = await apiClient.getAdminAds();
      setAdsList(res.ads);
    } catch (err: any) {
      showError(err.message || 'Falha ao gravar anúncio.');
    }
  };

  const handleToggleAdStatus = async (ad: Advertisement) => {
    try {
      const nextStatus = ad.status === 'active' ? 'paused' : 'active';
      await apiClient.updateAdminAd(ad.id, { status: nextStatus });
      showSuccess(`Anúncio "${ad.title}" agora está ${nextStatus === 'active' ? 'ATIVO' : 'PAUSADO'}.`);
      const res = await apiClient.getAdminAds();
      setAdsList(res.ads);
    } catch (err: any) {
      showError(err.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteAd = (ad: Advertisement) => {
    setAdToDelete(ad);
  };

  const confirmDeleteAd = async () => {
    if (!adToDelete) return;
    try {
      await apiClient.deleteAdminAd(adToDelete.id);
      showSuccess(`Anúncio "${adToDelete.title}" removido com sucesso.`);
      setAdToDelete(null);
      const res = await apiClient.getAdminAds();
      setAdsList(res.ads);
    } catch (err: any) {
      showError(err.message || 'Erro ao eliminar anúncio.');
    }
  };

  const isSoleAdmin = Boolean(user && user.email?.trim().toLowerCase() === 'luisbongue4@gmail.com');

  if (!isSoleAdmin) {
    return (
      <div className="p-8 max-w-xl mx-auto rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-4 my-12">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Acesso Restrito ao Administrador Oficial</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Apenas o administrador oficial do AngoPayX (<strong>luisbongue4@gmail.com</strong>) tem autorização para aceder ao painel de controlo, aprovação de KYC, ordens e configurações.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden box-border">
      {/* Top Banner with Role Indicators */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 w-full box-border">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Sliders className="w-4 h-4" />
            <span>Módulo de Gestão Administrativa</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Painel AngoPayX Backoffice</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Ambiente reservado para gestão de câmbios, liquidação de compras/vendas em Kz, validação documental de KYC, reconciliação financeira e monitorização da rede TRON.
          </p>
        </div>

        {/* Current Operator Role */}
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-xl p-3 text-left md:text-right shrink-0">
          <span className="text-[11px] text-slate-400 block font-medium">Operador Conectado</span>
          <span className="text-sm font-black text-purple-400 block">{user?.name}</span>
          <span className="text-[10px] text-slate-400 uppercase font-bold">Nível: {user?.role}</span>
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Realtime KYC Alert (Req #4) */}
      {realtimeKycNotification && (
        <div className="p-4 rounded-xl bg-purple-950/50 border border-purple-500/50 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <p className="font-bold text-white text-sm flex items-center gap-2">
                <span>NOVA SOLICITAÇÃO KYC</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Tempo Real
                </span>
              </p>
              <p className="text-slate-300 text-xs mt-0.5">
                <span className="font-semibold text-white">{realtimeKycNotification.userName}</span> ({realtimeKycNotification.userEmail}) • Enviado às {realtimeKycNotification.time}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => {
                setActiveTab('kyc');
                setRealtimeKycNotification(null);
              }}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-xs shadow flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Ver Fila KYC</span>
            </button>
            <button
              onClick={() => setRealtimeKycNotification(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              title="Fechar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nav Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-xs font-semibold">
        {[
          { id: 'dashboard', label: 'Métricas & Geral', icon: Sliders },
          { id: 'ads', label: 'Gerenciamento de Anúncios', icon: Megaphone },
          { id: 'purchases', label: 'Compras (USDT)', icon: PlusCircle, badge: metrics?.pendingPurchasesCount },
          { id: 'sales', label: 'Vendas (Kz)', icon: MinusCircle, badge: metrics?.pendingSalesCount },
          { id: 'withdrawals', label: 'Saques (Binance / Bybit / RedotPay / TRON)', icon: Upload, badge: metrics?.pendingWithdrawalsCount },
          { id: 'kyc', label: 'Validação de Identidade (BI)', icon: ShieldCheck, badge: metrics?.pendingKycCount },
          { id: 'clients', label: 'Clientes', icon: Users },
          { id: 'ledger', label: 'Livro-Razão (Ledger)', icon: Layers },
          { id: 'exchange', label: 'Câmbio (Kz)', icon: TrendingUp },
          { id: 'fees', label: 'Taxas', icon: DollarSign },
          { id: 'limits', label: 'Limites', icon: Lock },
          { id: 'methods', label: 'Contas Bancárias', icon: CreditCard },
          { id: 'tron', label: 'Recursos TRON', icon: Cpu },
          { id: 'reconciliation', label: 'Reconciliação', icon: RefreshCw },
          { id: 'audit', label: 'Auditoria', icon: FileText },
          { id: 'tickets', label: 'Tickets Suporte', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
                isActive
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {Boolean(tab.badge && tab.badge > 0) && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold ml-1">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: DASHBOARD */}
      {activeTab === 'dashboard' && metrics && (
        <div className="space-y-6 w-full box-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Total de Clientes</span>
              <span className="text-2xl font-extrabold text-white">{metrics.totalClients}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">KYC em Análise</span>
              <span className="text-2xl font-extrabold text-amber-400">{metrics.pendingKycCount}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Compras Pendentes</span>
              <span className="text-2xl font-extrabold text-emerald-400">{metrics.pendingPurchasesCount}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] text-slate-400 font-medium block">Vendas Pendentes</span>
              <span className="text-2xl font-extrabold text-cyan-400">{metrics.pendingSalesCount}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* TRON Status Box */}
            {tronStatus && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    <span>Carteira Operacional TRON</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    {tronStatus.isEnergySufficient ? 'Operacional' : 'Atenção'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">TRX Disponível</span>
                    <span className="text-sm font-bold text-white">{tronStatus.trxBalance} TRX</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">USDT em Hot Wallet</span>
                    <span className="text-sm font-bold text-emerald-400">{tronStatus.usdtBalance.toFixed(2)} USDT</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Energy / Bandwidth</span>
                    <span className="text-sm font-bold text-cyan-400">{tronStatus.energyAvailable.toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 truncate">
                  Endereço Operacional: <strong className="font-mono text-slate-300">{tronStatus.vaultAddress}</strong>
                </p>
              </div>
            )}

            {/* Reconciliation Box */}
            {reconciliation && (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-purple-400" />
                    <span>Auditoria de Reconciliação</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                    {!reconciliation.hasDivergence ? 'Sem Divergências' : 'Alerta'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Passivo Total Clientes (Ledger)</span>
                    <span className="text-sm font-bold text-white">{reconciliation.totalInternalClientUsdt.toFixed(2)} USDT</span>
                  </div>
                  <div className="p-3 bg-slate-800/60 rounded-xl">
                    <span className="text-slate-400 block text-[10px]">Saldo Blockchain Detectado</span>
                    <span className="text-sm font-bold text-emerald-400">{reconciliation.vaultBlockchainUsdt.toFixed(2)} USDT</span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-slate-400">Status dos Contratos:</span>
                  <span className="text-emerald-400 font-semibold">{reconciliation.hasDivergence ? 'Divergência Encontrada' : 'Auditado e Conciliado'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PURCHASES */}
      {activeTab === 'purchases' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Ordens de Compra de USDT ({purchases.length})
            </h2>
            <span className="text-xs text-slate-400">Valide os comprovativos bancários em Kz e credite USDT no ledger</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Ordem / Cliente</th>
                  <th className="pb-3">Valor USDT</th>
                  <th className="pb-3">Total Kz</th>
                  <th className="pb-3">Destino Carga</th>
                  <th className="pb-3">Método Pagamento</th>
                  <th className="pb-3">Comprovativo</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {purchases.map((p) => {
                  const targetPlatform = p.targetWallet?.platform || 'ANGOPAYX';
                  const meta = getWalletMeta(targetPlatform);
                  const Logo = meta.Logo;
                  const ident = p.targetWallet?.identifier || p.userEmail;
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2">
                        <span className="font-bold text-white block">{p.userName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{p.id}</span>
                      </td>
                      <td className="py-3 font-extrabold text-emerald-400">{p.usdtAmount} USDT</td>
                      <td className="py-3 font-bold text-white">{p.totalKz.toLocaleString()} Kz</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 max-w-[190px]">
                          <Logo className="w-4 h-4 shrink-0" />
                          <div className="truncate">
                            <span className={`px-1 py-0.2 rounded text-[9px] font-bold border ${meta.badgeBg}`}>
                              {meta.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-300 block truncate" title={ident}>
                              {ident}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(ident);
                              setCopiedDestId(p.id);
                              setTimeout(() => setCopiedDestId(null), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-white shrink-0"
                            title="Copiar dados da carteira"
                          >
                            {copiedDestId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-slate-300">{p.paymentMethodDetails.bank} ({p.paymentMethodType})</td>
                      <td className="py-3">
                        {p.receiptUrl ? (
                          <button
                            onClick={() => setInspectPurchase(p)}
                            className="text-emerald-400 underline font-bold inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver Talão</span>
                          </button>
                        ) : (
                          <span className="text-slate-500">Pendente</span>
                        )}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            p.status === 'USDT creditado'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : p.status === 'Rejeitado'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {p.status !== 'USDT creditado' && p.status !== 'Rejeitado' && (
                          <button
                            onClick={() => setInspectPurchase(p)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow"
                          >
                            Avaliar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SALES */}
      {activeTab === 'sales' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Ordens de Venda de USDT / Pagamento em Kz ({sales.length})
            </h2>
            <span className="text-xs text-slate-400">Efetue a transferência dos Kwanzas para o IBAN do cliente</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Ordem / Cliente</th>
                  <th className="pb-3">USDT Venda</th>
                  <th className="pb-3">Kz a Pagar</th>
                  <th className="pb-3">Banco & IBAN Cliente</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-2">
                      <span className="font-bold text-white block">{s.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{s.id}</span>
                    </td>
                    <td className="py-3 font-extrabold text-amber-400">{s.usdtAmount} USDT</td>
                    <td className="py-3 font-bold text-emerald-400">{s.totalKzToReceive.toLocaleString()} Kz</td>
                    <td className="py-3 text-slate-300">
                      <span className="block font-bold">{s.payoutMethod.bankName}</span>
                      <span className="font-mono text-[11px] text-slate-400 select-all">{s.payoutMethod.ibanOrAccount}</span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          s.status === 'Concluída'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : s.status === 'Rejeitada'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {s.status !== 'Concluída' && s.status !== 'Rejeitada' && (
                        <button
                          onClick={() => setInspectSale(s)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold shadow"
                        >
                          Liquidar Kz
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: WITHDRAWALS */}
      {activeTab === 'withdrawals' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Solicitações de Saque Externo ({withdrawals.length})
            </h2>
            <span className="text-xs text-slate-400">
              Efetue o pagamento na Binance (Email/UID), Bybit, RedotPay ou difusão na rede TRON TRC20
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Cliente</th>
                  <th className="pb-3">Plataforma / Carteira</th>
                  <th className="pb-3">Valor / Líquido</th>
                  <th className="pb-3">Destino do Pagamento</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {withdrawals.map((w) => {
                  const meta = getWalletMeta(w.type);
                  const Logo = meta.Logo;
                  return (
                    <tr key={w.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2">
                        <span className="font-bold text-white block">{w.userEmail || w.userId}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{w.id}</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5">
                          <Logo className="w-4 h-4 shrink-0" />
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${meta.badgeBg}`}>
                            {meta.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-bold text-white block">{w.amount} USDT</span>
                        <span className="text-[10px] text-slate-400">Líq: {w.netAmount} USDT</span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 bg-slate-950/60 px-2 py-1 rounded border border-slate-800 max-w-xs">
                          <span className="font-mono text-[11px] text-emerald-400 truncate select-all flex-1">
                            {w.destination}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(w.destination);
                              setCopiedDestId(w.id);
                              setTimeout(() => setCopiedDestId(null), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-white shrink-0"
                            title="Copiar dados para pagamento"
                          >
                            {copiedDestId === w.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            w.status === 'Concluído'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : w.status === 'Rejeitado'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        {w.status !== 'Concluído' && w.status !== 'Rejeitado' && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'complete')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold"
                            >
                              Concluir Pagamento
                            </button>
                            <button
                              onClick={() => handleWithdrawalAction(w.id, 'reject')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-bold"
                            >
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: KYC / VALIDAÇÃO DE IDENTIDADE */}
      {activeTab === 'kyc' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Fila de Validação de Identidade ({kycRecords.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Validação de Número do Bilhete de Identidade (BI) e Data de Nascimento enviados pelo Perfil dos clientes (sem fotos).
              </p>
            </div>
            <button
              onClick={() => {
                apiClient.getAdminKycList().then((res) => {
                  if (res.kycRecords) setKycRecords(res.kycRecords);
                }).catch(() => {});
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Fila</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Cliente / E-mail</th>
                  <th className="pb-3">Nº do Bilhete de Identidade (BI)</th>
                  <th className="pb-3">Data de Nascimento</th>
                  <th className="pb-3">Nacionalidade</th>
                  <th className="pb-3">Data Envio</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {kycRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhuma solicitação de validação de identidade na fila.
                    </td>
                  </tr>
                ) : (
                  kycRecords.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 pl-2">
                        <span className="font-bold text-white block">{k.fullName || k.userName}</span>
                        <span className="text-[11px] text-slate-400">{k.userEmail}</span>
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-400">{k.documentNumber}</td>
                      <td className="py-3 font-medium text-slate-200">
                        {k.dateOfBirth || (
                          <span className="text-slate-500 italic">Não informada</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-400">{k.nationality || 'Angolana'}</td>
                      <td className="py-3 text-slate-400">{new Date(k.submittedAt).toLocaleDateString('pt-AO')}</td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            k.status === 'Aprovado'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : k.status === 'Rejeitado'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="py-3 pr-2 text-right">
                        <button
                          onClick={() => setInspectKyc(k)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold shadow flex items-center gap-1 ml-auto transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Validar</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLIENTS */}
      {activeTab === 'clients' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Base de Clientes ({clients.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Nome / Email</th>
                  <th className="pb-3">Saldo Disponível</th>
                  <th className="pb-3">Saldo Bloqueado</th>
                  <th className="pb-3">KYC</th>
                  <th className="pb-3">Estado Conta</th>
                  <th className="pb-3 pr-2 text-right">Gerir Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-2">
                      <span className="font-bold text-white block">{c.name}</span>
                      <span className="text-[11px] text-slate-400">{c.email}</span>
                    </td>
                    <td className="py-3 font-bold text-emerald-400">
                      {c.balance ? c.balance.availableBalance.toFixed(2) : '0.00'} USDT
                    </td>
                    <td className="py-3 font-bold text-amber-400">
                      {c.balance ? c.balance.lockedBalance.toFixed(2) : '0.00'} USDT
                    </td>
                    <td className="py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {c.kycStatus}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.accountStatus === 'Ativa'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {c.accountStatus}
                      </span>
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => handleUpdateClientStatus(c.id, 'Ativa')}
                          className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800 hover:bg-emerald-900"
                        >
                          Ativar
                        </button>
                        <button
                          onClick={() => handleUpdateClientStatus(c.id, 'Suspensa')}
                          className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800 hover:bg-amber-900"
                        >
                          Suspender
                        </button>
                        <button
                          onClick={() => handleUpdateClientStatus(c.id, 'Bloqueada')}
                          className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800 hover:bg-rose-900"
                        >
                          Bloquear
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEDGER */}
      {activeTab === 'ledger' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Livro-Razão Financeiro Central ({ledger.length} Lançamentos)
            </h2>
            <span className="text-xs text-emerald-400 font-bold">Imutável e Auditável</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">ID / Operação</th>
                  <th className="pb-3">Cliente</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Antes</th>
                  <th className="pb-3">Depois</th>
                  <th className="pb-3">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledger.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 pl-2 font-mono">
                      <span className="font-bold text-white block">{l.type}</span>
                      <span className="text-[10px] text-slate-500">{l.id}</span>
                    </td>
                    <td className="py-2.5 text-slate-300 font-mono text-[11px] truncate max-w-[120px]">{l.userId}</td>
                    <td className="py-2.5 text-slate-400">{new Date(l.timestamp).toLocaleString('pt-AO')}</td>
                    <td className="py-2.5 font-bold">
                      <span className={l.direction === 'IN' ? 'text-emerald-400' : 'text-amber-400'}>
                        {l.direction === 'IN' ? '+' : '-'} {l.amount.toFixed(2)} USDT
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">{l.balanceBefore.toFixed(2)}</td>
                    <td className="py-2.5 text-white font-bold">{l.balanceAfter.toFixed(2)}</td>
                    <td className="py-2.5 text-slate-400 truncate max-w-xs">{l.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: EXCHANGE SETTINGS */}
      {activeTab === 'exchange' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-xl mx-auto shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Gestão Independente de Cotações Cambiais (Kz)
          </h2>
          <p className="text-xs text-slate-400">
            Ajuste os valores de compra e venda aplicáveis aos clientes do AngoPayX em tempo real.
          </p>

          <form onSubmit={handleSaveRates} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cotação de Compra do Cliente (Paga em Kz por 1 USDT)
              </label>
              <input
                type="number"
                min={1}
                required
                value={exchange.buyRateKz}
                onChange={(e) => setExchange({ ...exchange, buyRateKz: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400 focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: 1350 Kz</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Cotação de Venda do Cliente (Recebe em Kz por 1 USDT)
              </label>
              <input
                type="number"
                min={1}
                required
                value={exchange.sellRateKz}
                onChange={(e) => setExchange({ ...exchange, sellRateKz: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-amber-400 focus:outline-none focus:border-purple-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Ex: 1250 Kz</span>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              Gravar Novas Cotações
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: FEES */}
      {activeTab === 'fees' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-xl mx-auto shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Estrutura de Taxas Operacionais
          </h2>

          <form onSubmit={handleSaveFees} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Taxa de Retirada na Venda de USDT (em Kz)
              </label>
              <input
                type="number"
                min={0}
                required
                value={fees.sellFeeKzFixed}
                onChange={(e) => setFees({ ...fees, sellFeeKzFixed: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-emerald-400"
              />
              <span className="text-[10px] text-emerald-400 mt-0.5 block font-bold">
                Regra em vigor: 0 Kz (Taxa de retirada zero na venda!)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Taxa de Saque TRON TRC20 (USDT)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                required
                value={fees.trc20WithdrawalFeeUsdt}
                onChange={(e) => setFees({ ...fees, trc20WithdrawalFeeUsdt: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Taxa de Saque Binance UID (USDT)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                required
                value={fees.binanceWithdrawalFeeUsdt}
                onChange={(e) => setFees({ ...fees, binanceWithdrawalFeeUsdt: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow"
            >
              Guardar Configurações de Taxas
            </button>
          </form>
        </div>
      )}

      {/* TAB CONTENT: PAYMENT METHODS (CONTAS BANCÁRIAS E REFERÊNCIAS) */}
      {activeTab === 'methods' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 max-w-4xl mx-auto">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Dados Oficiais de Depósito em Kwanza (Kz)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure os dados bancários (Kwik / IBAN) e referências de pagamento que os clientes utilizam para depositar.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold">
              {paymentMethods.length} Métodos Ativos
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentMethods.map((method) => (
              <div key={method.id} className="p-5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    {method.id === 'iban' ? '🏦 Kwik / IBAN Bancário' : '📱 Referência Multicaixa / Kwik'}
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={method.isActive}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, isActive: e.target.checked } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                    />
                    <span>Ativo</span>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Nome de Exibição:</label>
                    <input
                      type="text"
                      value={method.name}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, name: e.target.value } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Banco / Rede:</label>
                    <input
                      type="text"
                      value={method.bank}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, bank: e.target.value } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Beneficiário (Empresa):</label>
                    <input
                      type="text"
                      value={method.beneficiary}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, beneficiary: e.target.value } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">
                      {method.id === 'iban' ? 'IBAN Oficial:' : 'Referência ou ID:'}
                    </label>
                    <input
                      type="text"
                      value={method.accountOrCode}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, accountOrCode: e.target.value } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-emerald-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Instruções para o Cliente:</label>
                    <textarea
                      rows={3}
                      value={method.instructions}
                      onChange={(e) => {
                        const updated = paymentMethods.map((m) =>
                          m.id === method.id ? { ...m, instructions: e.target.value } : m
                        );
                        setPaymentMethods(updated);
                      }}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSavePaymentMethod(method)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition shadow"
                >
                  Guardar Alterações do Método
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl mx-auto shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Auditoria de Reconciliação Financeira Automática
            </h2>
            <button
              onClick={handleRunReconciliation}
              disabled={loading}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Executar Auditoria Agora</span>
            </button>
          </div>

          {reconciliation && (
            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-800/80 rounded-xl space-y-2">
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Status Geral:</span>
                  <strong className="text-emerald-400">{reconciliation.hasDivergence ? 'Divergência' : 'Auditado e Conciliado'}</strong>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Total Devido aos Clientes (Ledger):</span>
                  <strong className="text-white">{reconciliation.totalInternalClientUsdt.toFixed(2)} USDT</strong>
                </div>
                <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                  <span className="text-slate-400">Saldo na Carteira TRON:</span>
                  <strong className="text-cyan-400">{reconciliation.vaultBlockchainUsdt.toFixed(2)} USDT</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Divergência Encontrada:</span>
                  <strong className="text-white">{reconciliation.divergenceUsdt.toFixed(2)} USDT</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Trilha de Auditoria Administrativa ({auditLogs.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Data / Hora</th>
                  <th className="pb-3">Operador</th>
                  <th className="pb-3">Ação</th>
                  <th className="pb-3">Alvo</th>
                  <th className="pb-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 pl-2 text-slate-400">{new Date(log.timestamp).toLocaleString('pt-AO')}</td>
                    <td className="py-2.5 font-bold text-purple-400">{log.adminEmail}</td>
                    <td className="py-2.5 font-semibold text-white">{log.action}</td>
                    <td className="py-2.5 text-slate-300 font-mono text-[11px]">{log.relatedId || '-'}</td>
                    <td className="py-2.5 text-slate-500 font-mono text-[11px]">{log.ipAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Atendimento a Tickets de Clientes ({tickets.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-4 space-y-2">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedTicket?.id === t.id
                      ? 'bg-slate-800 border-purple-500'
                      : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-xs text-white truncate max-w-[150px]">{t.subject}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
                      {t.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex justify-between">
                    <span>{t.userName}</span>
                    <span>{t.category}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="md:col-span-8">
              {selectedTicket ? (
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col h-[400px]">
                  <div className="pb-3 border-b border-slate-700 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-purple-400 font-bold uppercase">Cliente: {selectedTicket.userName} ({selectedTicket.userEmail})</span>
                      <h3 className="text-sm font-bold text-white">{selectedTicket.subject}</h3>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
                    {selectedTicket.messages.map((m, idx) => (
                      <div key={idx} className={`p-2.5 rounded-lg text-xs ${m.sender === 'client' ? 'bg-slate-900 border border-slate-700' : 'bg-purple-900/60 text-purple-200'}`}>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <strong className="text-white">{m.senderName} ({m.sender})</strong>
                          <span>{new Date(m.timestamp).toLocaleTimeString('pt-AO')}</span>
                        </div>
                        <p>{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleReplyTicket} className="pt-2 border-t border-slate-700 flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Escrever resposta oficial..."
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                    >
                      Responder & Resolver
                    </button>
                  </form>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500">Selecione um ticket ao lado.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GERENCIAMENTO DE ANÚNCIOS */}
      {activeTab === 'ads' && (
        <div className="space-y-6">
          {/* Header Module Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-900 border border-purple-500/40 shadow-xl">
            <div>
              <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
                <Megaphone className="w-4 h-4" />
                <span>Módulo de Gerenciamento de Anúncios</span>
              </div>
              <h2 className="text-xl font-black text-white">Divulgação de Anúncios & Produtos</h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                O Administrador define a imagem, o título e o link direto do produto ou página a ser divulgado no site.
              </p>
            </div>
            <button
              onClick={handleOpenCreateAd}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Novo Anúncio</span>
            </button>
          </div>

          {/* Quick Status Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <span>Anúncios Cadastrados:</span>
                <strong className="text-emerald-400 font-extrabold">{adsList.length}</strong>
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-300">
                Ativos: <strong className="text-emerald-300 font-bold">{adsList.filter((a) => a.status === 'active').length}</strong>
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">
                Pausados: <strong className="text-amber-300 font-bold">{adsList.filter((a) => a.status !== 'active').length}</strong>
              </span>
            </div>

            <button
              onClick={handleOpenCreateAd}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar Anúncio</span>
            </button>
          </div>

          {/* Table / List of Ads */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <span>Lista de Anúncios e Produtos Divulgados ({adsList.length})</span>
              </h3>
            </div>

            {adsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  <Megaphone className="w-6 h-6" />
                </div>
                <p className="text-slate-400 font-medium">Nenhum anúncio cadastrado ainda.</p>
                <p className="text-slate-500 text-[11px]">
                  Clique no botão abaixo para colocar a imagem, o título e o link da página ou produto a ser divulgado.
                </p>
                <button
                  onClick={handleOpenCreateAd}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition"
                >
                  + Adicionar Primeiro Anúncio
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3">Imagem do Produto</th>
                      <th className="p-3">Título do Anúncio</th>
                      <th className="p-3">Link do Produto / Página</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {adsList.map((ad) => (
                      <tr key={ad.id} className="hover:bg-slate-850/60 transition">
                        <td className="p-3">
                          {ad.bannerUrl ? (
                            <img
                              src={ad.bannerUrl}
                              alt={ad.title}
                              className="w-16 h-12 object-cover rounded-xl border border-slate-700 shrink-0 bg-slate-950"
                              onError={(e) => {
                                (e.currentTarget as any).src = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                              <ImageIcon className="w-5 h-5 text-slate-600" />
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <strong className="text-white font-bold text-sm block">{ad.title}</strong>
                        </td>

                        <td className="p-3">
                          {ad.destinationUrl ? (
                            <a
                              href={ad.destinationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-mono text-xs hover:underline max-w-sm"
                              title="Abrir página ou produto divulgado"
                            >
                              <LinkIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span className="truncate max-w-[260px]">{ad.destinationUrl}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          ) : (
                            <span className="text-slate-500 italic">Sem link definido</span>
                          )}
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => handleToggleAdStatus(ad)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                              ad.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                            }`}
                            title="Clique para alternar Ativo / Pausado"
                          >
                            {ad.status === 'active' ? (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Ativo</span>
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3 fill-current" />
                                <span>Pausado</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {ad.destinationUrl && (
                              <a
                                href={ad.destinationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                                title="Testar link do produto"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}

                            <button
                              onClick={() => handleEditAd(ad)}
                              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                              title="Editar Anúncio"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteAd(ad)}
                              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                              title="Eliminar Anúncio"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KYC INSPECTOR MODAL */}
      {inspectKyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setInspectKyc(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <div>
                <h3 className="text-base font-bold text-white">
                  Inspeção Documental KYC — {inspectKyc.fullName}
                </h3>
                <span className="text-xs text-slate-400">
                  {inspectKyc.userEmail} • ID: <span className="font-mono text-slate-300">{inspectKyc.userId}</span>
                </span>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  inspectKyc.status === 'Aprovado'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : inspectKyc.status === 'Rejeitado'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {inspectKyc.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60">
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Nº do BI</span>
                <p className="font-mono font-bold text-white text-xs">{inspectKyc.documentNumber}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Nacionalidade</span>
                <p className="font-bold text-white text-xs">{inspectKyc.nationality}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Data de Nascimento</span>
                <p className="font-bold text-white text-xs">{inspectKyc.dateOfBirth || 'Não informada'}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block uppercase font-medium">Submetido em</span>
                <p className="font-bold text-white text-xs">{new Date(inspectKyc.submittedAt).toLocaleString('pt-AO')}</p>
              </div>
            </div>

            {(() => {
              const adminToken = getStoredToken() || '';
              const resolveDocUrl = (url?: string) => {
                if (!url) return '';
                if (url.startsWith('/api/kyc/document/')) {
                  const sep = url.includes('?') ? '&' : '?';
                  return `${url}${sep}token=${encodeURIComponent(adminToken)}`;
                }
                return url;
              };

              const frontUrl = resolveDocUrl(inspectKyc.biFrontSignedUrl || inspectKyc.biFrontUrl);
              const backUrl = resolveDocUrl(inspectKyc.biBackSignedUrl || inspectKyc.biBackUrl);
              const selfieUrl = resolveDocUrl(inspectKyc.selfieSignedUrl || inspectKyc.selfieUrl);
              const hasPhotos = Boolean(frontUrl || backUrl || selfieUrl);

              if (!hasPhotos) {
                return (
                  <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-850 to-slate-900 border border-emerald-500/30 rounded-2xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          Validação de Identidade Direta (Sem Fotos)
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          O cliente preencheu os dados de identificação no seu Perfil para validação administrativa antes de solicitar depósitos ou recargas.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Número do Bilhete de Identidade (BI)
                        </span>
                        <p className="text-base font-mono font-black text-emerald-400 mt-1 select-all">
                          {inspectKyc.documentNumber}
                        </p>
                        <span className="text-[10px] text-slate-500 mt-1 block">Registo oficial angolano</span>
                      </div>

                      <div className="p-4 bg-slate-900 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Data de Nascimento
                        </span>
                        <p className="text-base font-bold text-white mt-1">
                          {inspectKyc.dateOfBirth || 'Não informada'}
                        </p>
                        <span className="text-[10px] text-slate-500 mt-1 block">Conforme consta no BI</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800/40">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Clique em <strong>"Aprovar Identidade"</strong> abaixo para liberar as compras (recargas) e depósitos para este cliente.</span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-300">BI Frente</span>
                        {frontUrl && (
                          <a
                            href={frontUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver Original</span>
                          </a>
                        )}
                      </div>
                      {frontUrl ? (
                        <img
                          src={frontUrl}
                          alt="BI Frente"
                          className="w-full h-36 object-contain bg-slate-950 rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                          Documento não disponível
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block truncate font-mono">
                      {inspectKyc.biFrontPath || 'cofre/kyc/frente'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-300">BI Verso</span>
                        {backUrl && (
                          <a
                            href={backUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver Original</span>
                          </a>
                        )}
                      </div>
                      {backUrl ? (
                        <img
                          src={backUrl}
                          alt="BI Verso"
                          className="w-full h-36 object-contain bg-slate-950 rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                          Documento não disponível
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block truncate font-mono">
                      {inspectKyc.biBackPath || 'cofre/kyc/verso'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/60 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-300">Selfie com BI</span>
                        {selfieUrl && (
                          <a
                            href={selfieUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Ver Original</span>
                          </a>
                        )}
                      </div>
                      {selfieUrl ? (
                        <img
                          src={selfieUrl}
                          alt="Selfie"
                          className="w-full h-36 object-contain bg-slate-950 rounded-lg border border-slate-700"
                        />
                      ) : (
                        <div className="w-full h-36 bg-slate-950 rounded-lg border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                          Documento não disponível
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block truncate font-mono">
                      {inspectKyc.selfiePath || 'cofre/kyc/selfie'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Informações adicionais de conformidade */}
            <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-[11px] text-blue-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-blue-300">
                <Lock className="w-3.5 h-3.5" />
                <span>Validação Administrativa de Clientes AngoPayX</span>
              </p>
              <p className="text-slate-300 leading-relaxed">
                A validação é baseada na conferência do Número do BI e Data de Nascimento informados pelo cliente no Perfil. A aprovação autoriza o cliente a emitir ordens de recarga e depósitos.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações de Compliance / Motivo de Rejeição
              </label>
              <input
                type="text"
                placeholder="Ex: Documentos nítidos e validados / Documento cortado, envie nova foto..."
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => handleKycAction('approve')}
                className="flex-1 min-w-[150px] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar Identidade</span>
              </button>
              <button
                onClick={() => handleKycAction('in_review')}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Em Análise</span>
              </button>
              <button
                onClick={() => {
                  if (!actionNotes.trim()) {
                    showError('Por favor preencha o motivo da rejeição no campo de observações.');
                    return;
                  }
                  handleKycAction('reject');
                }}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeitar Dados</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURCHASE INSPECTOR MODAL */}
      {inspectPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setInspectPurchase(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white">
              Validação de Comprovativo Bancário em Kz
            </h3>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente:</span>
                <strong className="text-white">{inspectPurchase.userName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">USDT a Creditar:</span>
                <strong className="text-emerald-400">{inspectPurchase.usdtAmount} USDT</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor em Kz esperado na conta:</span>
                <strong className="text-amber-400">{inspectPurchase.totalKz.toLocaleString()} Kz</strong>
              </div>
            </div>

            {/* Target Destination Card with Copy Button */}
            {(() => {
              const targetPlatform = inspectPurchase.targetWallet?.platform || 'ANGOPAYX';
              const targetMeta = getWalletMeta(targetPlatform);
              const TargetLogo = targetMeta.Logo;
              const targetIdent = inspectPurchase.targetWallet?.identifier || inspectPurchase.userEmail;

              return (
                <div className="p-3.5 bg-slate-950/90 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Destino da Carga / Pagamento:
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${targetMeta.badgeBg}`}>
                      {targetMeta.name}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <TargetLogo className="w-5 h-5 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-white block">
                          {targetMeta.fullName}
                        </span>
                        <span className="font-mono text-xs text-emerald-400 select-all truncate block">
                          {targetIdent}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(targetIdent);
                        setCopiedDestId(inspectPurchase.id);
                        setTimeout(() => setCopiedDestId(null), 2000);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 border border-slate-700 shrink-0"
                      title="Copiar identificador / e-mail"
                    >
                      {copiedDestId === inspectPurchase.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>Copiar</span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {inspectPurchase.receiptUrl && (
              <div>
                <span className="text-xs font-bold text-slate-300 block mb-1">Comprovativo Anexado:</span>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800 flex justify-center">
                  <img
                    src={inspectPurchase.receiptUrl}
                    alt="Talão"
                    className="max-h-56 object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Proof / TXID input for External Wallet */}
            {inspectPurchase.targetWallet?.platform && inspectPurchase.targetWallet.platform !== 'ANGOPAYX' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Comprovativo / TXID de Envio Externo (Opcional - gerado automático se vazio)
                </label>
                <input
                  type="text"
                  placeholder="Ex: BINANCE-PAY-98421048 ou TXID da blockchain"
                  value={purchaseProofTxid}
                  onChange={(e) => setPurchaseProofTxid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-emerald-400"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nota da Transação</label>
              <input
                type="text"
                placeholder="Ex: Confirmado no extrato às 14:32"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handlePurchaseAction('approve')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
              >
                {inspectPurchase.targetWallet?.platform && inspectPurchase.targetWallet.platform !== 'ANGOPAYX'
                  ? `Confirmar Carga na ${getWalletMeta(inspectPurchase.targetWallet.platform).name}`
                  : 'Confirmar Pagamento e Creditar USDT'}
              </button>
              <button
                onClick={() => handlePurchaseAction('reject')}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALE INSPECTOR MODAL */}
      {inspectSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setInspectSale(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white">
              Liquidação de Kwanzas para o Cliente
            </h3>

            <div className="p-3 bg-slate-800/60 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Cliente Vendedor:</span>
                <strong className="text-white">{inspectSale.userName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">USDT Vendido (Cativo):</span>
                <strong className="text-amber-400">{inspectSale.usdtAmount} USDT</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total a Transferir em Kz:</span>
                <strong className="text-emerald-400 font-extrabold text-sm">
                  {inspectSale.totalKzToReceive.toLocaleString()} Kz
                </strong>
              </div>
              <div className="pt-2 border-t border-slate-700/60">
                <span className="text-slate-400 block mb-0.5">Destino Bancário do Cliente:</span>
                <p className="font-bold text-white">{inspectSale.payoutMethod.bankName}</p>
                <p className="font-mono text-emerald-400 text-xs select-all">{inspectSale.payoutMethod.ibanOrAccount}</p>
                <p className="text-slate-400 text-[11px]">Titular: {inspectSale.payoutMethod.accountHolder}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nota ou Código do Comprovativo Interbancário EMIS
              </label>
              <input
                type="text"
                placeholder="Ex: Transf. EMIS Ref #981245 concluída"
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleSaleAction('complete')}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Concluir Pagamento Kz e Liquidar
              </button>
              <button
                onClick={() => handleSaleAction('processing')}
                className="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Em Processamento
              </button>
              <button
                onClick={() => handleSaleAction('reject')}
                className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow"
              >
                Rejeitar & Devolver USDT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT ADVERTISEMENT MODAL (Apenas Imagem, Título e Link) */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 my-8 space-y-5">
            <button
              onClick={() => {
                setIsAdModalOpen(false);
                setEditingAd(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                <Megaphone className="w-4 h-4" />
                <span>Divulgação de Anúncios & Produtos</span>
              </div>
              <h3 className="text-lg font-black text-white">
                {editingAd ? `Editar Anúncio — ${editingAd.title}` : 'Publicar Novo Anúncio / Produto'}
              </h3>
              <p className="text-xs text-slate-400">
                O Administrador define a imagem, o título e o link direto do produto ou página a ser divulgado.
              </p>
            </div>

            <form onSubmit={handleSaveAd} className="space-y-4">
              {/* 1. TÍTULO DO ANÚNCIO / PRODUTO */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  1. Título do Anúncio ou Produto *
                </label>
                <input
                  type="text"
                  required
                  value={adForm.title}
                  onChange={(e) => setAdForm({ ...adForm, title: e.target.value })}
                  placeholder="Ex: iPhone 15 Pro Max, Recargas Unitel, Curso de Cripto..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
                />
              </div>

              {/* 2. IMAGEM DO PRODUTO A SER DIVULGADO */}
              <div className="p-4 rounded-2xl bg-slate-950/90 border border-purple-500/40 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    <span>2. Imagem do Produto a ser Divulgado</span>
                  </label>
                  {adForm.bannerUrl && (
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Imagem Definida
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  {/* Upload button from device */}
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-bold transition group">
                    <Upload className={`w-4 h-4 text-purple-400 group-hover:scale-110 transition ${adImageLoading ? 'animate-spin' : ''}`} />
                    <span>{adImageLoading ? 'A processar imagem...' : 'Carregar Imagem do Dispositivo (PNG, JPG)'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAdImageFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Clear image button if present */}
                  {adForm.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setAdForm({ ...adForm, bannerUrl: '' })}
                      className="px-3 py-2 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                      title="Limpar imagem atual"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Limpar</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Ou cole o link direto (URL) da imagem:
                  </label>
                  <input
                    type="text"
                    value={adForm.bannerUrl}
                    onChange={(e) => setAdForm({ ...adForm, bannerUrl: e.target.value })}
                    placeholder="https://exemplo.com/imagem-produto.jpg"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>

                {/* Real-time Image Preview */}
                {adForm.bannerUrl ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3.5">
                    <img
                      src={adForm.bannerUrl}
                      alt="Pré-visualização do Produto"
                      className="w-24 h-20 object-cover rounded-xl border border-slate-700 shadow-md shrink-0 bg-slate-950"
                      onError={(e) => {
                        (e.currentTarget as any).src = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="min-w-0 text-xs space-y-1">
                      <p className="font-bold text-white truncate text-sm">
                        {adForm.title || 'Título do Anúncio'}
                      </p>
                      <p className="text-slate-400 text-[11px] truncate">
                        {adForm.destinationUrl || 'Link do produto a ser divulgado'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center border-2 border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                    Nenhuma imagem selecionada. Carregue um ficheiro do dispositivo ou cole uma URL acima.
                  </div>
                )}
              </div>

              {/* 3. LINK DA PÁGINA OU PRODUTO A SER DIVULGADO */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-400" />
                    <span>3. Link da Página ou Produto a ser Divulgado *</span>
                  </label>

                  {adForm.destinationUrl && adForm.destinationUrl.startsWith('http') && (
                    <a
                      href={adForm.destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 hover:border-emerald-500 transition"
                      title="Testar o link em nova aba"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Testar Link</span>
                    </a>
                  )}
                </div>

                <input
                  type="url"
                  required
                  value={adForm.destinationUrl}
                  onChange={(e) => setAdForm({ ...adForm, destinationUrl: e.target.value })}
                  placeholder="https://sua-loja.com/produto ou https://wa.me/244953330585..."
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-purple-500"
                />

                <p className="text-[11px] text-slate-400">
                  Quando os clientes clicarem no anúncio, serão direcionados imediatamente para este link (página de compra, catálogo ou WhatsApp).
                </p>
              </div>

              {/* 4. STATUS (ATIVO / PAUSADO) */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5">
                  Status do Anúncio *
                </label>
                <select
                  value={adForm.status}
                  onChange={(e) => setAdForm({ ...adForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                >
                  <option value="active">🟢 Ativo (Visível no site)</option>
                  <option value="paused">⏸️ Pausado (Oculto)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdModalOpen(false);
                    setEditingAd(null);
                  }}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/40 transition"
                >
                  {editingAd ? 'Gravar Alterações do Anúncio' : 'Publicar Anúncio Agora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE AD CONFIRMATION MODAL */}
      {adToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-white">Eliminar Anúncio?</h3>
              <p className="text-xs text-slate-300 mt-2">
                Tem a certeza que deseja eliminar o anúncio <strong className="text-white">&quot;{adToDelete.title}&quot;</strong>?
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Esta ação removerá o banner de circulação no site e excluirá o registro da base de dados.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdToDelete(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAd}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-900/40 transition"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
