import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  LogOut,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Save,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { useAuth, savePersistedProfileForEmail } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, balance, kyc, logout, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('Angolana');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setPhone(user.phone || '');
      setDocumentNumber(user.documentNumber || user.idNumber || kyc?.documentNumber || '');
      setDateOfBirth(user.dateOfBirth || kyc?.dateOfBirth || '');
      setNationality(user.nationality || kyc?.nationality || 'Angolana');
    }
  }, [user, kyc]);

  if (!user) return null;

  const kycStatus = user.kycStatus || 'Não iniciado';
  const isApproved = kycStatus === 'Aprovado';
  const isPending = kycStatus === 'Pendente' || kycStatus === 'Em análise';

  const handleSubmitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Por favor informe o seu Nome Completo conforme o Bilhete de Identidade.');
      return;
    }
    if (!documentNumber.trim()) {
      setError('Por favor preencha o Número do Bilhete de Identidade (BI).');
      return;
    }
    if (!dateOfBirth.trim()) {
      setError('Por favor selecione a sua Data de Nascimento.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.updateProfileIdentity({
        fullName: fullName.trim(),
        documentNumber: documentNumber.trim(),
        dateOfBirth: dateOfBirth.trim(),
        phone: phone.trim(),
        nationality: nationality.trim() || 'Angolana',
      });

      if (isSupabaseConfigured) {
        try {
          await supabase.auth.updateUser({
            data: {
              name: fullName.trim(),
              documentNumber: documentNumber.trim(),
              idNumber: documentNumber.trim(),
              dateOfBirth: dateOfBirth.trim(),
              phone: phone.trim(),
              nationality: nationality.trim() || 'Angolana',
            },
          });
        } catch (supaErr) {
          console.warn('Supabase updateUser metadata:', supaErr);
        }
      }

      // Guardar na persistência local permanente para nunca perder ao atualizar ou terminar sessão
      if (user.email) {
        savePersistedProfileForEmail(user.email, {
          name: fullName.trim(),
          documentNumber: documentNumber.trim(),
          idNumber: documentNumber.trim(),
          dateOfBirth: dateOfBirth.trim(),
          phone: phone.trim(),
          nationality: nationality.trim() || 'Angolana',
        });
      }

      setSuccess('Dados do perfil guardados com sucesso! Ficam salvos na sua conta e não precisa preencher novamente.');
      await refreshUser();
    } catch (err: any) {
      console.error('[Profile Submit Error]:', err);
      setError(err.message || 'Erro ao guardar dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  const isProfileFilled = Boolean(user.documentNumber || user.idNumber);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Conta {user.accountStatus}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isApproved
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : isPending
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Identidade: {kycStatus}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-center"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Status Banner */}
      {isProfileFilled ? (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-300 text-xs">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">Dados do Perfil Guardados com Sucesso</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                O seu Número do BI (<strong className="text-emerald-400 font-mono">{user.documentNumber || user.idNumber}</strong>) e Data de Nascimento (<strong className="text-white">{user.dateOfBirth}</strong>) estão salvos na sua conta e não serão perdidos ao atualizar a página ou terminar sessão.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('buy')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
              <span>Recargas / Compras</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('deposit')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
            >
              Depositar
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3 text-slate-300 text-xs">
          <FileText className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white">Preencha os Dados do seu Perfil</p>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Informe o seu Nome, Data de Nascimento e Número do Bilhete de Identidade (BI). Basta preencher uma única vez e os dados ficam guardados definitivamente na sua conta. Depósitos e recargas funcionam normalmente sem nenhuma obrigação de envio de fotos.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {/* Main Grid: Identity Form + Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Dados de Identidade do Cliente</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha os dados oficiais do seu Bilhete de Identidade para validação pelo Administrador.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitIdentity} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nome completo conforme consta no BI"
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Número do Bilhete de Identidade (BI) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value.toUpperCase())}
                    placeholder="Ex: 005432123LA045"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Formato angolano com 9 dígitos e letras.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Data de Nascimento <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Necessário para conferência com o BI.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+244 923 000 000"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    placeholder="Angolana"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>A guardar dados do perfil...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {isProfileFilled ? 'Atualizar Dados do Perfil' : 'Guardar Dados do Perfil'}
                      </span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  ✓ Fica salvo permanentemente na sua conta. Não precisa preencher novamente ao atualizar a página ou terminar sessão.
                </p>
              </div>
            </form>
          </div>
        </div>

        {/* Info Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Account Details */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Resumo da Conta
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2">
                  <UserIcon className="w-3.5 h-3.5" /> Nome
                </span>
                <span className="font-semibold text-white truncate max-w-[180px]">{user.name}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5" /> Email
                </span>
                <span className="font-semibold text-white truncate max-w-[180px]">{user.email}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" /> Telefone
                </span>
                <span className="font-semibold text-white">{user.phone || 'Não informado'}</span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> Membro desde
                </span>
                <span className="font-semibold text-white">
                  {new Date(user.createdAt).toLocaleDateString('pt-AO')}
                </span>
              </div>
            </div>
          </div>

          {/* Financial & Balances */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Saldos & Carteira USDT</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Saldo Disponível:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {balance ? balance.availableBalance.toFixed(2) : '0.00'} USDT
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Saldo Bloqueado / Ordens:</span>
                <span className="font-bold text-amber-400">
                  {balance ? balance.lockedBalance.toFixed(2) : '0.00'} USDT
                </span>
              </div>

              <div className="pt-2">
                <span className="text-[10px] text-slate-500 block mb-1">
                  Endereço de Depósito TRC20:
                </span>
                <span className="font-mono text-[11px] text-slate-300 break-all select-all block p-2 bg-slate-800 rounded-lg">
                  {user.depositAddressTRC20}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
