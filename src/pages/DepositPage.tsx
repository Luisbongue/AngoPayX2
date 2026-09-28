import React, { useState, useEffect } from 'react';
import {
  Download,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ExternalLink,
  Search,
  CheckCircle2,
  RefreshCw,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { DepositOrder } from '../types/index.ts';
import { QrCodeView } from '../components/QrCodeView.tsx';
import { TRON_USDT_CONTRACT } from '../server/tronUtils.ts';
import { KycRequiredBanner } from '../components/KycRequiredBanner.tsx';

interface DepositPageProps {
  onNavigate?: (tab: string) => void;
}

export const DepositPage: React.FC<DepositPageProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [depositData, setDepositData] = useState<{
    asset: string;
    network: string;
    tokenContract: string;
    depositAddress: string;
    minDeposit: number;
    warning: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [myDeposits, setMyDeposits] = useState<DepositOrder[]>([]);

  // TXID submission / verification state
  const [txidInput, setTxidInput] = useState('');
  const [amountInput, setAmountInput] = useState('50');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAddress();
    if (user) loadDeposits();
  }, [user]);

  const loadAddress = async () => {
    try {
      const data = await apiClient.getDepositAddress();
      setDepositData(data);
    } catch (err) {
      console.error('Error loading deposit address:', err);
    }
  };

  const loadDeposits = async () => {
    try {
      const res = await apiClient.getMyDeposits();
      setMyDeposits(res.deposits);
    } catch (err) {
      console.error('Error loading deposits:', err);
    }
  };

  const copyAddress = () => {
    if (!depositData?.depositAddress) return;
    navigator.clipboard.writeText(depositData.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSoleAdmin = user?.email?.toLowerCase() === 'luisbongue4@gmail.com';
  const isKycApproved = Boolean(isSoleAdmin || user?.kycStatus === 'Aprovado');

  const handleSimulateBlockchainDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    setVerifySuccess(null);

    if (!isKycApproved) {
      setVerifyError('Verificação de identidade necessária. Para realizar depósitos e retiradas, a sua conta precisa ter o KYC aprovado.');
      return;
    }

    setVerifying(true);

    try {
      const res = await apiClient.submitDepositTx({
        txid: txidInput.trim(),
        amount: Number(amountInput),
      });

      setVerifySuccess(
        `Transação TRON validada com sucesso! ${res.deposit.amount} USDT creditados ao seu saldo com TXID: ${res.deposit.txid.slice(0, 16)}...`
      );
      setTxidInput('');
      await refreshUser();
      await loadDeposits();
    } catch (err: any) {
      setVerifyError(err.message || 'Falha ao validar transação.');
    } finally {
      setVerifying(false);
    }
  };

  const generateRandomSampleTxid = () => {
    const chars = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < 64; i++) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    setTxidInput(str);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Download className="w-4 h-4" />
            <span>Depósito em Criptomoeda</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Depositar USDT (TRC20)</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Transfira USDT pela rede TRON para o seu endereço dedicado. O crédito é automático e auditado no livro-razão financeiro do AngoPayX.
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Contrato Oficial USDT</span>
          <span className="font-mono text-xs font-bold text-emerald-400">
            {TRON_USDT_CONTRACT.slice(0, 8)}...{TRON_USDT_CONTRACT.slice(-8)}
          </span>
        </div>
      </div>

      {/* Kwanza (Kz) Deposit Info Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="font-bold text-white text-xs">Deseja depositar em Kwanzas (Kz)?</p>
            <p className="text-slate-400 text-[11px] mt-0.5">
              Efetue o depósito através do <strong className="text-emerald-400">Kwik (IBAN PayPal: 0420 0000 0000 1098 3557 1)</strong> ou por <strong className="text-amber-400">Referência Multicaixa (Entidade: 10116 | ID: 935 531 547)</strong> na secção <strong className="text-white">Comprar USDT</strong> para crédito no seu saldo.
            </p>
          </div>
        </div>
      </div>

      {/* KYC Required Banner when KYC not approved */}
      {user && !isKycApproved && (
        <KycRequiredBanner onNavigate={onNavigate} operationName="depósitos e transferências de fundos" />
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Address & QR Code */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* QR Code */}
              <div className="shrink-0">
                <QrCodeView value={depositData?.depositAddress || 'TRON_ADDRESS_PENDING'} size={170} />
              </div>

              {/* Address details */}
              <div className="space-y-3 w-full">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Rede Suportada
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    TRON (TRC20)
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    O Seu Endereço de Depósito AngoPayX
                  </span>
                  <div className="p-3 bg-slate-800/90 border border-slate-700 rounded-xl flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-white break-all select-all">
                      {depositData?.depositAddress || 'Carregando endereço...'}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white transition shrink-0"
                      title="Copiar Endereço"
                    >
                      {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Depósito Mínimo:</span>
                  <strong className="text-white">{depositData?.minDeposit || 5} USDT</strong>
                </div>
              </div>
            </div>

            {/* Official Warning */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Aviso Crítico de Segurança Blockchain:</p>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Envie somente <strong>USDT pela rede TRON (TRC20)</strong>. O envio de outro token ou através de redes como ERC20, BEP20 ou Solana para este endereço resultará na perda irreversível dos seus ativos.
                </p>
              </div>
            </div>

            {/* Live Deposit Detection / Verification Tool */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Detetor / Verificador de Depósito TRC20</span>
                </h3>
                <button
                  type="button"
                  onClick={generateRandomSampleTxid}
                  className="text-[10px] text-emerald-400 hover:underline font-semibold"
                >
                  Gerar TXID de Teste
                </button>
              </div>

              <p className="text-[11px] text-slate-400">
                O monitor da blockchain indexa transferências automaticamente. Pode também inserir manualmente o hash da transação (TXID) para processamento imediato pelo motor de auditoria.
              </p>

              {verifyError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{verifyError}</span>
                </div>
              )}

              {verifySuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{verifySuccess}</span>
                </div>
              )}

              <form onSubmit={handleSimulateBlockchainDeposit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] text-slate-400 mb-1">Hash da Transação (TXID)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 4a8f6c91e2b4d7f5a8c9e1f3b5d7a9c2..."
                      value={txidInput}
                      onChange={(e) => setTxidInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Valor (USDT)</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifying || !isKycApproved || !txidInput}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 ${
                    !isKycApproved
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                  <span>
                    {verifying
                      ? 'A validar na rede TRON...'
                      : !isKycApproved
                      ? 'KYC Obrigatório para Validar Depósitos'
                      : 'Validar Transação e Creditar Saldo'}
                  </span>
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Side: Deposit History & Technical Specs */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Histórico de Depósitos TRC20</span>
            </h3>

            {myDeposits.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhum depósito recebido nesta conta até ao momento.
              </p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {myDeposits.map((dep) => (
                  <div
                    key={dep.id}
                    className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-emerald-400">
                        +{dep.amount.toFixed(2)} USDT
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                        {dep.status} ({dep.confirmations} confs)
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 truncate bg-slate-900/80 p-1.5 rounded border border-slate-800">
                      TXID: {dep.txid}
                    </div>

                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>Rede: {dep.network}</span>
                      <span>{new Date(dep.detectedAt).toLocaleString('pt-AO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Garantia de Idempotência</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              O motor blockchain do AngoPayX verifica a singularidade criptográfica de cada TXID. É matematicamente impossível creditar duas vezes a mesma transferência.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
