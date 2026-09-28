import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { BuyPage } from './pages/BuyPage.tsx';
import { SellPage } from './pages/SellPage.tsx';
import { DepositPage } from './pages/DepositPage.tsx';
import { WithdrawPage } from './pages/WithdrawPage.tsx';
import { WalletsPage } from './pages/WalletsPage.tsx';
import { HistoryPage } from './pages/HistoryPage.tsx';
import { KycPage } from './pages/KycPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { NotificationsPage } from './pages/NotificationsPage.tsx';
import { SupportPage } from './pages/SupportPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { TermsPage } from './pages/TermsPage.tsx';
import { PrivacyPage } from './pages/PrivacyPage.tsx';
import { AdminPanel } from './pages/AdminPanel.tsx';
import { ShieldCheck, Heart, ArrowUpRight, Megaphone, Smartphone } from 'lucide-react';
import { TopAdBanner } from './components/TopAdBanner.tsx';
import { AdvertiseModal } from './components/AdvertiseModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { InstallAppModal } from './components/InstallAppModal.tsx';

function AppContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAdvertiseModalOpen, setIsAdvertiseModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenAdvertiseModal={() => setIsAdvertiseModalOpen(true)}
          />
        );
      case 'buy':
        return <BuyPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'sell':
        return <SellPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'deposit':
        return <DepositPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'withdraw':
        return <WithdrawPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'wallets':
        return <WalletsPage />;
      case 'history':
        return <HistoryPage />;
      case 'kyc':
        return <KycPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'profile':
        return <ProfilePage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'notifications':
        return <NotificationsPage />;
      case 'support':
        return <SupportPage />;
      case 'about':
        return <AboutPage />;
      case 'terms':
        return <TermsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'admin':
        return <AdminPanel />;
      default:
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenAdvertiseModal={() => setIsAdvertiseModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Top Banner Advertisement (Rotativo) */}
      <TopAdBanner onOpenAdvertiseModal={() => setIsAdvertiseModalOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>

      {/* Professional Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 text-slate-400 text-xs py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-extrabold text-sm">
                A
              </div>
              <span className="font-extrabold text-white text-base">ANGOPAYX</span>
              <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800/60 ml-2">
                Mercado Angola
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
              <button
                onClick={() => setIsInstallModalOpen(true)}
                className="text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1.5 transition bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800/40"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Instalar Aplicativo</span>
              </button>
              <button
                onClick={() => setIsAdvertiseModalOpen(true)}
                className="text-emerald-400 font-bold hover:text-emerald-300 flex items-center gap-1 transition"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>Anuncie a sua Empresa</span>
              </button>
              <button onClick={() => setCurrentTab('about')} className="hover:text-emerald-400 transition">
                Sobre Nós
              </button>
              <button onClick={() => setCurrentTab('terms')} className="hover:text-emerald-400 transition">
                Termos de Utilização
              </button>
              <button onClick={() => setCurrentTab('privacy')} className="hover:text-emerald-400 transition">
                Privacidade & AML
              </button>
              <button onClick={() => setCurrentTab('support')} className="hover:text-emerald-400 transition">
                Suporte & Tickets
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
            <p>© {new Date().getFullYear()} AngoPayX. Todos os direitos reservados. Intermediação de USDT TRC20 e Kwanza (Kz).</p>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Conformidade com Procedimentos Rigorosos de KYC/AML</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Advertise With Us Modal */}
      <AdvertiseModal
        isOpen={isAdvertiseModalOpen}
        onClose={() => setIsAdvertiseModalOpen(false)}
      />

      {/* Install App Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
