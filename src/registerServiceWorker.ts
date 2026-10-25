/**
 * Service Worker Registration & Version Update Engine
 * Amarii Café Operations - PWA / Vercel Deployments
 *
 * Implements:
 * 1. 60-second periodic update polling (`registration.update()`)
 * 2. Focus & visibility change detection (`window.onfocus`, `visibilitychange`)
 * 3. Reactive 'waiting' Service Worker state detection (`hasNewUpdate: true`)
 * 4. 1-Click Update: postMessage({ type: 'SKIP_WAITING' }), caches purge, and reload
 * 5. Strict Zero Data Loss: LocalStorage & user session preserved intact
 */

export interface ServiceWorkerUpdateCallbacks {
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: unknown) => void;
}

let activeRegistration: ServiceWorkerRegistration | null = null;
let pollIntervalId: any = null;
let isControllerChanging = false;

/**
 * Registers the Service Worker and sets up periodic update checks
 */
export async function registerServiceWorker(
  callbacks: ServiceWorkerUpdateCallbacks = {}
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.info('[PWA SW] Service workers not supported in this environment.');
    return null;
  }

  try {
    // 1. Register Service Worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    activeRegistration = registration;
    console.log('[PWA SW] Registered successfully with scope:', registration.scope);

    // 2. Helper to notify update
    const notifyUpdate = (reg: ServiceWorkerRegistration) => {
      console.log('[PWA SW] ✨ New version detected in waiting state!');
      if (callbacks.onUpdateAvailable) {
        callbacks.onUpdateAvailable(reg);
      }
    };

    // 3. Check if there is already a waiting worker from a previous background download
    if (registration.waiting) {
      notifyUpdate(registration);
    }

    // 4. Listen for newly installing worker entering 'waiting' / 'installed' state
    registration.addEventListener('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed') {
          // If navigator.serviceWorker.controller is present, this is an update to an existing installation
          if (navigator.serviceWorker.controller) {
            notifyUpdate(registration);
          } else if (callbacks.onOfflineReady) {
            callbacks.onOfflineReady();
          }
        }
      });
    });

    // 5. Initial check for updates immediately on app launch
    registration.update().catch((err) => {
      console.debug('[PWA SW] Initial update check notice:', err?.message || err);
    });

    // 6. Periodic check every 60 seconds
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
    }
    pollIntervalId = setInterval(() => {
      console.log('[PWA SW] 60s periodic update check triggered...');
      registration.update().catch((err) => {
        console.debug('[PWA SW] Periodic update poll notice:', err?.message || err);
      });
    }, 60000);

    // 7. Check for updates on visibility change (when staff unlocks phone or returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[PWA SW] Tab resumed/visible, checking for Vercel deployment update...');
        registration.update().catch((err) => {
          console.debug('[PWA SW] Visibility update check notice:', err?.message || err);
        });
      }
    };

    // 8. Check for updates on window focus
    const handleFocus = () => {
      console.log('[PWA SW] Window focused, checking for Vercel deployment update...');
      registration.update().catch((err) => {
        console.debug('[PWA SW] Focus update check notice:', err?.message || err);
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // 9. Listen for controller change
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (isControllerChanging) return;
      isControllerChanging = true;
      console.log('[PWA SW] Controller changed -> reloading to activate latest deployment...');
      window.location.reload();
    });

    return registration;
  } catch (error) {
    console.warn('[PWA SW] Registration failed:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
    return null;
  }
}

/**
 * Executes 1-Click Instant Update:
 * 1. Post { type: 'SKIP_WAITING' } to waiting worker
 * 2. Purge temporary CacheStorage asset caches (preserving all localStorage & session data)
 * 3. Force-reload window immediately
 */
export async function executeAppUpdate(customRegistration?: ServiceWorkerRegistration | null): Promise<void> {
  const reg = customRegistration || activeRegistration;
  console.log('[PWA Update] Executing update to latest Vercel deployment...');

  try {
    // 1. Post SKIP_WAITING to waiting worker
    if (reg?.waiting) {
      console.log('[PWA Update] Sending SKIP_WAITING to waiting worker...');
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else if (reg?.installing) {
      console.log('[PWA Update] Sending SKIP_WAITING to installing worker...');
      reg.installing.postMessage({ type: 'SKIP_WAITING' });
    } else if (navigator.serviceWorker?.controller) {
      console.log('[PWA Update] Posting SKIP_WAITING to active controller...');
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }

    // 2. Clear temporary CacheStorage asset caches (CSS, JS chunks, images)
    // NOTE: This strictly does NOT clear localStorage or indexedDB!
    // Staff credentials, active station, and local task cache remain 100% intact.
    if ('caches' in window) {
      try {
        const cacheNames = await window.caches.keys();
        console.log(`[PWA Update] Clearing ${cacheNames.length} asset cache(s)...`);
        await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
        console.log('[PWA Update] Asset caches cleared successfully.');
      } catch (cacheErr) {
        console.warn('[PWA Update] Non-fatal cache clearing notice:', cacheErr);
      }
    }
  } catch (err) {
    console.warn('[PWA Update] Warning during update sequence:', err);
  } finally {
    // 3. Force-reload the window immediately
    console.log('[PWA Update] Forcing window reload to load latest deployment...');
    setTimeout(() => {
      window.location.reload();
    }, 150);
  }
}

/**
 * Returns current active registration
 */
export function getActiveRegistration(): ServiceWorkerRegistration | null {
  return activeRegistration;
}
