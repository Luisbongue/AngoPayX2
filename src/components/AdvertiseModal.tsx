import React, { useState } from 'react';
import {
  X,
  Megaphone,
  CheckCircle2,
  TrendingUp,
  Users,
  Eye,
  Send,
  Building2,
  Mail,
  Phone,
  DollarSign,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../services/api.ts';

interface AdvertiseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdvertiseModal: React.FC<AdvertiseModalProps> = ({ isOpen, onClose }) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState('350.000 Kz / mês (Destaque Principal)');
  const [preferredPlacement, setPreferredPlacement] = useState<'top_banner' | 'dashboard_native' | 'sidebar' | 'all'>('dashboard_native');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await apiClient.submitAdInquiry({
        companyName,
        contactPerson,
        email,
        phone,
        budget,
        preferredPlacement,
        message,
      });

      setSuccessMsg(res.message);
      setCompanyName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao enviar proposta de anúncio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
              <Megaphone className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Anuncie a sua Empresa no AngoPayX</h3>
              <p className="text-xs text-emerald-100">
                Monetize connosco e alcance milhares de operadores, cambistas e investidores em Angola
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Key Audience Stats */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <div>
              <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Público Activo
              </span>
              <strong className="text-sm sm:text-base font-extrabold text-white">+18.000</strong>
              <span className="text-[10px] text-slate-500 block">Usuários de Kz & USDT</span>
            </div>
            <div>
              <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Visualizações
              </span>
              <strong className="text-sm sm:text-base font-extrabold text-cyan-300">+250.000</strong>
              <span className="text-[10px] text-slate-500 block">Impressões mensais</span>
            </div>
            <div>
              <span className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" /> Conversão
              </span>
              <strong className="text-sm sm:text-base font-extrabold text-amber-300">Alto CTR</strong>
              <span className="text-[10px] text-slate-500 block">Tráfego Qualificado</span>
            </div>
          </div>

          {/* Pricing Options Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Formatos de Anúncio Disponíveis</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div
                onClick={() => {
                  setPreferredPlacement('top_banner');
                  setBudget('450.000 Kz / mês (Banner Topo)');
                }}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  preferredPlacement === 'top_banner'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Banner de Topo</span>
                  <span className="text-emerald-400">450.000 Kz</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Visibilidade máxima fixa no topo de todas as páginas da plataforma.
                </p>
              </div>

              <div
                onClick={() => {
                  setPreferredPlacement('dashboard_native');
                  setBudget('350.000 Kz / mês (Destaque Principal)');
                }}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  preferredPlacement === 'dashboard_native'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Card Nativo</span>
                  <span className="text-emerald-400">350.000 Kz</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Inserido no feed de operações, carteiras e fluxos de compra/venda.
                </p>
              </div>

              <div
                onClick={() => {
                  setPreferredPlacement('all');
                  setBudget('700.000 Kz / mês (Pacote 360°)');
                }}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  preferredPlacement === 'all'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                    : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold mb-1">
                  <span>Pacote 360° Total</span>
                  <span className="text-emerald-400">700.000 Kz</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Presença em todas as posições com selo de Parceiro Oficial Verificado.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          {successMsg ? (
            <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white">Proposta Enviada com Sucesso!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">{successMsg}</p>
              <p className="text-[11px] text-slate-400">
                O administrador do AngoPayX já recebeu a sua solicitação no painel e entrará em contacto para ativação do banner.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setSuccessMsg(null);
                    onClose();
                  }}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  Fechar Janela
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Nome da Empresa / Marca *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Banco Sol, Express Logística, etc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Pessoa de Contacto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Baptista (Director Comercial)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Email Corporativo *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="marketing@empresa.co.ao"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+244 923 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    Orçamento / Plano de Interesse
                  </label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Ex: 350.000 Kz / mês ou 250 USDT"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Posicionamento Desejado
                  </label>
                  <select
                    value={preferredPlacement}
                    onChange={(e) => setPreferredPlacement(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="top_banner">Banner no Topo (Destaque Superior)</option>
                    <option value="dashboard_native">Card Nativo no Dashboard</option>
                    <option value="sidebar">Barra Lateral / E-commerce</option>
                    <option value="all">Pacote Completo (Todas as Posições)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Detalhes da Campanha / Mensagem ou Link do Produto *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva o que a sua empresa oferece, links de referência, período pretendido de veiculação e requisitos..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Privacidade garantida. Não fazemos spam.
                </span>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? (
                      'A enviar...'
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Enviar Solicitação Comercial</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
