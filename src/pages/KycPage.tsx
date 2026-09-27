import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Camera,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';

export const KycPage: React.FC = () => {
  const { user, kyc, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [idNumber, setIdNumber] = useState(kyc?.documentNumber || '');
  const [nationality, setNationality] = useState('Angolana');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Document files (Base64 data URLs)
  const [docFrontUrl, setDocFrontUrl] = useState('');
  const [docBackUrl, setDocBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('O tamanho do ficheiro não deve exceder 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setter(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Sample document helper for quick testing
  const useSampleDoc = (setter: (val: string) => void, title: string) => {
    // Generate a simple high-contrast SVG placeholder representing an Angolan BI
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 400, 250);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, 380, 230);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`REPÚBLICA DE ANGOLA — ${title}`, 25, 45);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText(`DOCUMENTO OFICIAL DE IDENTIDADE (BI)`, 25, 75);
      ctx.fillText(`NÚMERO: 004829102LA042`, 25, 105);
      ctx.fillText(`TITULAR: ${user?.name || 'CIDADÃO ANGOLANO'}`, 25, 135);
      ctx.fillText(`VALIDADO PARA COMPLIANCE ANGOPAYX`, 25, 165);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(25, 185, 120, 35);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('EMISSO OFICIAL', 35, 207);
      setter(canvas.toDataURL());
    }
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!docFrontUrl || !docBackUrl || !selfieUrl) {
      setError('Por favor, anexe todas as 3 fotos obrigatórias: BI frente, BI verso e Selfie com o documento.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.submitKyc({
        fullName,
        idNumber,
        nationality,
        dateOfBirth,
        docFrontUrl,
        docBackUrl,
        selfieUrl,
      });

      setSuccess('Documentação de KYC submetida com sucesso! A nossa equipa de conformidade irá analisar os documentos.');
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Erro ao submeter documentos KYC.');
    } finally {
      setLoading(false);
    }
  };

  const kycStatus = user?.kycStatus || 'Não iniciado';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verificação de Identidade (KYC / AML)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Conformidade e Identidade</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Para garantir a segurança financeira das operações de compra e venda de USDT em Angola, validamos a identidade dos clientes segundo as boas práticas financeiras.
          </p>
        </div>

        {/* Current Status Badge */}
        <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-right">
          <span className="text-[11px] text-slate-400 block font-medium">Estado Atual do KYC</span>
          <span
            className={`text-sm font-black uppercase px-2.5 py-1 rounded inline-block mt-0.5 ${
              kycStatus === 'Aprovado'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : kycStatus === 'Rejeitado'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            {kycStatus}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Operator Notes if any */}
      {(kyc?.adminNotes || kyc?.notes) && (
        <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 text-xs space-y-1">
          <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">
            Mensagem do Analista de Conformidade:
          </span>
          <p className="text-slate-300">{kyc.adminNotes || kyc.notes}</p>
        </div>
      )}

      {/* KYC Form or Verified State */}
      {kycStatus === 'Aprovado' ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Identidade Verificada com Sucesso</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            A sua conta foi validada pela equipa do AngoPayX. Os seus limites de compra, venda e saque estão ativos no patamar máximo.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            BI Número: <strong className="text-slate-300 font-mono">{kyc?.documentNumber}</strong> • Nome: <strong className="text-slate-300">{kyc?.fullName}</strong>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                1. Informações Pessoais
              </h2>

              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nome Completo Oficial
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Conforme consta no BI"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Número do Bilhete de Identidade (BI)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 004829102LA042"
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nacionalidade
                    </label>
                    <input
                      type="text"
                      required
                      value={nationality}
                      onChange={(e) => setNationality(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                    2. Envio de Fotografias dos Documentos
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Front BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Frente)</span>
                          {docFrontUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto legível da frente do Bilhete</p>
                      </div>

                      {docFrontUrl ? (
                        <div className="space-y-2">
                          <img
                            src={docFrontUrl}
                            alt="BI Frente"
                            className="w-full h-24 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => setDocFrontUrl('')}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-300 block font-semibold">Anexar Imagem</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, setDocFrontUrl)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => useSampleDoc(setDocFrontUrl, 'FRENTE')}
                            className="w-full py-1 text-[10px] rounded bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                          >
                            Usar Modelo Demo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Back BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Verso)</span>
                          {docBackUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto legível do verso do Bilhete</p>
                      </div>

                      {docBackUrl ? (
                        <div className="space-y-2">
                          <img
                            src={docBackUrl}
                            alt="BI Verso"
                            className="w-full h-24 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => setDocBackUrl('')}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60">
                            <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-300 block font-semibold">Anexar Imagem</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, setDocBackUrl)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => useSampleDoc(setDocBackUrl, 'VERSO')}
                            className="w-full py-1 text-[10px] rounded bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                          >
                            Usar Modelo Demo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Selfie with BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">Selfie com BI</span>
                          {selfieUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Segurando o documento ao lado do rosto</p>
                      </div>

                      {selfieUrl ? (
                        <div className="space-y-2">
                          <img
                            src={selfieUrl}
                            alt="Selfie"
                            className="w-full h-24 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => setSelfieUrl('')}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60">
                            <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                            <span className="text-[10px] text-slate-300 block font-semibold">Anexar Selfie</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, setSelfieUrl)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => useSampleDoc(setSelfieUrl, 'SELFIE')}
                            className="w-full py-1 text-[10px] rounded bg-slate-700/60 text-slate-300 hover:bg-slate-700"
                          >
                            Usar Modelo Demo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition mt-4"
                >
                  {loading ? 'A submeter documentos...' : 'Enviar Documentação para Análise'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <UserCheck className="w-4 h-4" />
                <span>Instruções de Validação</span>
              </div>
              <ul className="space-y-2 text-slate-400 text-[11px] list-disc list-inside">
                <li>Certifique-se de que os 4 cantos do documento estão visíveis.</li>
                <li>Evite reflexos de flash e garanta iluminação adequada.</li>
                <li>O nome no Bilhete de Identidade deve coincidir exatamente com o titular das contas bancárias.</li>
                <li>A análise costuma levar de 15 a 60 minutos durante o horário comercial.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
