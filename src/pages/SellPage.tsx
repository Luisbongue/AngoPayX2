import React, { useState, useEffect } from 'react';
import {
  MinusCircle,
  Building,
  CheckCircle2,
  AlertCircle,
  Lock,
  ArrowRight,
  Clock,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { ExchangeSettings, SaleOrder } from '../types/index.ts';
import { KycRequiredBanner } from '../components/KycRequiredBanner.tsx';

const ANGOLAN_BANKS = [
  'Banco Angolano de Investimentos (BAI)',
  'Banco de Fomento Angola (BFA)',
  'Banco BIC Angola',
  'Banco Millennium Atlântico (BMA)',
  'Banco de Poupança e Crédito (BPC)',
  'Banco Sol',
  'Standard Bank Angola',
  'Banco Caixa Geral Angola (BCGA)',
  'Outro Banco Nacional / EMIS',
];

interface SellPageProps {
  onNavigate?: (tab: string) => void;
}

export const SellPage: React.FC<SellPageProps> = ({ onNavigate }) => {
  const { user, balance, refreshUser } = useAuth();
  const [usdtAmount, setUsdtAmount] = useState<number>(50);
  const [exchange, setExchange] = useState<ExchangeSettings>({ buyRateKz: 1350, sellRateKz: 1250, updatedAt: '', updatedBy: '' });

  // Bank payout form
  const [bankName, setBankName] = useState<string>(ANGOLAN_BANKS[0]);
  const [accountHolder, setAccountHolder] = useState<string>(user?.name || '');
  const [ibanOrAccount, setIbanOrAccount] = useState<string>('');
  const [phoneOrReference, setPhoneOrReference] = useState<string>(user?.phone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mySales, setMySales] = useState<SaleOrder[]>([]);

  useEffect(() => {
    loadRates();
    if (user) loadSales();
  }, [user]);

  const loadRates = async () => {
    try {
      const res = await apiClient.getRatesAndMethods();
      if (res.exchange) setExchange(res.exchange);
    } catch (err) {
      console.error('Error loading exchange rates:', err);
    }
  };

  const loadSales = async () => {
    try {
      const res = await apiClient.getMySales();
      setMySales(res.sales);
    } catch (err) {
      console.error('Error loading sales:', err);
    }
  };

  const availableBalance = balance ? balance.availableBalance : 0;
  const sellRateKz = exchange.sellRateKz; // Default 1250 Kz
  const feeKz = 0; // Current Rule: 0 Kz withdrawal fee
  const totalKzToReceive = Math.round(usdtAmount * sellRateKz - feeKz);

  const isSoleAdmin = user?.email?.toLowerCase() === 'luisbongue4@gmail.com';
  const isKycApproved = Boolean(isSoleAdmin || user?.kycStatus === 'Aprovado');

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isKycApproved) {
      setError('Antes de solicitar vendas ou retiradas, preencha a sua Data de Nascimento e Número do BI no seu Perfil para validação do Administrador (sem fotos).');
      return;
    }

    if (usdtAmount <= 0) {
      setError('A quantidade de USDT a vender deve ser maior que zero.');
      return;
    }

    if (usdtAmount > availableBalance) {
      setError(`Saldo insuficiente. O seu saldo disponível é de ${availableBalance.toFixed(2)} USDT.`);
      return;
    }

    if (!ibanOrAccount.trim()) {
      setError('Por favor, informe o seu IBAN ou número de conta bancária para receber os Kwanzas.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.createSale({
        usdtAmount,
        bankName,
        accountHolder: accountHolder.trim() || user?.name || '',
        ibanOrAccount: ibanOrAccount.trim(),
        phoneOrReference: phoneOrReference.trim(),
      });

      setSuccess(
        `Ordem de venda criada com sucesso! O valor de ${res.order.usdtAmount} USDT foi cativo e ${res.order.totalKzToReceive.toLocaleString()} Kz serão transferidos para o seu IBAN.`
      );
      await refreshUser();
      await loadSales();
    } catch (err: any) {
      setError(err.message || 'Falha ao criar ordem de venda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <MinusCircle className="w-4 h-4" />
            <span>Venda de USDT com Recebimento em Kz</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Vender USDT para AngoPayX</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Converta o seu saldo de USDT em Kwanzas depositados diretamente na sua conta bancária angolana sem taxa de levantamento.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-3 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Cotação de Venda ao Cliente</span>
          <span className="text-xl font-black text-amber-400">1 USDT = {sellRateKz.toLocaleString()} Kz</span>
          <span className="text-[10px] text-emerald-400 block font-bold mt-0.5">Taxa de retirada: 0 Kz</span>
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
        <KycRequiredBanner onNavigate={onNavigate} operationName="retiradas e levantamentos de fundos" />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Dados da Venda & Destino dos Kwanzas
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <Wallet className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Saldo Disponível:</span>
                <strong className="text-emerald-400 font-bold">{availableBalance.toFixed(2)} USDT</strong>
              </div>
            </div>

            <form onSubmit={handleCreateSale} className="space-y-4">
              {/* USDT Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Quantidade de USDT a Vender
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={availableBalance || 10000}
                    step="any"
                    required
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-lg font-bold text-white focus:outline-none focus:border-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setUsdtAmount(availableBalance)}
                    className="absolute right-3 top-2.5 text-xs px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg hover:bg-amber-500/30 transition font-bold"
                  >
                    MÁXIMO
                  </button>
                </div>
              </div>

              {/* Bank Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Banco Angolano de Destino
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-amber-500"
                >
                  {ANGOLAN_BANKS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Holder */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome Completo do Titular da Conta Bancária
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do titular como consta no banco"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* IBAN */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  IBAN Angolano (AO06...) ou Número de Conta
                </label>
                <input
                  type="text"
                  required
                  placeholder="AO06.0040.0000.1234.5678.9012.3"
                  value={ibanOrAccount}
                  onChange={(e) => setIbanOrAccount(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Phone or Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Telefone / WhatsApp para Confirmação do Comprovativo
                </label>
                <input
                  type="text"
                  placeholder="+244 923 000 000"
                  value={phoneOrReference}
                  onChange={(e) => setPhoneOrReference(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Breakdown Box */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>USDT a Entregar:</span>
                  <span className="font-bold text-white">{usdtAmount} USDT</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Câmbio de Venda:</span>
                  <span className="text-slate-200">1 USDT = {sellRateKz.toLocaleString()} Kz</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxa de Levantamento / Retirada:</span>
                  <span className="text-emerald-400 font-bold">0 Kz (Isento)</span>
                </div>
                <div className="pt-2 border-t border-slate-700 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-white">Valor Líquido a Receber em Kz:</span>
                  <span className="text-lg font-black text-amber-400">
                    {totalKzToReceive.toLocaleString()} Kz
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-300">
                <Lock className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <span>
                  O valor de <strong>{usdtAmount} USDT</strong> será cativo do seu saldo no momento do envio e liquidado após a transferência dos Kwanzas para o seu banco.
                </span>
              </div>

              <button
                type="submit"
                disabled={loading || !isKycApproved || usdtAmount <= 0 || usdtAmount > availableBalance}
                className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-lg transition flex items-center justify-center gap-2 ${
                  !isKycApproved
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                }`}
              >
                {loading
                  ? 'A processar ordem...'
                  : !isKycApproved
                  ? 'Preencha Perfil para Vender'
                  : 'Confirmar Venda e Receber Kwanzas'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Sales History & Rules */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Minhas Vendas de USDT</span>
            </h3>

            {mySales.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhuma ordem de venda realizada até ao momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
                {mySales.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-white">{sale.usdtAmount} USDT</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          sale.status === 'Concluída'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : sale.status === 'Rejeitada'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>Valor em Kz:</span>
                      <span className="text-amber-400 font-bold">
                        {sale.totalKzToReceive.toLocaleString()} Kz
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 truncate">
                      Destino: {sale.payoutMethod.bankName} ({sale.payoutMethod.ibanOrAccount})
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                      <span>ID: {sale.id}</span>
                      <span>{new Date(sale.createdAt).toLocaleDateString('pt-AO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Garantia de Liquidação em Kz</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O AngoPayX processa os pagamentos bancários em Angola através do sistema EMIS / Multicaixa interbancário. O comprovativo da transferência bancária emitida pelo operador fica registrado na sua ordem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
