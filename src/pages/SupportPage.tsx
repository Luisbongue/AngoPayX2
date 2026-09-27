import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus, Send, Clock, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { SupportTicket } from '../types/index.ts';

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // New ticket form
  const [isCreating, setIsCreating] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'COMPRA' | 'VENDA' | 'DEPOSITO' | 'SAQUE' | 'KYC' | 'GERAL'>('COMPRA');
  const [initialMessage, setInitialMessage] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');

  // Reply form
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadTickets();
  }, [user]);

  const loadTickets = async () => {
    try {
      const res = await apiClient.getMyTickets();
      setTickets(res.tickets);
      if (res.tickets.length > 0 && !selectedTicket) {
        setSelectedTicket(res.tickets[0]);
      }
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.createTicket({
        subject: subject.trim(),
        category,
        initialMessage: initialMessage.trim(),
        relatedOrderId: relatedOrderId.trim() || undefined,
      });

      setIsCreating(false);
      setSubject('');
      setInitialMessage('');
      setRelatedOrderId('');
      await loadTickets();
      setSelectedTicket(res.ticket);
    } catch (err: any) {
      setError(err.message || 'Erro ao abrir ticket de suporte.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setLoading(true);
    try {
      const res = await apiClient.sendTicketMessage(selectedTicket.id, replyText.trim());
      setSelectedTicket(res.ticket);
      setReplyText('');
      await loadTickets();
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar mensagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <HelpCircle className="w-4 h-4" />
            <span>Atendimento ao Cliente</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Suporte Técnico & Financeiro</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Tire dúvidas, informe dificuldades com comprovativos, validação de transações ou verificação de conta com o operador humano.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Abrir Novo Ticket</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isCreating ? (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-2xl mx-auto shadow-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white">Abertura de Ticket de Atendimento</h2>
            <button
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="COMPRA">Dúvida sobre Compra de USDT</option>
                <option value="VENDA">Dúvida sobre Venda de USDT / Recebimento em Kz</option>
                <option value="DEPOSITO">Depósito TRC20 não identificado</option>
                <option value="SAQUE">Saque de USDT</option>
                <option value="KYC">Verificação de Documentos (KYC)</option>
                <option value="GERAL">Outro assunto geral</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assunto</label>
              <input
                type="text"
                required
                placeholder="Ex: Confirmação de transferência bancária BAI"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                ID da Ordem Relacionada (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: ord_buy_..."
                value={relatedOrderId}
                onChange={(e) => setRelatedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Mensagem Detalhada</label>
              <textarea
                required
                rows={4}
                placeholder="Descreva detalhadamente a sua solicitação..."
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
            >
              {loading ? 'A enviar ticket...' : 'Submeter Ticket'}
            </button>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Meus Tickets ({tickets.length})
            </h3>

            {tickets.length === 0 ? (
              <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-500">
                Nenhum ticket aberto.
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      selectedTicket?.id === t.id
                        ? 'bg-slate-800 border-emerald-500/50'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-white truncate max-w-[150px]">
                        {t.subject}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          t.status === 'Resolvido'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>{t.category}</span>
                      <span>{new Date(t.updatedAt).toLocaleDateString('pt-AO')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ticket Messages View */}
          <div className="lg:col-span-8">
            {selectedTicket ? (
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col h-[520px]">
                {/* Header */}
                <div className="pb-4 border-b border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">
                      Ticket #{selectedTicket.id.slice(0, 10)}
                    </span>
                    <h2 className="text-base font-bold text-white">{selectedTicket.subject}</h2>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    Estado: {selectedTicket.status}
                  </span>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
                  {selectedTicket.messages.map((m, idx) => {
                    const isClient = m.sender === 'client';
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-300">{m.senderName}</span>
                          <span>• {new Date(m.timestamp).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`p-3 rounded-2xl max-w-md text-xs leading-relaxed ${
                            isClient
                              ? 'bg-emerald-600 text-white rounded-tr-none'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Escreva a sua resposta ao operador..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={loading || !replyText.trim()}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-500">
                Selecione um ticket ao lado para visualizar o atendimento.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
