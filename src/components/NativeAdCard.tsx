import React, { useEffect, useState } from 'react';
import { ExternalLink, Sparkles, Megaphone, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api.ts';
import { Advertisement } from '../types/index.ts';

interface NativeAdCardProps {
  placement?: 'dashboard_native' | 'sidebar' | 'all';
  onOpenAdvertiseModal?: () => void;
}

export const NativeAdCard: React.FC<NativeAdCardProps> = ({
  placement = 'dashboard_native',
  onOpenAdvertiseModal,
}) => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null);

  useEffect(() => {
    apiClient
      .getActiveAds(placement)
      .then((res) => {
        if (res.ads && res.ads.length > 0) {
          setAds(res.ads);
          // Pick the first ad or rotate
          setSelectedAd(res.ads[0]);
        }
      })
      .catch(() => {});
  }, [placement]);

  if (!selectedAd) {
    // If no ad active for this placement, show an invitation card to advertise
    return (
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm">Espaço Patrocinado para Empresas em Angola</h4>
            <p className="text-slate-400 text-xs">
              Promova o seu banco, gateway, comércio ou serviço para a comunidade de Kz e USDT.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenAdvertiseModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs transition shadow shrink-0 flex items-center gap-1.5"
        >
          <span>Anuncie Conosco</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
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
            className="md:w-52 h-36 md:h-auto relative cursor-pointer overflow-hidden shrink-0 block"
          >
            <img
              src={selectedAd.bannerUrl}
              alt={selectedAd.companyName}
              className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 md:bg-gradient-to-r md:from-transparent md:to-slate-900"></div>
          </a>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {selectedAd.badgeText || 'Patrocinado'}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {selectedAd.companyName}
                </span>
                {selectedAd.category && (
                  <span className="text-[10px] text-slate-500 hidden sm:inline">• {selectedAd.category}</span>
                )}
              </div>

              <button
                onClick={onOpenAdvertiseModal}
                className="text-[11px] text-slate-400 hover:text-emerald-400 transition underline underline-offset-2 flex items-center gap-1"
                title="Quer anunciar a sua empresa?"
              >
                <Megaphone className="w-3 h-3" />
                <span className="hidden sm:inline">Anuncie aqui</span>
              </button>
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

            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
              {selectedAd.description}
            </p>
          </div>

          <div className="pt-3.5 mt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              Parceiro comercial verificado no ecossistema AngoPayX
            </span>

            <a
              href={selectedAd.destinationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow shadow-emerald-900/40"
            >
              <span>{selectedAd.callToAction || 'Visitar Site'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
