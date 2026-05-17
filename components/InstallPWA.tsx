import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado ou usuário dispensou
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;

    // Detectar iOS
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (ios && !standalone) {
      setIsIOS(true);
      setTimeout(() => setShowBanner(true), 3000);
      return;
    }

    // Android / Desktop Chrome
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!showBanner) return null;

  // Guia de instalação para iOS
  if (isIOS && showIOSGuide) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm border border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-lg">Instalar no iPhone/iPad</h3>
            <button onClick={handleDismiss} className="text-slate-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <p className="text-slate-300 text-sm">
                Toque no botão <strong className="text-white">Compartilhar</strong>{' '}
                <span className="inline-block bg-slate-700 px-1 rounded text-xs">⬆</span>{' '}
                na barra inferior do Safari
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <p className="text-slate-300 text-sm">
                Role para baixo e toque em{' '}
                <strong className="text-white">"Adicionar à Tela de Início"</strong>
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-teal-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <p className="text-slate-300 text-sm">
                Toque em <strong className="text-white">"Adicionar"</strong> no canto superior direito
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="mt-5 w-full bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-3 text-sm font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 safe-bottom">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-4 flex items-center gap-3 max-w-md mx-auto">
        {/* Ícone do app */}
        <div className="bg-teal-500 rounded-xl w-12 h-12 flex items-center justify-center shrink-0">
          <Smartphone size={22} className="text-white" />
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Instalar PrecificaPro</p>
          <p className="text-slate-400 text-xs">Acesse rapidamente como app nativo</p>
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-1"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
          <button
            onClick={isIOS ? () => setShowIOSGuide(true) : handleInstall}
            className="bg-teal-500 hover:bg-teal-400 text-white rounded-xl px-3 py-2 text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={15} />
            Instalar
          </button>
        </div>
      </div>
    </div>
  );
}
