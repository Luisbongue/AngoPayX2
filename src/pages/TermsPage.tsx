import React from 'react';
import { FileText, ShieldAlert } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <FileText className="w-4 h-4" />
          <span>Políticas Oficiais</span>
        </div>
        <h1 className="text-2xl font-black text-white">Termos de Utilização do AngoPayX</h1>
        <p className="text-xs text-slate-400">
          Última revisão: Setembro de 2026 • Aplicável a todos os utilizadores da plataforma em Angola.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Objeto e Natureza do Serviço</h2>
          <p>
            O AngoPayX disponibiliza serviços de facilitação e intermediação tecnológica de compra e venda de USDT (Tether) na rede TRON TRC20 contra pagamentos efetuados em moeda fiduciária nacional de Angola (Kwanza — Kz).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Idoneidade e Verificação de Identidade (KYC)</h2>
          <p>
            Todos os clientes devem fornecer documentação autêntica (Bilhete de Identidade emitido pelas autoridades angolanas e selfie) para operações acima dos limites operacionais básicos. Tentativas de falsificação ou uso de documentos de terceiros acarretam no bloqueio sumário da conta e comunicação aos órgãos competentes.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Taxas e Cotações Cambiais</h2>
          <p>
            O valor de compra (ex: 1.350 Kz) e venda (ex: 1.250 Kz) exibido na criação da ordem é garantido até o limite do tempo de processamento. A regra em vigor estabelece isenção de taxa na venda de USDT (taxa de retirada = 0 Kz). As taxas de difusão de rede na blockchain TRON são deduzidas no momento do saque externo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">4. Irreversibilidade Blockchain</h2>
          <p>
            Transações na rede TRON TRC20 são imutáveis e irreversíveis. O AngoPayX não se responsabiliza por saques solicitados para endereços digitados incorretamente ou em redes incompatíveis com o protocolo TRC20.
          </p>
        </section>
      </div>
    </div>
  );
};
