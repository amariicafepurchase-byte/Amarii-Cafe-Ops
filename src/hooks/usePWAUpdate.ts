import { useEffect, useState, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState<boolean>(false);
  const [offlineReady, setOfflineReady] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  const updateApp = useCallback(async () => {
    setIsUpdating(true);
    console.log('[PWA Update] Updating application to latest build...');

    try {
      // 1. If there is a waiting worker, post SKIP_WAITING
      if (swRegistration?.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Call updateSW from virtual:pwa-register
      if (updateSWFnRef.current) {
        await updateSWFnRef.current(true);
      }
    } catch (err) {
      console.warn('[PWA Update] Error during updateSW invocation:', err);
    } finally {
      // 3. Force reload page to fetch fresh Vercel build
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  }, [swRegistration]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const updateFn = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA SW] New content available! Update prompt activated.');
          setNeedRefresh(true);
        },
        onOfflineReady() {
          console.log('[PWA SW] App is ready for offline operation.');
          setOfflineReady(true);
        },
        onRegisteredSW(_swScriptUrl, registration) {
          if (!registration) return;
          setSwRegistration(registration);

          console.log('[PWA SW] Service worker registered successfully.');

          // 1. Immediate update check on launch/resume
          registration.update().catch((err) => {
            console.debug('[PWA SW] Launch registration.update notice:', err?.message || err);
          });

          // 2. Periodic update check every 60 seconds
          const interval = setInterval(() => {
            console.log('[PWA SW] Polling for Service Worker updates...');
            registration.update().catch((err) => {
              console.debug('[PWA SW] Periodic update check notice:', err?.message || err);
            });
          }, 60000);

          // 3. Update check when staff unlocks device / resumes tab (visibilitychange & focus)
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              console.log('[PWA SW] Tab resumed/visible, checking for Service Worker update...');
              registration.update().catch((err) => {
                console.debug('[PWA SW] Resume update check notice:', err?.message || err);
              });
            }
          };

          const handleFocus = () => {
            console.log('[PWA SW] Window focused, checking for Service Worker update...');
            registration.update().catch((err) => {
              console.debug('[PWA SW] Focus update check notice:', err?.message || err);
            });
          };

          document.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('focus', handleFocus);

          return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', handleFocus);
          };
        },
        onRegisterError(error) {
          console.warn('[PWA SW] SW registration error:', error);
        },
      });

      updateSWFnRef.current = updateFn;
    } catch (err) {
      console.warn('[PWA SW] Service worker registration exception:', err);
    }
  }, []);

  // Listen to controllerchange: automatically reloads when new SW activates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[PWA SW] Controller changed -> reloading to activate latest deployment...');
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return {
    needRefresh,
    offlineReady,
    isUpdating,
    updateApp,
    dismissUpdate,
    swRegistration,
  };
}
