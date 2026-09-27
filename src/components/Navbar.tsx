import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  ShieldCheck,
  Bell,
  User as UserIcon,
  Menu,
  X,
  PlusCircle,
  MinusCircle,
  Download,
  Upload,
  Wallet,
  Clock,
  HelpCircle,
  FileText,
  Lock,
  ChevronDown,
  LogOut,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { ExchangeSettings } from '../types/index.ts';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuthModal }) => {
  const { user, balance, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rates, setRates] = useState<ExchangeSettings>({
    buyRateKz: 1350,
    sellRateKz: 1250,
    updatedAt: '',
    updatedBy: '',
  });

  useEffect(() => {
    apiClient
      .getRatesAndMethods()
      .then((res) => {
        if (res.exchange) setRates(res.exchange);
      })
      .catch(() => {});

    if (user) {
      apiClient
        .getMyNotifications()
        .then((res) => {
          const unread = res.notifications.filter((n) => !n.isRead).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    }
  }, [user, currentTab]);

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: ArrowLeftRight },
    { id: 'buy', label: 'Comprar / Carregar', icon: PlusCircle, highlight: true },
    { id: 'sell', label: 'Vender USDT', icon: MinusCircle },
    { id: 'deposit', label: 'Depositar USDT', icon: Download },
    { id: 'withdraw', label: 'Sacar USDT', icon: Upload },
    { id: 'wallets', label: 'Carteiras', icon: Wallet },
    { id: 'history', label: 'Histórico', icon: Clock },
    { id: 'kyc', label: 'KYC', icon: ShieldCheck },
    { id: 'support', label: 'Suporte', icon: HelpCircle },
  ];

  const secondaryItems = [
    { id: 'about', label: 'Sobre', icon: FileText },
    { id: 'terms', label: 'Termos', icon: FileText },
    { id: 'privacy', label: 'Privacidade', icon: Lock },
  ];

  const isAdminUser = user && user.role !== 'client';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800">
      {/* Top Demo & Role Switcher Bar */}
      <div className="bg-slate-950/80 border-b border-slate-800/60 px-4 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Cotação Oficial:</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
              Compra: <strong className="text-emerald-400">{rates.buyRateKz.toLocaleString()} Kz</strong>
            </span>
            <span className="bg-slate-900 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
              Venda: <strong className="text-amber-400">{rates.sellRateKz.toLocaleString()} Kz</strong>
            </span>
            <span className="text-slate-400 hidden sm:inline">(Taxa de retirada na venda: 0 Kz)</span>
          </div>
        </div>

        {/* Right Info: Live Official Operations Bar */}
        <div className="flex items-center gap-3 ml-auto text-[11px] text-slate-400">
          <span className="hidden md:inline-flex items-center gap-1 text-emerald-400 font-semibold">
            <span>⚡</span> Multicaixa Express Instantâneo
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden sm:inline">Taxa Compra: <strong className="text-amber-300">20 Kz</strong></span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">Venda / Retirada: 0 Kz (Taxa Zero)</span>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-emerald-500/20 ring-1 ring-white/20">
              A
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-white">ANGOPAY</span>
                <span className="font-extrabold text-xl tracking-tight text-emerald-400">X</span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 rounded font-semibold ml-1">
                  Angola
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-1">USDT TRC20 • Kwanza (Kz)</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : item.highlight
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* PWA Install Button */}
            <PWAInstallButton />

            {user ? (
              <>
                {/* Admin Panel Button if privileged */}
                {isAdminUser && (
                  <button
                    onClick={() => setCurrentTab('admin')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                      currentTab === 'admin'
                        ? 'bg-purple-600 text-white ring-2 ring-purple-400/50'
                        : 'bg-purple-950/80 text-purple-300 border border-purple-700/60 hover:bg-purple-900/60'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-purple-400" />
                    <span>Painel Admin</span>
                  </button>
                )}

                {/* User Balance Badge */}
                <div
                  onClick={() => setCurrentTab('dashboard')}
                  className="hidden sm:flex flex-col text-right px-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg cursor-pointer hover:border-slate-600 transition"
                >
                  <span className="text-[10px] text-slate-400 font-medium">Saldo Disponível</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {balance ? balance.availableBalance.toFixed(2) : '0.00'} USDT
                  </span>
                </div>

                {/* Notifications Bell */}
                <button
                  onClick={() => setCurrentTab('notifications')}
                  className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
                  title="Notificações"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900 animate-pulse"></span>
                  )}
                </button>

                {/* Profile Button */}
                <button
                  onClick={() => setCurrentTab('profile')}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    currentTab === 'profile'
                      ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                      : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="max-w-[90px] truncate hidden md:inline">{user.name.split(' ')[0]}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                  title="Terminar Sessão"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition"
              >
                Entrar / Criar Conta
              </button>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-1">
          {/* Mobile Install Button */}
          <div className="mb-3">
            <PWAInstallButton variant="full" />
          </div>

          {user && (
            <div className="p-3 bg-slate-800/80 rounded-xl mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{user.name}</p>
                <p className="text-[11px] text-slate-400">{user.email}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Saldo USDT</span>
                <p className="text-sm font-bold text-emerald-400">
                  {balance ? balance.availableBalance.toFixed(2) : '0.00'} USDT
                </p>
              </div>
            </div>
          )}

          {isAdminUser && (
            <button
              onClick={() => {
                setCurrentTab('admin');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50 mb-2"
            >
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Painel Administrativo Completo</span>
            </button>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 text-emerald-400" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 border-t border-slate-800 mt-2">
            <div className="grid grid-cols-3 gap-1">
              {secondaryItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`text-center py-1.5 px-2 rounded text-xs text-slate-400 hover:text-white ${
                    currentTab === item.id ? 'text-emerald-400 font-bold' : ''
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
