import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global flag to prevent double-reloading loops across hook instances or event listeners
let isGlobalReloading = false;

// Version information embedded in build
const CURRENT_APP_VERSION = '2.5.0';

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
  const [autoUpdateCountdown, setAutoUpdateCountdown] = useState<number | null>(null);
  const [isAutoUpdatePaused, setIsAutoUpdatePaused] = useState<boolean>(false);

  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  const safeReload = useCallback(() => {
    if (isGlobalReloading) return;
    isGlobalReloading = true;
    
    // Flag to indicate that we just updated successfully
    try {
      sessionStorage.setItem('ansama_app_just_updated', 'true');
    } catch {
      // ignore
    }

    // Give time to persist any unsaved local state, then reload safely
    setTimeout(() => {
      window.location.reload();
    }, 250);
  }, []);

  // Check if we just reloaded after an automatic update
  useEffect(() => {
    try {
      const justUpdated = sessionStorage.getItem('ansama_app_just_updated');
      if (justUpdated === 'true') {
        sessionStorage.removeItem('ansama_app_just_updated');
        setUpdateFeedback('¡Aplicación actualizada a la versión más reciente con éxito!');
        setTimeout(() => setUpdateFeedback(null), 5000);
      }
    } catch {
      // ignore
    }
  }, []);

  // Helper to trigger update found state
  const notifyUpdateFound = useCallback(() => {
    if (isUpdatingRef.current) return;
    setHasNewUpdate(true);
    setUpdateFeedback('¡Nueva versión detectada! Se descargará e instalará automáticamente...');
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

    const attachRegistration = (reg: ServiceWorkerRegistration) => {
      setSwRegistration(reg);

      // Check if there is already a waiting worker
      if (reg.waiting) {
        notifyUpdateFound();
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              notifyUpdateFound();
            }
          });
        }
      });
    };

    navigator.serviceWorker.ready
      .then(attachRegistration)
      .catch((err) => {
        console.warn('Service worker ready check:', err);
      });

    // Also query active registrations directly
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) attachRegistration(reg);
    }).catch(() => {});

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
  }, [safeReload, notifyUpdateFound]);

  // Apply update safely without leaving the screen blank
  const applyUpdate = useCallback(() => {
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;
    setUpdateFeedback('Descargando e instalando actualización automáticamente...');

    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Safe single reload trigger after short buffer
    setTimeout(() => {
      safeReload();
    }, 350);
  }, [swRegistration, safeReload]);

  // AUTOMATIC UPDATE: Start 5-second countdown when an update is detected
  useEffect(() => {
    if (hasNewUpdate && !isAutoUpdatePaused) {
      setAutoUpdateCountdown(5);
      setUpdateFeedback('¡Nueva versión detectada! Se descargará e instalará automáticamente en 5 segundos...');

      const interval = setInterval(() => {
        setAutoUpdateCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            applyUpdate();
            return 0;
          }
          const nextVal = prev - 1;
          setUpdateFeedback(`¡Nueva versión detectada! Se actualizará automáticamente en ${nextVal}s...`);
          return nextVal;
        });
      }, 1000);

      countdownTimerRef.current = interval;

      return () => {
        clearInterval(interval);
      };
    } else if (!hasNewUpdate) {
      setAutoUpdateCountdown(null);
    }
  }, [hasNewUpdate, isAutoUpdatePaused, applyUpdate]);

  // Periodic automatic background update checking (every 30 seconds + tab focus/online)
  useEffect(() => {
    const runBackgroundCheck = async () => {
      if (!navigator.onLine || hasNewUpdate || isUpdatingRef.current) return;

      // 1. Service Worker update check
      if (swRegistration) {
        try {
          await swRegistration.update();
          if (swRegistration.waiting) {
            notifyUpdateFound();
            return;
          }
        } catch {
          // ignore
        }
      }

      // 2. Fetch remote version.json with cache bust
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (res.ok) {
          const data = await res.json();
          // Check if remote version or buildTime is newer
          const lastKnownBuildTime = parseInt(localStorage.getItem('ansama_app_build_time') || '0', 10);
          if (data.buildTime && lastKnownBuildTime && data.buildTime > lastKnownBuildTime) {
            localStorage.setItem('ansama_app_build_time', String(data.buildTime));
            notifyUpdateFound();
          } else if (!lastKnownBuildTime && data.buildTime) {
            localStorage.setItem('ansama_app_build_time', String(data.buildTime));
          }
        }
      } catch {
        // offline or quiet fail
      }
    };

    // Initial check after short delay
    const initialTimer = setTimeout(runBackgroundCheck, 3000);
    const interval = setInterval(runBackgroundCheck, 30000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runBackgroundCheck();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', runBackgroundCheck);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', runBackgroundCheck);
    };
  }, [swRegistration, hasNewUpdate, notifyUpdateFound]);

  const pauseAutoUpdate = useCallback(() => {
    setIsAutoUpdatePaused(true);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }
    setAutoUpdateCountdown(null);
    setUpdateFeedback('Actualización automática en pausa. Pulsa «Actualizar ahora» cuando desees.');
    setTimeout(() => setUpdateFeedback(null), 4000);
  }, []);

  const resumeAutoUpdate = useCallback(() => {
    setIsAutoUpdatePaused(false);
    applyUpdate();
  }, [applyUpdate]);

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

  // Manual Check for Updates (Independent of the automatic background update)
  const checkForUpdates = useCallback(async () => {
    // If an update is already detected and waiting, apply immediately
    if (hasNewUpdate) {
      applyUpdate();
      return;
    }

    setIsCheckingUpdate(true);
    setUpdateFeedback('Buscando actualizaciones en el servidor...');

    let updateDetected = false;

    // Check Service Worker
    if ('serviceWorker' in navigator && swRegistration) {
      try {
        await swRegistration.update();
        if (swRegistration.waiting) {
          updateDetected = true;
          notifyUpdateFound();
        }
      } catch (err) {
        console.warn('Aviso comprobación actualización SW:', err);
      }
    }

    // Check version.json
    try {
      const res = await fetch(`./version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        const lastKnownBuildTime = parseInt(localStorage.getItem('ansama_app_build_time') || '0', 10);
        if (data.buildTime && lastKnownBuildTime && data.buildTime > lastKnownBuildTime) {
          updateDetected = true;
          localStorage.setItem('ansama_app_build_time', String(data.buildTime));
          notifyUpdateFound();
        }
      }
    } catch {
      // quiet
    }

    // Finished checking
    setTimeout(() => {
      setIsCheckingUpdate(false);
      if (!updateDetected && !hasNewUpdate) {
        setUpdateFeedback('Tu aplicación ya está en la versión más reciente (v2.5).');
        setTimeout(() => setUpdateFeedback(null), 3500);
      }
    }, 700);
  }, [swRegistration, hasNewUpdate, applyUpdate, notifyUpdateFound]);

  return {
    isInstalled,
    isInstallable: !!deferredPrompt,
    hasNewUpdate,
    isCheckingUpdate,
    updateFeedback,
    autoUpdateCountdown,
    isAutoUpdatePaused,
    installApp,
    applyUpdate,
    checkForUpdates,
    pauseAutoUpdate,
    resumeAutoUpdate,
    setHasNewUpdate,
    setUpdateFeedback,
  };
}
