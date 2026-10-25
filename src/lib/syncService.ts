import React from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import {
  db,
  sanitizeForFirestore,
  updateDisasterBackup,
  readDisasterBackup,
  isTaskBlacklisted,
} from './firebase';
import { TaskItem, StaffMember, ShiftRecord, Outlet, TaskEditRequest } from '../types';

const STORAGE_KEY_STAFF_V3 = 'amarii_staff_list_v3';
const STORAGE_KEY_TASKS_V3 = 'amarii_tasks_master_v3';
const STORAGE_KEY_SUBMISSIONS_V3 = 'amarii_submissions_v3';
const STORAGE_KEY_TASKS_MASTER_CACHE = 'amarii_tasks_master_cache';

const LEGACY_DEMO_STAFF_IDS = [
  'staff-1790256036455-md1v',
  'staff-admin-arjun',
  'user-mgr-kitchen',
  'user-mgr-bar',
  'user-staff-kitchen',
  'user-staff-barista',
  'user-staff-cashier',
  'user-staff-service',
  'user-staff-cleaning',
  'staff-m1', 'staff-k1', 'staff-k2', 'staff-k3',
  'staff-b1', 'staff-b2', 'staff-b3', 'staff-b4',
  'staff-h1', 'staff-h2', 'staff-h3',
  'staff-s1', 'staff-s2', 'staff-s3',
  'staff-bl1', 'staff-bl2',
];

const LEGACY_DEMO_OUTLET_IDS = [
  'outlet-main-street',
  'outlet-airport-lounge',
  'outlet-mall-kiosk',
];

// ============================================================================
// 1. FIREBASE CREDENTIAL VALIDATION & COLLECTION AUTO-DISCOVERY
// ============================================================================
export const PENDING_SYNC_QUEUE_KEY = 'amarii_pending_sync_queue';
export const SYNC_STATUS_EVENT = 'amarii-universal-sync-status';

export interface FirebaseCredentialValidation {
  isValid: boolean;
  projectId: string;
  appId: string;
  apiKeyPresent: boolean;
  databaseId: string;
  authDomain: string;
  missingFields: string[];
}

export function validateFirebaseCredentials(): FirebaseCredentialValidation {
  const cfg = (firebaseConfigData || {}) as Record<string, any>;
  const missingFields: string[] = [];

  if (!cfg.apiKey || typeof cfg.apiKey !== 'string' || cfg.apiKey.trim().length < 10) {
    missingFields.push('apiKey');
  }
  if (!cfg.projectId || typeof cfg.projectId !== 'string' || cfg.projectId === 'remixed-project-id') {
    missingFields.push('projectId');
  }
  if (!cfg.appId || typeof cfg.appId !== 'string') {
    missingFields.push('appId');
  }

  const databaseId =
    typeof cfg.firestoreDatabaseId === 'string' && cfg.firestoreDatabaseId.trim()
      ? cfg.firestoreDatabaseId.trim()
      : '(default)';

  return {
    isValid: missingFields.length === 0,
    projectId: cfg.projectId || '',
    appId: cfg.appId || '',
    apiKeyPresent: Boolean(cfg.apiKey),
    databaseId,
    authDomain: cfg.authDomain || '',
    missingFields,
  };
}

// ============================================================================
// 2. UNIVERSAL OFFLINE MUTATION QUEUE (amarii_pending_sync_queue)
// ============================================================================
export type SyncMutationAction = 'UPSERT' | 'BATCH_UPSERT' | 'DELETE' | 'BATCH_DELETE';

export interface PendingSyncMutation {
  id: string;
  collectionName: string;
  mirrorCollections?: string[];
  action: SyncMutationAction;
  docId?: string;
  data?: Record<string, any>;
  items?: Array<{ id: string; data: Record<string, any> }>;
  docIds?: string[];
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

let inMemoryPendingQueue: PendingSyncMutation[] | null = null;
let isFlushingQueue = false;

function sanitizeForLocalStorageQuota(obj: any): any {
  try {
    const clone = JSON.parse(JSON.stringify(obj));
    const trimUrl = (val: any) => {
      if (typeof val === 'string' && val.startsWith('data:') && val.length > 60000) {
        return val.substring(0, 55000);
      }
      return val;
    };
    const walk = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }
      for (const k of Object.keys(node)) {
        if (typeof node[k] === 'string') {
          node[k] = trimUrl(node[k]);
        } else if (typeof node[k] === 'object') {
          walk(node[k]);
        }
      }
    };
    walk(clone);
    return clone;
  } catch {
    return obj;
  }
}

export function getPendingSyncQueue(): PendingSyncMutation[] {
  if (inMemoryPendingQueue !== null) return inMemoryPendingQueue;
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
    if (!raw) {
      inMemoryPendingQueue = [];
      return [];
    }
    const parsed = JSON.parse(raw);
    inMemoryPendingQueue = Array.isArray(parsed) ? parsed : [];
    return inMemoryPendingQueue;
  } catch {
    inMemoryPendingQueue = [];
    return [];
  }
}

function savePendingSyncQueue(queue: PendingSyncMutation[]): void {
  inMemoryPendingQueue = queue;
  if (typeof window === 'undefined') return;
  try {
    const compact = queue.slice(-150).map(sanitizeForLocalStorageQuota);
    localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(compact));
  } catch {
    try {
      const minimal = queue.slice(-30).map(sanitizeForLocalStorageQuota);
      localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(minimal));
    } catch {
      // Keep in-memory queue intact if quota exceeded
    }
  }
  dispatchSyncStatusEvent();
}

function dispatchSyncStatusEvent() {
  if (typeof window === 'undefined') return;
  try {
    const q = getPendingSyncQueue();
    window.dispatchEvent(
      new CustomEvent(SYNC_STATUS_EVENT, {
        detail: {
          pendingCount: q.length,
          isFlushing: isFlushingQueue,
          timestamp: new Date().toISOString(),
        },
      })
    );
  } catch {}
}

/**
 * Enqueues a mutation into `amarii_pending_sync_queue` with intelligent coalescing
 * so repeated edits or deletes to the same document never conflict or bloat the queue.
 */
export function enqueuePendingMutation(
  mutation: Omit<PendingSyncMutation, 'id' | 'timestamp' | 'retryCount'>
): PendingSyncMutation {
  const current = getPendingSyncQueue();
  const newEntry: PendingSyncMutation = {
    ...mutation,
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  let filtered = [...current];

  if (newEntry.action === 'UPSERT' && newEntry.docId) {
    // Merge with any existing pending UPSERT for the same collection + docId
    const existingIdx = filtered.findIndex(
      (m) =>
        m.collectionName === newEntry.collectionName &&
        m.action === 'UPSERT' &&
        m.docId === newEntry.docId
    );
    if (existingIdx >= 0) {
      filtered[existingIdx] = {
        ...filtered[existingIdx],
        data: { ...(filtered[existingIdx].data || {}), ...(newEntry.data || {}) },
        timestamp: Date.now(),
      };
      savePendingSyncQueue(filtered);
      return filtered[existingIdx];
    }
  } else if (newEntry.action === 'DELETE' && newEntry.docId) {
    // Remove any pending UPSERT for the deleted docId
    filtered = filtered.filter(
      (m) =>
        !(
          m.collectionName === newEntry.collectionName &&
          m.docId === newEntry.docId &&
          m.action === 'UPSERT'
        )
    );
  } else if (newEntry.action === 'BATCH_DELETE' && Array.isArray(newEntry.docIds)) {
    const delSet = new Set(newEntry.docIds);
    filtered = filtered.filter(
      (m) =>
        !(
          m.collectionName === newEntry.collectionName &&
          m.docId &&
          delSet.has(m.docId) &&
          m.action === 'UPSERT'
        )
    );
  }

  filtered.push(newEntry);
  savePendingSyncQueue(filtered);
  return newEntry;
}

/**
 * Checks if a document ID has a pending unsynced UPSERT or DELETE in `amarii_pending_sync_queue`.
 */
export function getPendingIdsForCollection(collectionName: string): {
  pendingUpserts: Map<string, Record<string, any>>;
  pendingDeletes: Set<string>;
} {
  const queue = getPendingSyncQueue();
  const pendingUpserts = new Map<string, Record<string, any>>();
  const pendingDeletes = new Set<string>();

  for (const item of queue) {
    if (item.collectionName !== collectionName) continue;
    if (item.action === 'UPSERT' && item.docId && item.data) {
      pendingUpserts.set(item.docId, item.data);
      pendingDeletes.delete(item.docId);
    } else if (item.action === 'BATCH_UPSERT' && Array.isArray(item.items)) {
      for (const entry of item.items) {
        if (entry?.id && entry.data) {
          pendingUpserts.set(entry.id, entry.data);
          pendingDeletes.delete(entry.id);
        }
      }
    } else if (item.action === 'DELETE' && item.docId) {
      pendingDeletes.add(item.docId);
      pendingUpserts.delete(item.docId);
    } else if (item.action === 'BATCH_DELETE' && Array.isArray(item.docIds)) {
      for (const id of item.docIds) {
        if (id) {
          pendingDeletes.add(id);
          pendingUpserts.delete(id);
        }
      }
    }
  }

  return { pendingUpserts, pendingDeletes };
}

/**
 * Executes a single Firestore write/delete with a safe timeout.
 */
async function executeFirestoreMutation(
  mutation: Omit<PendingSyncMutation, 'id' | 'timestamp' | 'retryCount'>,
  timeoutMs = 3500
): Promise<boolean> {
  const creds = validateFirebaseCredentials();
  if (!creds.isValid) return false;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false;

  let timer: any;
  const timeoutPromise = new Promise<{ ok: false }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false }), timeoutMs);
  });

  const targetCollections = [
    mutation.collectionName,
    ...(mutation.mirrorCollections || []),
  ].filter(Boolean);

  try {
    const workPromise = (async () => {
      if (mutation.action === 'UPSERT' && mutation.docId && mutation.data) {
        const sanitized = sanitizeForFirestore({
          ...mutation.data,
          id: mutation.docId,
          updatedAt: mutation.data.updatedAt || new Date().toISOString(),
        });
        await Promise.all(
          targetCollections.map((colName) =>
            setDoc(doc(db, colName, mutation.docId!), sanitized, { merge: true })
          )
        );
      } else if (mutation.action === 'BATCH_UPSERT' && Array.isArray(mutation.items)) {
        const CHUNK_SIZE = 200;
        for (let i = 0; i < mutation.items.length; i += CHUNK_SIZE) {
          const chunk = mutation.items.slice(i, i + CHUNK_SIZE);
          const batch = writeBatch(db);
          for (const item of chunk) {
            if (!item || !item.id) continue;
            const sanitized = sanitizeForFirestore({
              ...item.data,
              id: item.id,
              updatedAt: item.data?.updatedAt || new Date().toISOString(),
            });
            for (const colName of targetCollections) {
              batch.set(doc(db, colName, item.id), sanitized, { merge: true });
            }
          }
          await batch.commit();
        }
      } else if (mutation.action === 'DELETE' && mutation.docId) {
        await Promise.all(
          targetCollections.map((colName) =>
            deleteDoc(doc(db, colName, mutation.docId!)).catch(() => {})
          )
        );
      } else if (mutation.action === 'BATCH_DELETE' && Array.isArray(mutation.docIds)) {
        const validIds = mutation.docIds.filter(Boolean);
        await Promise.all(
          validIds.flatMap((id) =>
            targetCollections.map((colName) =>
              deleteDoc(doc(db, colName, id)).catch(() => {})
            )
          )
        );
      }
      return { ok: true as const };
    })();

    const res = await Promise.race([workPromise, timeoutPromise]);
    return Boolean(res && res.ok);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dispatches a mutation to Firestore immediately; if temporarily unreachable or offline,
 * automatically queues it in `amarii_pending_sync_queue` for zero-data-loss auto-flush.
 */
export async function dispatchCloudMutation(
  mutation: Omit<PendingSyncMutation, 'id' | 'timestamp' | 'retryCount'>
): Promise<boolean> {
  // Always enqueue first so even if the tab closes mid-flight, the mutation is persisted
  const queued = enqueuePendingMutation(mutation);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  const succeeded = await executeFirestoreMutation(mutation);
  if (succeeded) {
    // Remove the completed item from the pending queue
    const current = getPendingSyncQueue().filter((m) => m.id !== queued.id);
    savePendingSyncQueue(current);
    // Also opportunistically flush any older queued mutations
    if (current.length > 0 && !isFlushingQueue) {
      flushPendingSyncQueue().catch(() => {});
    }
    return true;
  }

  return false;
}

/**
 * Flushes all queued mutations in `amarii_pending_sync_queue` to Firestore as soon as
 * connectivity is established.
 */
export async function flushPendingSyncQueue(): Promise<{
  flushed: number;
  remaining: number;
}> {
  if (isFlushingQueue) {
    return { flushed: 0, remaining: getPendingSyncQueue().length };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { flushed: 0, remaining: getPendingSyncQueue().length };
  }

  const creds = validateFirebaseCredentials();
  if (!creds.isValid) {
    return { flushed: 0, remaining: getPendingSyncQueue().length };
  }

  const queue = [...getPendingSyncQueue()];
  if (queue.length === 0) {
    return { flushed: 0, remaining: 0 };
  }

  isFlushingQueue = true;
  dispatchSyncStatusEvent();

  let flushed = 0;
  const remaining: PendingSyncMutation[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const ok = await executeFirestoreMutation(item, 4000);
    if (ok) {
      flushed++;
    } else {
      item.retryCount = (item.retryCount || 0) + 1;
      if (item.retryCount <= 25) {
        remaining.push(item, ...queue.slice(i + 1));
      }
      break;
    }
  }

  isFlushingQueue = false;
  savePendingSyncQueue(remaining);

  return { flushed, remaining: remaining.length };
}

// Automatically flush pending sync queue when browser comes back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    flushPendingSyncQueue().catch(() => {});
  });
}

// ============================================================================
// 3. UNIVERSAL REAL-TIME FIRESTORE REPOSITORY PATTERN
// ============================================================================
export interface RepositoryConfig<T extends { id: string }> {
  collectionName: string;
  storageKey: string;
  legacyStorageKeys?: string[];
  deletedIdsStorageKey?: string;
  mirrorCollections?: string[];
  filterItem?: (item: T) => boolean;
  sortItems?: (a: T, b: T) => number;
  transformBeforeSave?: (item: T) => Record<string, any>;
  onLocalSave?: (items: T[]) => void;
  recoverFromDisasterBackup?: () => T[];
}

export class FirestoreRepository<T extends { id: string }> {
  public readonly config: RepositoryConfig<T>;
  private stateListeners = new Set<(items: T[], fromCache?: boolean) => void>();
  private backfilledIds = new Set<string>();

  constructor(config: RepositoryConfig<T>) {
    this.config = config;
  }

  public getDeletedIds(): Set<string> {
    if (!this.config.deletedIdsStorageKey || typeof window === 'undefined') {
      return new Set();
    }
    try {
      const raw = localStorage.getItem(this.config.deletedIdsStorageKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  public markIdsDeleted(ids: string[]): void {
    if (!this.config.deletedIdsStorageKey || typeof window === 'undefined' || !ids.length) {
      return;
    }
    try {
      const set = this.getDeletedIds();
      ids.forEach((id) => {
        if (id) set.add(id);
      });
      localStorage.setItem(this.config.deletedIdsStorageKey, JSON.stringify(Array.from(set)));
    } catch {}
  }

  public unmarkIdsDeleted(ids: string[]): void {
    if (!this.config.deletedIdsStorageKey || typeof window === 'undefined' || !ids.length) {
      return;
    }
    try {
      const set = this.getDeletedIds();
      ids.forEach((id) => {
        if (id) set.delete(id);
      });
      localStorage.setItem(this.config.deletedIdsStorageKey, JSON.stringify(Array.from(set)));
    } catch {}
  }

  /**
   * Reads authoritative local records from `localStorage` (0ms latency).
   */
  public getAllLocal(): T[] {
    if (typeof window === 'undefined') return [];
    const deletedIds = this.getDeletedIds();
    const keysToCheck = [
      this.config.storageKey,
      ...(this.config.legacyStorageKeys || []),
    ];

    const cleanArray = (arr: any[]): T[] => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const rawItem of arr) {
        if (!rawItem || typeof rawItem !== 'object' || typeof rawItem.id !== 'string' || !rawItem.id) {
          continue;
        }
        if (seen.has(rawItem.id) || deletedIds.has(rawItem.id)) {
          continue;
        }
        if (this.config.filterItem && !this.config.filterItem(rawItem as T)) {
          continue;
        }
        seen.add(rawItem.id);
        out.push(rawItem as T);
      }
      if (this.config.sortItems) {
        out.sort(this.config.sortItems);
      }
      return out;
    };

    for (const key of keysToCheck) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const valid = cleanArray(parsed);
            if (valid.length > 0) return valid;
          }
        }
      } catch {}
    }

    if (this.config.recoverFromDisasterBackup) {
      const recovered = cleanArray(this.config.recoverFromDisasterBackup() || []);
      if (recovered.length > 0) {
        this.saveAllLocal(recovered);
        return recovered;
      }
    }

    return [];
  }

  /**
   * Saves records to `localStorage` FIRST (0ms) with Data Preservation Shield
   * so an accidental empty array never overwrites existing records unless `allowEmpty = true`.
   */
  public saveAllLocal(items: T[], allowEmpty = false): T[] {
    if (typeof window === 'undefined') return items || [];
    const deletedIds = this.getDeletedIds();
    const seen = new Set<string>();
    const clean: T[] = [];

    for (const item of items || []) {
      if (!item || typeof item !== 'object' || !item.id || seen.has(item.id) || deletedIds.has(item.id)) {
        continue;
      }
      if (this.config.filterItem && !this.config.filterItem(item)) {
        continue;
      }
      seen.add(item.id);
      clean.push(item);
    }

    if (this.config.sortItems) {
      clean.sort(this.config.sortItems);
    }

    // Data Preservation Shield: prevent accidental empty wipe
    if (clean.length === 0 && !allowEmpty) {
      const existing = this.getAllLocal();
      if (existing.length > 0) {
        return existing;
      }
    }

    try {
      const serialized = JSON.stringify(clean);
      localStorage.setItem(this.config.storageKey, serialized);
      for (const legacyKey of this.config.legacyStorageKeys || []) {
        try {
          localStorage.setItem(legacyKey, serialized);
        } catch {}
      }
      if (this.config.onLocalSave) {
        this.config.onLocalSave(clean);
      }
    } catch {}

    return clean;
  }

  private notifyStateListeners(items: T[], fromCache = true) {
    this.stateListeners.forEach((cb) => {
      try {
        cb(items, fromCache);
      } catch {}
    });
  }

  /**
   * Add or Update (Upsert) a single entity with 0ms local state + localStorage update
   * and automatic Firestore sync + offline queue protection.
   */
  public async upsert(
    item: T,
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<T> {
    if (!item || !item.id) return item;

    this.unmarkIdsDeleted([item.id]);
    const current = this.getAllLocal();
    const exists = current.some((existing) => existing.id === item.id);
    const updatedList = exists
      ? current.map((existing) => (existing.id === item.id ? item : existing))
      : [item, ...current];

    const saved = this.saveAllLocal(updatedList);
    if (setState) {
      setState(saved);
    }
    this.notifyStateListeners(saved, true);

    const payload = this.config.transformBeforeSave
      ? this.config.transformBeforeSave(item)
      : (item as Record<string, any>);

    await dispatchCloudMutation({
      collectionName: this.config.collectionName,
      mirrorCollections: this.config.mirrorCollections,
      action: 'UPSERT',
      docId: item.id,
      data: payload,
    });

    return item;
  }

  /**
   * Alias for `upsert` when adding a new entity.
   */
  public async add(
    item: T,
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<T> {
    return this.upsert(item, setState);
  }

  /**
   * Edit partial fields on an existing entity by ID (0ms local + background Firestore merge).
   */
  public async edit(
    id: string,
    updates: Partial<T>,
    setState?: React.Dispatch<React.SetStateAction<T[]>>,
    fallbackItem?: T
  ): Promise<T | null> {
    if (!id) return null;
    const current = this.getAllLocal();
    const existing = current.find((item) => item.id === id) || fallbackItem;
    const mergedItem = {
      ...(existing || {}),
      ...updates,
      id,
    } as T;

    await this.upsert(mergedItem, setState);
    return mergedItem;
  }

  /**
   * Toggle a boolean field on an entity (0ms local + background Firestore merge).
   */
  public async toggle(
    id: string,
    field: keyof T,
    explicitValue?: boolean,
     extraUpdates?: Partial<T>,
    setState?: React.Dispatch<React.SetStateAction<T[]>>,
    fallbackItem?: T
  ): Promise<T | null> {
    if (!id) return null;
    const current = this.getAllLocal();
    const existing = current.find((item) => item.id === id) || fallbackItem;
    const nextVal =
      explicitValue !== undefined
        ? explicitValue
        : existing
        ? !Boolean(existing[field])
        : true;

    return this.edit(
      id,
      {
        ...(extraUpdates || {}),
        [field]: nextVal,
      } as Partial<T>,
      setState,
      fallbackItem
    );
  }

  /**
   * Reorder a list of entities (0ms local + batch Firestore update).
   */
  public async reorder(
    orderedItems: T[],
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<T[]> {
    const withOrder = orderedItems.map((item, index) => ({
      ...item,
      orderIndex: index,
    }));
    return this.batchUpsert(withOrder, setState);
  }

  /**
   * Batch Upsert multiple entities (0ms local + background Firestore batch commit).
   */
  public async batchUpsert(
    items: T[],
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<T[]> {
    if (!items || items.length === 0) return this.getAllLocal();

    const ids = items.map((i) => i?.id).filter(Boolean);
    this.unmarkIdsDeleted(ids);

    const current = this.getAllLocal();
    const incomingMap = new Map<string, T>();
    items.forEach((item) => {
      if (item && item.id) incomingMap.set(item.id, item);
    });

    const updatedExisting = current.map((c) =>
      incomingMap.has(c.id) ? incomingMap.get(c.id)! : c
    );
    const existingIdSet = new Set(current.map((c) => c.id));
    const brandNew = items.filter((i) => i && i.id && !existingIdSet.has(i.id));

    const saved = this.saveAllLocal([...brandNew, ...updatedExisting]);
    if (setState) {
      setState(saved);
    }
    this.notifyStateListeners(saved, true);

    await dispatchCloudMutation({
      collectionName: this.config.collectionName,
      mirrorCollections: this.config.mirrorCollections,
      action: 'BATCH_UPSERT',
      items: items
        .filter((i) => i && i.id)
        .map((item) => ({
          id: item.id,
          data: this.config.transformBeforeSave
            ? this.config.transformBeforeSave(item)
            : (item as Record<string, any>),
        })),
    });

    return saved;
  }

  /**
   * Permanently delete a single entity by ID (0ms local state + localStorage + Firestore deleteDoc).
   */
  public async remove(
    id: string,
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<void> {
    if (!id) return;
    this.markIdsDeleted([id]);

    const current = this.getAllLocal().filter((item) => item.id !== id);
    const saved = this.saveAllLocal(current, true);
    if (setState) {
      setState(saved);
    }
    this.notifyStateListeners(saved, true);

    await dispatchCloudMutation({
      collectionName: this.config.collectionName,
      mirrorCollections: this.config.mirrorCollections,
      action: 'DELETE',
      docId: id,
    });
  }

  /**
   * Permanently batch-delete multiple entities by ID (0ms local state + localStorage + Firestore deleteDoc).
   */
  public async batchRemove(
    ids: string[],
    setState?: React.Dispatch<React.SetStateAction<T[]>>
  ): Promise<void> {
    const validIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (validIds.length === 0) return;

    this.markIdsDeleted(validIds);
    const idSet = new Set(validIds);
    const current = this.getAllLocal().filter((item) => !idSet.has(item.id));
    const saved = this.saveAllLocal(current, true);
    if (setState) {
      setState(saved);
    }
    this.notifyStateListeners(saved, true);

    await dispatchCloudMutation({
      collectionName: this.config.collectionName,
      mirrorCollections: this.config.mirrorCollections,
      action: 'BATCH_DELETE',
      docIds: validIds,
    });
  }

  /**
   * Real-Time Cloud Listener (`onSnapshot`) with Data Preservation Guarantee & Two-Way Auto-Backfill:
   * 1. Immediately emits `localStorage` data in 0ms.
   * 2. Attaches Firestore `onSnapshot` listener to `collectionName`.
   * 3. Handles explicit remote deletions via `snapshot.docChanges()` (`removed`).
   * 4. Merges remote documents with any pending local mutations without ever wiping local state with `[]`.
   * 5. Automatically backfills unsynced local items to Firestore so existing local items appear in the cloud!
   */
  public subscribe(
    onUpdate: (items: T[], fromCache?: boolean) => void,
    onError?: (err: Error) => void
  ): () => void {
    let unsubscribed = false;
    let firestoreUnsub: (() => void) | null = null;

    this.stateListeners.add(onUpdate);

    // 1. Emit authoritative localStorage data immediately (0ms)
    const initialLocal = this.getAllLocal();
    onUpdate(initialLocal, true);

    const creds = validateFirebaseCredentials();
    if (!creds.isValid) {
      return () => {
        unsubscribed = true;
        this.stateListeners.delete(onUpdate);
      };
    }

    try {
      const colRef = collection(db, this.config.collectionName);
      firestoreUnsub = onSnapshot(
        colRef,
        (snapshot) => {
          if (unsubscribed) return;

          // If we got a live server snapshot, flush any pending offline mutations
          if (!snapshot.metadata.fromCache) {
            flushPendingSyncQueue().catch(() => {});
          }

          // Process explicit remote removals from other devices
          const newlyRemovedIds: string[] = [];
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'removed') {
              newlyRemovedIds.push(change.doc.id);
            }
          });
          if (newlyRemovedIds.length > 0) {
            this.markIdsDeleted(newlyRemovedIds);
          }

          const deletedIds = this.getDeletedIds();
          const { pendingUpserts, pendingDeletes } = getPendingIdsForCollection(
            this.config.collectionName
          );

          const remoteItems: T[] = [];
          const remoteIdSet = new Set<string>();

          snapshot.forEach((docSnap) => {
            const id = docSnap.id;
            if (deletedIds.has(id) || pendingDeletes.has(id)) return;
            const rawData = { id, ...(docSnap.data() as any) } as T;
            if (this.config.filterItem && !this.config.filterItem(rawData)) return;
            remoteIdSet.add(id);
            remoteItems.push(rawData);
          });

          const currentLocal = this.getAllLocal().filter(
            (item) => !deletedIds.has(item.id) && !pendingDeletes.has(item.id)
          );

          // Preservation Guarantee: If remote snapshot is empty and we have valid local items,
          // preserve local items AND backfill them to Firestore so cloud gets populated!
          if (remoteItems.length === 0 && currentLocal.length > 0) {
            onUpdate(currentLocal, snapshot.metadata.fromCache);
            const unsyncedToBackfill = currentLocal.filter(
              (item) => !this.backfilledIds.has(item.id)
            );
            if (unsyncedToBackfill.length > 0 && !snapshot.metadata.fromCache) {
              unsyncedToBackfill.forEach((item) => this.backfilledIds.add(item.id));
              dispatchCloudMutation({
                collectionName: this.config.collectionName,
                mirrorCollections: this.config.mirrorCollections,
                action: 'BATCH_UPSERT',
                items: unsyncedToBackfill.map((item) => ({
                  id: item.id,
                  data: this.config.transformBeforeSave
                    ? this.config.transformBeforeSave(item)
                    : (item as Record<string, any>),
                })),
              }).catch(() => {});
            }
            return;
          }

          // Merge remote items + any local items not yet in remote (or with pending upserts)
          const mergedMap = new Map<string, T>();
          const itemsNeedingBackfill: T[] = [];

          // Start with local items so local order and unsynced items are retained
          for (const localItem of currentLocal) {
            mergedMap.set(localItem.id, localItem);
            if (!remoteIdSet.has(localItem.id) && !this.backfilledIds.has(localItem.id)) {
              itemsNeedingBackfill.push(localItem);
            }
          }

          // Apply remote items (unless overridden by an active pending local upsert)
          for (const remoteItem of remoteItems) {
            if (pendingUpserts.has(remoteItem.id)) {
              const pendingData = pendingUpserts.get(remoteItem.id)!;
              mergedMap.set(remoteItem.id, { ...remoteItem, ...pendingData, id: remoteItem.id } as T);
            } else {
              mergedMap.set(remoteItem.id, remoteItem);
            }
          }

          const mergedList = Array.from(mergedMap.values());
          const saved = this.saveAllLocal(
            mergedList,
            mergedList.length === 0 && currentLocal.length === 0
          );
          onUpdate(saved, snapshot.metadata.fromCache);

          // Automatically push any local items that weren't in Firestore yet
          if (itemsNeedingBackfill.length > 0 && !snapshot.metadata.fromCache) {
            itemsNeedingBackfill.forEach((item) => this.backfilledIds.add(item.id));
            dispatchCloudMutation({
              collectionName: this.config.collectionName,
              mirrorCollections: this.config.mirrorCollections,
              action: 'BATCH_UPSERT',
              items: itemsNeedingBackfill.map((item) => ({
                id: item.id,
                data: this.config.transformBeforeSave
                  ? this.config.transformBeforeSave(item)
                  : (item as Record<string, any>),
              })),
            }).catch(() => {});
          }
        },
        (err) => {
          const fallback = this.getAllLocal();
          onUpdate(fallback, true);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      if (onError) onError(err);
    }

    return () => {
      unsubscribed = true;
      this.stateListeners.delete(onUpdate);
      if (firestoreUnsub) {
        try {
          firestoreUnsub();
        } catch {}
      }
    };
  }
}

// ============================================================================
// 4. PRE-CONFIGURED CORE REPOSITORIES & DYNAMIC REPOSITORY REGISTRY
// ============================================================================

export const staffRepository = new FirestoreRepository<StaffMember>({
  collectionName: 'staff',
  mirrorCollections: ['users'],
  storageKey: STORAGE_KEY_STAFF_V3,
  legacyStorageKeys: ['amarii_staff_list_cache', 'amarii_staff_backup'],
  deletedIdsStorageKey: 'amarii_deleted_staff_ids_v2',
  filterItem: (s) =>
    Boolean(
      s &&
        s.id &&
        !LEGACY_DEMO_STAFF_IDS.includes(s.id) &&
        !String(s.name || '').toLowerCase().includes('arjun')
    ),
  transformBeforeSave: (staff) => ({
    ...staff,
    role: staff.roleType || 'employee',
    active: staff.isActive !== false,
    isActive: staff.isActive !== false,
    updatedAt: new Date().toISOString(),
  }),
  onLocalSave: (clean) => {
    if (clean.length > 0) {
      updateDisasterBackup({ staffList: clean });
    }
  },
  recoverFromDisasterBackup: () => readDisasterBackup().staffList || [],
});

export const tasksRepository = new FirestoreRepository<TaskItem>({
  collectionName: 'tasks',
  storageKey: STORAGE_KEY_TASKS_V3,
  legacyStorageKeys: [
    STORAGE_KEY_TASKS_MASTER_CACHE,
    'amarii_tasks_cache',
    'amarii_offline_tasks_cache_v1',
  ],
  deletedIdsStorageKey: 'amarii_deleted_task_ids_v2',
  filterItem: (t) => Boolean(t && t.id && !isTaskBlacklisted(t)),
  onLocalSave: (clean) => {
    if (clean.length > 0) {
      updateDisasterBackup({ tasks: clean });
    }
  },
  recoverFromDisasterBackup: () => readDisasterBackup().tasks || [],
});

export const submissionsRepository = new FirestoreRepository<ShiftRecord>({
  collectionName: 'shifts',
  storageKey: STORAGE_KEY_SUBMISSIONS_V3,
  legacyStorageKeys: ['amarii_shift_history_cache'],
  deletedIdsStorageKey: 'amarii_deleted_shift_ids_v3',
  sortItems: (a, b) =>
    new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime(),
  onLocalSave: (clean) => {
    if (clean.length > 0) {
      updateDisasterBackup({ submissions: clean });
    }
  },
  recoverFromDisasterBackup: () => readDisasterBackup().submissions || [],
});

export const outletsRepository = new FirestoreRepository<Outlet>({
  collectionName: 'outlets',
  storageKey: 'amarii_outlets_v2',
  legacyStorageKeys: ['amarii_outlets_cache'],
  deletedIdsStorageKey: 'amarii_deleted_outlet_ids_v1',
  filterItem: (o) => {
    if (!o || !o.id) return false;
    const name = String(o.name || '').toLowerCase();
    return (
      !LEGACY_DEMO_OUTLET_IDS.includes(o.id) &&
      !name.includes('main street') &&
      !name.includes('airport') &&
      !name.includes('mall kiosk')
    );
  },
});

export const editRequestsRepository = new FirestoreRepository<TaskEditRequest>({
  collectionName: 'edit_requests',
  storageKey: 'amarii_edit_requests_v1',
  deletedIdsStorageKey: 'amarii_deleted_edit_request_ids_v1',
});

// Dynamic repository cache for any new or future collection
const dynamicRepositories = new Map<string, FirestoreRepository<any>>([
  ['staff', staffRepository],
  ['tasks', tasksRepository],
  ['shifts', submissionsRepository],
  ['submissions', submissionsRepository],
  ['outlets', outletsRepository],
  ['edit_requests', editRequestsRepository],
]);

/**
 * Auto-Collection Discovery: Returns the `FirestoreRepository` for any collection name.
 * If a new feature or collection is introduced in the future, it automatically provisions
 * a real-time two-way synced repository with localStorage + offline queue protection.
 */
export function getRepository<T extends { id: string }>(
  collectionName: string,
  customConfig?: Partial<RepositoryConfig<T>>
): FirestoreRepository<T> {
  const key = collectionName.trim();
  if (dynamicRepositories.has(key)) {
    return dynamicRepositories.get(key) as FirestoreRepository<T>;
  }

  const repo = new FirestoreRepository<T>({
    collectionName: key,
    storageKey: `amarii_${key}_v3`,
    deletedIdsStorageKey: `amarii_deleted_${key}_ids_v1`,
    ...(customConfig || {}),
  });
  dynamicRepositories.set(key, repo);
  return repo;
}
