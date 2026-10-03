import React, { useState } from 'react';
import { MessageCircle, X, ExternalLink, Phone, ShieldCheck, Headphones } from 'lucide-react';

export const WHATSAPP_NUMBER = '+244 953 330 585';
export const WHATSAPP_RAW_PHONE = '244953330585';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_RAW_PHONE}?text=${encodeURIComponent(
  'Olá! Gostaria de atendimento para suporte e vendas no AngoPayX.'
)}`;

export const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const WhatsAppFloatingWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const openWhatsApp = (customMsg?: string) => {
    const text = customMsg || 'Olá! Gostaria de atendimento para suporte e vendas no AngoPayX.';
    const url = `https://wa.me/${WHATSAPP_RAW_PHONE}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <aside aria-label="Atendimento WhatsApp" className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Quick Action Flyout */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 p-4 rounded-2xl bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-950/60 text-white animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#25D366] text-white flex items-center justify-center shadow-md shadow-[#25D366]/30 shrink-0">
                <WhatsAppIcon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Atendimento WhatsApp
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </h2>
                <p className="text-[11px] text-emerald-400 font-semibold">{WHATSAPP_NUMBER}</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="py-3 text-xs text-slate-300 space-y-2">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Equipa de atendimento oficial do AngoPayX para vendas, recargas, depósitos e suporte técnico.
            </p>

            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => openWhatsApp('Olá! Gostaria de comprar USDT / fazer recarga no AngoPayX.')}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/40 text-xs text-slate-200 hover:text-emerald-300 transition flex items-center justify-between group"
              >
                <span>💳 Vendas & Recargas USDT</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition" />
              </button>

              <button
                onClick={() => openWhatsApp('Olá! Preciso de suporte com uma transação / comprovativo no AngoPayX.')}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/40 text-xs text-slate-200 hover:text-emerald-300 transition flex items-center justify-between group"
              >
                <span>🛠️ Suporte & Comprovativos</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition" />
              </button>

              <button
                onClick={() => openWhatsApp('Olá! Gostaria de falar com o atendimento geral do AngoPayX.')}
                className="w-full text-left px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/40 text-xs text-slate-200 hover:text-emerald-300 transition flex items-center justify-between group"
              >
                <span>💬 Dúvidas Gerais & Cotação</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition" />
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3 h-3" /> Canal Oficial Verificado
            </span>
            <span>Seg - Dom 24/7</span>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <div className="flex items-center gap-2 group">
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/95 border border-emerald-500/30 shadow-lg text-xs font-semibold text-slate-200 backdrop-blur-sm cursor-pointer hover:border-emerald-400 transition group-hover:scale-105"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 font-bold">WhatsApp:</span>
            <span>{WHATSAPP_NUMBER}</span>
          </div>
        )}

        <button
          onClick={() => {
            if (isOpen) {
              setIsOpen(false);
            } else {
              openWhatsApp();
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsOpen(!isOpen);
          }}
          aria-label="Abrir conversa no WhatsApp para suporte e vendas"
          className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white flex items-center justify-center shadow-xl shadow-[#25D366]/40 transition-all duration-200 group-hover:ring-4 group-hover:ring-[#25D366]/30 cursor-pointer"
          title={`WhatsApp: ${WHATSAPP_NUMBER} (Atendimento, Suporte e Vendas)`}
        >
          <WhatsAppIcon className="w-7 h-7 sm:w-8 sm:h-8" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-400 border-2 border-slate-950"></span>
          </span>
        </button>
      </div>
    </aside>
  );
};
