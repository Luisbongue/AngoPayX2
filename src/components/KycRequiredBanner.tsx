import React from 'react';
import { ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';

interface KycRequiredBannerProps {
  onNavigate?: (tab: string) => void;
  operationName?: string;
}

export const KycRequiredBanner: React.FC<KycRequiredBannerProps> = ({
  onNavigate,
  operationName = 'depósitos ou recargas',
}) => {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-900 border border-amber-500/40 shadow-xl space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-white">
            Preenchimento de Perfil Necessário
          </h3>
          <p className="text-xs text-amber-300 font-medium mt-0.5">
            Antes de solicitar {operationName}, preencha a sua Data de Nascimento e Número do Bilhete de Identidade (BI).
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Estes dados são enviados diretamente para o Administrador validar, sem precisar de enviar nenhuma foto de documentos.
          </p>
        </div>
      </div>
      {onNavigate && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
          >
            <UserCheck className="w-4 h-4 stroke-[2.5]" />
            <span>Editar Perfil e Preencher Dados</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};
