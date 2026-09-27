import React, { useState, useEffect } from 'react';
import {
  Clock,
  Filter,
  Search,
  Eye,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { LedgerEntry } from '../types/index.ts';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  useEffect(() => {
    if (user) loadLedger();
  }, [user]);

  const loadLedger = async () => {
    try {
      const res = await apiClient.getMyLedger();
      setLedger(res.ledger);
    } catch (err) {
      console.error('Error loading ledger:', err);
    }
  };

  const filteredEntries = ledger.filter((entry) => {
    if (filterType !== 'ALL') {
      const normType = entry.type.toLowerCase();
      if (filterType === 'COMPRA' && !normType.includes('compra')) return false;
      if (filterType === 'VENDA' && !normType.includes('venda')) return false;
      if (filterType === 'DEPOSITO' && !normType.includes('depósito') && !normType.includes('deposito')) return false;
      if (filterType === 'SAQUE' && !normType.includes('saque')) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchRef = entry.reference.toLowerCase().includes(q);
      const matchType = entry.type.toLowerCase().includes(q);
      const matchId = entry.id.toLowerCase().includes(q);
      const matchTxid = (entry.txid || '').toLowerCase().includes(q);
      if (!matchRef && !matchType && !matchId && !matchTxid) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Auditoria & Livro-Razão</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Histórico de Transações</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Registro cronológico e imutável de todas as compras, vendas, depósitos, saques e lançamentos financeiros no seu saldo.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {['ALL', 'COMPRA', 'VENDA', 'DEPOSITO', 'SAQUE'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === type
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {type === 'ALL' ? 'Todos os Registos' : type}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Pesquisar por referência, ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        {filteredEntries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-10">
            Nenhuma transação encontrada para os filtros selecionados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                  <th className="pb-3 pl-2">Operação</th>
                  <th className="pb-3">Data e Hora</th>
                  <th className="pb-3">Valor</th>
                  <th className="pb-3">Saldo Anterior</th>
                  <th className="pb-3">Saldo Resultante</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 pr-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEntries.map((entry) => {
                  const norm = entry.type.toLowerCase();
                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2">
                          {norm.includes('compra') && <ArrowDownLeft className="w-4 h-4 text-emerald-400" />}
                          {norm.includes('venda') && <ArrowUpRight className="w-4 h-4 text-amber-400" />}
                          {(norm.includes('depósito') || norm.includes('deposito')) && (
                            <Download className="w-4 h-4 text-cyan-400" />
                          )}
                          {norm.includes('saque') && <Upload className="w-4 h-4 text-purple-400" />}
                          <div>
                            <span className="font-bold text-slate-200 block">{entry.type}</span>
                            <span className="text-[10px] text-slate-500 font-mono block">ID: {entry.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString('pt-AO')}
                      </td>
                      <td className="py-3.5 font-extrabold whitespace-nowrap">
                        <span className={entry.direction === 'IN' ? 'text-emerald-400' : 'text-amber-400'}>
                          {entry.direction === 'IN' ? '+' : '-'} {entry.amount.toFixed(2)} USDT
                        </span>
                      </td>
                      <td className="py-3.5 text-slate-400 whitespace-nowrap">
                        {entry.balanceBefore.toFixed(2)} USDT
                      </td>
                      <td className="py-3.5 text-white font-bold whitespace-nowrap">
                        {entry.balanceAfter.toFixed(2)} USDT
                      </td>
                      <td className="py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedEntry(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs">
              <FileText className="w-4 h-4" />
              <span>Extrato de Movimentação no Ledger</span>
            </div>

            <h3 className="text-xl font-black text-white">
              {selectedEntry.type} — {selectedEntry.amount} USDT
            </h3>

            <div className="p-4 bg-slate-800/80 rounded-xl space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Identificador do Lançamento:</span>
                <span className="font-mono text-slate-200">{selectedEntry.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Referência da Operação:</span>
                <span className="font-semibold text-white">{selectedEntry.reference}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Direção no Ledger:</span>
                <span className="font-bold text-emerald-400">{selectedEntry.direction === 'IN' ? 'Crédito (Entrada)' : 'Débito (Saída)'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Saldo Anterior:</span>
                <span className="text-slate-300">{selectedEntry.balanceBefore.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Saldo Resultante:</span>
                <span className="font-bold text-white">{selectedEntry.balanceAfter.toFixed(2)} USDT</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                <span className="text-slate-400">Data de Registro:</span>
                <span className="text-slate-300">{new Date(selectedEntry.timestamp).toLocaleString('pt-AO')}</span>
              </div>

              {selectedEntry.txid && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-0.5">TXID Blockchain:</span>
                  <span className="font-mono text-[10px] text-slate-300 select-all break-all block p-2 bg-slate-950 rounded">
                    {selectedEntry.txid}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
