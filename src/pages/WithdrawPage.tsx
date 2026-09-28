import React, { useState, useEffect } from 'react';
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { WithdrawalOrder, FeeSettings, LimitSettings, ClientWallet, WithdrawalPlatform } from '../types/index.ts';
import {
  validateTronAddress,
  validateBinanceIdentifier,
  validateBybitIdentifier,
  validateRedotPayIdentifier,
} from '../server/tronUtils.ts';
import {
  BinanceLogo,
  BybitLogo,
  RedotPayLogo,
  TronLogo,
  getWalletMeta,
} from '../components/WalletLogos.tsx';
import { KycRequiredBanner } from '../components/KycRequiredBanner.tsx';

interface WithdrawPageProps {
  onNavigate?: (tab: string) => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({ onNavigate }) => {
  const { user, balance } = useAuth();
  const [type, setType] = useState<WithdrawalPlatform>('BINANCE');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState<number>(50);
  const [savedWallets, setSavedWallets] = useState<ClientWallet[]>([]);

  const [fees, setFees] = useState<FeeSettings>({
    buyFeePercent: 0,
    sellFeePercent: 0,
    sellFeeKzFixed: 0,
    trc20WithdrawalFeeUsdt: 1.5,
    binanceWithdrawalFeeUsdt: 0.5,
    updatedAt: '',
    updatedBy: '',
  });

  const [limits, setLimits] = useState<LimitSettings>({
    minBuyUsdt: 10,
    maxBuyUsdt: 10000,
    minSellUsdt: 10,
    maxSellUsdt: 10000,
    minDepositUsdt: 5,
    minWithdrawUsdt: 10,
    maxWithdrawUsdt: 5000,
    dailyLimitUsdt: 20000,
    monthlyLimitUsdt: 100000,
    updatedAt: '',
    updatedBy: '',
  });

  const [validationResult, setValidationResult] = useState<{ isValid: boolean; error?: string } | null>(null);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
    if (user) {
      loadWithdrawals();
      loadWallets();
    }
  }, [user]);

  // Real-time address validation as user types
  useEffect(() => {
    if (!destination.trim()) {
      setValidationResult(null);
      return;
    }

    if (type === 'TRC20') {
      const v = validateTronAddress(destination);
      setValidationResult(v);
    } else if (type === 'BINANCE') {
      const v = validateBinanceIdentifier(destination);
      setValidationResult(v);
    } else if (type === 'BYBIT') {
      const v = validateBybitIdentifier(destination);
      setValidationResult(v);
    } else if (type === 'REDOTPAY') {
      const v = validateRedotPayIdentifier(destination);
      setValidationResult(v);
    }
  }, [destination, type]);

  const loadSettings = async () => {
    try {
      const res = await apiClient.getRatesAndMethods();
      if (res.fees) setFees(res.fees);
      if (res.limits) setLimits(res.limits);
    } catch (err) {
      console.error('Error loading fees/limits:', err);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const res = await apiClient.getMyWithdrawals();
      setMyWithdrawals(res.withdrawals);
    } catch (err) {
      console.error('Error loading withdrawals:', err);
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const availableBalance = balance ? balance.availableBalance : 0;
  const currentFee = type === 'TRC20' ? fees.trc20WithdrawalFeeUsdt : fees.binanceWithdrawalFeeUsdt;
  const netAmount = Math.max(0, Number((amount - currentFee).toFixed(4)));

  const isSoleAdmin = user?.email?.toLowerCase() === 'luisbongue4@gmail.com';
  const isKycApproved = Boolean(isSoleAdmin || user?.kycStatus === 'Aprovado');

  const handleCreateWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isKycApproved) {
      setError('Verificação de identidade necessária. Para realizar depósitos e retiradas, a sua conta precisa ter o KYC aprovado.');
      return;
    }

    if (validationResult && !validationResult.isValid) {
      setError(validationResult.error || 'Destino de saque inválido.');
      return;
    }

    if (amount < limits.minWithdrawUsdt) {
      setError(`O saque mínimo permitido é de ${limits.minWithdrawUsdt} USDT.`);
      return;
    }

    if (amount > availableBalance) {
      setError(`Saldo insuficiente. O seu saldo disponível é de ${availableBalance.toFixed(2)} USDT.`);
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.createWithdrawal({
        type,
        destination: destination.trim(),
        amount,
      });

      setSuccess(
        `Pedido de saque de ${res.withdrawal.amount} USDT para ${res.withdrawal.destination.slice(0, 16)}... criado com sucesso! O operador financeiro irá efetuar a liquidação.`
      );
      setDestination('');
      await loadWithdrawals();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar solicitação de saque.');
    } finally {
      setLoading(false);
    }
  };

  const currentMeta = getWalletMeta(type);

  // Filter saved wallets corresponding to current type
  const targetWalletType = type === 'TRC20' ? 'TRON' : type;
  const matchingSavedWallets = savedWallets.filter((w) => w.type === targetWalletType);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Upload className="w-4 h-4" />
            <span>Retirada Externa de Criptoativo</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Sacar USDT</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Transfira os seus USDT para a sua conta Binance, Bybit, RedotPay (via Email ou ID/UID) ou diretamente para a rede TRON (TRC20).
          </p>
        </div>

        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Saldo Disponível para Saque</span>
          <span className="text-xl font-black text-cyan-400">{availableBalance.toFixed(2)} USDT</span>
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
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* KYC Required Banner when KYC not approved */}
      {user && !isKycApproved && (
        <KycRequiredBanner onNavigate={onNavigate} operationName="saques e retiradas de USDT" />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              1. Selecione a Carteira de Destino
            </h2>

            {/* Network Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Binance */}
              <button
                type="button"
                onClick={() => {
                  setType('BINANCE');
                  setDestination('');
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'BINANCE'
                    ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <BinanceLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-white">Binance</span>
                </div>
                <span className="text-[10px] text-slate-400">Email ou UID</span>
                <span className="text-[10px] text-amber-400 font-semibold mt-1">Taxa: {fees.binanceWithdrawalFeeUsdt} USDT</span>
              </button>

              {/* Bybit */}
              <button
                type="button"
                onClick={() => {
                  setType('BYBIT');
                  setDestination('');
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'BYBIT'
                    ? 'bg-yellow-950/40 border-yellow-500 ring-1 ring-yellow-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <BybitLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-white">Bybit</span>
                </div>
                <span className="text-[10px] text-slate-400">UID ou Email</span>
                <span className="text-[10px] text-yellow-400 font-semibold mt-1">Taxa: {fees.binanceWithdrawalFeeUsdt} USDT</span>
              </button>

              {/* RedotPay */}
              <button
                type="button"
                onClick={() => {
                  setType('REDOTPAY');
                  setDestination('');
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'REDOTPAY'
                    ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <RedotPayLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-white">RedotPay</span>
                </div>
                <span className="text-[10px] text-slate-400">ID ou Email</span>
                <span className="text-[10px] text-rose-400 font-semibold mt-1">Taxa: {fees.binanceWithdrawalFeeUsdt} USDT</span>
              </button>

              {/* TRON TRC20 */}
              <button
                type="button"
                onClick={() => {
                  setType('TRC20');
                  setDestination('');
                }}
                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                  type === 'TRC20'
                    ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50 text-white'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <TronLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-white">TRON</span>
                </div>
                <span className="text-[10px] text-slate-400">Rede TRC20</span>
                <span className="text-[10px] text-cyan-400 font-semibold mt-1">Taxa: {fees.trc20WithdrawalFeeUsdt} USDT</span>
              </button>
            </div>

            <form onSubmit={handleCreateWithdrawal} className="space-y-4">
              {/* Destination Input with Live Validation */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">
                    {currentMeta.identifierLabel}
                  </label>
                  {matchingSavedWallets.length > 0 && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      {matchingSavedWallets.length} carteira(s) salvas
                    </span>
                  )}
                </div>

                {matchingSavedWallets.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                    {matchingSavedWallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setDestination(w.addressOrUid)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border transition whitespace-nowrap ${
                          destination === w.addressOrUid
                            ? 'bg-emerald-600 text-white border-emerald-500 font-bold'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
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
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-slate-800 border rounded-xl text-xs font-mono text-white focus:outline-none transition ${
                    validationResult
                      ? validationResult.isValid
                        ? 'border-emerald-500 bg-emerald-950/10'
                        : 'border-rose-500 bg-rose-950/10'
                      : 'border-slate-700 focus:border-cyan-500'
                  }`}
                />

                {/* Live validation feedback message */}
                {validationResult && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                    {validationResult.isValid ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Identificador {currentMeta.name} válido para transferência
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {validationResult.error}
                      </span>
                    )}
                  </div>
                )}
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 {currentMeta.instructions}
                </p>
              </div>

              {/* Amount Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300">Quantidade de USDT a Sacar</label>
                  <button
                    type="button"
                    onClick={() => setAmount(Number(availableBalance.toFixed(2)))}
                    className="text-[11px] text-cyan-400 hover:underline font-semibold"
                  >
                    Usar Saldo Total ({availableBalance.toFixed(2)} USDT)
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={limits.minWithdrawUsdt}
                    max={limits.maxWithdrawUsdt}
                    step="any"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-cyan-500"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">USDT</span>
                </div>

                <div className="flex gap-2 mt-2">
                  {[25, 50, 100, 250, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                        amount === preset
                          ? 'bg-cyan-600 text-white border-cyan-500 font-bold'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {preset} USDT
                    </button>
                  ))}
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Montante do Saque:</span>
                  <span className="font-bold text-white">{amount} USDT</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxa de Envio ({currentMeta.name}):</span>
                  <span className="text-slate-200">{currentFee} USDT</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Receberá na Carteira:</span>
                  <span className="text-lg font-black text-cyan-400">{netAmount} USDT</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/50 border border-slate-700/80 rounded-xl flex items-start gap-2 text-[11px] text-slate-400">
                <Lock className="w-4 h-4 shrink-0 text-cyan-400 mt-0.5" />
                <span>
                  O valor de <strong>{amount} USDT</strong> será bloqueado temporariamente para garantir integridade contábil até à confirmação do envio pelo operador financeiro.
                </span>
              </div>

              <button
                type="submit"
                disabled={Boolean(loading || !isKycApproved || amount <= currentFee || amount > availableBalance || (validationResult && !validationResult.isValid))}
                className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 ${
                  !isKycApproved
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30'
                }`}
              >
                {loading
                  ? 'A processar saque...'
                  : !isKycApproved
                  ? 'KYC Obrigatório para Saques'
                  : `Confirmar e Sacar para ${currentMeta.name}`}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Withdrawals History & Details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>Meus Pedidos de Saque ({myWithdrawals.length})</span>
            </h3>

            {myWithdrawals.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhum saque solicitado até ao momento.
              </p>
            ) : (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {myWithdrawals.map((wd) => {
                  const wdMeta = getWalletMeta(wd.type);
                  const WdLogo = wdMeta.Logo;
                  return (
                    <div
                      key={wd.id}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2 hover:border-slate-600 transition"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <WdLogo className="w-4 h-4 shrink-0" />
                          <span className="font-extrabold text-xs text-white">
                            {wd.amount} USDT ({wd.netAmount} liq.)
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            wd.status === 'Concluído'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : wd.status === 'Rejeitado'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {wd.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
                        <span className="truncate">Destino: <span className="font-mono text-slate-300">{wd.destination}</span></span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(wd.destination, wd.id)}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Copiar destino"
                        >
                          {copiedId === wd.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      {wd.txid && (
                        <div className="p-2 rounded bg-slate-900 border border-slate-700/80">
                          <span className="text-[10px] text-emerald-400 font-bold block mb-0.5">
                            Comprovativo / TXID de Envio:
                          </span>
                          <span className="font-mono text-[10px] text-slate-300 break-all select-all block">
                            {wd.txid}
                          </span>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                        <span className={`px-1.5 py-0.2 rounded font-bold border ${wdMeta.badgeBg}`}>
                          {wdMeta.fullName}
                        </span>
                        <span>{new Date(wd.createdAt).toLocaleString('pt-AO')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
