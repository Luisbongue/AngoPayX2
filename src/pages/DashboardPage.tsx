import React, { useEffect, useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Upload,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  Lock,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { ExchangeSettings, LedgerEntry } from '../types/index.ts';
import { NativeAdCard } from '../components/NativeAdCard.tsx';
import { InstallAppModal } from '../components/InstallAppModal.tsx';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenAdvertiseModal?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenAuthModal,
  onOpenAdvertiseModal,
}) => {
  const { user, balance, refreshUser } = useAuth();
  const [rates, setRates] = useState<ExchangeSettings>({
    buyRateKz: 1350,
    sellRateKz: 1250,
    updatedAt: '',
    updatedBy: '',
  });
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  useEffect(() => {
    apiClient
      .getRatesAndMethods()
      .then((res) => {
        if (res.exchange) setRates(res.exchange);
      })
      .catch(() => {});

    if (user) {
      apiClient
        .getMyLedger()
        .then((res) => setRecentLedger(res.ledger.slice(0, 5)))
        .catch(() => {});
    }
  }, [user]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshUser();
    if (user) {
      const res = await apiClient.getMyLedger().catch(() => ({ ledger: [] }));
      setRecentLedger(res.ledger.slice(0, 5));
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const availableUsdt = balance ? balance.availableBalance : 0;
  const lockedUsdt = balance ? balance.lockedBalance : 0;
  const totalUsdt = balance ? balance.totalBalance : 0;
  const approxKz = Math.round(availableUsdt * rates.sellRateKz);

  return (
    <div className="space-y-6">
      {/* Welcome Banner / KYC Notice */}
      {user ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white">Olá, {user.name}</h1>
                {user.kycStatus === 'Aprovado' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> KYC Verificado
                  </span>
                ) : (
                  <span
                    onClick={() => onNavigate('kyc')}
                    className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 transition"
                  >
                    <AlertCircle className="w-3 h-3" /> KYC: {user.kycStatus}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Conta AngoPayX activa • Mercado de Câmbio de USDT em Kwanza (Kz)
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Atualizar Saldos</span>
          </button>
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white">Intermediação Segura de USDT e Kwanza em Angola</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Compre USDT pagando por Kwik / IBAN (PayPal) ou Referência Multicaixa e venda USDT recebendo Kwanza diretamente na sua conta bancária angolana.
            </p>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition shrink-0"
          >
            Criar Conta ou Entrar
          </button>
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Balance Card */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-44 h-44 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              Saldo da Conta AngoPayX
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Rede TRON (TRC20)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {availableUsdt.toFixed(2)}{' '}
              <span className="text-emerald-400 text-xl font-bold">USDT</span>
            </span>
            <span className="text-slate-400 text-sm sm:text-base font-medium">
              ≈ {approxKz.toLocaleString()} Kz
            </span>
          </div>

          {lockedUsdt > 0 && (
            <div className="mb-5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                <strong>{lockedUsdt.toFixed(2)} USDT</strong> cativos em operações de saque/venda pendentes. (Saldo total: {totalUsdt.toFixed(2)} USDT)
              </span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              onClick={() => onNavigate('buy')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Comprar / Carregar</span>
            </button>

            <button
              onClick={() => onNavigate('sell')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Vender USDT</span>
            </button>

            <button
              onClick={() => onNavigate('deposit')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Depositar</span>
            </button>

            <button
              onClick={() => onNavigate('withdraw')}
              className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Sacar USDT</span>
            </button>
          </div>
        </div>

        {/* Rates & Spread Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Câmbio em Vigor
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/40">
                Actualizado
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Cliente Compra</span>
                  <span className="text-xs text-slate-300">Paga em Kz</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-400">
                    {rates.buyRateKz.toLocaleString()} Kz
                  </span>
                  <span className="text-[10px] text-slate-400 block">por 1 USDT</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Cliente Vende</span>
                  <span className="text-xs text-slate-300">Recebe em Kz</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-extrabold text-amber-400">
                    {rates.sellRateKz.toLocaleString()} Kz
                  </span>
                  <span className="text-[10px] text-slate-400 block">por 1 USDT</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Taxa na venda de USDT:</span>
            <span className="font-bold text-emerald-400">0 Kz (Isento)</span>
          </div>
        </div>
      </div>

      {/* Trust & Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Pagamentos em Angola</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Depósitos via Kwik (IBAN PayPal) e Referência Multicaixa (10116) com validação transparente.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Ledger e Idempotência</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Cada movimento possui trilha de auditoria completa, sem créditos ou débitos duplicados.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Rede TRON TRC20</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Validação estrita de endereços oficiais e monitoramento de liquidez e energia.
            </p>
          </div>
        </div>
      </div>

      {/* PWA Mobile App Card Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Instale a Aplicação AngoPayX no seu Telemóvel</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PWA Oficial
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Acesso instantâneo em ecrã total, notificações de depósitos, sem barra do navegador e com suporte offline.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsInstallModalOpen(true)}
          className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Instalar no Dispositivo</span>
        </button>
      </div>

      {/* Install App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Native Sponsored Cards / Ad Monetization */}
      <NativeAdCard onOpenAdvertiseModal={onOpenAdvertiseModal} />

      {/* Recent Ledger Activity */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Últimas Movimentações no Ledger</h3>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-emerald-400 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Ver Histórico Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentLedger.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            Ainda não existem movimentos registrados nesta conta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Tipo de Operação</th>
                  <th className="pb-3">Data</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Saldo Resultante</th>
                  <th className="pb-3 pr-2 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentLedger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 pl-2">
                      <span className="font-bold text-slate-200 block">{entry.type}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-xs block">
                        {entry.reference}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400">
                      {new Date(entry.timestamp).toLocaleString('pt-AO', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 font-bold">
                      <span
                        className={entry.direction === 'IN' ? 'text-emerald-400' : 'text-amber-400'}
                      >
                        {entry.direction === 'IN' ? '+' : '-'} {entry.amount.toFixed(2)} USDT
                      </span>
                    </td>
                    <td className="py-3 text-slate-300 font-medium">
                      {entry.balanceAfter.toFixed(2)} USDT
                    </td>
                    <td className="py-3 pr-2 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
