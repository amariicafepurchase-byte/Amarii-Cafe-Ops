import { useState, useEffect, useCallback } from 'react';
import {
  QueuedTaskOperation,
  QueuedTaskOperationPayload,
  subscribeToTaskQueue,
  getStoredQueue,
  getLastSyncTime,
  processTaskQueue,
  clearTaskQueue,
  executeTaskOperationWithQueue,
} from '../lib/taskQueue';

export interface UseTaskQueueReturn {
  queue: QueuedTaskOperation[];
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  triggerSync: () => Promise<{ processed: number; remaining: number; failed: number }>;
  clearQueue: () => void;
  executeOp: (
    payload: QueuedTaskOperationPayload
  ) => Promise<{ synced: boolean; queued: boolean; error?: Error }>;
}

export function useTaskQueue(): UseTaskQueueReturn {
  const [queue, setQueue] = useState<QueuedTaskOperation[]>(() => getStoredQueue());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(() => getLastSyncTime());

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = subscribeToTaskQueue((updatedQueue, syncing) => {
      setQueue(updatedQueue);
      setIsSyncing(syncing);
      setLastSyncTime(getLastSyncTime());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(async () => {
    const result = await processTaskQueue();
    setLastSyncTime(getLastSyncTime());
    return result;
  }, []);

  const clear = useCallback(() => {
    clearTaskQueue();
  }, []);

  const executeOp = useCallback(
    async (payload: QueuedTaskOperationPayload) => {
      return executeTaskOperationWithQueue(payload);
    },
    []
  );

  return {
    queue,
    pendingCount: queue.length,
    isOnline,
    isSyncing,
    lastSyncTime,
    triggerSync,
    clearQueue: clear,
    executeOp,
  };
}
