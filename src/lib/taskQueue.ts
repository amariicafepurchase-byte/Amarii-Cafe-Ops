import { TaskItem, TaskMedia } from '../types';
import {
  saveTaskToFirebase,
  deleteTaskFromFirebase,
  batchSaveTasksToFirebase,
  batchDeleteTasksFromFirebase,
  updateTaskCompletion,
  updateTaskNoteInFirebase,
  updateTaskMediaInFirebase,
  updateTaskSubTasksInFirebase,
} from './firebase';

export type TaskOperationType =
  | 'SAVE_TASK'
  | 'DELETE_TASK'
  | 'BATCH_SAVE_TASKS'
  | 'BATCH_DELETE_TASKS'
  | 'UPDATE_COMPLETION'
  | 'UPDATE_NOTE'
  | 'UPDATE_MEDIA'
  | 'UPDATE_SUBTASKS';

export interface BaseQueuedOperation {
  id: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export type QueuedTaskOperation =
  | (BaseQueuedOperation & {
      type: 'SAVE_TASK';
      task: TaskItem;
    })
  | (BaseQueuedOperation & {
      type: 'DELETE_TASK';
      taskId: string;
    })
  | (BaseQueuedOperation & {
      type: 'BATCH_SAVE_TASKS';
      tasks: TaskItem[];
    })
  | (BaseQueuedOperation & {
      type: 'BATCH_DELETE_TASKS';
      taskIds: string[];
    })
  | (BaseQueuedOperation & {
      type: 'UPDATE_COMPLETION';
      taskId: string;
      completed: boolean;
      fullTask?: TaskItem;
    })
  | (BaseQueuedOperation & {
      type: 'UPDATE_NOTE';
      taskId: string;
      notes: string;
      fullTask?: TaskItem;
    })
  | (BaseQueuedOperation & {
      type: 'UPDATE_MEDIA';
      taskId: string;
      media: TaskMedia[];
      fullTask?: TaskItem;
    })
  | (BaseQueuedOperation & {
      type: 'UPDATE_SUBTASKS';
      taskId: string;
      subTasks: any[];
      fullTask?: TaskItem;
    });

export type QueuedTaskOperationPayload =
  | { type: 'SAVE_TASK'; task: TaskItem }
  | { type: 'DELETE_TASK'; taskId: string }
  | { type: 'BATCH_SAVE_TASKS'; tasks: TaskItem[] }
  | { type: 'BATCH_DELETE_TASKS'; taskIds: string[] }
  | { type: 'UPDATE_COMPLETION'; taskId: string; completed: boolean; fullTask?: TaskItem }
  | { type: 'UPDATE_NOTE'; taskId: string; notes: string; fullTask?: TaskItem }
  | { type: 'UPDATE_MEDIA'; taskId: string; media: TaskMedia[]; fullTask?: TaskItem }
  | { type: 'UPDATE_SUBTASKS'; taskId: string; subTasks: any[]; fullTask?: TaskItem };

const QUEUE_STORAGE_KEY = 'amarii_task_offline_queue';
const LAST_SYNC_KEY = 'amarii_task_last_sync_time';

type QueueChangeListener = (queue: QueuedTaskOperation[], isSyncing: boolean) => void;
const listeners = new Set<QueueChangeListener>();

let isCurrentlySyncing = false;

// Notify all subscribed listeners
function notifyListeners() {
  const currentQueue = getStoredQueue();
  listeners.forEach((listener) => {
    try {
      listener(currentQueue, isCurrentlySyncing);
    } catch (e) {
      console.error('Error in task queue listener:', e);
    }
  });
}

// Subscribe to queue changes
export function subscribeToTaskQueue(listener: QueueChangeListener): () => void {
  listeners.add(listener);
  // Initial fire
  try {
    listener(getStoredQueue(), isCurrentlySyncing);
  } catch (e) {
    console.error('Initial listener fire error:', e);
  }
  return () => {
    listeners.delete(listener);
  };
}

// Helper to sanitize payload for localStorage to avoid 5MB browser quota limits
function sanitizePayloadForStorage(op: QueuedTaskOperation): QueuedTaskOperation {
  try {
    const copy = JSON.parse(JSON.stringify(op));
    // If there are large base64 data URLs, trim them for offline storage persistence
    const stripDataUrl = (url?: string) => {
      if (!url) return url;
      if (url.startsWith('data:') && url.length > 2048) {
        // Truncate huge data urls in offline storage backup
        return url.substring(0, 500) + '...[offline_cached_preview]';
      }
      return url;
    };

    if ('task' in copy && copy.task?.media) {
      copy.task.media = copy.task.media.map((m: any) => ({
        ...m,
        url: stripDataUrl(m.url),
      }));
    }

    if ('fullTask' in copy && copy.fullTask?.media) {
      copy.fullTask.media = copy.fullTask.media.map((m: any) => ({
        ...m,
        url: stripDataUrl(m.url),
      }));
    }

    if ('media' in copy && Array.isArray(copy.media)) {
      copy.media = copy.media.map((m: any) => ({
        ...m,
        url: stripDataUrl(m.url),
      }));
    }

    if ('tasks' in copy && Array.isArray(copy.tasks)) {
      copy.tasks = copy.tasks.map((t: any) => ({
        ...t,
        media: t.media ? t.media.map((m: any) => ({ ...m, url: stripDataUrl(m.url) })) : undefined,
      }));
    }

    return copy;
  } catch {
    return op;
  }
}

// In-memory queue cache
let inMemoryQueue: QueuedTaskOperation[] = [];

// Safely retrieve stored queue from localStorage
export function getStoredQueue(): QueuedTaskOperation[] {
  if (inMemoryQueue.length > 0) return inMemoryQueue;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    inMemoryQueue = Array.isArray(parsed) ? parsed : [];
    return inMemoryQueue;
  } catch (e) {
    console.warn('Failed to parse offline task queue from storage:', e);
    return inMemoryQueue;
  }
}

// Save queue to localStorage with QuotaExceededError protection
function saveQueue(queue: QueuedTaskOperation[]): void {
  inMemoryQueue = queue;
  if (typeof window === 'undefined') return;

  try {
    // Keep most recent 40 items max
    const trimmed = queue.slice(-40);
    const sanitized = trimmed.map(sanitizePayloadForStorage);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(sanitized));
    notifyListeners();
  } catch (e) {
    // If localStorage quota exceeded, aggressively trim and clean
    try {
      console.warn('LocalStorage quota limit reached, optimizing task queue storage...');
      const compactQueue = queue.slice(-10).map(sanitizePayloadForStorage);
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(compactQueue));
      notifyListeners();
    } catch (innerErr) {
      console.warn('Failed to persist task queue to localStorage (retaining in-memory only):', innerErr);
      // Keep in-memory queue functioning without throwing
      notifyListeners();
    }
  }
}

// Retrieve last sync timestamp
export function getLastSyncTime(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const val = localStorage.getItem(LAST_SYNC_KEY);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

// Update last sync timestamp
function updateLastSyncTime(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  } catch {
    // Ignore storage issues
  }
}

// Add an operation to the local queue with smart coalescing
export function enqueueTaskOperation(payload: QueuedTaskOperationPayload): QueuedTaskOperation {
  const current = getStoredQueue();
  const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const base: BaseQueuedOperation = {
    id,
    timestamp: Date.now(),
    retryCount: 0,
  };

  const newOp = { ...base, ...payload } as QueuedTaskOperation;

  // Smart deduplication & coalescing
  let filtered = current;

  if (newOp.type === 'DELETE_TASK') {
    // If a task is being deleted, discard any pending updates for that same task
    filtered = current.filter((item) => {
      if ('taskId' in item && item.taskId === newOp.taskId) return false;
      if (item.type === 'SAVE_TASK' && item.task.id === newOp.taskId) return false;
      return true;
    });
  } else if (newOp.type === 'UPDATE_COMPLETION') {
    // Coalesce with prior completion updates for the same task
    filtered = current.filter(
      (item) => !(item.type === 'UPDATE_COMPLETION' && item.taskId === newOp.taskId)
    );
  } else if (newOp.type === 'UPDATE_NOTE') {
    // Coalesce with prior note updates for the same task
    filtered = current.filter(
      (item) => !(item.type === 'UPDATE_NOTE' && item.taskId === newOp.taskId)
    );
  } else if (newOp.type === 'UPDATE_SUBTASKS') {
    // Coalesce with prior subtask updates for the same task
    filtered = current.filter(
      (item) => !(item.type === 'UPDATE_SUBTASKS' && item.taskId === newOp.taskId)
    );
  } else if (newOp.type === 'UPDATE_MEDIA') {
    // Coalesce with prior media updates for the same task
    filtered = current.filter(
      (item) => !(item.type === 'UPDATE_MEDIA' && item.taskId === newOp.taskId)
    );
  } else if (newOp.type === 'SAVE_TASK') {
    // Coalesce with prior save of same task
    filtered = current.filter(
      (item) => !(item.type === 'SAVE_TASK' && item.task.id === newOp.task.id)
    );
  }

  const updatedQueue = [...filtered, newOp];
  saveQueue(updatedQueue);
  console.log(`[TaskQueue] Enqueued operation: ${newOp.type} (Queue size: ${updatedQueue.length})`);
  return newOp;
}

// Clear all queued operations (for admin reset or manual clearing)
export function clearTaskQueue(): void {
  saveQueue([]);
  console.log('[TaskQueue] Queue cleared.');
}

// Execute a single operation against Firestore
async function executeSingleOperation(op: QueuedTaskOperation): Promise<void> {
  switch (op.type) {
    case 'SAVE_TASK':
      await saveTaskToFirebase(op.task);
      break;
    case 'DELETE_TASK':
      await deleteTaskFromFirebase(op.taskId);
      break;
    case 'BATCH_SAVE_TASKS':
      await batchSaveTasksToFirebase(op.tasks);
      break;
    case 'BATCH_DELETE_TASKS':
      await batchDeleteTasksFromFirebase(op.taskIds);
      break;
    case 'UPDATE_COMPLETION':
      await updateTaskCompletion(op.taskId, op.completed, op.fullTask);
      break;
    case 'UPDATE_NOTE':
      await updateTaskNoteInFirebase(op.taskId, op.notes, op.fullTask);
      break;
    case 'UPDATE_MEDIA':
      await updateTaskMediaInFirebase(op.taskId, op.media, op.fullTask);
      break;
    case 'UPDATE_SUBTASKS':
      await updateTaskSubTasksInFirebase(op.taskId, op.subTasks, op.fullTask);
      break;
    default:
      console.warn('Unknown task operation type:', (op as any).type);
  }
}

// Process the queue: sequentially retries failed operations
export async function processTaskQueue(): Promise<{
  processed: number;
  remaining: number;
  failed: number;
}> {
  if (isCurrentlySyncing) {
    console.log('[TaskQueue] Sync already in progress, skipping duplicate call.');
    const q = getStoredQueue();
    return { processed: 0, remaining: q.length, failed: 0 };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[TaskQueue] Offline. Cannot process queue right now.');
    const q = getStoredQueue();
    return { processed: 0, remaining: q.length, failed: 0 };
  }

  const queue = getStoredQueue();
  if (queue.length === 0) {
    return { processed: 0, remaining: 0, failed: 0 };
  }

  isCurrentlySyncing = true;
  notifyListeners();
  console.log(`[TaskQueue] Starting sync of ${queue.length} pending operation(s)...`);

  let processedCount = 0;
  let failedCount = 0;
  const remainingQueue = [...queue];

  while (remainingQueue.length > 0) {
    const currentOp = remainingQueue[0];
    try {
      await executeSingleOperation(currentOp);
      // Remove succeeded op
      remainingQueue.shift();
      saveQueue(remainingQueue);
      processedCount++;
      console.log(`[TaskQueue] Successfully synced operation ${currentOp.type} (id: ${currentOp.id})`);
    } catch (err: any) {
      console.error(`[TaskQueue] Failed to execute queued operation ${currentOp.type}:`, err);
      failedCount++;
      currentOp.retryCount = (currentOp.retryCount || 0) + 1;
      currentOp.lastError = err?.message || 'Network error';

      // If permanently failing after excessive attempts (e.g. > 15), remove to prevent blockage
      if (currentOp.retryCount > 15) {
        console.warn(`[TaskQueue] Discarding operation ${currentOp.id} after 15 failed retries.`);
        remainingQueue.shift();
      } else {
        // Stop sequential execution on connection failure to preserve ordering
        saveQueue(remainingQueue);
        break;
      }
      saveQueue(remainingQueue);
    }
  }

  isCurrentlySyncing = false;
  if (processedCount > 0) {
    updateLastSyncTime();
  }
  notifyListeners();

  console.log(
    `[TaskQueue] Sync pass complete. Processed: ${processedCount}, Remaining: ${remainingQueue.length}, Failed: ${failedCount}`
  );

  return {
    processed: processedCount,
    remaining: remainingQueue.length,
    failed: failedCount,
  };
}

/**
 * Universal executor for Task Management logic.
 * - If offline: immediately queues operation into localStorage for retry.
 * - If online: attempts immediate Firestore update; on any error, enqueues to localStorage.
 */
export async function executeTaskOperationWithQueue(
  payload: QueuedTaskOperationPayload
): Promise<{ synced: boolean; queued: boolean; error?: Error }> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const existingQueue = getStoredQueue();

  // If offline OR if older items are already pending in queue, enqueue first to maintain strictly ordered execution!
  if (!isOnline || existingQueue.length > 0) {
    console.log(`[TaskQueue] Enqueueing ${payload.type} to maintain FIFO ordering (Queue size: ${existingQueue.length + 1}).`);
    enqueueTaskOperation(payload);
    if (isOnline) {
      processTaskQueue().catch((e) => console.warn('[TaskQueue] Queue flush error:', e));
    }
    return { synced: false, queued: true };
  }

  // Device reports online and queue is empty: attempt direct write
  try {
    const tempOp: QueuedTaskOperation = {
      id: `temp-${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0,
      ...payload,
    } as QueuedTaskOperation;

    await executeSingleOperation(tempOp);
    updateLastSyncTime();

    // If there are older queued operations waiting, trigger queue processing in the background
    const existingQueue = getStoredQueue();
    if (existingQueue.length > 0) {
      processTaskQueue().catch((e) => console.warn('[TaskQueue] Background sync error:', e));
    }

    return { synced: true, queued: false };
  } catch (err: any) {
    console.warn(`[TaskQueue] Direct Firestore update failed (${err?.message}). Storing in local queue...`, err);
    enqueueTaskOperation(payload);

    // Schedule an auto-retry shortly
    setTimeout(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        processTaskQueue().catch((e) => console.warn('[TaskQueue] Auto-retry error:', e));
      }
    }, 4000);

    return { synced: false, queued: true, error: err };
  }
}

// Setup background auto-retry triggers on window load
if (typeof window !== 'undefined') {
  // Listen for online event to automatically flush queue
  window.addEventListener('online', () => {
    console.log('[TaskQueue] Connection re-established. Automatically retrying pending queue...');
    setTimeout(() => {
      processTaskQueue().catch((e) => console.warn('[TaskQueue] Auto-retry on online error:', e));
    }, 1000);
  });

  // Background interval: periodic retry every 20 seconds if queue has items and device is online
  setInterval(() => {
    if (navigator.onLine) {
      const q = getStoredQueue();
      if (q.length > 0 && !isCurrentlySyncing) {
        console.log(`[TaskQueue] Periodic auto-retry check: ${q.length} item(s) pending sync...`);
        processTaskQueue().catch((e) => console.warn('[TaskQueue] Periodic retry error:', e));
      }
    }
  }, 20000);
}
