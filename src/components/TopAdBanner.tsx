import React, { useEffect, useState } from 'react';
import { Megaphone, ExternalLink, X, ChevronRight, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api.ts';
import { Advertisement } from '../types/index.ts';

interface TopAdBannerProps {
  onOpenAdvertiseModal: () => void;
}

export const TopAdBanner: React.FC<TopAdBannerProps> = ({ onOpenAdvertiseModal }) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    apiClient
      .getActiveAds('top_banner')
      .then((res) => {
        if (res.ads && res.ads.length > 0) {
          setAds(res.ads);
        } else {
          // If no top_banner specifically, try any active ad
          apiClient.getActiveAds().then((fallback) => {
            if (fallback.ads && fallback.ads.length > 0) {
              setAds(fallback.ads);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Rotate ads every 8 seconds if multiple exist
  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [ads.length]);

  if (isDismissed || ads.length === 0) {
    // If dismissed or no ad, show a subtle prompt to companies wanting to advertise
    return null;
  }

  const currentAd = ads[currentIndex];

  const handleAdClick = () => {
    // Record click asynchronously
    apiClient.clickAd(currentAd.id).catch(() => {});
  };

  return (
    <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-emerald-900/40 text-xs px-3 sm:px-4 py-2 transition-all w-full max-w-full overflow-hidden box-border">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3 w-full box-border">
        {/* Ad Content */}
        <a
          href={currentAd.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group flex-1 min-w-0"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-none">{currentAd.badgeText || 'Patrocinado'}</span>
            </span>
            <span className="font-extrabold text-white group-hover:text-emerald-300 transition flex items-center gap-1 shrink-0">
              {currentAd.companyName}:
            </span>
          </div>

          <p className="text-slate-300 truncate text-xs group-hover:text-white transition min-w-0">
            {currentAd.title} <span className="text-slate-400 hidden md:inline">— {currentAd.description}</span>
          </p>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:underline shrink-0 ml-1">
            <span>{currentAd.callToAction || 'Aceder'}</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        {/* Action Controls: Anuncie Conosco + Close */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          <button
            onClick={onOpenAdvertiseModal}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-[10px] sm:text-[11px] font-semibold transition shrink-0"
            title="Coloque o anúncio da sua empresa aqui"
          >
            <Megaphone className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">Anuncie a sua Empresa</span>
            <span className="sm:hidden">Anunciar</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-500 hover:text-slate-300 rounded transition shrink-0"
            title="Fechar banner"
            aria-label="Fechar banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
