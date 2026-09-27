import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Lock className="w-4 h-4" />
          <span>Privacidade e Proteção de Dados</span>
        </div>
        <h1 className="text-2xl font-black text-white">Política de Privacidade & Conformidade AML</h1>
        <p className="text-xs text-slate-400">
          Compromisso do AngoPayX com o tratamento seguro, criptografia e proteção de dados pessoais.
        </p>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5 text-xs text-slate-300 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">1. Recolha de Dados Pessoais</h2>
          <p>
            Recolhemos unicamente os dados estritamente necessários para a execução dos serviços de intermediação e prevenção a fraudes: Nome completo, endereço de correio eletrónico, número de telefone, documento de identificação (BI) e histórico de transações financeiras.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">2. Tratamento e Sigilo</h2>
          <p>
            Os comprovativos bancários e documentos de identificação são armazenados em repositório encriptado e com permissões estritas restritas a operadores autorizados do departamento de conformidade e auditoria.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-white">3. Prevenção ao Branqueamento de Capitais (AML)</h2>
          <p>
            O AngoPayX adota procedimentos rigorosos para prevenir o uso indevido da plataforma para atividades ilícitas. Qualquer comportamento anômalo ou incompatível com a capacidade financeira declarada poderá ser submetido a auditoria detalhada e reporte legal conforme a legislação em vigor.
          </p>
        </section>
      </div>
    </div>
  );
};
