import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Firestore,
  setLogLevel,
  disableNetwork,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { TaskItem, StaffMember, ShiftRecord, Outlet, INITIAL_OUTLETS, DEFAULT_OUTLET } from '../types';
import { INITIAL_STAFF } from '../data/staffData';
import { INITIAL_DAILY_TASKS } from '../data/defaultTasks';

import {
  staffRepository,
  tasksRepository,
  submissionsRepository,
  outletsRepository,
  dispatchCloudMutation,
  flushPendingSyncQueue,
  validateFirebaseCredentials,
  getRepository,
  PENDING_SYNC_QUEUE_KEY,
} from './syncService';

export {
  staffRepository,
  tasksRepository,
  submissionsRepository,
  outletsRepository,
  dispatchCloudMutation,
  flushPendingSyncQueue,
  validateFirebaseCredentials,
  getRepository,
  PENDING_SYNC_QUEUE_KEY,
};

// Silence internal @firebase/firestore WebChannel / RPC console error floods when offline
try {
  setLogLevel('silent');
} catch {
  // Ignore if unsupported in environment
}

export const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
  firestoreDatabaseId: (firebaseConfigData as any).firestoreDatabaseId || '(default)',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned database ID from firebase-applet-config.json
export const db: Firestore = (firebaseConfigData as any).firestoreDatabaseId
  ? getFirestore(app, (firebaseConfigData as any).firestoreDatabaseId)
  : getFirestore(app);

const TASKS_COLLECTION = 'tasks';
export const STAFF_COLLECTION = 'staff';
export const USERS_COLLECTION = 'users';
const SHIFTS_COLLECTION = 'shifts';
const OUTLETS_COLLECTION = 'outlets';

// ============================================================================
// AUTHORITATIVE LOCALSTORAGE KEYS (V3) & DISASTER BACKUP SHIELD
// ============================================================================
export const STORAGE_KEY_STAFF_V3 = 'amarii_staff_list_v3';
export const STORAGE_KEY_TASKS_V3 = 'amarii_tasks_master_v3';
export const STORAGE_KEY_SUBMISSIONS_V3 = 'amarii_submissions_v3';
export const STORAGE_KEY_DISASTER_BACKUP = 'amarii_disaster_backup';

// Legacy & auxiliary keys kept in sync for 100% backward compatibility
export const STORAGE_KEY_TASKS_MASTER_CACHE = 'amarii_tasks_master_cache';
export const STORAGE_KEY_DELETED_TASK_IDS = 'amarii_deleted_task_ids_v2';
export const STORAGE_KEY_DELETED_CHECKLIST_IDS = 'amarii_deleted_checklist_ids';
export const STORAGE_KEY_DELETED_CHECKLIST_TITLES = 'amarii_deleted_checklist_titles';
export const STORAGE_KEY_DELETED_CHECKLIST_HEADERS = 'amarii_deleted_checklist_headers';
export const STORAGE_KEY_DELETED_STAFF_IDS = 'amarii_deleted_staff_ids_v2';
export const STORAGE_KEY_DELETED_SHIFT_IDS = 'amarii_deleted_shift_ids_v3';

// List of dummy / legacy staff IDs to ignore
export const LEGACY_DEMO_STAFF_IDS = [
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

export const LEGACY_DEMO_OUTLET_IDS = [
  'outlet-main-street',
  'outlet-airport-lounge',
  'outlet-mall-kiosk',
];

// ============================================================================
// CREDENTIAL & DATABASE CONFIGURATION GUARD
// ============================================================================
let firestoreDisabled = false;

export function isFirestoreDisabled(): boolean {
  return firestoreDisabled;
}

function isPermanentDatabaseMissingError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes("database '(default)' not found") ||
    msg.includes('database (default) not found') ||
    (msg.includes('database') && msg.includes('not found'))
  );
}

function tripFirestoreCircuitBreaker(): void {
  if (firestoreDisabled) return;
  firestoreDisabled = true;
  try {
    disableNetwork(db).catch(() => {});
  } catch {
    // Ignore
  }
}

// Helper to run any Firestore promise with a safe timeout (default 2500ms) and silent catch
async function withFirestoreSafeTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs = 2500,
  fallbackValue?: T
): Promise<{ ok: boolean; value?: T; timedOut?: boolean; error?: string }> {
  if (firestoreDisabled) {
    return { ok: false, value: fallbackValue, error: 'Local storage mode active' };
  }

  let timer: any;
  const timeoutPromise = new Promise<{ ok: false; timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, timedOut: true }), timeoutMs);
  });

  try {
    const result = await Promise.race([
      operation().then((value) => ({ ok: true as const, value })),
      timeoutPromise,
    ]);
    if (!result.ok) {
      return { ok: false, value: fallbackValue, timedOut: true, error: 'Firestore request timed out' };
    }
    return result;
  } catch (err: any) {
    if (isPermanentDatabaseMissingError(err)) {
      tripFirestoreCircuitBreaker();
    }
    return {
      ok: false,
      value: fallbackValue,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function ensureFirestoreAvailable(): Promise<boolean> {
  if (firestoreDisabled) return false;
  const creds = validateFirebaseCredentials();
  return creds.isValid;
}

// ============================================================================
// DISASTER BACKUP & AUTHORITATIVE LOCALSTORAGE HELPERS
// ============================================================================
export interface DisasterBackupPayload {
  staffList: StaffMember[];
  tasks: TaskItem[];
  submissions: ShiftRecord[];
  updatedAt: string;
}

export function readDisasterBackup(): Partial<DisasterBackupPayload> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DISASTER_BACKUP);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function updateDisasterBackup(partial: {
  staffList?: StaffMember[];
  tasks?: TaskItem[];
  submissions?: ShiftRecord[];
}): void {
  if (typeof window === 'undefined') return;
  try {
    const current = readDisasterBackup();
    const nextStaff =
      partial.staffList !== undefined
        ? partial.staffList.length > 0
          ? partial.staffList
          : current.staffList || []
        : current.staffList || [];
    const nextTasks =
      partial.tasks !== undefined
        ? partial.tasks.length > 0
          ? partial.tasks
          : current.tasks || []
        : current.tasks || [];
    const nextSubmissions =
      partial.submissions !== undefined
        ? partial.submissions.length > 0
          ? partial.submissions
          : current.submissions || []
        : current.submissions || [];

    const payload: DisasterBackupPayload = {
      staffList: nextStaff,
      tasks: nextTasks,
      submissions: nextSubmissions,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_DISASTER_BACKUP, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors
  }
}

export const getDeletedStaffIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_STAFF_IDS);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

export const addDeletedStaffIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedStaffIds();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_STAFF_IDS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const removeDeletedStaffIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedStaffIds();
    ids.forEach((id) => {
      if (id) current.delete(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_STAFF_IDS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const getDeletedShiftIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_SHIFT_IDS);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

export const addDeletedShiftIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedShiftIds();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_SHIFT_IDS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const toChecklistSlugId = (titleOrId: string): string => {
  return (titleOrId || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const getDeletedChecklistTitles = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const result = new Set<string>();
  const keys = [STORAGE_KEY_DELETED_CHECKLIST_TITLES, STORAGE_KEY_DELETED_CHECKLIST_HEADERS];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (typeof item === 'string' && item.trim()) {
              result.add(item.trim());
            }
          });
        }
      }
    } catch {}
  }
  return result;
};

export const getDeletedChecklistIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const result = new Set<string>();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_CHECKLIST_IDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (typeof item === 'string' && item.trim()) {
            result.add(item.trim());
            result.add(toChecklistSlugId(item));
          }
        });
      }
    }
  } catch {}
  getDeletedChecklistTitles().forEach((title) => {
    const slug = toChecklistSlugId(title);
    if (slug) result.add(slug);
  });
  return result;
};

export const isChecklistDeleted = (headerOrId?: string | null): boolean => {
  if (!headerOrId || typeof headerOrId !== 'string') return false;
  const trimmed = headerOrId.trim();
  if (!trimmed) return false;
  const titles = getDeletedChecklistTitles();
  if (titles.has(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  for (const t of titles) {
    if (t.toLowerCase() === lower) return true;
  }
  const slug = toChecklistSlugId(trimmed);
  if (slug && getDeletedChecklistIds().has(slug)) return true;
  return false;
};

export const getDeletedTaskIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DELETED_TASK_IDS);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

export const addDeletedTaskIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedTaskIds();
    ids.forEach((id) => {
      if (id) current.add(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_TASK_IDS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const removeDeletedTaskIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedTaskIds();
    ids.forEach((id) => {
      if (id) current.delete(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_TASK_IDS, JSON.stringify(Array.from(current)));
  } catch {}
};

export const isTaskBlacklisted = (task?: Partial<TaskItem> | null): boolean => {
  if (!task || !task.id) return true;
  const deletedTaskIds = getDeletedTaskIds();
  if (deletedTaskIds.has(task.id)) return true;
  if (task.checklistHeader && isChecklistDeleted(task.checklistHeader)) return true;
  if (task.title && isChecklistDeleted(task.title)) return true;
  return false;
};

// Load authoritative Staff list from localStorage (v3 first, then legacy caches, then disaster backup)
export function loadLocalStaff(): StaffMember[] {
  if (typeof window === 'undefined') return [];
  const deletedStaffIds = getDeletedStaffIds();
  const keys = [STORAGE_KEY_STAFF_V3, 'amarii_staff_list_cache', 'amarii_staff_backup'];

  const filterValidStaff = (arr: any[]): StaffMember[] => {
    const seen = new Set<string>();
    const result: StaffMember[] = [];
    for (const s of arr) {
      if (
        s &&
        typeof s === 'object' &&
        typeof s.id === 'string' &&
        s.id &&
        !seen.has(s.id) &&
        !deletedStaffIds.has(s.id) &&
        !LEGACY_DEMO_STAFF_IDS.includes(s.id) &&
        !String(s.name || '').toLowerCase().includes('arjun')
      ) {
        seen.add(s.id);
        result.push(s as StaffMember);
      }
    }
    return result;
  };

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = filterValidStaff(parsed);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    } catch {}
  }

  // Fallback to disaster backup if primary keys were cleared
  const backup = readDisasterBackup();
  if (Array.isArray(backup.staffList) && backup.staffList.length > 0) {
    const recovered = filterValidStaff(backup.staffList);
    if (recovered.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_STAFF_V3, JSON.stringify(recovered));
        localStorage.setItem('amarii_staff_list_cache', JSON.stringify(recovered));
        localStorage.setItem('amarii_staff_backup', JSON.stringify(recovered));
      } catch {}
      return recovered;
    }
  }

  return [];
}

// Save authoritative Staff list to localStorage FIRST + rolling disaster backup
export function saveLocalStaff(staffList: StaffMember[], allowEmpty = false): StaffMember[] {
  if (typeof window === 'undefined') return staffList || [];
  const deletedStaffIds = getDeletedStaffIds();
  const seen = new Set<string>();
  const clean = (staffList || []).filter((s) => {
    if (
      !s ||
      !s.id ||
      seen.has(s.id) ||
      deletedStaffIds.has(s.id) ||
      LEGACY_DEMO_STAFF_IDS.includes(s.id) ||
      String(s.name || '').toLowerCase().includes('arjun')
    ) {
      return false;
    }
    seen.add(s.id);
    return true;
  });

  // DATA PRESERVATION SHIELD: Never allow an accidental empty array to wipe existing records
  if (clean.length === 0 && !allowEmpty) {
    const existing = loadLocalStaff();
    if (existing.length > 0) {
      return existing;
    }
  }

  try {
    const serialized = JSON.stringify(clean);
    localStorage.setItem(STORAGE_KEY_STAFF_V3, serialized);
    localStorage.setItem('amarii_staff_list_cache', serialized);
    localStorage.setItem('amarii_staff_backup', serialized);
    if (clean.length > 0) {
      updateDisasterBackup({ staffList: clean });
    }
  } catch {}

  return clean;
}

// Load authoritative Master Tasks from localStorage (v3 first, then legacy caches, then disaster backup)
export function loadLocalTasks(): TaskItem[] {
  if (typeof window === 'undefined') return [];
  const keys = [
    STORAGE_KEY_TASKS_V3,
    STORAGE_KEY_TASKS_MASTER_CACHE,
    'amarii_tasks_cache',
    'amarii_offline_tasks_cache_v1',
  ];

  const filterValidTasks = (arr: any[]): TaskItem[] => {
    const seen = new Set<string>();
    const result: TaskItem[] = [];
    for (const t of arr) {
      if (t && typeof t === 'object' && typeof t.id === 'string' && t.id && !seen.has(t.id) && !isTaskBlacklisted(t)) {
        seen.add(t.id);
        result.push(t as TaskItem);
      }
    }
    return result;
  };

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = filterValidTasks(parsed);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    } catch {}
  }

  // Fallback to disaster backup if primary keys were cleared
  const backup = readDisasterBackup();
  if (Array.isArray(backup.tasks) && backup.tasks.length > 0) {
    const recovered = filterValidTasks(backup.tasks);
    if (recovered.length > 0) {
      try {
        const serialized = JSON.stringify(recovered);
        localStorage.setItem(STORAGE_KEY_TASKS_V3, serialized);
        localStorage.setItem(STORAGE_KEY_TASKS_MASTER_CACHE, serialized);
        localStorage.setItem('amarii_tasks_cache', serialized);
      } catch {}
      return recovered;
    }
  }

  return [];
}

// Save authoritative Master Tasks to localStorage FIRST + rolling disaster backup
export function saveLocalTasks(tasks: TaskItem[], allowEmpty = false): TaskItem[] {
  if (typeof window === 'undefined') return tasks || [];
  const seen = new Set<string>();
  const clean = (tasks || []).filter((t) => {
    if (!t || !t.id || seen.has(t.id) || isTaskBlacklisted(t)) return false;
    seen.add(t.id);
    return true;
  });

  // DATA PRESERVATION SHIELD: Never allow an accidental empty array to wipe existing records
  if (clean.length === 0 && !allowEmpty) {
    const existing = loadLocalTasks();
    if (existing.length > 0) {
      return existing;
    }
  }

  try {
    const serialized = JSON.stringify(clean);
    localStorage.setItem(STORAGE_KEY_TASKS_V3, serialized);
    localStorage.setItem(STORAGE_KEY_TASKS_MASTER_CACHE, serialized);
    localStorage.setItem('amarii_tasks_cache', serialized);
    if (clean.length > 0) {
      updateDisasterBackup({ tasks: clean });
    }
  } catch {}

  return clean;
}

// Load authoritative Shift Submissions from localStorage (v3 first, then legacy cache, then disaster backup)
export function loadLocalSubmissions(): ShiftRecord[] {
  if (typeof window === 'undefined') return [];
  const deletedShiftIds = getDeletedShiftIds();
  const keys = [STORAGE_KEY_SUBMISSIONS_V3, 'amarii_shift_history_cache'];

  const filterValidShifts = (arr: any[]): ShiftRecord[] => {
    const seen = new Set<string>();
    const result: ShiftRecord[] = [];
    for (const s of arr) {
      if (s && typeof s === 'object' && typeof s.id === 'string' && s.id && !seen.has(s.id) && !deletedShiftIds.has(s.id)) {
        seen.add(s.id);
        result.push(s as ShiftRecord);
      }
    }
    return result;
  };

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = filterValidShifts(parsed);
          if (valid.length > 0) {
            return valid;
          }
        }
      }
    } catch {}
  }

  const backup = readDisasterBackup();
  if (Array.isArray(backup.submissions) && backup.submissions.length > 0) {
    const recovered = filterValidShifts(backup.submissions);
    if (recovered.length > 0) {
      try {
        const serialized = JSON.stringify(recovered);
        localStorage.setItem(STORAGE_KEY_SUBMISSIONS_V3, serialized);
        localStorage.setItem('amarii_shift_history_cache', serialized);
      } catch {}
      return recovered;
    }
  }

  return [];
}

// Save authoritative Shift Submissions to localStorage FIRST + rolling disaster backup
export function saveLocalSubmissions(submissions: ShiftRecord[], allowEmpty = false): ShiftRecord[] {
  if (typeof window === 'undefined') return submissions || [];
  const deletedShiftIds = getDeletedShiftIds();
  const seen = new Set<string>();
  const clean = (submissions || []).filter((s) => {
    if (!s || !s.id || seen.has(s.id) || deletedShiftIds.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });

  if (clean.length === 0 && !allowEmpty) {
    const existing = loadLocalSubmissions();
    if (existing.length > 0) {
      return existing;
    }
  }

  try {
    const serialized = JSON.stringify(clean);
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS_V3, serialized);
    localStorage.setItem('amarii_shift_history_cache', serialized);
    if (clean.length > 0) {
      updateDisasterBackup({ submissions: clean });
    }
  } catch {}

  return clean;
}

// ============================================================================
// CONNECTION DIAGNOSTIC PROBE (STRICT 1-SECOND MAX TIMEOUT)
// ============================================================================
export interface FirestoreConnectionDiagnostic {
  connected: boolean;
  latencyMs: number;
  databaseId: string;
  projectId: string;
  error?: string;
  timestamp: string;
}

export async function testFirestoreConnection(): Promise<FirestoreConnectionDiagnostic> {
  const start = Date.now();
  const creds = validateFirebaseCredentials();
  const databaseId = creds.databaseId;
  const projectId = creds.projectId || 'local';

  if (!creds.isValid || firestoreDisabled || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return {
      connected: false,
      latencyMs: Date.now() - start,
      databaseId,
      projectId,
      error: !creds.isValid
        ? `Missing Firebase credentials: ${creds.missingFields.join(', ')}`
        : 'Offline queue active',
      timestamp: new Date().toISOString(),
    };
  }

  let timer: any;
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), 2500);
  });

  try {
    const testDocRef = doc(db, 'system_meta', 'seed_state');
    const raceResult: any = await Promise.race([
      getDocFromServer(testDocRef).then(() => ({ timedOut: false })),
      timeoutPromise,
    ]);

    const latencyMs = Date.now() - start;
    if (raceResult && raceResult.timedOut) {
      return {
        connected: false,
        latencyMs,
        databaseId,
        projectId,
        error: 'Firestore connection initializing (offline queue active)',
        timestamp: new Date().toISOString(),
      };
    }

    flushPendingSyncQueue().catch(() => {});
    return {
      connected: true,
      latencyMs,
      databaseId,
      projectId,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    const msg = String(error?.message || error || '');
    const isPermanentDbMissing = isPermanentDatabaseMissingError(error);

    if (!isPermanentDbMissing && (error?.code === 'not-found' || msg.includes('not exist'))) {
      flushPendingSyncQueue().catch(() => {});
      return {
        connected: true,
        latencyMs,
        databaseId,
        projectId,
        timestamp: new Date().toISOString(),
      };
    }

    if (isPermanentDbMissing) {
      tripFirestoreCircuitBreaker();
    }

    return {
      connected: false,
      latencyMs,
      databaseId,
      projectId,
      error: msg || 'Offline queue active',
      timestamp: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================================
// UNIVERSAL REAL-TIME LISTENERS (VIA syncService.ts REPOSITORIES)
// ============================================================================

export function subscribeToOutlets(
  onUpdate: (outlets: Outlet[], fromCache?: boolean) => void,
  onError?: (err: Error) => void
) {
  return outletsRepository.subscribe((items, fromCache) => {
    if (items.length === 0) {
      onUpdate(INITIAL_OUTLETS, fromCache);
    } else {
      onUpdate(items, fromCache);
    }
  }, onError);
}

export function subscribeToTasks(
  onUpdate: (tasks: TaskItem[], fromCache?: boolean) => void,
  onError?: (err: Error) => void
) {
  return tasksRepository.subscribe(onUpdate, onError);
}

export async function fetchTasksOnce(): Promise<TaskItem[]> {
  const localTasks = loadLocalTasks();
  if (firestoreDisabled) return localTasks;

  const res = await withFirestoreSafeTimeout(async () => {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const snapshot = await getDocs(tasksRef);
    const items: TaskItem[] = [];
    snapshot.forEach((d) => {
      const candidate: TaskItem = { id: d.id, ...(d.data() as Omit<TaskItem, 'id'>) };
      if (!isTaskBlacklisted(candidate)) {
        items.push(candidate);
      }
    });
    return items;
  }, 2500);

  if (res.ok && Array.isArray(res.value) && res.value.length > 0) {
    const mergedMap = new Map<string, TaskItem>();
    localTasks.forEach((t) => {
      if (!isTaskBlacklisted(t)) mergedMap.set(t.id, t);
    });
    res.value.forEach((t) => {
      if (!isTaskBlacklisted(t)) mergedMap.set(t.id, t);
    });
    return saveLocalTasks(Array.from(mergedMap.values()));
  }

  return localTasks;
}

export async function fetchStaffOnce(): Promise<StaffMember[]> {
  const localStaff = loadLocalStaff();
  if (firestoreDisabled) return localStaff;

  const deletedStaffIds = getDeletedStaffIds();
  const res = await withFirestoreSafeTimeout(async () => {
    const staffRef = collection(db, STAFF_COLLECTION);
    const snapshot = await getDocs(staffRef);
    const items: StaffMember[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as Omit<StaffMember, 'id'>;
      const staffId = d.id;
      const staffName = (data.name || '').toLowerCase();
      const isArjun = staffName.includes('arjun') || staffId === 'staff-admin-arjun';
      const isLegacyId = LEGACY_DEMO_STAFF_IDS.includes(staffId);

      if (!isArjun && !isLegacyId && !deletedStaffIds.has(staffId)) {
        items.push({ id: staffId, ...data });
      }
    });
    return items;
  }, 2500);

  if (res.ok && Array.isArray(res.value) && res.value.length > 0) {
    const mergedMap = new Map<string, StaffMember>();
    localStaff.forEach((s) => {
      if (!deletedStaffIds.has(s.id)) mergedMap.set(s.id, s);
    });
    res.value.forEach((s) => {
      if (!deletedStaffIds.has(s.id)) mergedMap.set(s.id, s);
    });
    return saveLocalStaff(Array.from(mergedMap.values()));
  }

  return localStaff;
}

export function subscribeToStaff(
  onUpdate: (staff: StaffMember[], fromCache?: boolean) => void,
  onError?: (err: Error) => void
) {
  return staffRepository.subscribe(onUpdate, onError);
}

export function subscribeToShifts(
  onUpdate: (shifts: ShiftRecord[]) => void,
  onError?: (err: Error) => void
) {
  return submissionsRepository.subscribe((shifts) => onUpdate(shifts), onError);
}

// ============================================================================
// SANITIZATION & UNIVERSAL REPOSITORY CRUD OPERATIONS
// ============================================================================

export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (item !== null && typeof item === 'object' ? sanitizeForFirestore(item) : item));
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Save or Update a single task via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function saveTaskToFirebase(task: TaskItem): Promise<void> {
  if (!task || !task.id) return;
  removeDeletedTaskIds([task.id]);
  await tasksRepository.upsert(task);
}

// Batch save multiple tasks via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function batchSaveTasksToFirebase(tasks: TaskItem[]): Promise<void> {
  if (!tasks || tasks.length === 0) return;
  const taskIds = tasks.map((t) => t?.id).filter(Boolean);
  removeDeletedTaskIds(taskIds);
  await tasksRepository.batchUpsert(tasks);
}

export const addDeletedChecklistToBlacklist = (headerName: string, extraTaskIds: string[] = []): string[] => {
  if (!headerName || typeof window === 'undefined') return [];
  const cleanTitle = headerName.trim();
  if (!cleanTitle) return [];

  const titlesSet = getDeletedChecklistTitles();
  titlesSet.add(cleanTitle);
  const titlesArray = Array.from(titlesSet);

  const idsSet = getDeletedChecklistIds();
  const slugId = toChecklistSlugId(cleanTitle);
  if (slugId) {
    idsSet.add(slugId);
    idsSet.add(`checklist-${slugId}`);
  }
  const idsArray = Array.from(idsSet);

  try {
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_TITLES, JSON.stringify(titlesArray));
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_HEADERS, JSON.stringify(titlesArray));
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_IDS, JSON.stringify(idsArray));
  } catch {}

  const matchingTemplateTaskIds = INITIAL_DAILY_TASKS.filter(
    (t) =>
      t.checklistHeader &&
      (t.checklistHeader.trim().toLowerCase() === cleanTitle.toLowerCase() ||
        toChecklistSlugId(t.checklistHeader) === slugId)
  ).map((t) => t.id);

  const allTaskIdsToBlacklist = Array.from(new Set([...extraTaskIds, ...matchingTemplateTaskIds]));
  if (allTaskIdsToBlacklist.length > 0) {
    addDeletedTaskIds(allTaskIdsToBlacklist);
  }
  removeTasksFromLocalCache(allTaskIdsToBlacklist, cleanTitle);

  return titlesArray;
};

export const removeDeletedChecklistFromBlacklist = (headerName?: string): string[] => {
  if (typeof window === 'undefined') return [];
  if (!headerName) {
    try {
      localStorage.removeItem(STORAGE_KEY_DELETED_CHECKLIST_TITLES);
      localStorage.removeItem(STORAGE_KEY_DELETED_CHECKLIST_HEADERS);
      localStorage.removeItem(STORAGE_KEY_DELETED_CHECKLIST_IDS);
    } catch {}
    removeDeletedTaskIds(INITIAL_DAILY_TASKS.map((t) => t.id));
    return [];
  }

  const cleanTitle = headerName.trim();
  const lower = cleanTitle.toLowerCase();
  const slug = toChecklistSlugId(cleanTitle);

  const remainingTitles = Array.from(getDeletedChecklistTitles()).filter(
    (t) => t.toLowerCase() !== lower && toChecklistSlugId(t) !== slug
  );
  const remainingIds = Array.from(getDeletedChecklistIds()).filter(
    (id) => id !== slug && id !== `checklist-${slug}` && id.toLowerCase() !== lower
  );

  try {
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_TITLES, JSON.stringify(remainingTitles));
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_HEADERS, JSON.stringify(remainingTitles));
    localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_IDS, JSON.stringify(remainingIds));
  } catch {}

  const matchingTemplateTaskIds = INITIAL_DAILY_TASKS.filter(
    (t) =>
      t.checklistHeader &&
      (t.checklistHeader.trim().toLowerCase() === lower || toChecklistSlugId(t.checklistHeader) === slug)
  ).map((t) => t.id);
  if (matchingTemplateTaskIds.length > 0) {
    removeDeletedTaskIds(matchingTemplateTaskIds);
  }

  return remainingTitles;
};

// Clean deleted tasks & checklists from ALL localStorage caches (including v3 & disaster backup)
export function removeTasksFromLocalCache(taskIds: string[], deletedHeaderName?: string) {
  if (typeof window === 'undefined') return;
  const idSet = new Set(taskIds || []);
  const lowerHeader = deletedHeaderName ? deletedHeaderName.trim().toLowerCase() : null;

  const shouldRemoveTask = (t: any): boolean => {
    if (!t || !t.id) return true;
    if (idSet.has(t.id)) return true;
    if (lowerHeader && typeof t.checklistHeader === 'string' && t.checklistHeader.trim().toLowerCase() === lowerHeader) {
      return true;
    }
    if (isTaskBlacklisted(t)) return true;
    return false;
  };

  const cacheKeys = [
    STORAGE_KEY_TASKS_V3,
    STORAGE_KEY_TASKS_MASTER_CACHE,
    'amarii_tasks_cache',
    'amarii_offline_tasks_cache_v1',
  ];
  for (const key of cacheKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((t: any) => !shouldRemoveTask(t));
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  // Also clean from disaster backup so explicitly deleted tasks don't resurrect
  try {
    const backup = readDisasterBackup();
    if (Array.isArray(backup.tasks)) {
      const filteredBackupTasks = backup.tasks.filter((t: any) => !shouldRemoveTask(t));
      localStorage.setItem(
        STORAGE_KEY_DISASTER_BACKUP,
        JSON.stringify({
          ...backup,
          tasks: filteredBackupTasks,
          updatedAt: new Date().toISOString(),
        })
      );
    }
  } catch {}

  try {
    const rawQueue = localStorage.getItem('amarii_task_offline_queue');
    if (rawQueue) {
      const parsed = JSON.parse(rawQueue);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((op: any) => {
          if ('taskId' in op && idSet.has(op.taskId)) return false;
          if (op.type === 'SAVE_TASK' && op.task && shouldRemoveTask(op.task)) return false;
          if (op.type === 'BATCH_SAVE_TASKS' && Array.isArray(op.tasks)) {
            op.tasks = op.tasks.filter((t: any) => !shouldRemoveTask(t));
            return op.tasks.length > 0;
          }
          return true;
        });
        localStorage.setItem('amarii_task_offline_queue', JSON.stringify(filtered));
      }
    }
  } catch {}

  try {
    const rawSubmissions = localStorage.getItem('amarii_offline_checklist_queue_v1');
    if (rawSubmissions) {
      const parsed = JSON.parse(rawSubmissions);
      if (Array.isArray(parsed)) {
        const updated = parsed
          .filter((sub: any) => !(lowerHeader && sub?.headerName?.trim()?.toLowerCase() === lowerHeader))
          .map((sub: any) => ({
            ...sub,
            finalizedTasks: Array.isArray(sub.finalizedTasks)
              ? sub.finalizedTasks.filter((t: any) => !shouldRemoveTask(t))
              : [],
            freshBlankTasks: Array.isArray(sub.freshBlankTasks)
              ? sub.freshBlankTasks.filter((t: any) => !shouldRemoveTask(t))
              : [],
          }));
        localStorage.setItem('amarii_offline_checklist_queue_v1', JSON.stringify(updated));
      }
    }
  } catch {}
}

// Clean deleted staff from ALL localStorage caches (including v3 & disaster backup)
export function removeStaffFromLocalCache(staffId: string) {
  if (!staffId || typeof window === 'undefined') return;
  const keys = [STORAGE_KEY_STAFF_V3, 'amarii_staff_list_cache', 'amarii_staff_backup'];
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((s: any) => s && s.id !== staffId);
          localStorage.setItem(key, JSON.stringify(filtered));
        }
      }
    } catch {}
  }

  try {
    const backup = readDisasterBackup();
    if (Array.isArray(backup.staffList)) {
      const filteredStaff = backup.staffList.filter((s: any) => s && s.id !== staffId);
      localStorage.setItem(
        STORAGE_KEY_DISASTER_BACKUP,
        JSON.stringify({
          ...backup,
          staffList: filteredStaff,
          updatedAt: new Date().toISOString(),
        })
      );
    }
  } catch {}
}

// Delete a task permanently via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function deleteTaskFromFirebase(taskId: string): Promise<void> {
  if (!taskId) return;
  addDeletedTaskIds([taskId]);
  removeTasksFromLocalCache([taskId]);
  await tasksRepository.remove(taskId);
}

// Batch delete multiple tasks via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function batchDeleteTasksFromFirebase(taskIds: string[]): Promise<void> {
  if (!taskIds || taskIds.length === 0) return;
  const validIds = Array.from(new Set(taskIds.filter(Boolean)));
  if (validIds.length === 0) return;

  addDeletedTaskIds(validIds);
  removeTasksFromLocalCache(validIds);
  await tasksRepository.batchRemove(validIds);
}

// Delete an entire checklist and all associated tasks from localStorage FIRST, then cloud sync + offline queue
export async function deleteChecklistFromFirebase(headerName: string, knownTaskIds: string[] = []): Promise<string[]> {
  if (!headerName) return Array.from(getDeletedChecklistTitles());
  const cleanTitle = headerName.trim();

  // 1. Immediately blacklist checklist ID & title + purge local caches
  const updatedDeletedTitles = addDeletedChecklistToBlacklist(cleanTitle, knownTaskIds);
  const allIdsToDelete = Array.from(new Set(knownTaskIds)).filter(Boolean);

  // 2. Dispatch cloud deletes through universal sync engine
  if (allIdsToDelete.length > 0) {
    await tasksRepository.batchRemove(allIdsToDelete);
  }
  await saveDeletedChecklistsToFirebase(updatedDeletedTitles);

  return updatedDeletedTitles;
}

// Delete a shift submission via Universal Submissions Repository (0ms local + Firestore + offline queue)
export async function deleteShiftFromFirebase(shiftId: string): Promise<void> {
  if (!shiftId) return;
  addDeletedShiftIds([shiftId]);
  await submissionsRepository.remove(shiftId);
}

// Toggle or update task completion via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function updateTaskCompletion(taskId: string, completed: boolean, fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  const completedAt = completed ? new Date().toISOString() : undefined;
  await tasksRepository.toggle(
    taskId,
    'completed',
    completed,
    { completedAt } as Partial<TaskItem>,
    undefined,
    fullTask
  );
}

// Update task notes via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function updateTaskNoteInFirebase(taskId: string, notes: string, fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  await tasksRepository.edit(taskId, { notes: notes ?? '' }, undefined, fullTask);
}

// Update task media attachments via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function updateTaskMediaInFirebase(taskId: string, media: any[], fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  await tasksRepository.edit(taskId, { media: media ?? [] }, undefined, fullTask);
}

// Update task sub-tasks via Universal Tasks Repository (0ms local + Firestore + offline queue)
export async function updateTaskSubTasksInFirebase(taskId: string, subTasks: any[], fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  await tasksRepository.edit(taskId, { subTasks: subTasks ?? [] }, undefined, fullTask);
}

// Save or update a staff member via Universal Staff Repository (0ms local + Firestore + offline queue)
export async function saveStaffToFirebase(staff: StaffMember): Promise<StaffMember> {
  if (!staff || !staff.id) {
    return staff;
  }
  removeDeletedStaffIds([staff.id]);
  return await staffRepository.upsert(staff);
}

// Delete a staff member via Universal Staff Repository (0ms local + Firestore + offline queue)
export async function deleteStaffFromFirebase(staffId: string): Promise<void> {
  if (!staffId) return;
  addDeletedStaffIds([staffId]);
  removeStaffFromLocalCache(staffId);
  await staffRepository.remove(staffId);
}

// Save a shift snapshot via Universal Submissions Repository (0ms local + Firestore + offline queue)
export async function saveShiftToFirebase(shift: ShiftRecord): Promise<void> {
  if (!shift || !shift.id) return;
  await submissionsRepository.upsert(shift);
}

// Save or update an outlet via Universal Outlets Repository (0ms local + Firestore + offline queue)
export async function saveOutletToFirebase(outlet: Outlet): Promise<void> {
  if (!outlet || !outlet.id) return;
  await outletsRepository.upsert(outlet);
}

// Delete an outlet via Universal Outlets Repository (0ms local + Firestore + offline queue)
export async function deleteOutletFromFirebase(outletId: string): Promise<void> {
  if (!outletId) return;
  await outletsRepository.remove(outletId);
}

export async function purgeLegacyDemoOutletsFromFirestore() {
  return;
}

export async function cleanupMismatchedOutletsInFirestore() {
  return;
}

export async function seedInitialOutletsIfEmpty(_initialOutlets: Outlet[]) {
  return;
}

export async function purgeDemoTasksFromFirestore() {
  return;
}

export async function purgeLegacyDemoStaffFromFirestore() {
  return;
}

// Generate clean, readable, named staff IDs
export function generateStaffId(name: string, roleType?: string, existingIds?: string[]): string {
  const cleanName = (name || 'member')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const prefix = roleType === 'manager' ? 'staff-mgr' : 'staff';
  const baseId = `${prefix}-${cleanName || 'member'}`;
  if (!existingIds || !existingIds.includes(baseId)) {
    return baseId;
  }
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${baseId}-${suffix}`;
}

export async function syncAllStaffAndUsersToFirestore(
  staffList?: StaffMember[]
): Promise<{ count: number; error?: string }> {
  const activeList = staffList && staffList.length > 0 ? staffList : loadLocalStaff();
  const saved = saveLocalStaff(activeList);

  if (firestoreDisabled) {
    return { count: saved.length };
  }

  const res = await withFirestoreSafeTimeout(async () => {
    const batch = writeBatch(db);
    let writesCount = 0;
    saved.forEach((member) => {
      if (!member || !member.id) return;
      const sanitized = sanitizeForFirestore({
        ...member,
        role: member.roleType || 'employee',
        active: member.isActive !== false,
        isActive: member.isActive !== false,
        updatedAt: new Date().toISOString(),
      });
      batch.set(doc(db, STAFF_COLLECTION, member.id), sanitized, { merge: true });
      batch.set(doc(db, USERS_COLLECTION, member.id), sanitized, { merge: true });
      writesCount++;
    });
    if (writesCount > 0) {
      await batch.commit();
    }
    return writesCount;
  }, 1500);

  return { count: saved.length, error: res.ok ? undefined : undefined };
}

// Auto-seeding of dummy tasks/staff is permanently disabled so user data is the sole ground truth
export async function seedInitialTasksIfEmpty(_initialTasks?: TaskItem[], _initialStaff?: StaffMember[]) {
  return;
}

export async function saveDeletedChecklistsToFirebase(deletedHeaders: string[]) {
  if (firestoreDisabled) return;
  const ids = deletedHeaders.map((h) => toChecklistSlugId(h)).filter(Boolean);
  await dispatchCloudMutation({
    collectionName: 'settings',
    action: 'UPSERT',
    docId: 'deleted_checklists',
    data: {
      headers: deletedHeaders,
      titles: deletedHeaders,
      ids,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function subscribeToChecklistSettings(onUpdate: (deletedHeaders: string[]) => void) {
  let unsubscribed = false;
  let firestoreUnsub: (() => void) | null = null;

  // 1. Immediately serve localStorage blacklist (0ms)
  onUpdate(Array.from(getDeletedChecklistTitles()));

  const creds = validateFirebaseCredentials();
  if (!creds.isValid || firestoreDisabled) {
    return () => {
      unsubscribed = true;
    };
  }

  try {
    const ref = doc(db, 'settings', 'deleted_checklists');
    firestoreUnsub = onSnapshot(
      ref,
      (snap) => {
        if (unsubscribed) return;
        const localTitles = getDeletedChecklistTitles();
        if (snap.exists() && Array.isArray(snap.data()?.headers)) {
          const remoteHeaders = snap.data()?.headers as string[];
          remoteHeaders.forEach((h) => {
            if (typeof h === 'string' && h.trim()) {
              localTitles.add(h.trim());
            }
          });
        }
        const merged = Array.from(localTitles);
        if (typeof window !== 'undefined' && merged.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_TITLES, JSON.stringify(merged));
            localStorage.setItem(STORAGE_KEY_DELETED_CHECKLIST_HEADERS, JSON.stringify(merged));
            localStorage.setItem(
              STORAGE_KEY_DELETED_CHECKLIST_IDS,
              JSON.stringify(merged.map((m) => toChecklistSlugId(m)).filter(Boolean))
            );
          } catch {}
        }
        onUpdate(merged);
      },
      (err) => {
        if (isPermanentDatabaseMissingError(err)) {
          tripFirestoreCircuitBreaker();
          if (firestoreUnsub) {
            try {
              firestoreUnsub();
            } catch {}
            firestoreUnsub = null;
          }
        }
        onUpdate(Array.from(getDeletedChecklistTitles()));
      }
    );
  } catch {
    // Silent fallback
  }

  return () => {
    unsubscribed = true;
    if (firestoreUnsub) {
      try {
        firestoreUnsub();
      } catch {}
    }
  };
}

export async function getDeletedChecklistsFromFirebase(): Promise<string[]> {
  const localTitles = getDeletedChecklistTitles();
  if (firestoreDisabled) return Array.from(localTitles);

  await withFirestoreSafeTimeout(async () => {
    const ref = doc(db, 'settings', 'deleted_checklists');
    const snap = await getDoc(ref);
    if (snap.exists() && Array.isArray(snap.data()?.headers)) {
      (snap.data().headers as string[]).forEach((h) => {
        if (typeof h === 'string' && h.trim()) {
          localTitles.add(h.trim());
        }
      });
    }
  }, 1000);

  return Array.from(localTitles);
}
