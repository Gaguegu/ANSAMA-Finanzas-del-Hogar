import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global flag to prevent double-reloading loops across hook instances or event listeners
let isGlobalReloading = false;

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateFeedback, setUpdateFeedback] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const safeReload = useCallback(() => {
    if (isGlobalReloading) return;
    isGlobalReloading = true;
    
    // Give time to persist any unsaved local state if any, then reload safely
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }, []);

  // Monitor installation status
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(standalone);
    };

    checkStandalone();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkStandalone();
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Monitor Service Worker updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => {
        setSwRegistration(reg);

        // Check if there is already a waiting worker
        if (reg.waiting) {
          setHasNewUpdate(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // A new update is ready!
                  setHasNewUpdate(true);
                }
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Service worker ready check:', err);
      });

    // Auto-reload when new controller takes over - guarded
    const handleControllerChange = () => {
      if (!isGlobalReloading) {
        safeReload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [safeReload]);

  // Install trigger
  const installApp = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (e) {
      console.error('Error during PWA prompt:', e);
    }
    return false;
  }, [deferredPrompt]);

  // Apply update safely without leaving the screen blank
  const applyUpdate = useCallback(() => {
    setUpdateFeedback('Aplicando actualización...');
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Safe single reload trigger after short buffer
    setTimeout(() => {
      safeReload();
    }, 600);
  }, [swRegistration, safeReload]);

  // Manual Check for Updates
  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback('Comprobando actualizaciones...');

    if ('serviceWorker' in navigator && swRegistration) {
      try {
        await swRegistration.update();
        if (swRegistration.waiting) {
          setHasNewUpdate(true);
          setUpdateFeedback('¡Nueva versión lista! Aplicando...');
          setTimeout(() => applyUpdate(), 800);
          return;
        }
      } catch (err) {
        console.warn('Aviso comprobación actualización:', err);
      }
    }

    // Finished checking: inform user without forcing blank reload
    setTimeout(() => {
      setIsCheckingUpdate(false);
      if (!hasNewUpdate) {
        setUpdateFeedback('Tu aplicación está al día con la versión más reciente.');
        setTimeout(() => setUpdateFeedback(null), 3000);
      }
    }, 900);
  }, [swRegistration, hasNewUpdate, applyUpdate]);

  return {
    isInstalled,
    isInstallable: !!deferredPrompt,
    hasNewUpdate,
    isCheckingUpdate,
    updateFeedback,
    installApp,
    applyUpdate,
    checkForUpdates,
    setHasNewUpdate,
    setUpdateFeedback,
  };
}
