import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

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

    // Auto-reload when new controller takes over
    let refreshing = false;
    const handleControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  // Auto-update timer if an update is waiting
  useEffect(() => {
    if (hasNewUpdate) {
      // Auto-update after 6 seconds of notification, or user can click manually
      const timer = setTimeout(() => {
        applyUpdate();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [hasNewUpdate]);

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

  // Apply update
  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Force reload with cache bypass
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, [swRegistration]);

  // Manual Check for Updates
  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    setUpdateFeedback('Buscando actualizaciones...');

    if ('serviceWorker' in navigator && swRegistration) {
      try {
        await swRegistration.update();
        if (swRegistration.waiting) {
          setHasNewUpdate(true);
          setUpdateFeedback('¡Nueva actualización detectada! Aplicando...');
          setTimeout(() => applyUpdate(), 1000);
          return;
        }
      } catch (err) {
        console.warn('Error al verificar actualización:', err);
      }
    }

    // Short simulated check in dev mode / client cache verification
    setTimeout(() => {
      setIsCheckingUpdate(false);
      if (!hasNewUpdate) {
        setUpdateFeedback('Tu aplicación está al día con la última versión.');
        setTimeout(() => setUpdateFeedback(null), 3500);
      }
    }, 1200);
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
