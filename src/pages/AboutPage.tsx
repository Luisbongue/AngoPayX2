import React from 'react';
import { ShieldCheck, Info, CheckCircle2, AlertTriangle, Layers, Lock, Landmark } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 font-extrabold text-2xl mb-1 shadow-inner">
          A
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white">Sobre a Plataforma AngoPayX</h1>
        <p className="text-sm text-slate-400 max-w-xl mx-auto">
          Infraestrutura profissional de intermediação ponto-a-ponto de USDT (TRC20) e Kwanza (Kz) projetada especificamente para o mercado angolano.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-400" />
          <span>O Nosso Modelo de Operação</span>
        </h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          O <strong>AngoPayX</strong> atua estritamente como uma plataforma de intermediação financeira e tecnológica para facilitação de compra e venda de USDT (Tether) na rede TRON (TRC20) contra moeda local nacional de Angola (Kwanza — Kz).
        </p>
        <p className="text-xs text-slate-300 leading-relaxed">
          Ao contrário de esquemas de investimento, a plataforma não capta depósitos para rentabilidade, não realiza custódia especulativa e não promete quaisquer retornos sobre o capital do utilizador. As operações são de câmbio direto, transparentes e lastreadas na paridade de mercado acordada no momento de cada ordem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Ledger Imutável</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Cada entrada e saída possui dupla validação com saldo anterior, saldo posterior, ID único e proteção contra duplo-gasto (idempotência).
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 w-fit">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Chaves Seguras</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nenhuma chave privada, seed phrase ou segredo operacional reside no navegador do cliente. As operações na rede TRON são assinadas em ambiente isolado.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 w-fit">
            <Landmark className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Pagamentos em Angola</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Conexão direta com os métodos mais utilizados em Angola: transferências via Kwik / IBAN e pagamentos por Referência Multicaixa Express.
          </p>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
        <div className="flex items-center gap-2 font-bold text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Aviso Importante e Transparência Regulatória</span>
        </div>
        <p className="text-[11px] text-amber-200/90 leading-relaxed">
          O AngoPayX não é um banco comercial e não oferece contas correntes remuneradas. Os criptoativos e stablecoins estão sujeitos à dinâmica de mercado e volatilidade cambial. O utilizador deve certificar-se de cumprir todas as obrigações fiscais e legais em vigor na República de Angola.
        </p>
      </div>
    </div>
  );
};
