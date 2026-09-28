import React from 'react';
import { ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

interface KycRequiredBannerProps {
  onNavigate?: (tab: string) => void;
  operationName?: string;
}

export const KycRequiredBanner: React.FC<KycRequiredBannerProps> = ({
  onNavigate,
  operationName = 'depósitos e retiradas',
}) => {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white">
            Verificação de identidade necessária
          </h3>
          <p className="text-xs text-amber-300 font-medium mt-0.5">
            KYC obrigatório. Verifique a sua identidade para ativar {operationName}.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Por normas de segurança e conformidade financeira, todas as contas necessitam de validação do Bilhete de Identidade antes de emitir solicitações de fundos.
          </p>
        </div>
      </div>
      {onNavigate && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('kyc')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Verificar Identidade</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};
