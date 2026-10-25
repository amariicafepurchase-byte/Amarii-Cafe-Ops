import { useEffect, useState, useRef, useCallback } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface UsePWAUpdateReturn {
  hasNewUpdate: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  isUpdating: boolean;
  updateApp: () => Promise<void>;
  dismissUpdate: () => void;
  swRegistration: ServiceWorkerRegistration | null;
}

export function usePWAUpdate(): UsePWAUpdateReturn {
  const [hasNewUpdate, setHasNewUpdate] = useState<boolean>(false);
  const [offlineReady, setOfflineReady] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  // 1-Click Instant Update Execution
  const updateApp = useCallback(async () => {
    setIsUpdating(true);
    console.log('[PWA Update] Executing 1-Click update to latest Vercel deployment...');

    try {
      // 1. Post { type: 'SKIP_WAITING' } to registration.waiting
      if (swRegistration?.waiting) {
        console.log('[PWA Update] Posting SKIP_WAITING to waiting worker...');
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // 2. Call updateSW from virtual:pwa-register if registered
      if (updateSWFnRef.current) {
        await updateSWFnRef.current(true);
      }

      // 3. Clear temporary asset caches via caches.keys()
      // NOTE: Strictly does NOT clear localStorage or indexedDB!
      // User login, staff list, task data, and outlet selections are 100% preserved.
      if ('caches' in window) {
        try {
          const cacheKeys = await window.caches.keys();
          console.log(`[PWA Update] Clearing ${cacheKeys.length} asset cache(s)...`);
          await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
          console.log('[PWA Update] Asset caches cleared successfully.');
        } catch (cacheErr) {
          console.warn('[PWA Update] Cache clearing notice:', cacheErr);
        }
      }
    } catch (err) {
      console.warn('[PWA Update] Error during update sequence:', err);
    } finally {
      // 4. Force-reload the window immediately
      console.log('[PWA Update] Forcing window reload to load latest deployment...');
      setTimeout(() => {
        window.location.reload();
      }, 150);
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
          console.log('[PWA SW] ✨ New version detected in waiting state! Update prompt activated.');
          setHasNewUpdate(true);
        },
        onOfflineReady() {
          console.log('[PWA SW] App is ready for offline operation.');
          setOfflineReady(true);
        },
        onRegisteredSW(_swScriptUrl, registration) {
          if (!registration) return;
          setSwRegistration(registration);

          console.log('[PWA SW] Service worker registered successfully.');

          // Check if there is already a waiting worker
          if (registration.waiting) {
            console.log('[PWA SW] Found existing waiting service worker on register.');
            setHasNewUpdate(true);
          }

          // Listen for updatefound event
          registration.addEventListener('updatefound', () => {
            const installing = registration.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA SW] New worker installed & waiting!');
                setHasNewUpdate(true);
              }
            });
          });

          // 1. Immediate update check on launch/resume
          registration.update().catch((err) => {
            console.debug('[PWA SW] Launch registration.update notice:', err?.message || err);
          });

          // 2. Periodic update check every 60 seconds
          const interval = setInterval(() => {
            console.log('[PWA SW] 60s periodic polling for Service Worker updates...');
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
    setHasNewUpdate(false);
  };

  return {
    hasNewUpdate,
    needRefresh: hasNewUpdate, // Backwards-compatible alias
    offlineReady,
    isUpdating,
    updateApp,
    dismissUpdate,
    swRegistration,
  };
}
