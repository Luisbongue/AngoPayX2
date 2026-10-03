import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Building2,
  Copy,
  Check,
  UploadCloud,
  FileCheck,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  Wallet,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { purchaseService } from '../services/purchaseService.ts';
import {
  PaymentMethodConfig,
  PurchaseOrder,
  ExchangeSettings,
  PurchaseTargetPlatform,
  ClientWallet,
} from '../types/index.ts';
import {
  BinanceLogo,
  BybitLogo,
  RedotPayLogo,
  TronLogo,
  AngoPayXLogo,
  getWalletMeta,
} from '../components/WalletLogos.tsx';
import {
  validateTronAddress,
  validateBinanceIdentifier,
  validateBybitIdentifier,
  validateRedotPayIdentifier,
} from '../server/tronUtils.ts';
import { WhatsAppIcon, WHATSAPP_NUMBER, WHATSAPP_URL } from '../components/WhatsAppFloatingWidget.tsx';

interface BuyPageProps {
  onNavigate?: (tab: string) => void;
}

export const BuyPage: React.FC<BuyPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [usdtAmount, setUsdtAmount] = useState<number>(100);
  const [exchange, setExchange] = useState<ExchangeSettings>({ buyRateKz: 1350, sellRateKz: 1250, updatedAt: '', updatedBy: '' });
  const [methods, setMethods] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<'iban' | 'referencia'>('iban');
  const [activeOrder, setActiveOrder] = useState<PurchaseOrder | null>(null);
  const [myOrders, setMyOrders] = useState<PurchaseOrder[]>([]);

  // Target wallet selection state
  const [targetPlatform, setTargetPlatform] = useState<PurchaseTargetPlatform>('ANGOPAYX');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [savedWallets, setSavedWallets] = useState<ClientWallet[]>([]);
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Receipt upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [receiptDataUrl, setReceiptDataUrl] = useState<string>('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  useEffect(() => {
    loadConfig();
    if (user) {
      loadMyOrders();
      loadWallets();
    }
  }, [user]);

  // Real-time validation for target wallet identifier
  useEffect(() => {
    if (targetPlatform === 'ANGOPAYX') {
      setValidationResult(null);
      return;
    }

    if (!targetIdentifier.trim()) {
      setValidationResult(null);
      return;
    }

    if (targetPlatform === 'BINANCE') {
      setValidationResult(validateBinanceIdentifier(targetIdentifier));
    } else if (targetPlatform === 'BYBIT') {
      setValidationResult(validateBybitIdentifier(targetIdentifier));
    } else if (targetPlatform === 'REDOTPAY') {
      setValidationResult(validateRedotPayIdentifier(targetIdentifier));
    } else if (targetPlatform === 'TRON') {
      setValidationResult(validateTronAddress(targetIdentifier));
    }
  }, [targetPlatform, targetIdentifier]);

  const loadConfig = async () => {
    try {
      const res = await apiClient.getRatesAndMethods();
      if (res.exchange) setExchange(res.exchange);
      if (res.paymentMethods) {
        setMethods(res.paymentMethods);
        if (res.paymentMethods.length > 0) {
          setSelectedMethodId(res.paymentMethods[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading config:', err);
    }
  };

  const loadMyOrders = async () => {
    if (!user) return;
    try {
      const orders = await purchaseService.loadUserOrders(user);
      setMyOrders(orders);

      // Restore ongoing active order waiting for receipt or review
      const localActive = purchaseService.getActiveOrderLocally(user.id);
      const ongoing =
        (localActive && orders.find((p) => p.id === localActive.id)) ||
        localActive ||
        orders.find(
          (p) =>
            p.status === 'Aguardando pagamento' ||
            p.status === 'Comprovativo enviado' ||
            p.status === 'Em análise'
        );

      if (ongoing && !activeOrder) {
        setActiveOrder(ongoing);
      }
    } catch (err) {
      console.error('Error loading purchases:', err);
    }
  };

  const loadWallets = async () => {
    try {
      const res = await apiClient.getMyWallets();
      setSavedWallets(res.wallets);
    } catch (err) {
      console.error('Error loading wallets:', err);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('Sessão expirada. Por favor autentique-se para continuar.');
      return;
    }

    if (targetPlatform !== 'ANGOPAYX') {
      if (!targetIdentifier.trim()) {
        setError(`Por favor forneça o identificador ou e-mail da sua conta ${targetPlatform}.`);
        return;
      }
      if (validationResult && !validationResult.isValid) {
        setError(validationResult.error || `Identificador ${targetPlatform} inválido.`);
        return;
      }
    }

    const selectedMethod = methods.find((m) => m.id === selectedMethodId);
    if (!selectedMethod) {
      setError('Método de pagamento não encontrado.');
      return;
    }

    setLoading(true);

    try {
      const created = await purchaseService.createPurchase({
        usdtAmount,
        paymentMethod: selectedMethod,
        targetWallet: {
          platform: targetPlatform,
          identifier: targetPlatform === 'ANGOPAYX' ? user.email : targetIdentifier.trim(),
        },
        user,
        buyRateKz: exchange.buyRateKz,
      });

      setActiveOrder(created);
      setSuccess('Ordem criada com sucesso.');
      await loadMyOrders();
    } catch (err: any) {
      console.error('[Criar Ordem Erro]:', err);
      setError(err.message || 'Erro ao criar ordem de compra.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O tamanho do comprovativo não pode exceder 5MB.');
      return;
    }

    const validMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!validMimeTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(extension || '')) {
      setError('Formato inválido. Por favor envie um ficheiro JPG, PNG ou PDF.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadReceipt = async () => {
    if (!activeOrder || (!selectedFile && !receiptDataUrl)) {
      setError('Por favor selecione um comprovativo em formato JPG, PNG ou PDF antes de enviar.');
      return;
    }

    if (!user) {
      setError('Sessão expirada. Por favor autentique-se para continuar.');
      return;
    }

    setUploadingReceipt(true);
    setError(null);
    setSuccess(null);

    console.log('[Confirmar Envio Comprovativo]', {
      orderId: activeOrder.id,
      userId: user.id,
      userEmail: user.email,
      fileName: selectedFile?.name,
      fileSize: selectedFile?.size,
    });

    try {
      const updatedOrder = await purchaseService.uploadReceipt({
        orderId: activeOrder.id,
        file: selectedFile,
        receiptDataUrl,
        user,
      });

      setActiveOrder(updatedOrder);
      setSuccess('Depósito enviado com sucesso! Recebemos o seu comprovativo e a sua solicitação está agora em análise. Aguarde a confirmação e a libertação dos fundos pela AngoPayX.');
      setSelectedFile(null);
      setReceiptDataUrl('');
      await loadMyOrders();
    } catch (err: any) {
      console.error('[UploadReceipt Erro]:', err);
      setError(err.message || 'Erro ao anexar comprovativo à ordem.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Calculations
  const rateKz = exchange.buyRateKz;
  const subtotalKz = usdtAmount * rateKz;
  const feeKz = 0;
  const totalKz = subtotalKz + feeKz;

  const currentMeta = getWalletMeta(targetPlatform);
  const matchingSavedWallets = savedWallets.filter(
    (w) => w.type === (targetPlatform === 'TRON' ? 'TRON' : targetPlatform)
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <PlusCircle className="w-4 h-4" />
            <span>Compra de USDT & Carga de Carteiras em Kwanzas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Comprar USDT & Carregar Carteiras</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Pague em Kwanzas via Kwik / IBAN (PayPal) ou Referência Multicaixa (10116) e credite o seu saldo AngoPayX ou carregue diretamente as suas contas Binance, Bybit, RedotPay ou TRON.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl p-3 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Cotação Oficial de Compra</span>
          <span className="text-xl font-black text-emerald-400">1 USDT = {rateKz.toLocaleString()} Kz</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Order Form or Active Order Steps */}
        <div className="lg:col-span-7 space-y-6">
          {!activeOrder ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>1. Quantidade e Destino do Carregamento</span>
              </h2>

              <form onSubmit={handleCreateOrder} className="space-y-5">
                {/* USDT Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Quantidade de USDT a Comprar
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      step="any"
                      required
                      value={usdtAmount}
                      onChange={(e) => setUsdtAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                    <span className="absolute right-4 top-3 text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800/60">
                      USDT
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[50, 100, 250, 500, 1000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setUsdtAmount(preset)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                          usdtAmount === preset
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        +{preset} USDT
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Wallet / Destination Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Onde deseja carregar ou creditar os USDT?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* AngoPayX internal */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPlatform('ANGOPAYX');
                        setTargetIdentifier('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        targetPlatform === 'ANGOPAYX'
                          ? 'bg-emerald-950/50 border-emerald-500 ring-1 ring-emerald-500/50 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <AngoPayXLogo className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs text-white">AngoPayX</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Saldo da Conta</span>
                    </button>

                    {/* Binance */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPlatform('BINANCE');
                        setTargetIdentifier('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        targetPlatform === 'BINANCE'
                          ? 'bg-amber-950/50 border-amber-500 ring-1 ring-amber-500/50 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <BinanceLogo className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs text-white">Binance</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Email ou UID</span>
                    </button>

                    {/* Bybit */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPlatform('BYBIT');
                        setTargetIdentifier('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        targetPlatform === 'BYBIT'
                          ? 'bg-yellow-950/50 border-yellow-500 ring-1 ring-yellow-500/50 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <BybitLogo className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs text-white">Bybit</span>
                      </div>
                      <span className="text-[10px] text-slate-400">UID ou Email</span>
                    </button>

                    {/* RedotPay */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPlatform('REDOTPAY');
                        setTargetIdentifier('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        targetPlatform === 'REDOTPAY'
                          ? 'bg-rose-950/50 border-rose-500 ring-1 ring-rose-500/50 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <RedotPayLogo className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs text-white">RedotPay</span>
                      </div>
                      <span className="text-[10px] text-slate-400">ID ou Email</span>
                    </button>

                    {/* TRON */}
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPlatform('TRON');
                        setTargetIdentifier('');
                      }}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        targetPlatform === 'TRON'
                          ? 'bg-cyan-950/50 border-cyan-500 ring-1 ring-cyan-500/50 text-white'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <TronLogo className="w-4 h-4 shrink-0" />
                        <span className="font-bold text-xs text-white">TRON</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Rede TRC20</span>
                    </button>
                  </div>

                  {/* Identifier Input for External Wallet */}
                  {targetPlatform !== 'ANGOPAYX' && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-300">
                          {currentMeta.identifierLabel}
                        </label>
                        {matchingSavedWallets.length > 0 && (
                          <span className="text-[10px] text-emerald-400 font-semibold">
                            {matchingSavedWallets.length} salva(s)
                          </span>
                        )}
                      </div>

                      {matchingSavedWallets.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {matchingSavedWallets.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => setTargetIdentifier(w.addressOrUid)}
                              className={`text-[11px] px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                                targetIdentifier === w.addressOrUid
                                  ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                              }`}
                            >
                              📌 {w.nickname} ({w.addressOrUid.slice(0, 10)}...)
                            </button>
                          ))}
                        </div>
                      )}

                      <input
                        type="text"
                        required
                        placeholder={currentMeta.placeholder}
                        value={targetIdentifier}
                        onChange={(e) => setTargetIdentifier(e.target.value)}
                        className={`w-full px-3 py-2 bg-slate-900 border rounded-xl text-xs font-mono text-white focus:outline-none transition ${
                          validationResult
                            ? validationResult.isValid
                              ? 'border-emerald-500'
                              : 'border-rose-500'
                            : 'border-slate-700 focus:border-emerald-500'
                        }`}
                      />

                      {validationResult && (
                        <div className="text-[11px] flex items-center gap-1.5">
                          {validationResult.isValid ? (
                            <span className="text-emerald-400 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Identificador {currentMeta.name} válido
                            </span>
                          ) : (
                            <span className="text-rose-400 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              {validationResult.error}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400">
                        💡 {currentMeta.instructions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    Selecione a Forma de Pagamento em Kz
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {methods.map((method) => {
                      const isSelected = selectedMethodId === method.id;
                      const isIban = method.id === 'iban';
                      return (
                        <div
                          key={method.id}
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition ${
                            isSelected
                              ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/50'
                              : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-white">{method.name}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 mb-1.5">{method.bank}</p>
                          <div className="text-[10px] font-mono text-emerald-400 bg-slate-900/90 px-2 py-1 rounded border border-slate-700/60 truncate">
                            {isIban ? (
                              <span>IBAN: {method.accountOrCode}</span>
                            ) : (
                              <span>Entidade: 10116 | ID: {method.accountOrCode}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Calculation Summary Box */}
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>USDT Solicitado:</span>
                    <span className="font-bold text-white">{usdtAmount} USDT</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Destino do Carregamento:</span>
                    <span className="font-bold text-emerald-400">{currentMeta.fullName}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Câmbio de Compra:</span>
                    <span className="text-slate-200">1 USDT = {rateKz.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="text-slate-200">{subtotalKz.toLocaleString()} Kz</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Taxa Administrativa:</span>
                    <span className="text-emerald-400 font-medium">0 Kz (Sem taxas ocultas)</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700/80 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-white">Total a Transferir em Kz:</span>
                    <span className="text-lg font-black text-emerald-400">
                      {totalKz.toLocaleString()} Kz
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={Boolean(
                    loading ||
                      usdtAmount <= 0 ||
                      (targetPlatform !== 'ANGOPAYX' &&
                        (!targetIdentifier.trim() || (validationResult && !validationResult.isValid)))
                  )}
                  className="w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'A criar ordem...'
                    : `Prosseguir para Carga na ${currentMeta.name}`}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          ) : (
            /* ACTIVE ORDER SCREEN */
            <div className="p-6 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Ordem de Compra:</span>
                    <strong className="font-mono text-xs text-emerald-400">{activeOrder.id}</strong>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {activeOrder.usdtAmount} USDT por {activeOrder.totalKz.toLocaleString()} Kz
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {activeOrder.status}
                  </span>
                  <button
                    onClick={() => {
                      if (user) purchaseService.clearActiveOrderLocally(user.id);
                      setActiveOrder(null);
                      setReceiptDataUrl('');
                      setSelectedFile(null);
                    }}
                    className="text-xs text-slate-400 hover:text-white underline ml-2"
                  >
                    Nova Ordem
                  </button>
                </div>
              </div>

              {/* Target Wallet Summary */}
              {(() => {
                const targetMeta = getWalletMeta(activeOrder.targetWallet?.platform || 'ANGOPAYX');
                const TargetLogo = targetMeta.Logo;
                return (
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <TargetLogo className="w-5 h-5 shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-white block">
                          Destino: {targetMeta.fullName}
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 truncate select-all block">
                          {activeOrder.targetWallet?.identifier || activeOrder.userEmail}
                        </span>
                      </div>
                    </div>
                    {activeOrder.targetWallet?.txidOrProof && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
                        TXID: {activeOrder.targetWallet.txidOrProof}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Bank Details Display */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  <Building2 className="w-4 h-4" />
                  <span>Dados Bancários Oficiais do AngoPayX</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Banco / Rede:</span>
                    <span className="font-semibold text-white">{activeOrder.paymentMethodDetails.bank}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Beneficiário (Empresa):</span>
                    <span className="font-semibold text-emerald-400">{activeOrder.paymentMethodDetails.beneficiary}</span>
                  </div>

                  {activeOrder.paymentMethodType === 'referencia' ? (
                    <>
                      <div className="flex justify-between items-center py-1.5 bg-slate-900/70 px-3 rounded-lg border border-slate-700">
                        <span className="text-slate-400">Entidade Multicaixa:</span>
                        <div className="flex items-center gap-2 font-mono font-bold text-amber-400 text-sm">
                          <span>10116</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('10116', 'entidade')}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copiar Entidade"
                          >
                            {copiedField === 'entidade' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-1.5 bg-slate-900/70 px-3 rounded-lg border border-slate-700">
                        <span className="text-slate-400">Referência ou ID:</span>
                        <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 text-sm">
                          <span>935 531 547</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('935 531 547', 'referencia')}
                            className="p-1 text-slate-400 hover:text-white"
                            title="Copiar Referência / ID"
                          >
                            {copiedField === 'referencia' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center py-1.5 bg-slate-900/70 px-3 rounded-lg border border-slate-700">
                      <span className="text-slate-400">IBAN (Kwik / Bancário):</span>
                      <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 text-sm">
                        <span>{activeOrder.paymentMethodDetails.accountOrCode}</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(activeOrder.paymentMethodDetails.accountOrCode, 'account')
                          }
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copiar IBAN"
                        >
                          {copiedField === 'account' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center py-1.5 bg-slate-900/70 px-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400">Valor Exacto em Kz:</span>
                    <div className="flex items-center gap-2 font-bold text-amber-400 text-sm">
                      <span>{activeOrder.totalKz.toLocaleString()} Kz</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(activeOrder.totalKz.toString(), 'amount')}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Copiar Valor"
                      >
                        {copiedField === 'amount' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg text-[11px] text-slate-300">
                  <p className="font-semibold text-slate-200 mb-0.5">Instruções:</p>
                  <p>{activeOrder.paymentMethodDetails.instructions}</p>
                </div>
              </div>

              {/* Upload Receipt Step */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span>Enviar Comprovativo de Pagamento</span>
                </h4>

                {activeOrder.receiptUrl ? (
                  <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span>Comprovativo anexado à ordem com sucesso.</span>
                    </div>
                    <a
                      href={activeOrder.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-400 underline font-bold"
                    >
                      Visualizar
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block p-4 border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl cursor-pointer text-center bg-slate-900/50 transition">
                      <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-xs font-semibold text-slate-200 block">
                        Clique para anexar o talão bancário ou PDF
                      </span>
                      <span className="text-[10px] text-slate-400">Formatos aceitos: JPG, PNG, PDF (Máx. 5MB)</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>

                    {receiptDataUrl && (
                      <div className="flex items-center justify-between p-2 bg-slate-900 rounded-lg border border-slate-700 text-xs">
                        <span className="text-slate-300 truncate max-w-xs">Ficheiro selecionado e pronto</span>
                        <button
                          type="button"
                          onClick={handleUploadReceipt}
                          disabled={uploadingReceipt}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs shadow transition"
                        >
                          {uploadingReceipt ? 'A submeter...' : 'Confirmar Envio'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Timeline */}
              <div className="pt-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Progresso da Ordem
                </h5>
                <div className="grid grid-cols-4 text-center gap-1 text-[11px]">
                  <div className="p-2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                    1. Criada
                  </div>
                  <div
                    className={`p-2 rounded font-semibold ${
                      activeOrder.receiptUrl || activeOrder.status !== 'Aguardando pagamento'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    2. Comprovativo
                  </div>
                  <div
                    className={`p-2 rounded font-semibold ${
                      activeOrder.status === 'USDT creditado'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : activeOrder.status === 'Comprovativo enviado' ||
                          activeOrder.status === 'Em análise' ||
                          activeOrder.status === 'Pagamento confirmado'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-1 ring-amber-500/30 font-bold'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    3. Em Análise
                  </div>
                  <div
                    className={`p-2 rounded font-semibold ${
                      activeOrder.status === 'USDT creditado'
                        ? 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    4. USDT Creditado
                  </div>
                </div>

                {/* WhatsApp Support Link for active order */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 text-[11px]">Dúvidas ou envio de comprovativo alternativo?</span>
                  <a
                    href={`https://wa.me/244953330585?text=${encodeURIComponent(
                      `Olá! Tenho a ordem de compra ${activeOrder.id} (${activeOrder.usdtAmount} USDT / ${activeOrder.totalKz.toLocaleString()} Kz) no AngoPayX e gostaria de atendimento.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 font-bold transition"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366]" />
                    <span>Apoio WhatsApp ({WHATSAPP_NUMBER})</span>
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Security, Info and Order History */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order History Panel */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Minhas Ordens de Compra ({myOrders.length})</span>
            </h3>

            {myOrders.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhuma ordem de compra efetuada até ao momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {myOrders.map((order) => {
                  const targetMeta = getWalletMeta(order.targetWallet?.platform || 'ANGOPAYX');
                  const TargetLogo = targetMeta.Logo;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setActiveOrder(order)}
                      className={`p-3 rounded-xl border cursor-pointer transition ${
                        activeOrder?.id === order.id
                          ? 'bg-slate-800 border-emerald-500/50'
                          : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-1.5">
                          <TargetLogo className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-bold text-xs text-white">
                            {order.usdtAmount} USDT
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            order.status === 'USDT creditado'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : order.status === 'Rejeitado'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>{order.totalKz.toLocaleString()} Kz</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${targetMeta.badgeBg}`}>
                          {targetMeta.name}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Compliance & Security Guarantee Box */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Segurança Financeira AngoPayX</span>
            </div>
            <ul className="space-y-2 text-slate-400 text-[11px] list-disc list-inside">
              <li>O valor do câmbio é fixado no momento exato em que cria a ordem.</li>
              <li>Pode carregar a sua conta AngoPayX ou diretamente a sua Binance, Bybit, RedotPay ou TRON.</li>
              <li>Todas as validações bancárias são conferidas contra o extrato bancário oficial.</li>
              <li>O crédito ou envio de USDT é imediatamente lançado no livro-razão financeiro auditável.</li>
              <li>Nunca faça transferências para contas não listadas nesta aplicação oficial.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
