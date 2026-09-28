import React, { useState } from 'react';
import {
  ShieldCheck,
  Upload,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Camera,
  ArrowRight,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { supabase, isSupabaseConfigured } from '../lib/supabase.ts';

interface KycPageProps {
  onNavigate?: (tab: string) => void;
}

function getErrorMessage(err: unknown): string {
  if (!err) return 'Não foi possível enviar os documentos. Verifique os ficheiros e tente novamente.';
  if (typeof err === 'string' && err !== '[object Object]') return err;
  if (typeof err === 'object') {
    const e = err as any;
    if (typeof e.message === 'string' && e.message && e.message !== '[object Object]') {
      return e.message;
    }
    if (typeof e.error === 'string' && e.error && e.error !== '[object Object]') {
      return e.error;
    }
    if (e.error && typeof e.error.message === 'string') {
      return e.error.message;
    }
    if (typeof e.error_description === 'string') {
      return e.error_description;
    }
  }
  return 'Não foi possível enviar os documentos. Verifique os ficheiros e tente novamente.';
}

export const KycPage: React.FC<KycPageProps> = ({ onNavigate }) => {
  const { user, kyc, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.name || '');
  const [idNumber, setIdNumber] = useState(kyc?.documentNumber || '');
  const [nationality, setNationality] = useState('Angolana');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Real files
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Previews
  const [docFrontUrl, setDocFrontUrl] = useState('');
  const [docBackUrl, setDocBackUrl] = useState('');
  const [selfieUrl, setSelfieUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (url: string) => void
  ) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('O tamanho do ficheiro não deve exceder 8MB.');
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      setError('Formato inválido. Por favor envie uma imagem nos formatos JPG ou PNG.');
      return;
    }

    setFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadFileToStorage = async (file: File, prefix: string): Promise<string> => {
    if (!user) throw new Error('Sessão expirada. Por favor inicie sessão.');

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${user.id}/${Date.now()}-${prefix}-${cleanFileName}`;

    if (isSupabaseConfigured) {
      // 1. Tentar bucket kyc-documents
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (!uploadError) {
        const { data: publicData } = supabase.storage
          .from('kyc-documents')
          .getPublicUrl(storagePath);
        return publicData?.publicUrl || storagePath;
      }

      console.warn('[KYC Storage] Aviso no bucket kyc-documents:', uploadError.message);

      // 2. Fallback para bucket purchase-proofs
      const { error: fallbackError } = await supabase.storage
        .from('purchase-proofs')
        .upload(`kyc/${storagePath}`, file, { cacheControl: '3600', upsert: false });

      if (!fallbackError) {
        const { data: fallbackData } = supabase.storage
          .from('purchase-proofs')
          .getPublicUrl(`kyc/${storagePath}`);
        return fallbackData?.publicUrl || storagePath;
      }

      console.warn('[KYC Storage] Fallback também falhou:', fallbackError.message);
    }

    // Fallback: retornar data URL local
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Erro ao processar ficheiro de imagem.'));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('Sessão expirada. Por favor autentique-se para continuar.');
      return;
    }

    if (!fullName.trim() || !idNumber.trim()) {
      setError('Por favor preencha o seu Nome Completo e o Número do Bilhete de Identidade (BI).');
      return;
    }

    if ((!frontFile && !docFrontUrl) || (!backFile && !docBackUrl) || (!selfieFile && !selfieUrl)) {
      setError('Por favor, anexe todas as 3 fotos obrigatórias: BI frente, BI verso e Selfie com o documento.');
      return;
    }

    setLoading(true);

    try {
      // Upload dos ficheiros reais para o Supabase Storage
      let uploadedFront = docFrontUrl;
      let uploadedBack = docBackUrl;
      let uploadedSelfie = selfieUrl;

      if (frontFile) {
        uploadedFront = await uploadFileToStorage(frontFile, 'frente');
      }
      if (backFile) {
        uploadedBack = await uploadFileToStorage(backFile, 'verso');
      }
      if (selfieFile) {
        uploadedSelfie = await uploadFileToStorage(selfieFile, 'selfie');
      }

      // Atualizar status no Supabase Database
      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('profiles')
            .update({ kyc_status: 'Pendente' })
            .eq('id', user.id);
        } catch (supaErr) {
          console.warn('[Supabase Profiles update error]:', supaErr);
        }

        try {
          await supabase
            .from('kyc_records')
            .upsert({
              user_id: user.id,
              user_email: user.email,
              user_name: user.name,
              full_name: fullName.trim(),
              document_type: 'BI',
              document_number: idNumber.trim(),
              nationality: nationality.trim(),
              date_of_birth: dateOfBirth,
              status: 'Pendente',
              bi_front_url: uploadedFront,
              bi_back_url: uploadedBack,
              selfie_url: uploadedSelfie,
              submitted_at: new Date().toISOString(),
            });
        } catch (supaKycErr) {
          console.warn('[Supabase kyc_records upsert warning]:', supaKycErr);
        }
      }

      // Enviar para o backend AngoPayX
      await apiClient.submitKyc({
        fullName: fullName.trim(),
        documentType: 'BI',
        documentNumber: idNumber.trim(),
        nationality: nationality.trim(),
        dateOfBirth,
        biFrontUrl: uploadedFront,
        biBackUrl: uploadedBack,
        selfieUrl: uploadedSelfie,
        // Chaves alternativas para retrocompatibilidade
        idNumber: idNumber.trim(),
        docFrontUrl: uploadedFront,
        docBackUrl: uploadedBack,
      });

      setSuccess('Dados enviados com sucesso! Os seus documentos foram recebidos e estão em análise. Aguarde a validação da sua identificação.');
      await refreshUser();
    } catch (err: unknown) {
      console.error('[KYC Submit Erro]:', err);
      const friendlyMessage = getErrorMessage(err);
      setError(friendlyMessage);
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

      {/* Alerts */}
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

      {/* Admin Notes if rejected */}
      {(kyc?.adminNotes || kyc?.notes) && (
        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 text-xs space-y-1">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" />
            <span>Mensagem do Administrador / Compliance</span>
          </div>
          <p className="text-slate-300">{kyc.adminNotes || kyc.notes}</p>
        </div>
      )}

      {/* State Branches */}
      {kycStatus === 'Aprovado' ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-emerald-500/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Identidade Totalmente Verificada</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            A sua conta foi validada com sucesso. Os serviços de Depósito (Compra USDT) e Retirada (Venda USDT) estão 100% liberados para uso.
          </p>
          <div className="pt-2 text-xs text-slate-500">
            BI Número: <strong className="text-slate-300 font-mono">{kyc?.documentNumber || user?.id}</strong> • Nome: <strong className="text-slate-300">{kyc?.fullName || user?.name}</strong>
          </div>
          {onNavigate && (
            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('buy')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition"
              >
                Fazer Depósito (USDT)
              </button>
              <button
                type="button"
                onClick={() => onNavigate('withdraw')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
              >
                Fazer Retirada
              </button>
            </div>
          )}
        </div>
      ) : kycStatus === 'Pendente' || kycStatus === 'Em análise' ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-amber-500/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto border border-amber-500/40 animate-pulse">
            <FileCheck className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white">Documentação em Análise</h2>
          <p className="text-xs text-slate-300 max-w-lg mx-auto">
            Os seus documentos foram recebidos pela equipa do AngoPayX e estão atualmente em processo de verificação. Assim que a análise for concluída pelo administrador oficial, as operações financeiras serão automaticamente desbloqueadas.
          </p>
          <p className="text-[11px] text-slate-400">
            Tempo estimado: entre 15 e 60 minutos durante o horário comercial.
          </p>
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
                    2. Envio de Fotografias dos Documentos Oficiais
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    {/* Front BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Frente)</span>
                          {docFrontUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto nítida e legível da frente do Bilhete</p>
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
                            onClick={() => {
                              setFrontFile(null);
                              setDocFrontUrl('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60 transition">
                          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <span className="text-[10px] text-slate-300 block font-semibold">Anexar Imagem</span>
                          <span className="text-[9px] text-slate-500 block">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileInput(e, setFrontFile, setDocFrontUrl)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Back BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Verso)</span>
                          {docBackUrl && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto nítida e legível do verso do Bilhete</p>
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
                            onClick={() => {
                              setBackFile(null);
                              setDocBackUrl('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60 transition">
                          <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <span className="text-[10px] text-slate-300 block font-semibold">Anexar Imagem</span>
                          <span className="text-[9px] text-slate-500 block">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileInput(e, setBackFile, setDocBackUrl)}
                            className="hidden"
                          />
                        </label>
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
                            onClick={() => {
                              setSelfieFile(null);
                              setSelfieUrl('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-3 border border-dashed border-slate-600 hover:border-emerald-500 rounded-lg text-center cursor-pointer bg-slate-900/60 transition">
                          <Camera className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                          <span className="text-[10px] text-slate-300 block font-semibold">Tirar / Anexar Selfie</span>
                          <span className="text-[9px] text-slate-500 block">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileInput(e, setSelfieFile, setSelfieUrl)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/30 transition mt-4 flex items-center justify-center gap-2"
                >
                  {loading ? 'A enviar documentos para o Supabase Storage...' : 'Enviar Documentação para Análise'}
                  <ArrowRight className="w-4 h-4" />
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
