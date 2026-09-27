import React from 'react';
import { User, Mail, Phone, Calendar, ShieldCheck, Wallet, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface ProfilePageProps {
  onNavigate: (tab: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigate }) => {
  const { user, balance, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-2xl">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-slate-400">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Conta {user.accountStatus}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Função: {user.role}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 text-slate-300 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Account Info */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Dados da Conta
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Nome
              </span>
              <span className="font-semibold text-white">{user.name}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" /> Email
              </span>
              <span className="font-semibold text-white">{user.email}</span>
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

        {/* Financial & Compliance Summary */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Segurança & Conformidade
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Estado KYC
              </span>
              <button
                onClick={() => onNavigate('kyc')}
                className="font-bold text-emerald-400 hover:underline"
              >
                {user.kycStatus}
              </button>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <Wallet className="w-3.5 h-3.5" /> Saldo Disponível
              </span>
              <span className="font-bold text-emerald-400">
                {balance ? balance.availableBalance.toFixed(2) : '0.00'} USDT
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Saldo Cativo / Bloqueado:</span>
              <span className="font-bold text-amber-400">
                {balance ? balance.lockedBalance.toFixed(2) : '0.00'} USDT
              </span>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-500 block mb-1">Endereço TRC20 Permanente:</span>
              <span className="font-mono text-[11px] text-slate-300 break-all select-all block p-2 bg-slate-800 rounded-lg">
                {user.depositAddressTRC20}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
