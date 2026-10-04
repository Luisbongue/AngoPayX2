import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api.ts';
import { Advertisement } from '../types/index.ts';

export const TopAdBanner: React.FC = () => {
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
    return null;
  }

  const currentAd = ads[currentIndex];

  const handleAdClick = () => {
    apiClient.clickAd(currentAd.id).catch(() => {});
  };

  return (
    <div className="relative bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-emerald-900/40 text-xs px-3 sm:px-4 py-2 transition-all w-full max-w-full overflow-hidden box-border">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 w-full box-border">
        {/* Ad Content */}
        <a
          href={currentAd.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleAdClick}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group flex-1 min-w-0"
          title={`Visitar: ${currentAd.title}`}
        >
          {/* Imagem do Produto definida pelo Admin */}
          {currentAd.bannerUrl && (
            <img
              src={currentAd.bannerUrl}
              alt={currentAd.title}
              className="w-10 h-7 sm:w-12 sm:h-8 object-cover rounded-lg border border-slate-700/80 shrink-0 shadow group-hover:border-emerald-500/50 transition bg-slate-900"
              onError={(e) => {
                (e.currentTarget as any).style.display = 'none';
              }}
            />
          )}

          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shrink-0">
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            <span>Destaque</span>
          </span>

          <p className="text-white font-bold truncate text-xs group-hover:text-emerald-300 transition min-w-0">
            {currentAd.title}
          </p>

          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 group-hover:underline shrink-0 ml-1">
            <span>Ver Produto</span>
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        {/* Action Controls: Close */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
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
