import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api.ts';
import { Advertisement } from '../types/index.ts';

interface NativeAdCardProps {
  placement?: 'dashboard_native' | 'sidebar' | 'all';
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({
  placement = 'dashboard_native',
}) => {
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

  useEffect(() => {
    apiClient
      .getActiveAds(placement)
      .then((res) => {
        if (res.ads && res.ads.length > 0) {
          setSelectedAd(res.ads[0]);
        } else {
          apiClient.getActiveAds().then((fallback) => {
            if (fallback.ads && fallback.ads.length > 0) {
              setSelectedAd(fallback.ads[0]);
            } else {
              setSelectedAd(null);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [placement]);

  if (!selectedAd) {
    return null;
  }

  const handleClick = () => {
    apiClient.clickAd(selectedAd.id).catch(() => {});
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition shadow-lg group">
      <div className="flex flex-col md:flex-row items-stretch">
        {/* Banner image preview if exists */}
        {selectedAd.bannerUrl && (
          <a
            href={selectedAd.destinationUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="md:w-56 h-40 md:h-auto relative cursor-pointer overflow-hidden shrink-0 block bg-slate-950"
            title={`Abrir: ${selectedAd.title}`}
          >
            <img
              src={selectedAd.bannerUrl}
              alt={selectedAd.title}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as any).src = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80';
              }}
            />
          </a>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Produto em Destaque</span>
              </span>
            </div>

            <a
              href={selectedAd.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="block text-base sm:text-lg font-extrabold text-white group-hover:text-emerald-300 transition cursor-pointer"
            >
              {selectedAd.title}
            </a>

            {selectedAd.destinationUrl && (
              <p className="text-xs text-slate-400 font-mono truncate max-w-lg">
                {selectedAd.destinationUrl}
              </p>
            )}
          </div>

          <div className="pt-3.5 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Anúncio & Produto divulgado no AngoPayX
            </span>

            <a
              href={selectedAd.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow shadow-emerald-900/40"
            >
              <span>Ver Produto / Página</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
