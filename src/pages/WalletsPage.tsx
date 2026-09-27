import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Trash2, AlertCircle, CheckCircle2, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { ClientWallet, WalletType } from '../types/index.ts';
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

export const WalletsPage: React.FC = () => {
  const { user } = useAuth();
  const [wallets, setWallets] = useState<ClientWallet[]>([]);
  const [type, setType] = useState<WalletType>('BINANCE');
  const [nickname, setNickname] = useState('');
  const [addressOrUid, setAddressOrUid] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadWallets();
  }, [user]);

  const loadWallets = async () => {
    try {
      const res = await apiClient.getMyWallets();
      setWallets(res.wallets);
    } catch (err) {
      console.error('Error loading wallets:', err);
    }
  };

  const handleAddWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate per platform
    if (type === 'TRON') {
      const v = validateTronAddress(addressOrUid);
      if (!v.isValid) {
        setError(v.error || 'Endereço TRON inválido.');
        return;
      }
    } else if (type === 'BINANCE') {
      const v = validateBinanceIdentifier(addressOrUid);
      if (!v.isValid) {
        setError(v.error || 'Identificador ou e-mail Binance inválido.');
        return;
      }
    } else if (type === 'BYBIT') {
      const v = validateBybitIdentifier(addressOrUid);
      if (!v.isValid) {
        setError(v.error || 'UID ou e-mail Bybit inválido.');
        return;
      }
    } else if (type === 'REDOTPAY') {
      const v = validateRedotPayIdentifier(addressOrUid);
      if (!v.isValid) {
        setError(v.error || 'ID ou e-mail RedotPay inválido.');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await apiClient.addWallet({
        type,
        nickname: nickname.trim(),
        addressOrUid: addressOrUid.trim(),
      });
      setSuccess(`Carteira ${type} "${res.wallet.nickname}" guardada com sucesso!`);
      setNickname('');
      setAddressOrUid('');
      await loadWallets();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar carteira.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja remover esta carteira salva?')) return;
    try {
      await apiClient.deleteWallet(id);
      await loadWallets();
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir carteira.');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const meta = getWalletMeta(type);

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Wallet className="w-4 h-4" />
            <span>Gestão de Endereços de Saque</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Minhas Carteiras Salvas</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Registe as suas carteiras e contas da Binance, Bybit, RedotPay e rede TRON (TRC20) com Email ou ID/UID para pagamentos rápidos pelo operador financeiro.
          </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>Adicionar Nova Carteira</span>
            </h2>

            <form onSubmit={handleAddWallet} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Selecione a Plataforma / Carteira
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('BINANCE')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                      type === 'BINANCE'
                        ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/50 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <BinanceLogo className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-white">Binance</span>
                      <span className="block text-[10px] text-slate-400">Email ou UID</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('BYBIT')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                      type === 'BYBIT'
                        ? 'bg-yellow-950/40 border-yellow-500 ring-1 ring-yellow-500/50 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <BybitLogo className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-white">Bybit</span>
                      <span className="block text-[10px] text-slate-400">UID ou Email</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('REDOTPAY')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                      type === 'REDOTPAY'
                        ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500/50 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <RedotPayLogo className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-white">RedotPay</span>
                      <span className="block text-[10px] text-slate-400">ID ou Email</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('TRON')}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                      type === 'TRON'
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500/50 text-white'
                        : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <TronLogo className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="block font-bold text-xs text-white">TRON (TRC20)</span>
                      <span className="block text-[10px] text-slate-400">Endereço T...</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Apelido da Carteira
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Ex: Minha conta ${meta.name} principal`}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {meta.identifierLabel}
                </label>
                <input
                  type="text"
                  required
                  placeholder={meta.placeholder}
                  value={addressOrUid}
                  onChange={(e) => setAddressOrUid(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  💡 {meta.instructions}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                {loading ? 'A guardar...' : `Guardar Carteira ${meta.name}`}
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-4">
              Carteiras Cadastradas ({wallets.length})
            </h3>

            {wallets.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhuma carteira salva ainda. Adicione uma carteira Binance, Bybit, RedotPay ou TRON para facilitar as suas ordens.
              </p>
            ) : (
              <div className="space-y-3">
                {wallets.map((w) => {
                  const itemMeta = getWalletMeta(w.type);
                  const Logo = itemMeta.Logo;
                  return (
                    <div
                      key={w.id}
                      className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between gap-3 hover:border-slate-600 transition"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 shrink-0">
                          <Logo className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{w.nickname}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${itemMeta.badgeBg}`}>
                              {itemMeta.fullName}
                            </span>
                          </div>
                          <p className="font-mono text-xs text-slate-300 truncate select-all">{w.addressOrUid}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(w.addressOrUid, w.id)}
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition"
                          title="Copiar endereço / ID"
                        >
                          {copiedId === w.id ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWallet(w.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
