import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Laptop,
  Apple,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'auto' | 'android' | 'ios' | 'desktop' | 'playstore'>('auto');
  const [copied, setCopied] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  // Convert dev URL to pre (shared preview) URL so it opens on external mobile devices without dev login barrier
  const mobileShareUrl = currentUrl.replace('ais-dev-', 'ais-pre-');

  useEffect(() => {
    const targetUrl = mobileShareUrl || currentUrl;
    if (targetUrl) {
      QRCode.toDataURL(targetUrl, {
        width: 220,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch(() => {});
    }

    if (isIOS) {
      setActiveTab('ios');
    } else {
      setActiveTab('auto');
    }
  }, [mobileShareUrl, currentUrl, isIOS, isOpen]);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleCopyLink = () => {
    const targetUrl = mobileShareUrl || currentUrl;
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-emerald-500/20">
              A
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Instalar AngoPayX no Dispositivo</h3>
              <p className="text-xs text-slate-400">Aplicação Web Progressiva Oficial (PWA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {installSuccess ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/30">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-white">Aplicação Instalada com Sucesso!</h4>
              <p className="text-sm text-slate-400">
                O AngoPayX agora está acessível no ecrã inicial do seu telemóvel ou menu do computador.
              </p>
            </div>
          ) : isInstalled ? (
            <div className="text-center py-6 space-y-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-base font-bold text-emerald-300">Aplicação já Instalada!</h4>
              <p className="text-xs text-slate-300">
                Já está a executar o AngoPayX como aplicativo nativo. Tem acesso a atualizações automáticas e suporte offline.
              </p>
            </div>
          ) : (
            <>
              {/* Native Prompt Banner if supported */}
              {isInstallable && (
                <div className="p-4 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-600/40 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Download className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">Instalação Direta Pronta</h4>
                      <p className="text-xs text-slate-300">
                        O seu navegador suporta instalação com 1 clique sem passar por lojas de apps.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleNativeInstall}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Agora o AngoPayX</span>
                  </button>
                </div>
              )}

              {/* Tabs for platform guidance */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto gap-2">
                <button
                  onClick={() => setActiveTab('android')}
                  className={`text-xs font-semibold pb-1 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'android' || activeTab === 'auto'
                      ? 'text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android (PWA)</span>
                </button>
                <button
                  onClick={() => setActiveTab('playstore')}
                  className={`text-xs font-semibold pb-1 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'playstore'
                      ? 'text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">Google Play (.AAB / APK)</span>
                </button>
                <button
                  onClick={() => setActiveTab('ios')}
                  className={`text-xs font-semibold pb-1 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'ios'
                      ? 'text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>iPhone / iPad</span>
                </button>
                <button
                  onClick={() => setActiveTab('desktop')}
                  className={`text-xs font-semibold pb-1 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activeTab === 'desktop'
                      ? 'text-emerald-400 border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>PC / Mac</span>
                </button>
              </div>

              {/* Instructions based on platform */}
              {activeTab === 'playstore' ? (
                <div className="space-y-4 bg-slate-950/80 p-4 rounded-xl border border-amber-500/30 text-xs text-slate-300">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5 text-sm">
                      <Download className="w-4 h-4" /> Como Gerar o Pacote .AAB / .APK para a Google Play
                    </p>
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded text-[10px] font-mono">
                      com.angopayx.app
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    O <strong>AngoPayX</strong> foi construído de acordo com os padrões <strong>TWA (Trusted Web Activity)</strong> e <strong>PWA Manifest</strong> exigidos oficialmente pela Google para a Google Play Store.
                  </p>

                  <div className="bg-slate-900/90 border border-slate-700/80 rounded-lg p-3 space-y-2">
                    <h6 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      Método 1: Gerar o Pacote Oficial no PWABuilder (Recomendado pela Google)
                    </h6>
                    <p className="text-[11px] text-slate-400">
                      O <strong>PWABuilder</strong> empacota automaticamente o AngoPayX num ficheiro <strong>.aab</strong> (Android App Bundle) e <strong>.apk</strong> assinado, pronto para submeter na Google Play Console.
                    </p>
                    <a
                      href={`https://www.pwabuilder.com/reportcard?url=${encodeURIComponent(mobileShareUrl || currentUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg text-xs transition shadow-md cursor-pointer mt-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Gerar Pacote Android no PWABuilder</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-300">
                    <p className="font-semibold text-white">4 Passos para Publicar no Google Play Console:</p>
                    <ol className="space-y-1.5 list-decimal list-inside text-slate-300">
                      <li>
                        Acesse a sua conta no <a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Google Play Console</a> e clique em <strong>Criar Aplicativo</strong>.
                      </li>
                      <li>
                        Dê o nome de <strong>AngoPayX</strong> e escolha a categoria <strong>Finanças</strong>.
                      </li>
                      <li>
                        No menu <strong>Versão do App</strong>, faça o upload do ficheiro <strong>.aab</strong> descarregado do PWABuilder.
                      </li>
                      <li>
                        Envie para revisão da Google (a equipa da Google aprova geralmente entre 24 a 48 horas).
                      </li>
                    </ol>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1 text-slate-400 font-mono">
                    <p><strong className="text-slate-300">Host URL:</strong> {mobileShareUrl || currentUrl}</p>
                    <p><strong className="text-slate-300">Manifest:</strong> {mobileShareUrl || currentUrl}/manifest.webmanifest</p>
                    <p><strong className="text-slate-300">AssetLinks:</strong> {mobileShareUrl || currentUrl}/.well-known/assetlinks.json</p>
                  </div>
                </div>
              ) : activeTab === 'ios' ? (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Apple className="w-4 h-4 text-emerald-400" /> Como instalar no Safari do iPhone / iPad:
                  </p>
                  <ol className="space-y-2.5 list-decimal list-inside text-slate-300 leading-relaxed">
                    <li>
                      Abra este link no navegador <strong>Safari</strong> do iPhone.
                    </li>
                    <li className="flex items-center gap-1.5">
                      Toque no botão <Share className="w-4 h-4 text-emerald-400 inline" /> <strong>Partilhar</strong> na barra inferior do Safari.
                    </li>
                    <li className="flex items-center gap-1.5">
                      Deslize para baixo e escolha <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> <strong>Adicionar ao Ecrã Principal</strong>.
                    </li>
                    <li>
                      Toque em <strong>Adicionar</strong> no canto superior direito.
                    </li>
                  </ol>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    O ícone do AngoPayX aparecerá no ecrã como qualquer aplicação instalada pela App Store!
                  </p>
                </div>
              ) : activeTab === 'desktop' ? (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-emerald-400" /> No Google Chrome ou Microsoft Edge (PC/Mac):
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-300">
                    <li>Olhe para o canto direito da barra de endereço URL do navegador.</li>
                    <li>Clique no ícone de <strong>Instalar Aplicação</strong> (um pequeno computador ou sinal de + com seta).</li>
                    <li>Confirme clicando em <strong>Instalar</strong>.</li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <p className="font-semibold text-white flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" /> No Google Chrome ou Samsung Internet (Android):
                  </p>
                  <ol className="space-y-2 list-decimal list-inside text-slate-300">
                    <li>Toque no menu de <strong>3 pontos verticais (⋮)</strong> no canto superior direito.</li>
                    <li>Selecione <strong>Instalar Aplicativo</strong> ou <strong>Adicionar ao Ecrã Principal</strong>.</li>
                    <li>Confirme a instalação.</li>
                  </ol>
                </div>
              )}

              {/* QR Code and Quick Link section to open on Mobile */}
              <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-center gap-4">
                {qrCodeUrl && (
                  <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                    <img src={qrCodeUrl} alt="QR Code AngoPayX" className="w-28 h-28" />
                  </div>
                )}
                <div className="space-y-2 w-full">
                  <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    Abrir diretamente no telemóvel
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Aponte a câmara do telemóvel ao código QR acima ou copie o endereço para abrir no seu telemóvel e instalar.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      readOnly
                      value={mobileShareUrl || currentUrl}
                      className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 w-full font-mono text-[11px] focus:outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Advantages of the PWA */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
            <div className="p-2 bg-slate-950/50 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-200">100% Seguro</p>
              <p className="text-[9px] text-slate-400">Criptografia SSL</p>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg">
              <Smartphone className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-200">Ecrã Total</p>
              <p className="text-[9px] text-slate-400">Sem barra do navegador</p>
            </div>
            <div className="p-2 bg-slate-950/50 rounded-lg">
              <Download className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-[10px] font-bold text-slate-200">Super Leve</p>
              <p className="text-[9px] text-slate-400">Ocupa menos de 3MB</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">AngoPayX PWA • v1.0.0</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
