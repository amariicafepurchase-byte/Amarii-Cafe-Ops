/**
 * Offline Sync and Network Resilience Strategy for Amarii Cafe Operations.
 * Manages offline checklist queues, local persistence, network detection,
 * and automatic synchronization with Firebase once connection is restored.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TaskItem, ShiftRecord } from '../types';

export interface QueuedChecklistSubmission {
  id: string;
  createdAt: string;
  headerName: string;
  submitterName: string;
  finalizedTasks: TaskItem[];
  freshBlankTasks: TaskItem[];
  shiftRecord: ShiftRecord;
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = 'amarii_offline_checklist_queue_v1';
const OFFLINE_TASKS_CACHE_KEY = 'amarii_offline_tasks_cache_v1';

/**
 * Returns whether the device is currently online.
 */
export function isDeviceOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * React hook to observe online / offline network connectivity changes.
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => isDeviceOnline());

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network Monitor] Network connection restored (Online).');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.warn('[Network Monitor] Connection lost. Switching to offline cache mode.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Retrieves all pending offline submissions from localStorage.
 */
export function getQueuedSubmissions(): QueuedChecklistSubmission[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('[OfflineSync] Failed to read queue:', err);
    return [];
  }
}

/**
 * Enqueues a checklist submission to be synced when back online.
 */
export function enqueueOfflineSubmission(submission: Omit<QueuedChecklistSubmission, 'id' | 'createdAt' | 'retryCount'>): QueuedChecklistSubmission {
  const queue = getQueuedSubmissions();
  const newItem: QueuedChecklistSubmission = {
    ...submission,
    id: `offline-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };

  const updated = [...queue, newItem];
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    console.log(`[OfflineSync] Enqueued offline submission for "${newItem.headerName}". Queue length: ${updated.length}`);
  } catch (err) {
    console.error('[OfflineSync] Failed to write to queue:', err);
  }

  // Dispatch custom window event so UI can react immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amarii-offline-queue-changed', { detail: { count: updated.length } }));
  }

  return newItem;
}

/**
 * Removes a submission from the offline queue.
 */
export function removeQueuedSubmission(id: string): void {
  const queue = getQueuedSubmissions();
  const filtered = queue.filter((item) => item.id !== id);
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('[OfflineSync] Failed to remove from queue:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('amarii-offline-queue-changed', { detail: { count: filtered.length } }));
  }
}

/**
 * Saves current active tasks to local offline cache so staff never lose answers.
 */
export function cacheTasksLocally(tasks: TaskItem[]): void {
  try {
    if (!tasks || tasks.length === 0) return;
    localStorage.setItem(OFFLINE_TASKS_CACHE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore quota errors
  }
}

/**
 * Retrieves cached tasks from local offline storage.
 */
export function getCachedTasksLocally(): TaskItem[] | null {
  try {
    const raw = localStorage.getItem(OFFLINE_TASKS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Synchronizes all pending queued submissions with Firebase Firestore.
 */
export async function flushOfflineQueue(
  batchSaveTasks: (tasks: TaskItem[]) => Promise<void>,
  saveShift: (shift: ShiftRecord) => Promise<void>
): Promise<{ syncedCount: number; failedCount: number; errors: any[] }> {
  const queue = getQueuedSubmissions();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, errors: [] };
  }

  console.log(`[OfflineSync] Flushing offline queue (${queue.length} pending)...`);
  let syncedCount = 0;
  let failedCount = 0;
  const errors: any[] = [];

  for (const item of queue) {
    try {
      // 1. Batch save finalized permanent records and blank tasks
      const allTasksToSave = [...(item.finalizedTasks || []), ...(item.freshBlankTasks || [])];
      if (allTasksToSave.length > 0) {
        await batchSaveTasks(allTasksToSave);
      }

      // 2. Save permanent shift record to Firestore
      if (item.shiftRecord) {
        await saveShift(item.shiftRecord);
      }

      // 3. Remove successfully synced item from queue
      removeQueuedSubmission(item.id);
      syncedCount++;
      console.log(`[OfflineSync] Successfully synced offline checklist: "${item.headerName}"`);
    } catch (err) {
      failedCount++;
      errors.push(err);
      console.error(`[OfflineSync] Error syncing item ${item.id}:`, err);

      // Increment retry count
      const currentQueue = getQueuedSubmissions();
      const updated = currentQueue.map((q) => (q.id === item.id ? { ...q, retryCount: q.retryCount + 1 } : q));
      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
      } catch {}
    }
  }

  return { syncedCount, failedCount, errors };
}

/**
 * React hook to manage automatic synchronization when connection returns.
 */
export function useOfflineAutoSync(
  batchSaveTasks: (tasks: TaskItem[]) => Promise<void>,
  saveShift: (shift: ShiftRecord) => Promise<void>,
  onSyncComplete?: (syncedCount: number) => void
) {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(() => getQueuedSubmissions().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const isSyncingRef = useRef(false);

  // Keep pending count in sync with custom events
  useEffect(() => {
    const handleQueueChange = (e: any) => {
      setPendingCount(e?.detail?.count ?? getQueuedSubmissions().length);
    };

    window.addEventListener('amarii-offline-queue-changed', handleQueueChange);
    return () => {
      window.removeEventListener('amarii-offline-queue-changed', handleQueueChange);
    };
  }, []);

  const triggerSync = useCallback(async () => {
    if (!isDeviceOnline() || isSyncingRef.current) return;
    const currentQueue = getQueuedSubmissions();
    if (currentQueue.length === 0) return;

    try {
      isSyncingRef.current = true;
      setIsSyncing(true);

      const result = await flushOfflineQueue(batchSaveTasks, saveShift);
      const remaining = getQueuedSubmissions().length;
      setPendingCount(remaining);

      if (result.syncedCount > 0 && onSyncComplete) {
        onSyncComplete(result.syncedCount);
      }
    } catch (err) {
      console.warn('[OfflineAutoSync] Sync attempt failed:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [batchSaveTasks, saveShift, onSyncComplete]);

  // Trigger sync automatically when online state transitions to true
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline, triggerSync]);

  // Periodic fallback check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDeviceOnline() && getQueuedSubmissions().length > 0) {
        triggerSync();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [triggerSync]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  };
}
