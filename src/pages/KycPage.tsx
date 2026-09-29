import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Upload,
  Camera,
  ArrowRight,
  UserCheck,
  Lock,
  RefreshCw,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { KycRecord } from '../types/index.ts';

interface KycPageProps {
  onNavigate?: (tab: string) => void;
}

function getFriendlyErrorMessage(err: unknown): string {
  if (!err) return 'Não foi possível enviar os documentos. Verifique a sua ligação e tente novamente.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.includes('timeout') || err.message.includes('tempo limite')) {
      return 'O envio dos documentos demorou mais do que o esperado. Por favor, verifique a sua ligação à internet e tente novamente.';
    }
    return err.message;
  }
  if (typeof err === 'object' && err !== null) {
    const maybeObj = err as Record<string, unknown>;
    if (typeof maybeObj.error === 'string') return maybeObj.error;
    if (typeof maybeObj.message === 'string') return maybeObj.message;
  }
  return 'Não foi possível enviar os documentos. Verifique a sua ligação e tente novamente.';
}

export const KycPage: React.FC<KycPageProps> = ({ onNavigate }) => {
  const { user, kyc, refreshUser } = useAuth();

  // Form Fields
  const [fullName, setFullName] = useState(user?.name || '');
  const [idNumber, setIdNumber] = useState(kyc?.documentNumber || '');
  const [nationality, setNationality] = useState(kyc?.nationality || 'Angolana');
  const [dateOfBirth, setDateOfBirth] = useState(kyc?.dateOfBirth || '');

  // File states (Files to upload)
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  // Preview URLs
  const [frontPreview, setFrontPreview] = useState<string>(kyc?.biFrontSignedUrl || kyc?.biFrontUrl || '');
  const [backPreview, setBackPreview] = useState<string>(kyc?.biBackSignedUrl || kyc?.biBackUrl || '');
  const [selfiePreview, setSelfiePreview] = useState<string>(kyc?.selfieSignedUrl || kyc?.selfieUrl || '');

  // Loading & Progress states
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Synchronize initial data from KYC record if already exists
  useEffect(() => {
    if (user?.name && !fullName) {
      setFullName(user.name);
    }
    if (kyc) {
      if (kyc.fullName && !fullName) setFullName(kyc.fullName);
      if (kyc.documentNumber && !idNumber) setIdNumber(kyc.documentNumber);
      if (kyc.nationality && !nationality) setNationality(kyc.nationality);
      if (kyc.dateOfBirth && !dateOfBirth) setDateOfBirth(kyc.dateOfBirth);
      if (!frontPreview && (kyc.biFrontSignedUrl || kyc.biFrontUrl)) {
        setFrontPreview(kyc.biFrontSignedUrl || kyc.biFrontUrl);
      }
      if (!backPreview && (kyc.biBackSignedUrl || kyc.biBackUrl)) {
        setBackPreview(kyc.biBackSignedUrl || kyc.biBackUrl);
      }
      if (!selfiePreview && (kyc.selfieSignedUrl || kyc.selfieUrl)) {
        setSelfiePreview(kyc.selfieSignedUrl || kyc.selfieUrl);
      }
    }
  }, [user, kyc]);

  // Handle local file picking with validation
  const handleFileInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (url: string) => void,
    label: string
  ) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError(`O ficheiro de ${label} excede o limite máximo de 8MB. Escolha uma imagem menor.`);
      return;
    }

    const validMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validMimes.includes(file.type) && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      setError(`Formato de imagem inválido para ${label}. Por favor, anexe uma fotografia nos formatos JPG ou PNG.`);
      return;
    }

    setFile(file);

    // Generate local preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Helper: converts file to base64 with safety timeout
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const timeout = setTimeout(() => {
        reader.abort();
        reject(new Error(`Tempo limite excedido ao processar ${file.name}.`));
      }, 15000);

      reader.onload = () => {
        clearTimeout(timeout);
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Erro ao ler o ficheiro ${file.name}.`));
      };
      reader.readAsDataURL(file);
    });
  };

  // Upload single document directly to Supabase Storage via backend
  const uploadDocumentReal = async (
    file: File,
    documentType: 'bi-frente' | 'bi-verso' | 'selfie',
    label: string
  ): Promise<string> => {
    try {
      const base64Data = await fileToBase64(file);
      const res = await apiClient.uploadKycDocument({
        documentType,
        fileName: file.name,
        contentType: file.type || 'image/jpeg',
        base64Data,
      });

      if (!res.success || !res.path) {
        throw new Error(`Falha no upload do ficheiro de ${label}.`);
      }

      return res.path;
    } catch (err: unknown) {
      console.error(`[Upload Real ${documentType} Erro]:`, err);
      throw new Error(`Erro ao enviar ${label} para o Supabase Storage. Verifique o ficheiro e tente novamente.`);
    }
  };

  // Submit complete KYC verification
  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!user) {
      setError('Sessão expirada. Por favor inicie sessão novamente.');
      return;
    }

    // 1. Validate Text Fields
    if (!fullName.trim()) {
      setError('Por favor, informe o seu Nome Completo conforme consta no Bilhete de Identidade.');
      return;
    }

    if (!idNumber.trim()) {
      setError('Por favor, preencha o Número do Bilhete de Identidade (BI).');
      return;
    }

    // 2. Validate all 3 files are present
    const hasFront = Boolean(frontFile || frontPreview || kyc?.biFrontUrl);
    const hasBack = Boolean(backFile || backPreview || kyc?.biBackUrl);
    const hasSelfie = Boolean(selfieFile || selfiePreview || kyc?.selfieUrl);

    if (!hasFront || !hasBack || !hasSelfie) {
      setError('Todos os 3 documentos são obrigatórios: 1. BI Frente, 2. BI Verso e 3. Selfie segurando o BI.');
      return;
    }

    setLoading(true);

    try {
      let finalFrontPath = kyc?.biFrontPath || kyc?.biFrontUrl || '';
      let finalBackPath = kyc?.biBackPath || kyc?.biBackUrl || '';
      let finalSelfiePath = kyc?.selfiePath || kyc?.selfieUrl || '';

      // Upload 1: BI Frente
      if (frontFile) {
        setUploadStep('A enviar BI (Frente) para o Supabase Storage... (1/3)');
        finalFrontPath = await uploadDocumentReal(frontFile, 'bi-frente', 'BI (Frente)');
      }

      // Upload 2: BI Verso
      if (backFile) {
        setUploadStep('A enviar BI (Verso) para o Supabase Storage... (2/3)');
        finalBackPath = await uploadDocumentReal(backFile, 'bi-verso', 'BI (Verso)');
      }

      // Upload 3: Selfie com BI
      if (selfieFile) {
        setUploadStep('A enviar Selfie com BI para o Supabase Storage... (3/3)');
        finalSelfiePath = await uploadDocumentReal(selfieFile, 'selfie', 'Selfie com BI');
      }

      // Step 4: Registo oficial no banco de dados e Supabase
      setUploadStep('A registar verificação de identidade no sistema...');

      const response = await apiClient.submitKyc({
        fullName: fullName.trim(),
        documentType: 'BI',
        documentNumber: idNumber.trim(),
        nationality: nationality.trim() || 'Angolana',
        dateOfBirth: dateOfBirth || '',
        biFrontPath: finalFrontPath,
        biBackPath: finalBackPath,
        selfiePath: finalSelfiePath,
        biFrentePath: finalFrontPath,
        biVersoPath: finalBackPath,
      });

      // Clear files since they are safely uploaded
      setFrontFile(null);
      setBackFile(null);
      setSelfieFile(null);

      setSuccess(
        response.message ||
        '✓ Documentos enviados com sucesso. A sua documentação foi recebida e está aguardando validação.'
      );

      // Refresh global user state to show updated KYC badge
      await refreshUser();
    } catch (err: unknown) {
      console.error('[KYC Submit Erro]:', err);
      const friendlyMessage = getFriendlyErrorMessage(err);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
      setUploadStep('');
    }
  };

  const kycStatus = user?.kycStatus || 'Não iniciado';

  return (
    <div className="space-y-6 w-full max-w-full box-border">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Verificação de Identidade (KYC / AML)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Conformidade e Identidade</h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Para garantir a segurança financeira das operações de compra e venda de USDT em Angola, validamos a identidade dos clientes segundo as boas práticas financeiras e do BNA.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Estado Atual</span>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full inline-block mt-0.5 ${
                kycStatus === 'Aprovado'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : kycStatus === 'Rejeitado'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : kycStatus === 'Pendente' || kycStatus === 'Em análise'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {kycStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-400 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Atenção ao submeter documentação</p>
            <p className="leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-emerald-400 text-xs">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">✓ Submissão Concluída</p>
            <p className="leading-relaxed">{success}</p>
          </div>
        </div>
      )}

      {/* Admin Notes if rejected or additional docs needed */}
      {(kyc?.adminNotes || kyc?.notes || kyc?.rejectionReason) && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-300 text-xs">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Mensagem do Administrador / Compliance:</p>
            <p className="text-slate-300 mt-1">{kyc.rejectionReason || kyc.adminNotes || kyc.notes}</p>
          </div>
        </div>
      )}

      {/* KYC APPROVED VIEW */}
      {kycStatus === 'Aprovado' ? (
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Identidade Verificada e Aprovada</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              A sua conta AngoPayX possui validação KYC completa. Tem acesso a todos os limites de compra, venda, depósito e retirada em kwanzas e USDT.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Titular Validado:</span>
              <span className="font-bold text-white">{kyc?.fullName || user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nº do Bilhete de Identidade:</span>
              <span className="font-mono font-bold text-emerald-400">{kyc?.documentNumber || 'Registado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nacionalidade:</span>
              <span className="text-slate-300">{kyc?.nationality || 'Angolana'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verificação no Storage:</span>
              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                <FileCheck2 className="w-3.5 h-3.5" /> Supabase Storage (Privado)
              </span>
            </div>
          </div>

          {onNavigate && (
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('buy')}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Comprar USDT
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sell')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow transition"
              >
                Vender USDT
              </button>
            </div>
          )}
        </div>
      ) : kycStatus === 'Pendente' || kycStatus === 'Em análise' ? (
        /* KYC PENDING VIEW */
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center border border-amber-500/30">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Documentação em Análise pela AngoPayX</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Os seus documentos estão guardados com segurança no Supabase Storage e aguardam validação pela equipa de compliance.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Nome Submetido:</span>
              <span className="font-bold text-white">{kyc?.fullName || user?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nº de Documento:</span>
              <span className="font-mono font-bold text-slate-200">{kyc?.documentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data de Envio:</span>
              <span className="text-slate-300">
                {kyc?.submittedAt ? new Date(kyc.submittedAt).toLocaleString('pt-AO') : 'Hoje'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Armazenamento:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Supabase Storage (kyc-documents)
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            O tempo médio de análise é de 15 a 60 minutos durante horário comercial.
          </p>

          <button
            type="button"
            onClick={refreshUser}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold inline-flex items-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Atualizar Estado</span>
          </button>
        </div>
      ) : (
        /* KYC SUBMISSION FORM */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Submissão de Documentos Oficiais de Angola</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Envie fotos claras do seu Bilhete de Identidade (Frente e Verso) e uma selfie segurando o documento.
                </p>
              </div>

              <form onSubmit={handleSubmitKyc} className="space-y-5">
                {/* 1. Personal Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    1. Dados do Titular do Documento
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nome Completo (Conforme no BI) *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Ex: Manuel António da Silva"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Número do Bilhete de Identidade (BI) *
                      </label>
                      <input
                        type="text"
                        required
                        value={idNumber}
                        onChange={(e) => setIdNumber(e.target.value.toUpperCase())}
                        placeholder="Ex: 001234567LA042"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Nacionalidade
                      </label>
                      <input
                        type="text"
                        value={nationality}
                        onChange={(e) => setNationality(e.target.value)}
                        placeholder="Angolana"
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Data de Nascimento
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Photo Uploads */}
                <div className="pt-4 border-t border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      2. Fotografias Obrigatórias dos Documentos
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-semibold">3 de 3 Ficheiros Requeridos</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* BI Frente */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Frente) *</span>
                          {(frontFile || frontPreview) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto nítida e legível da frente do Bilhete</p>
                      </div>

                      {frontPreview ? (
                        <div className="space-y-2">
                          <img
                            src={frontPreview}
                            alt="BI Frente"
                            className="w-full h-28 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setFrontFile(null);
                              setFrontPreview('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full py-1"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-center cursor-pointer bg-slate-900/60 transition">
                          <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                          <span className="text-xs text-slate-200 block font-bold">Anexar BI Frente</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => handleFileInput(e, setFrontFile, setFrontPreview, 'BI (Frente)')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* BI Verso */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">BI (Verso) *</span>
                          {(backFile || backPreview) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Foto nítida e legível do verso do Bilhete</p>
                      </div>

                      {backPreview ? (
                        <div className="space-y-2">
                          <img
                            src={backPreview}
                            alt="BI Verso"
                            className="w-full h-28 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setBackFile(null);
                              setBackPreview('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full py-1"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-center cursor-pointer bg-slate-900/60 transition">
                          <Upload className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                          <span className="text-xs text-slate-200 block font-bold">Anexar BI Verso</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => handleFileInput(e, setBackFile, setBackPreview, 'BI (Verso)')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {/* Selfie com BI */}
                    <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-white">Selfie com BI *</span>
                          {(selfieFile || selfiePreview) && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-2">Segurando o documento ao lado do rosto</p>
                      </div>

                      {selfiePreview ? (
                        <div className="space-y-2">
                          <img
                            src={selfiePreview}
                            alt="Selfie"
                            className="w-full h-28 object-cover rounded-lg border border-slate-700"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSelfieFile(null);
                              setSelfiePreview('');
                            }}
                            className="text-[10px] text-rose-400 hover:underline block text-center w-full py-1"
                          >
                            Substituir Ficheiro
                          </button>
                        </div>
                      ) : (
                        <label className="block p-4 border-2 border-dashed border-slate-600 hover:border-emerald-500 rounded-xl text-center cursor-pointer bg-slate-900/60 transition">
                          <Camera className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                          <span className="text-xs text-slate-200 block font-bold">Tirar / Anexar Selfie</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">JPG ou PNG (máx. 8MB)</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={(e) => handleFileInput(e, setSelfieFile, setSelfiePreview, 'Selfie com BI')}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress message while uploading */}
                {loading && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                    <span className="text-xs text-emerald-300 font-semibold">{uploadStep || 'A processar documentação...'}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl text-xs font-bold shadow-lg transition mt-4 flex items-center justify-center gap-2 ${
                    loading
                      ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  }`}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{uploadStep || 'A enviar documentos para o Supabase Storage...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar Documentação para Análise</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Instructions */}
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

            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-xs space-y-2 text-slate-400">
              <div className="flex items-center gap-2 text-white font-bold mb-1">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Segurança e Privacidade</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Os seus documentos são encriptados e armazenados em bucket privado no Supabase Storage. Apenas o administrador oficial da AngoPayX tem autorização de consulta para aprovação.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
