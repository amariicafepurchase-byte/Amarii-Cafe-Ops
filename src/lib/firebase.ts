import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  Firestore,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { TaskItem, StaffMember, ShiftRecord, Outlet, INITIAL_OUTLETS, DEFAULT_OUTLET } from '../types';
import { INITIAL_STAFF } from '../data/staffData';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific database ID if provided
export const db: Firestore = firebaseConfigData.firestoreDatabaseId
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

const TASKS_COLLECTION = 'tasks';
export const STAFF_COLLECTION = 'staff';
export const USERS_COLLECTION = 'users';
const SHIFTS_COLLECTION = 'shifts';
const OUTLETS_COLLECTION = 'outlets';

// Test connection to Firestore directly from server
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
  try {
    const testDocRef = doc(db, 'system_meta', 'seed_state');
    await getDocFromServer(testDocRef);
    const latencyMs = Date.now() - start;
    console.log(`[Firestore Connection] Cloud test succeeded in ${latencyMs}ms`);
    return {
      connected: true,
      latencyMs,
      databaseId: firebaseConfigData.firestoreDatabaseId || '(default)',
      projectId: firebaseConfigData.projectId,
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    if (error?.code === 'not-found' || error?.message?.includes('not exist')) {
      console.log(`[Firestore Connection] Server reachable (doc not found) in ${latencyMs}ms`);
      return {
        connected: true,
        latencyMs,
        databaseId: firebaseConfigData.firestoreDatabaseId || '(default)',
        projectId: firebaseConfigData.projectId,
        timestamp: new Date().toISOString(),
      };
    }
    console.warn(`[Firestore Connection] Probe error (${latencyMs}ms):`, error?.message || error);
    return {
      connected: false,
      latencyMs,
      databaseId: firebaseConfigData.firestoreDatabaseId || '(default)',
      projectId: firebaseConfigData.projectId,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };
  }
}

// List of legacy demo outlets to purge
export const LEGACY_DEMO_OUTLET_IDS = [
  'outlet-main-street',
  'outlet-airport-lounge',
  'outlet-mall-kiosk',
];

// Subscribe to real-time Outlets in Firestore
export function subscribeToOutlets(onUpdate: (outlets: Outlet[], fromCache?: boolean) => void, onError?: (err: Error) => void) {
  const outletsRef = collection(db, OUTLETS_COLLECTION);
  return onSnapshot(
    outletsRef,
    (snapshot) => {
      const items: Outlet[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Omit<Outlet, 'id'>;
        const name = (data.name || '').toLowerCase();
        const isLegacy =
          LEGACY_DEMO_OUTLET_IDS.includes(d.id) ||
          name.includes('main street') ||
          name.includes('airport') ||
          name.includes('mall kiosk');
        if (!isLegacy) {
          items.push({ id: d.id, ...data });
        }
      });
      if (items.length === 0) {
        onUpdate(INITIAL_OUTLETS, snapshot.metadata.fromCache);
      } else {
        onUpdate(items, snapshot.metadata.fromCache);
      }
    },
    (err) => {
      console.warn('[Firestore] Outlets listener note (falling back to cache/defaults):', err.message);
      try {
        const cached = localStorage.getItem('amarii_outlets_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onUpdate(parsed, true);
            if (onError) onError(err);
            return;
          }
        }
      } catch (e) {}
      onUpdate(INITIAL_OUTLETS, true);
      if (onError) onError(err);
    }
  );
}

// Subscribe to real-time Tasks in Firestore
export function subscribeToTasks(onUpdate: (tasks: TaskItem[], fromCache?: boolean) => void, onError?: (err: Error) => void) {
  const tasksRef = collection(db, TASKS_COLLECTION);
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      console.log(
        `[Firestore DEBUG] subscribeToTasks received snapshot: ${snapshot.size} docs (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
      );
      const items: TaskItem[] = [];
      const deletedIds = getDeletedTaskIds();
      snapshot.forEach((d) => {
        if (!deletedIds.has(d.id)) {
          items.push({ id: d.id, ...(d.data() as Omit<TaskItem, 'id'>) });
        }
      });
      onUpdate(items, snapshot.metadata.fromCache);
      try {
        localStorage.setItem('amarii_tasks_cache', JSON.stringify(items));
      } catch (e) {}
    },
    (err) => {
      console.warn('[Firestore DEBUG] Tasks listener note (falling back to local cache):', err.message);
      try {
        const cached = localStorage.getItem('amarii_tasks_cache');
        const deletedIds = getDeletedTaskIds();
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const filtered = parsed.filter((t: any) => t && t.id && !deletedIds.has(t.id));
            onUpdate(filtered, true);
          }
        }
      } catch (e) {}
      if (onError) onError(err);
    }
  );
}

// Fetch Tasks Once (useful for manual refresh or pull-to-refresh)
export async function fetchTasksOnce(): Promise<TaskItem[]> {
  try {
    const tasksRef = collection(db, TASKS_COLLECTION);
    const snapshot = await getDocs(tasksRef);
    const items: TaskItem[] = [];
    const deletedIds = getDeletedTaskIds();
    snapshot.forEach((d) => {
      if (!deletedIds.has(d.id)) {
        items.push({ id: d.id, ...(d.data() as Omit<TaskItem, 'id'>) });
      }
    });
    return items;
  } catch (err) {
    console.error('Error fetching tasks from Firestore:', err);
    return [];
  }
}

// Fetch Staff Once (useful for pull-to-refresh or explicit sync)
export async function fetchStaffOnce(): Promise<StaffMember[]> {
  try {
    const staffRef = collection(db, STAFF_COLLECTION);
    const snapshot = await getDocs(staffRef);

    const items: StaffMember[] = [];
    snapshot.forEach((d) => {
      const data = d.data() as Omit<StaffMember, 'id'>;
      const staffId = d.id;
      const staffName = (data.name || '').toLowerCase();
      const isArjun = staffName.includes('arjun') || staffId === 'staff-admin-arjun';
      const isLegacyId = LEGACY_DEMO_STAFF_IDS.includes(staffId);

      if (!isArjun && !isLegacyId) {
        items.push({ id: staffId, ...data });
      }
    });

    return items;
  } catch (err) {
    console.error('Error fetching staff from Firestore:', err);
    return [];
  }
}

// List of dummy / legacy staff IDs to ignore and permanently purge
export const LEGACY_DEMO_STAFF_IDS = [
  'staff-1790256036455-md1v',
  'staff-admin-arjun',
  'staff-mgr-anand-verma',
  'staff-mgr-kunal-sen',
  'staff-cook-manoj-kumar',
  'staff-barista-riya-roy',
  'staff-cashier-vikas-mehta',
  'staff-service-priya-verma',
  'staff-hk-ramesh-das',
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

// Subscribe to Staff in Firestore
export function subscribeToStaff(onUpdate: (staff: StaffMember[], fromCache?: boolean) => void, onError?: (err: Error) => void) {
  const staffRef = collection(db, STAFF_COLLECTION);
  return onSnapshot(
    staffRef,
    (snapshot) => {
      console.log(
        `[Firestore DEBUG] subscribeToStaff received snapshot: ${snapshot.size} docs (fromCache: ${snapshot.metadata.fromCache}, hasPendingWrites: ${snapshot.metadata.hasPendingWrites})`
      );
      const items: StaffMember[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as Omit<StaffMember, 'id'>;
        const staffId = d.id;
        const staffName = (data.name || '').toLowerCase();
        const isArjun = staffName.includes('arjun') || staffId === 'staff-admin-arjun';

        if (isArjun) {
          // Filter out legacy demo staff in-memory without calling deleteDoc inside snapshot
          return;
        }

        const isLegacyId = LEGACY_DEMO_STAFF_IDS.includes(staffId);
        if (!isLegacyId) {
          items.push({ id: staffId, ...data });
        }
      });

      if (items.length === 0) {
        onUpdate(INITIAL_STAFF, snapshot.metadata.fromCache);
      } else {
        // Use the actual live staff directly from Firestore
        onUpdate(items, snapshot.metadata.fromCache);
        try {
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify(items));
        } catch (e) {}
      }
    },
    (err) => {
      console.warn('[Firestore DEBUG] Staff listener note (falling back to local cache):', err.message);
      try {
        const cached = localStorage.getItem('amarii_staff_list_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onUpdate(parsed, true);
          }
        }
      } catch (e) {}
      if (onError) onError(err);
    }
  );
}

// Subscribe to Shifts in Firestore
export function subscribeToShifts(onUpdate: (shifts: ShiftRecord[]) => void, onError?: (err: Error) => void) {
  const shiftsRef = collection(db, SHIFTS_COLLECTION);
  return onSnapshot(
    shiftsRef,
    (snapshot) => {
      const items: ShiftRecord[] = [];
      snapshot.forEach((d) => {
        items.push({ id: d.id, ...(d.data() as Omit<ShiftRecord, 'id'>) });
      });
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(items);
      try {
        if (items.length > 0) {
          localStorage.setItem('amarii_shift_history_cache', JSON.stringify(items));
        }
      } catch (e) {}
    },
    (err) => {
      console.warn('[Firestore] Shifts listener note (falling back to local cache):', err.message);
      try {
        const cached = localStorage.getItem('amarii_shift_history_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onUpdate(parsed);
          }
        }
      } catch (e) {}
      if (onError) onError(err);
    }
  );
}

// Recursively strip undefined properties from an object so Firestore never throws
// "Unsupported field value: undefined".
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
      continue; // Skip undefined to satisfy Firestore validation
    } else if (value !== null && typeof value === 'object') {
      result[key] = sanitizeForFirestore(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// Save or Update a single task
export async function saveTaskToFirebase(task: TaskItem): Promise<void> {
  if (!task || !task.id) return;
  const taskRef = doc(db, TASKS_COLLECTION, task.id);
  const dataToSave = sanitizeForFirestore({
    ...task,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(taskRef, dataToSave, { merge: true });
}

// Batch save multiple tasks (safely sanitized and chunked under the 500 batch limit)
export async function batchSaveTasksToFirebase(tasks: TaskItem[]): Promise<void> {
  if (!tasks || tasks.length === 0) return;
  const BATCH_SIZE = 400;

  for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
    const chunk = tasks.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((t) => {
      if (!t || !t.id) return;
      const taskRef = doc(db, TASKS_COLLECTION, t.id);
      const dataToSave = sanitizeForFirestore({
        ...t,
        updatedAt: new Date().toISOString(),
      });
      batch.set(taskRef, dataToSave, { merge: true });
    });

    await batch.commit();
  }
}

// Storage keys for deleted tasks tracking
export const STORAGE_KEY_DELETED_TASK_IDS = 'amarii_deleted_task_ids_v2';

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
  } catch (e) {}
};

export const removeDeletedTaskIds = (ids: string[]) => {
  if (!ids || ids.length === 0 || typeof window === 'undefined') return;
  try {
    const current = getDeletedTaskIds();
    ids.forEach((id) => {
      if (id) current.delete(id);
    });
    localStorage.setItem(STORAGE_KEY_DELETED_TASK_IDS, JSON.stringify(Array.from(current)));
  } catch (e) {}
};

// Clean deleted tasks from ALL localStorage caches and offline queues immediately
export function removeTasksFromLocalCache(taskIds: string[]) {
  if (!taskIds || taskIds.length === 0 || typeof window === 'undefined') return;
  const idSet = new Set(taskIds);

  // 1. amarii_tasks_cache
  try {
    const raw = localStorage.getItem('amarii_tasks_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((t: any) => t && t.id && !idSet.has(t.id));
        localStorage.setItem('amarii_tasks_cache', JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  // 2. amarii_offline_tasks_cache_v1
  try {
    const rawOffline = localStorage.getItem('amarii_offline_tasks_cache_v1');
    if (rawOffline) {
      const parsed = JSON.parse(rawOffline);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((t: any) => t && t.id && !idSet.has(t.id));
        localStorage.setItem('amarii_offline_tasks_cache_v1', JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  // 3. amarii_task_offline_queue (remove queued updates for deleted tasks)
  try {
    const rawQueue = localStorage.getItem('amarii_task_offline_queue');
    if (rawQueue) {
      const parsed = JSON.parse(rawQueue);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((op: any) => {
          if ('taskId' in op && idSet.has(op.taskId)) return false;
          if (op.type === 'SAVE_TASK' && op.task && idSet.has(op.task.id)) return false;
          if (op.type === 'BATCH_SAVE_TASKS' && Array.isArray(op.tasks)) {
            op.tasks = op.tasks.filter((t: any) => !idSet.has(t.id));
            return op.tasks.length > 0;
          }
          return true;
        });
        localStorage.setItem('amarii_task_offline_queue', JSON.stringify(filtered));
      }
    }
  } catch (e) {}

  // 4. amarii_offline_checklist_queue_v1 (remove from offline submissions)
  try {
    const rawSubmissions = localStorage.getItem('amarii_offline_checklist_queue_v1');
    if (rawSubmissions) {
      const parsed = JSON.parse(rawSubmissions);
      if (Array.isArray(parsed)) {
        const updated = parsed.map((sub: any) => ({
          ...sub,
          finalizedTasks: Array.isArray(sub.finalizedTasks)
            ? sub.finalizedTasks.filter((t: any) => !idSet.has(t.id))
            : [],
          freshBlankTasks: Array.isArray(sub.freshBlankTasks)
            ? sub.freshBlankTasks.filter((t: any) => !idSet.has(t.id))
            : [],
        }));
        localStorage.setItem('amarii_offline_checklist_queue_v1', JSON.stringify(updated));
      }
    }
  } catch (e) {}

  // 5. amarii_shift_history_cache (clean task items from stored shifts)
  try {
    const rawShifts = localStorage.getItem('amarii_shift_history_cache');
    if (rawShifts) {
      const parsed = JSON.parse(rawShifts);
      if (Array.isArray(parsed)) {
        const updated = parsed.map((s: any) => ({
          ...s,
          tasks: Array.isArray(s.tasks) ? s.tasks.filter((t: any) => !idSet.has(t.id)) : [],
          completedTasks: Array.isArray(s.tasks) ? s.tasks.filter((t: any) => !idSet.has(t.id) && t.completed).length : s.completedTasks,
          totalTasks: Array.isArray(s.tasks) ? s.tasks.filter((t: any) => !idSet.has(t.id)).length : s.totalTasks,
        }));
        localStorage.setItem('amarii_shift_history_cache', JSON.stringify(updated));
      }
    }
  } catch (e) {}
}

// Delete a task permanently from Firestore & local caches
export async function deleteTaskFromFirebase(taskId: string): Promise<void> {
  if (!taskId) return;
  addDeletedTaskIds([taskId]);
  removeTasksFromLocalCache([taskId]);

  try {
    const taskRef = doc(db, TASKS_COLLECTION, taskId);
    await deleteDoc(taskRef);
  } catch (err: any) {
    console.warn(`[Firestore] Note on deleteTaskFromFirebase(${taskId}):`, err.message);
    throw err;
  }
}

// Batch delete multiple tasks from Firestore & local caches (chunked under the 500 batch limit)
export async function batchDeleteTasksFromFirebase(taskIds: string[]): Promise<void> {
  if (!taskIds || taskIds.length === 0) return;
  addDeletedTaskIds(taskIds);
  removeTasksFromLocalCache(taskIds);

  const BATCH_SIZE = 400;
  for (let i = 0; i < taskIds.length; i += BATCH_SIZE) {
    const chunk = taskIds.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    chunk.forEach((id) => {
      if (!id) return;
      const taskRef = doc(db, TASKS_COLLECTION, id);
      batch.delete(taskRef);
    });

    await batch.commit();
  }
}

// Delete a shift snapshot from Firestore
export async function deleteShiftFromFirebase(shiftId: string): Promise<void> {
  if (!shiftId) return;
  try {
    const raw = localStorage.getItem('amarii_shift_history_cache');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter((s: any) => s && s.id !== shiftId);
        localStorage.setItem('amarii_shift_history_cache', JSON.stringify(filtered));
      }
    }
  } catch (e) {}
  const shiftRef = doc(db, SHIFTS_COLLECTION, shiftId);
  await deleteDoc(shiftRef);
}

// Toggle or update task completion (uses setDoc with merge: true to avoid 'No document to update')
export async function updateTaskCompletion(taskId: string, completed: boolean, fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const dataToSave = sanitizeForFirestore({
    ...(fullTask || {}),
    id: taskId,
    completed,
    completedAt: completed ? new Date().toISOString() : null,
    updatedAt: new Date().toISOString(),
  });
  await setDoc(taskRef, dataToSave, { merge: true });
}

// Update task notes (uses setDoc with merge: true to avoid 'No document to update')
export async function updateTaskNoteInFirebase(taskId: string, notes: string, fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const dataToSave = sanitizeForFirestore({
    ...(fullTask || {}),
    id: taskId,
    notes: notes ?? '',
    updatedAt: new Date().toISOString(),
  });
  await setDoc(taskRef, dataToSave, { merge: true });
}

// Update task media attachments (uses setDoc with merge: true to avoid 'No document to update')
export async function updateTaskMediaInFirebase(taskId: string, media: any[], fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const dataToSave = sanitizeForFirestore({
    ...(fullTask || {}),
    id: taskId,
    media: media ?? [],
    updatedAt: new Date().toISOString(),
  });
  await setDoc(taskRef, dataToSave, { merge: true });
}

// Update task sub-tasks (nested checklists)
export async function updateTaskSubTasksInFirebase(taskId: string, subTasks: any[], fullTask?: TaskItem): Promise<void> {
  if (!taskId) return;
  const taskRef = doc(db, TASKS_COLLECTION, taskId);
  const dataToSave = sanitizeForFirestore({
    ...(fullTask || {}),
    id: taskId,
    subTasks: subTasks ?? [],
    updatedAt: new Date().toISOString(),
  });
  await setDoc(taskRef, dataToSave, { merge: true });
}

// Save or update a staff member with detailed diagnostic logging
export async function saveStaffToFirebase(staff: StaffMember): Promise<StaffMember> {
  const startTime = Date.now();
  console.group(`[Firestore DEBUG] saveStaffToFirebase:START`);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Target Collection:', STAFF_COLLECTION);
  console.log('Document ID:', staff?.id || 'MISSING_ID');
  console.log('Target Database:', firebaseConfigData.firestoreDatabaseId || '(default)');
  console.log('Staff Payload Summary:', {
    id: staff?.id,
    name: staff?.name,
    email: staff?.email,
    department: staff?.department,
    roleType: staff?.roleType,
    outlet: staff?.outlet,
    hasPin: Boolean(staff?.pin),
    hasPassword: Boolean(staff?.password),
    isActive: staff?.isActive !== false,
  });

  if (!staff || !staff.id) {
    const errorMsg = 'Staff document missing valid ID';
    console.error('[Firestore DEBUG] Validation failure:', errorMsg);
    console.groupEnd();
    throw new Error(errorMsg);
  }

  try {
    const staffRef = doc(db, STAFF_COLLECTION, staff.id);
    const userRef = doc(db, USERS_COLLECTION, staff.id);
    const dataToSave = sanitizeForFirestore({
      ...staff,
      role: staff.roleType || 'employee',
      active: staff.isActive !== false,
      isActive: staff.isActive !== false,
      updatedAt: new Date().toISOString(),
    });
    console.log('[Firestore DEBUG] Sanitized document keys:', Object.keys(dataToSave));

    await Promise.all([
      setDoc(staffRef, dataToSave, { merge: true }),
      setDoc(userRef, dataToSave, { merge: true }),
    ]);

    // Immediately sync to localStorage cache so reload has updated credentials
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('amarii_staff_list_cache');
        if (stored) {
          const parsed: StaffMember[] = JSON.parse(stored);
          const updated = parsed.map((s) => (s.id === staff.id ? { ...s, ...staff } : s));
          if (!updated.some((s) => s.id === staff.id)) updated.push(staff);
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify(updated));
        } else {
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify([staff]));
        }
      }
    } catch (cacheErr) {
      console.warn('Cache update warning:', cacheErr);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Firestore DEBUG] SUCCESS: Saved staff "${staff.name}" to '${STAFF_COLLECTION}/${staff.id}' and '${USERS_COLLECTION}/${staff.id}' in ${duration}ms`
    );
    console.groupEnd();
    return staff;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(
      `[Firestore DEBUG] ERROR saving staff "${staff?.name}" (${staff?.id}) to collections '${STAFF_COLLECTION}' & '${USERS_COLLECTION}' after ${duration}ms:`,
      error
    );
    console.error('Error Name:', error?.name);
    console.error('Error Code:', error?.code);
    console.error('Error Message:', error?.message);
    console.groupEnd();
    throw error;
  }
}

// Delete a staff member with detailed diagnostic logging
export async function deleteStaffFromFirebase(staffId: string): Promise<void> {
  if (!staffId) return;
  const startTime = Date.now();
  console.group(`[Firestore DEBUG] deleteStaffFromFirebase:START - ID: ${staffId}`);
  try {
    const staffRef = doc(db, STAFF_COLLECTION, staffId);
    const userRef = doc(db, USERS_COLLECTION, staffId);
    await Promise.all([
      deleteDoc(staffRef),
      deleteDoc(userRef).catch(() => {}),
    ]);
    const duration = Date.now() - startTime;
    console.log(`[Firestore DEBUG] SUCCESS: Deleted staff '${staffId}' from '${STAFF_COLLECTION}' and '${USERS_COLLECTION}' in ${duration}ms`);
    console.groupEnd();
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Firestore DEBUG] ERROR deleting staff '${staffId}' after ${duration}ms:`, error);
    console.groupEnd();
    throw error;
  }
}

// Save a shift snapshot to Firestore
export async function saveShiftToFirebase(shift: ShiftRecord): Promise<void> {
  if (!shift || !shift.id) return;
  const shiftRef = doc(db, SHIFTS_COLLECTION, shift.id);
  const dataToSave = sanitizeForFirestore(shift);
  await setDoc(shiftRef, dataToSave, { merge: true });
}

// Save or update an outlet in Firestore
export async function saveOutletToFirebase(outlet: Outlet): Promise<void> {
  if (!outlet || !outlet.id) return;
  const outletRef = doc(db, OUTLETS_COLLECTION, outlet.id);
  const dataToSave = sanitizeForFirestore(outlet);
  await setDoc(outletRef, dataToSave, { merge: true });
}

// Delete an outlet from Firestore
export async function deleteOutletFromFirebase(outletId: string): Promise<void> {
  if (!outletId) return;
  const outletRef = doc(db, OUTLETS_COLLECTION, outletId);
  await deleteDoc(outletRef);
}

// Purge legacy demo outlets (Main Street, Airport Lounge, Mall Kiosk)
export async function purgeLegacyDemoOutletsFromFirestore() {
  try {
    const snapshot = await getDocs(collection(db, OUTLETS_COLLECTION));
    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      const name = (data.name || '').toLowerCase();
      if (
        LEGACY_DEMO_OUTLET_IDS.includes(d.id) ||
        name.includes('main street') ||
        name.includes('airport') ||
        name.includes('mall kiosk')
      ) {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`Purged ${count} legacy dummy outlets from Firestore.`);
    }
  } catch (err) {
    console.warn('Outlet purge warning:', err);
  }
}

// Clean up mismatched or old timestamped outlet documents in Firestore
export async function cleanupMismatchedOutletsInFirestore() {
  try {
    const snapshot = await getDocs(collection(db, OUTLETS_COLLECTION));
    const batch = writeBatch(db);
    let count = 0;
    snapshot.forEach((d) => {
      const data = d.data();
      const docId = d.id;
      const name = (data.name || '').toLowerCase();
      
      // Delete old doc if doc ID starts with 'aundh' but name is 'kothrud', or if doc has old timestamp ID
      if (
        (docId.includes('aundh') && name.includes('kothrud')) ||
        docId.includes('179025') ||
        docId.includes('179026')
      ) {
        batch.delete(d.ref);
        count++;
      }
    });
    if (count > 0) {
      await batch.commit();
      console.log(`Cleaned up ${count} mismatched outlet documents from Firestore.`);
    }
  } catch (err) {
    console.warn('Mismatched outlet cleanup warning:', err);
  }
}

// Seed initial outlets if collection is empty or only had dummy/mismatched outlets
export async function seedInitialOutletsIfEmpty(initialOutlets: Outlet[]) {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('amarii_outlets_seeded_v3') === 'true') {
      return;
    }
    const snapshot = await getDocs(collection(db, OUTLETS_COLLECTION));
    if (snapshot.empty) {
      console.log('Seeding initial outlets (Kothrud & Aundh) into Firestore...');
      const batch = writeBatch(db);
      initialOutlets.forEach((o) => {
        if (!o || !o.id) return;
        const outletRef = doc(db, OUTLETS_COLLECTION, o.id);
        batch.set(outletRef, sanitizeForFirestore(o), { merge: true });
      });
      await batch.commit();
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('amarii_outlets_seeded_v3', 'true');
    }
  } catch (err) {
    console.warn('Firestore outlet seed check notice:', err);
  }
}

// Purge demo tasks so only custom user tasks exist
export async function purgeDemoTasksFromFirestore() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('amarii_demo_tasks_purged_v3') === 'true') {
      return;
    }
    const tasksSnapshot = await getDocs(collection(db, TASKS_COLLECTION));
    const batch = writeBatch(db);
    let demoCount = 0;
    tasksSnapshot.forEach((d) => {
      const id = d.id;
      if (
        id.startsWith('task-foh-') ||
        id.startsWith('task-bar-') ||
        id.startsWith('task-kit-') ||
        id.startsWith('task-srv-') ||
        id.startsWith('task-hk-') ||
        id.startsWith('task-cls-') ||
        id.startsWith('task-air-') ||
        id.startsWith('task-mall-')
      ) {
        batch.delete(d.ref);
        demoCount++;
      }
    });
    if (demoCount > 0) {
      await batch.commit();
      console.log(`Purged ${demoCount} demo tasks from Firestore.`);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('amarii_demo_tasks_purged_v3', 'true');
    }
  } catch (err) {
    console.warn('Demo purge warning:', err);
  }
}

// Purge legacy demo staff so only real staff exist
export async function purgeLegacyDemoStaffFromFirestore() {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('amarii_staff_purged_v3') === 'true') {
      return;
    }
    const staffSnapshot = await getDocs(collection(db, STAFF_COLLECTION));
    const batch = writeBatch(db);
    let count = 0;
    staffSnapshot.forEach((d) => {
      const data = d.data();
      const staffName = (data.name || '').toLowerCase();
      const isArjun = staffName.includes('arjun') || d.id === 'staff-admin-arjun';
      const isLegacyId = LEGACY_DEMO_STAFF_IDS.includes(d.id);
      
      // ONLY delete legacy test placeholder IDs or Arjun - NEVER delete user created staff!
      if (isLegacyId || isArjun) {
        batch.delete(d.ref);
        const userDocRef = doc(db, USERS_COLLECTION, d.id);
        batch.delete(userDocRef);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Purged ${count} legacy demo staff members from Firestore.`);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('amarii_staff_purged_v3', 'true');
    }
  } catch (err) {
    console.warn('Staff purge warning:', err);
  }
}

// Generate clean, readable, named staff IDs (e.g. staff-rahul-sharma or staff-mgr-anand-verma)
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

// Master synchronizer to guarantee all staff (Hemen Das, Aditya, Abhinash Dcosta, etc.) exist in BOTH 'staff' and 'users' collections in Firestore
// CRITICAL: NEVER overwrites existing staff passwords, PINs, or credentials in Firestore with static defaults!
export async function syncAllStaffAndUsersToFirestore(staffList?: StaffMember[]): Promise<{ count: number; error?: string }> {
  try {
    // 1. Fetch current existing staff docs directly from Firestore to preserve user-customized passwords & PINs
    const staffSnapshot = await getDocs(collection(db, STAFF_COLLECTION));
    const existingStaffMap = new Map<string, Record<string, any>>();
    staffSnapshot.forEach((d) => {
      existingStaffMap.set(d.id, d.data());
    });

    const combinedMap = new Map<string, StaffMember>();
    
    // Core default templates (used ONLY if document does not exist in Firestore yet)
    INITIAL_STAFF.forEach((s) => {
      if (s && s.id) combinedMap.set(s.id, s);
    });

    // Merge with any staff passed in from active state
    if (staffList && staffList.length > 0) {
      staffList.forEach((s) => {
        if (s && s.id) combinedMap.set(s.id, s);
      });
    }

    const cleanStaff = Array.from(combinedMap.values()).filter(
      (s) => s && s.id && !s.name?.toLowerCase().includes('arjun') && !LEGACY_DEMO_STAFF_IDS.includes(s.id)
    );
    if (cleanStaff.length === 0) return { count: 0 };

    console.log(`[Firestore SYNC] Synchronizing ${cleanStaff.length} staff into 'staff' AND 'users' collections (preserving passwords)...`);
    const batch = writeBatch(db);
    let writesCount = 0;

    cleanStaff.forEach((member) => {
      const existing = existingStaffMap.get(member.id);

      // If document already exists in Firestore, preserve existing password, pin, and custom fields!
      const mergedMember: StaffMember = {
        ...member,
        ...(existing || {}),
        // If the member in memory has an updated password/pin that was explicitly modified, prioritize it; otherwise keep existing Firestore password/pin
        password: member.password && member.password !== 'admin123' && member.password !== 'chef123' && member.password !== '2255'
          ? member.password
          : (existing?.password || member.password),
        pin: member.pin && member.pin !== '9987' && member.pin !== '1234' && member.pin !== '2255'
          ? member.pin
          : (existing?.pin || member.pin),
        name: member.name || existing?.name,
        email: member.email || existing?.email,
        phone: member.phone || existing?.phone,
        department: member.department || existing?.department,
        designation: member.designation || existing?.designation,
        roleType: member.roleType || existing?.roleType || existing?.role || 'employee',
        outlet: member.outlet || existing?.outlet || DEFAULT_OUTLET,
        isActive: member.isActive !== false && member.active !== false && existing?.isActive !== false && existing?.active !== false,
        active: member.isActive !== false && member.active !== false && existing?.isActive !== false && existing?.active !== false,
      };

      const sanitized = sanitizeForFirestore({
        ...mergedMember,
        role: mergedMember.roleType || 'employee',
        active: mergedMember.isActive !== false,
        isActive: mergedMember.isActive !== false,
        updatedAt: new Date().toISOString(),
      });

      // 1. Write to 'staff' collection
      const staffRef = doc(db, STAFF_COLLECTION, member.id);
      batch.set(staffRef, sanitized, { merge: true });

      // 2. Write to 'users' collection so user profiles appear in database/users!
      const userRef = doc(db, USERS_COLLECTION, member.id);
      batch.set(userRef, sanitized, { merge: true });
      writesCount++;
    });

    if (writesCount > 0) {
      await batch.commit();
      console.log(`[Firestore SYNC] SUCCESS: Persisted all ${writesCount} staff to BOTH '${STAFF_COLLECTION}' and '${USERS_COLLECTION}'!`);
    }
    return { count: writesCount };
  } catch (err: any) {
    console.error('[Firestore SYNC] Error syncing staff/users to Firestore:', err);
    return { count: 0, error: err?.message || 'Sync failed' };
  }
}

// Check if tasks collection is empty and seed once; never re-seed deleted tasks or overwrite staff passwords
export async function seedInitialTasksIfEmpty(initialTasks: TaskItem[], initialStaff: StaffMember[]) {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem('amarii_tasks_seeded_v3') === 'true') {
      return;
    }
    const metaDocRef = doc(db, 'system_meta', 'seed_state');
    let hasSeeded = false;

    try {
      const metaSnap = await getDoc(metaDocRef);
      if (metaSnap.exists() && metaSnap.data()?.tasksSeeded) {
        hasSeeded = true;
      }
    } catch (metaErr) {
      console.warn('Meta seed check warning:', metaErr);
    }

    // Only seed initial tasks if NEVER seeded before and initialTasks is not empty
    if (!hasSeeded) {
      if (initialTasks && initialTasks.length > 0) {
        const tasksSnapshot = await getDocs(collection(db, TASKS_COLLECTION));
        if (tasksSnapshot.empty) {
          console.log('Seeding initial tasks into Firestore (first run only)...');
          await batchSaveTasksToFirebase(initialTasks);
        }
      }
      // Record seed marker so deleted checklists/tasks are NEVER re-injected
      await setDoc(metaDocRef, { tasksSeeded: true, seededAt: new Date().toISOString() }, { merge: true });
      await purgeDemoTasksFromFirestore();
      await purgeLegacyDemoStaffFromFirestore();
      await syncAllStaffAndUsersToFirestore(initialStaff);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('amarii_tasks_seeded_v3', 'true');
    }
  } catch (err) {
    console.warn('Firestore seed check notice:', err);
  }
}

// Persist deleted checklist headers in Firestore so they stay deleted across reloads and devices
export async function saveDeletedChecklistsToFirebase(deletedHeaders: string[]) {
  try {
    const ref = doc(db, 'settings', 'deleted_checklists');
    await setDoc(ref, { headers: deletedHeaders, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn('Failed to save deleted checklists to Firestore:', err);
  }
}

// Subscribe to deleted checklist headers in Firestore in real time
export function subscribeToChecklistSettings(onUpdate: (deletedHeaders: string[]) => void) {
  const ref = doc(db, 'settings', 'deleted_checklists');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists() && Array.isArray(snap.data()?.headers)) {
        onUpdate(snap.data()?.headers as string[]);
      } else {
        onUpdate([]);
      }
    },
    (err) => {
      console.warn('Error subscribing to checklist settings:', err);
    }
  );
}

// Retrieve deleted checklist headers from Firestore
export async function getDeletedChecklistsFromFirebase(): Promise<string[]> {
  try {
    const ref = doc(db, 'settings', 'deleted_checklists');
    const snap = await getDoc(ref);
    if (snap.exists() && Array.isArray(snap.data()?.headers)) {
      return snap.data().headers as string[];
    }
  } catch (err) {
    console.warn('Failed to get deleted checklists from Firestore:', err);
  }
  return [];
}
