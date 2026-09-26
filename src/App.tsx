import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardList,
  Clock,
  AlertCircle,
  CheckCircle2,
  Share2,
  Trash2,
  Plus,
  Filter,
  Check,
  Search,
  Users,
  Film,
  Image as ImageIcon,
  Sparkles,
  Layers,
  Utensils,
  Coffee,
  ConciergeBell,
  CreditCard,
  Briefcase,
  PlusCircle,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  ListTodo,
  Lock,
  Smartphone,
  Flame,
  RefreshCw,
  ShieldAlert,
  Camera,
  Video,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  AnalysisResult,
  TaskItem,
  ShiftRecord,
  TaskPriority,
  TaskDepartment,
  StaffMember,
  TaskMedia,
  ChatMessage,
  ChecklistHeader,
  CHECKLIST_HEADERS,
  DEFAULT_OUTLET,
} from './types';
import { INITIAL_STAFF, DEPARTMENTS, DEPARTMENT_COLORS } from './data/staffData';
import { INITIAL_DAILY_TASKS } from './data/defaultTasks';
import { Header } from './components/Header';
import { SectionBlock } from './components/SectionBlock';
import { DepartmentChecklistSection } from './components/DepartmentChecklistSection';
import { ChecklistGroupSection } from './components/ChecklistGroupSection';
import { ScannableBriefView } from './components/ScannableBriefView';
import { PasteInputModal } from './components/PasteInputModal';
import { ShiftHistoryModal } from './components/ShiftHistoryModal';
import { ChatAssistantDrawer } from './components/ChatAssistantDrawer';
import { StaffManagementModal } from './components/StaffManagementModal';
import { TaskAssignModal } from './components/TaskAssignModal';
import { MediaPreviewModal } from './components/MediaPreviewModal';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { ToolsMenuModal } from './components/ToolsMenuModal';
import { StationSelectorModal, StationMode } from './components/StationSelectorModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { StationProgressBar } from './components/StationProgressBar';
import { LoginScreen } from './components/LoginScreen';
import { TaskAnalyticsDashboard } from './components/TaskAnalyticsDashboard';
import { PdfExportModal } from './components/PdfExportModal';
import { OutletManagementModal } from './components/OutletManagementModal';
import { DataCleanupModal } from './components/DataCleanupModal';
import { TaskManagementModal } from './components/TaskManagementModal';
import { AdminApprovalModal } from './components/AdminApprovalModal';
import { FirestoreDiagnosticModal } from './components/FirestoreDiagnosticModal';
import { TaskRegisterModal } from './components/TaskRegisterModal';
import { TaskRegisterView } from './components/TaskRegisterView';
import { PreTaskAlarmModal } from './components/PreTaskAlarmModal';
import { PullToRefresh } from './components/PullToRefresh';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useTheme } from './context/ThemeContext';
import { useAuth } from './context/AuthContext';
import { useOutlet } from './context/OutletContext';
import { triggerHaptic } from './utils/haptics';
import { compressImage } from './utils/imageCompressor';
import {
  checkPreTaskAlarms,
  triggerTestPreTaskAlarm,
  requestNotificationPermission,
  stopExtremeLoudAlarm,
} from './utils/preTaskAlarm';
import {
  subscribeToTasks,
  subscribeToStaff,
  subscribeToShifts,
  fetchTasksOnce,
  fetchStaffOnce,
  saveTaskToFirebase,
  batchSaveTasksToFirebase,
  deleteTaskFromFirebase,
  batchDeleteTasksFromFirebase,
  updateTaskCompletion,
  updateTaskNoteInFirebase,
  updateTaskMediaInFirebase,
  updateTaskSubTasksInFirebase,
  saveStaffToFirebase,
  deleteStaffFromFirebase,
  saveShiftToFirebase,
  seedInitialTasksIfEmpty,
  syncAllStaffAndUsersToFirestore,
  purgeLegacyDemoStaffFromFirestore,
  LEGACY_DEMO_STAFF_IDS,
  subscribeToChecklistSettings,
  testFirestoreConnection,
  generateStaffId,
} from './lib/firebase';
import { useTaskQueue } from './hooks/useTaskQueue';
import { executeTaskOperationWithQueue } from './lib/taskQueue';

const STORAGE_KEY_STATION = 'amarii_active_station_v2';
const STORAGE_KEY_ACTIVE_STAFF = 'amarii_active_staff_id_v2';

// Helper to normalize any incoming tasks so that combined subtasks are always converted to separate individual tasks by default
const normalizeTasksToSeparateCards = (rawTasks: TaskItem[]): TaskItem[] => {
  const result: TaskItem[] = [];
  rawTasks.forEach((t) => {
    if (t.subTasks && t.subTasks.length > 0) {
      t.subTasks.forEach((s, sIdx) => {
        result.push({
          id: s.id && !s.id.startsWith('sub-') ? s.id : `${t.id}-card-${sIdx + 1}`,
          title: s.title,
          checklistHeader: t.checklistHeader || 'General Operations',
          startTime: t.startTime || '09:00 AM',
          endTime: t.endTime || t.deadline || '10:30 AM',
          deadline: t.deadline || t.endTime || '10:30 AM',
          department: t.department || 'General',
          priority: t.priority || 'today',
          completed: s.isDone,
          completedAt: s.completedAt,
          isPhotoMandatory: Boolean(s.isPhotoMandatory || s.mandatoryMedia === 'photo'),
          isVideoMandatory: Boolean(s.isVideoMandatory || s.mandatoryMedia === 'video'),
          isNoteMandatory: Boolean(s.isNoteMandatory),
          mandatoryMedia: s.isPhotoMandatory || s.mandatoryMedia === 'photo' ? 'photo' : s.isVideoMandatory || s.mandatoryMedia === 'video' ? 'video' : 'none',
          media: s.media || [],
          notes: s.notes || '',
          outlet: t.outlet || DEFAULT_OUTLET,
          assignee: t.assignee,
          assigneeId: t.assigneeId,
          assigneeDesignation: t.assigneeDesignation,
          assigneeRoleType: t.assigneeRoleType,
          createdAt: t.createdAt,
          assignedAt: t.assignedAt,
          assignedBy: t.assignedBy,
          approvalStatus: t.approvalStatus,
          submittedBy: t.submittedBy,
          submittedAt: t.submittedAt,
          subTasks: [],
        });
      });
    } else {
      result.push(t);
    }
  });
  return result;
};

export default function App() {
  const { theme, isLightMode } = useTheme();
  const {
    currentUser,
    logout,
    isAuthenticated,
    canAccessTools,
    canViewAllDepartments,
    canAddTask,
    canEditTask,
    canDeleteTask,
    canOverrideMandatory,
    canSwitchStations,
    isStaff,
    isAdmin,
    isManager,
    staffStation,
  } = useAuth();

  const {
    queue: offlineQueue,
    pendingCount: pendingQueueCount,
    isOnline,
    isSyncing: isQueueSyncing,
    triggerSync: triggerQueueSync,
  } = useTaskQueue();

  const handleTriggerManualQueueSync = async () => {
    try {
      const res = await triggerQueueSync();
      if (res.processed > 0) {
        setToastFeedback({
          id: `toast-sync-${Date.now()}`,
          text: `Synchronized ${res.processed} pending task update${res.processed > 1 ? 's' : ''} to Firestore.`,
          type: 'success',
        });
      } else if (res.remaining === 0) {
        setToastFeedback({
          id: `toast-sync-${Date.now()}`,
          text: 'All offline task updates are fully synchronized.',
          type: 'info',
        });
      } else {
        setToastFeedback({
          id: `toast-sync-${Date.now()}`,
          text: `Network connection offline. ${res.remaining} update(s) stored in local queue for auto-retry.`,
          type: 'error',
        });
      }
    } catch (err) {
      console.error('Manual queue sync failed:', err);
    }
  };

  const {
    activeOutlet,
    availableOutlets,
    isOutletLocked,
    isOutletModalOpen,
    openOutletModal,
    closeOutletModal,
  } = useOutlet();

  const [tasks, setTasks] = useState<TaskItem[]>(INITIAL_DAILY_TASKS);
  const [staffList, setStaffList] = useState<StaffMember[]>(() => {
    try {
      const cached = localStorage.getItem('amarii_staff_list_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(
            (s: any) => s && s.id && !LEGACY_DEMO_STAFF_IDS.includes(s.id) && !s.name?.toLowerCase().includes('arjun')
          );
          if (clean.length > 0) return clean;
        }
      }
    } catch (e) {
      console.warn('Staff cache read note:', e);
    }
    return INITIAL_STAFF;
  });
  const [history, setHistory] = useState<ShiftRecord[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Active Staff Member on this device
  const [activeStaff, setActiveStaff] = useState<StaffMember | null>(() => {
    try {
      const savedStaffId = localStorage.getItem(STORAGE_KEY_ACTIVE_STAFF);
      if (savedStaffId) {
        const foundInInitial = INITIAL_STAFF.find((s) => s.id === savedStaffId);
        if (foundInInitial) return foundInInitial;
        const cached = localStorage.getItem('amarii_staff_list_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const foundInCache = parsed.find((s: any) => s && s.id === savedStaffId);
            if (foundInCache) return foundInCache;
          }
        }
      }
    } catch (e) {
      console.warn('Staff storage read error:', e);
    }
    // Default to Kitchen employee (Head Chef Aditya) so department isolation is locked by default
    return INITIAL_STAFF.find((s) => s.id === 'staff-chef-aditya') || INITIAL_STAFF[0] || null;
  });

  // Manager override state (if unlocked via PIN '1234')
  const [isManagerUnlocked, setIsManagerUnlocked] = useState<boolean>(false);

  // Station isolation state (Bar, Kitchen, Housekeeping, Service, Billing, or Manager)
  const [currentStation, setCurrentStation] = useState<StationMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATION);
      if (saved) return saved as StationMode;
    } catch (e) {
      console.warn('Storage read note:', e);
    }
    return 'Kitchen';
  });

  // Whenever currentUser changes, enforce station isolation for staff
  useEffect(() => {
    if (isStaff && staffStation) {
      setCurrentStation(staffStation as StationMode);
    } else if (isAdmin && currentStation !== 'Manager') {
      // Admin can view all or switch
    }
    if (currentUser) {
      const match = staffList.find(
        (s) =>
          s.id === currentUser.id ||
          (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          s.name.toLowerCase() === currentUser.name.toLowerCase()
      );
      if (match) {
        setActiveStaff(match);
      }
    }
  }, [currentUser, isStaff, isAdmin, staffStation, staffList]);

  // Whenever activeStaff changes, automatically enforce their department station if they are an employee
  useEffect(() => {
    if (activeStaff) {
      try {
        localStorage.setItem(STORAGE_KEY_ACTIVE_STAFF, activeStaff.id);
      } catch (e) {}

      if (activeStaff.roleType === 'employee') {
        setCurrentStation(activeStaff.department);
        try {
          localStorage.setItem(STORAGE_KEY_STATION, activeStaff.department);
        } catch (e) {}
      }
    }
  }, [activeStaff]);

  const handleManagerUnlock = (pin: string): boolean => {
    const isMatchingManager = staffList.some(
      (s) => (s.roleType === 'manager' || s.roleType === 'admin') && s.pin === pin
    );
    if (isMatchingManager || (activeStaff?.pin && pin === activeStaff.pin)) {
      setIsManagerUnlocked(true);
      return true;
    }
    return false;
  };

  const handleSelectActiveStaff = (staff: StaffMember | null) => {
    setActiveStaff(staff);
    if (!staff) {
      try {
        localStorage.removeItem(STORAGE_KEY_ACTIVE_STAFF);
      } catch (e) {}
    } else if (staff.roleType === 'employee') {
      setIsManagerUnlocked(false);
    }
  };

  // Firebase status & Real-Time Sync Diagnostics
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [firestoreConnectionState, setFirestoreConnectionState] = useState<'connected' | 'connecting' | 'error' | 'offline'>('connecting');
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string | null>(null);
  const [isLiveRealtime, setIsLiveRealtime] = useState<boolean>(true);
  const [lastFirestoreError, setLastFirestoreError] = useState<string | null>(null);
  const [syncedTasksCount, setSyncedTasksCount] = useState<number>(0);
  const [syncedStaffCount, setSyncedStaffCount] = useState<number>(0);
  const [syncedShiftsCount, setSyncedShiftsCount] = useState<number>(0);
  const [syncedOutletsCount, setSyncedOutletsCount] = useState<number>(0);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Modals state
  const [isStationModalOpen, setIsStationModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [isTaskDirectoryOpen, setIsTaskDirectoryOpen] = useState<boolean>(false);
  const [isAdminApprovalOpen, setIsAdminApprovalOpen] = useState<boolean>(false);
  const [isTaskRegisterOpen, setIsTaskRegisterOpen] = useState<boolean>(false);
  const [taskViewMode, setTaskViewMode] = useState<'live' | 'register'>('live');

  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [isDataCleanupModalOpen, setIsDataCleanupModalOpen] = useState<boolean>(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState<boolean>(false);
  const [selectedMedia, setSelectedMedia] = useState<TaskMedia | null>(null);
  const [defaultAssignDept, setDefaultAssignDept] = useState<TaskDepartment>('Kitchen');
  const [defaultAssignHeader, setDefaultAssignHeader] = useState<ChecklistHeader | string>('Kitchen Opening Checklist');
  const [defaultAssignStaff, setDefaultAssignStaff] = useState<StaffMember | null>(null);

  // UI state
  const [isScannableMode, setIsScannableMode] = useState<boolean>(false);
  const [groupBy, setGroupBy] = useState<'checklistHeader' | 'department' | 'priority'>('checklistHeader');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'remaining' | 'completed' | 'awaiting_approval'>('all');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<'tasks' | 'station' | 'staff' | 'chat' | 'brief'>('tasks');

  // Track deleted checklist headers so removed empty headers don't reappear
  const [deletedChecklistHeaders, setDeletedChecklistHeaders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('amarii_deleted_checklist_headers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // PWA install hook
  const { isInstallable, isInstalled, install, deferredPrompt } = usePWAInstall();

  // Chat Assistant state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      sender: 'assistant',
      text: "Hello! I'm your Amarii Café Operations Assistant. All tasks are synced in real time. Each station (Kitchen, Bar, Housekeeping, Service, Billing) displays strictly their own tasks. Which task should I mark as completed?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Mandatory Requirement Completion Validation Warning
  const [validationWarning, setValidationWarning] = useState<{
    taskId: string;
    taskTitle: string;
    missingItems: string[];
    missingPhoto: boolean;
    missingVideo: boolean;
    missingNote: boolean;
  } | null>(null);
  const [blockedTaskId, setBlockedTaskId] = useState<string | null>(null);

  // Helper to reliably resolve which checklist group a task belongs to
  const getTaskChecklistGroup = useCallback((task: TaskItem): string => {
    if (task.checklistHeader && task.checklistHeader.trim()) {
      return task.checklistHeader.trim();
    }
    // Sensible default station checklist group based on department or active station
    const dept = (task.department || '').toLowerCase();
    if (dept.includes('kitchen') || currentStation === 'Kitchen') return 'Kitchen Daily Checklist';
    if (dept.includes('bar') || dept.includes('beverage') || currentStation === 'Bar') return 'Bar Opening Checklist';
    if (dept.includes('cashier') || dept.includes('billing') || currentStation === 'Billing') return 'Cashier Opening/Closing';
    if (dept.includes('service') || dept.includes('foh') || currentStation === 'Service') return 'Service Opening/Closing';
    if (dept.includes('housekeeping') || currentStation === 'Housekeeping') return 'Housekeeping Opening/Closing';
    return 'General Operations';
  }, [currentStation]);

  // Synchronize deleted checklist headers: any header with active tasks should NEVER be suppressed
  useEffect(() => {
    if (deletedChecklistHeaders.length > 0 && tasks.length > 0) {
      const activeHeaders = new Set(tasks.map((t) => getTaskChecklistGroup(t)));
      const stillDeleted = deletedChecklistHeaders.filter((h) => !activeHeaders.has(h));
      if (stillDeleted.length !== deletedChecklistHeaders.length) {
        setDeletedChecklistHeaders(stillDeleted);
        try {
          localStorage.setItem('amarii_deleted_checklist_headers', JSON.stringify(stillDeleted));
        } catch (e) {
          console.warn('Could not update deleted checklist headers in localStorage:', e);
        }
      }
    }
  }, [tasks, deletedChecklistHeaders, getTaskChecklistGroup]);

  // Floating Operation Feedback Toast (e.g. deletion, updates)
  const [toastFeedback, setToastFeedback] = useState<{
    id: string;
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // 10-Minute Pre-Task Extreme Siren Alarm Modal State
  const [activeAlarm, setActiveAlarm] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
    minutesRemaining: number;
  }>({
    isOpen: false,
    task: null,
    minutesRemaining: 10,
  });

  // Automatically request notification permissions on user activity & mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        requestNotificationPermission().catch(() => {});
      }
    }
  }, []);

  // Periodic 10-minute pre-task alarm evaluation (runs every 15 seconds)
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const runAlarmCheck = () => {
      checkPreTaskAlarms(tasks, (task, minutesRemaining) => {
        setActiveAlarm({
          isOpen: true,
          task,
          minutesRemaining,
        });
      });
    };

    // Immediate initial check
    runAlarmCheck();

    // Check periodically
    const interval = setInterval(runAlarmCheck, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Auto-dismiss toast feedback after 4 seconds
  useEffect(() => {
    if (!toastFeedback) return;
    const timer = setTimeout(() => {
      setToastFeedback(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastFeedback]);

  // Auto-dismiss warning toast after 7 seconds
  useEffect(() => {
    if (!validationWarning) return;
    const timer = setTimeout(() => {
      setValidationWarning(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [validationWarning]);

  // Initialize Firebase and real-time listeners
  useEffect(() => {
    let unsubscribeTasks: () => void = () => {};
    let unsubscribeStaff: () => void = () => {};
    let unsubscribeShifts: () => void = () => {};
    let unsubscribeSettings: () => void = () => {};

    console.log('[App] Initializing real-time Firestore listeners & verifying connection...');

    // Proactively test cloud connectivity
    testFirestoreConnection()
      .then((diag) => {
        if (diag.connected) {
          console.log(`[App] Firestore Cloud Server connected (latency: ${diag.latencyMs}ms)`);
          setIsFirebaseConnected(true);
          setFirestoreConnectionState('connected');
        } else {
          console.warn('[App] Firestore test connection probe failed:', diag.error);
          setFirestoreConnectionState('offline');
          setLastFirestoreError(diag.error || 'Connection probe failed');
        }
      })
      .catch((err) => {
        console.warn('[App] Connection diagnostic probe error:', err);
      });

    // 1. Immediately subscribe to staff in real time
    unsubscribeStaff = subscribeToStaff(
      (liveStaff, fromCache) => {
        console.log(
          `[App] Real-time staff listener updated: ${liveStaff.length} members (fromCache: ${Boolean(fromCache)})`
        );
        if (liveStaff && liveStaff.length > 0) {
          setStaffList(liveStaff);
          setSyncedStaffCount(liveStaff.length);
          try {
            localStorage.setItem('amarii_staff_list_cache', JSON.stringify(liveStaff));
          } catch (err) {
            console.warn('Could not cache staff list:', err);
          }
        }
        setIsFirebaseConnected(true);
        setFirestoreConnectionState('connected');
        setIsLiveRealtime(!fromCache);
        setLastSyncTimestamp(new Date().toISOString());
      },
      (err) => {
        console.error('[App] Error in real-time staff listener:', err);
        setLastFirestoreError(err?.message || 'Staff subscription error');
        setFirestoreConnectionState('error');
      }
    );

    // 2. Immediately subscribe to tasks in real time
    unsubscribeTasks = subscribeToTasks(
      (liveTasks, fromCache) => {
        console.log(
          `[App] Real-time tasks listener updated: ${liveTasks.length} tasks (fromCache: ${Boolean(fromCache)})`
        );
        if (liveTasks && liveTasks.length > 0) {
          const normalized = normalizeTasksToSeparateCards(liveTasks);
          setTasks(normalized);
        }
        setSyncedTasksCount(liveTasks ? liveTasks.length : 0);
        setIsFirebaseConnected(true);
        setFirestoreConnectionState('connected');
        setIsLiveRealtime(!fromCache);
        setLastSyncTimestamp(new Date().toISOString());
      },
      (err) => {
        console.error('[App] Error in real-time tasks listener:', err);
        setLastFirestoreError(err?.message || 'Tasks subscription error');
        setFirestoreConnectionState('error');
      }
    );

    // 3. Immediately subscribe to shifts in real time
    unsubscribeShifts = subscribeToShifts(
      (liveShifts) => {
        setHistory(liveShifts);
        setSyncedShiftsCount(liveShifts ? liveShifts.length : 0);
      },
      (err) => {
        console.warn('[App] Error in shifts listener:', err);
      }
    );

    // 4. Immediately subscribe to checklist settings in real time
    unsubscribeSettings = subscribeToChecklistSettings((deletedHeaders) => {
      setDeletedChecklistHeaders(deletedHeaders);
    });

    // 5. Initial explicit fetch for instant cache hydration
    fetchStaffOnce()
      .then((items) => {
        if (items && items.length > 0) {
          setStaffList(items);
          setSyncedStaffCount(items.length);
          try {
            localStorage.setItem('amarii_staff_list_cache', JSON.stringify(items));
          } catch (e) {}
        }
      })
      .catch((err) => console.warn('App initial staff fetch note:', err));

    // 6. Run background bootstrap seed (only seeds if collections are completely empty)
    seedInitialTasksIfEmpty(INITIAL_DAILY_TASKS, INITIAL_STAFF).catch((err) => {
      console.warn('Firebase bootstrap seed notice:', err);
    });

    // 7. Purge any leftover legacy dummy staff so only real staff exist
    purgeLegacyDemoStaffFromFirestore().catch((err) => {
      console.warn('Staff purge notice:', err);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeStaff();
      unsubscribeShifts();
      unsubscribeSettings();
    };
  }, []);

  const isAnyModalOpen =
    isStationModalOpen ||
    isStaffModalOpen ||
    isHistoryModalOpen ||
    isPasteModalOpen ||
    isAssignModalOpen ||
    isPdfModalOpen ||
    isDataCleanupModalOpen ||
    isTaskDirectoryOpen ||
    isDiagnosticsModalOpen;

  // Prevent background body scrolling when any modal is open (fixes dual scrollbars)
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyModalOpen]);

  // Save active station to LocalStorage
  const handleSelectStation = (station: StationMode) => {
    if (isStaff) {
      alert(`Station locked to ${currentStation} for Staff role.`);
      return;
    }
    setCurrentStation(station);
    try {
      localStorage.setItem(STORAGE_KEY_STATION, station);
    } catch (e) {
      console.warn('Failed to save station:', e);
    }
  };

  // Delete a task (Admin and Manager)
  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) {
      console.error('handleDeleteTask: taskId is missing or invalid');
      return;
    }
    if (!canDeleteTask) {
      alert('Access Denied: Only Administrator and Manager accounts can delete tasks.');
      return;
    }

    // Capture task title for clear confirmation toast
    const taskToDelete = tasks.find((t) => t.id === taskId);
    const taskTitle = taskToDelete?.title || 'Checklist task';

    // 1. Instantly remove from local UI state so the card disappears immediately
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    // 2. Immediate feedback toast
    setToastFeedback({
      id: `toast-del-${Date.now()}`,
      text: `Checklist "${taskTitle}" deleted successfully.`,
      type: 'success',
    });

    // 3. Remove using offline-resilient local queue
    try {
      const res = await executeTaskOperationWithQueue({
        type: 'DELETE_TASK',
        taskId,
      });
      if (res.queued && !res.synced) {
        setToastFeedback({
          id: `toast-del-queue-${Date.now()}`,
          text: `"${taskTitle}" removed locally & queued for Firestore auto-sync.`,
          type: 'info',
        });
      }
    } catch (err) {
      console.error('Failed to queue task deletion:', err);
    }
  };

  // Delete an entire checklist and all its associated tasks (Admin and Manager)
  const handleDeleteChecklist = async (headerName: string) => {
    if (!headerName) return;
    if (!canDeleteTask) {
      setToastFeedback({
        id: `toast-err-${Date.now()}`,
        text: 'Access Denied: Only Administrator and Manager accounts can delete checklists.',
        type: 'error',
      });
      return;
    }

    const tasksToDelete = tasks.filter(
      (t) => getTaskChecklistGroup(t) === headerName || (t.checklistHeader || 'General Operations') === headerName
    );
    const taskIds = tasksToDelete.map((t) => t.id);

    // 1. Remove tasks from local state
    setTasks((prev) =>
      prev.filter((t) => getTaskChecklistGroup(t) !== headerName && (t.checklistHeader || 'General Operations') !== headerName)
    );

    // 2. Persist deleted header so empty/default templates don't reappear
    setDeletedChecklistHeaders((prev) => {
      const updated = prev.includes(headerName) ? prev : [...prev, headerName];
      try {
        localStorage.setItem('amarii_deleted_checklist_headers', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save deleted checklists to localStorage:', e);
      }
      return updated;
    });

    // 3. Immediate feedback toast
    setToastFeedback({
      id: `toast-del-chk-${Date.now()}`,
      text: `Checklist "${headerName}" ${
        taskIds.length > 0 ? `and its ${taskIds.length} tasks ` : ''
      }deleted successfully.`,
      type: 'success',
    });

    // 4. Batch delete via offline-resilient queue
    if (taskIds.length > 0) {
      try {
        const res = await executeTaskOperationWithQueue({
          type: 'BATCH_DELETE_TASKS',
          taskIds,
        });
        if (res.queued && !res.synced) {
          setToastFeedback({
            id: `toast-del-chk-queue-${Date.now()}`,
            text: `Checklist deleted locally & queued for Firestore auto-sync.`,
            type: 'info',
          });
        }
      } catch (err) {
        console.error('Failed to queue batch delete checklist tasks:', err);
      }
    }
  };

  // Batch delete tasks (selected tasks from directory)
  const handleBatchDeleteTasks = async (taskIds: string[]) => {
    if (!taskIds || taskIds.length === 0) return;
    if (!canDeleteTask) {
      setToastFeedback({
        id: `toast-err-${Date.now()}`,
        text: 'Access Denied: Only Administrator and Manager accounts can delete tasks.',
        type: 'error',
      });
      return;
    }

    setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));

    setToastFeedback({
      id: `toast-batch-del-${Date.now()}`,
      text: `Deleted ${taskIds.length} tasks successfully.`,
      type: 'success',
    });

    try {
      const res = await executeTaskOperationWithQueue({
        type: 'BATCH_DELETE_TASKS',
        taskIds,
      });
      if (res.queued && !res.synced) {
        setToastFeedback({
          id: `toast-batch-del-queue-${Date.now()}`,
          text: `Deleted locally; ${taskIds.length} tasks queued for Firestore auto-sync.`,
          type: 'info',
        });
      }
    } catch (err) {
      console.error('Failed to queue batch delete tasks:', err);
    }
  };

  // Rename checklist header across all its tasks
  const handleRenameChecklist = async (oldHeader: string, newHeader: string) => {
    if (!newHeader || newHeader.trim() === '' || newHeader === oldHeader) return;
    const trimmed = newHeader.trim();

    setTasks((prev) =>
      prev.map((t) =>
        (t.checklistHeader || 'General Operations') === oldHeader
          ? { ...t, checklistHeader: trimmed }
          : t
      )
    );

    const affectedTasks = tasks.filter(
      (t) => (t.checklistHeader || 'General Operations') === oldHeader
    );
    if (affectedTasks.length > 0) {
      try {
        const updatedTasks = affectedTasks.map((t) => ({ ...t, checklistHeader: trimmed }));
        const res = await executeTaskOperationWithQueue({
          type: 'BATCH_SAVE_TASKS',
          tasks: updatedTasks,
        });
        if (res.queued && !res.synced) {
          setToastFeedback({
            id: `toast-ren-queue-${Date.now()}`,
            text: `Renamed checklist locally & queued for Firestore auto-sync.`,
            type: 'info',
          });
        }
      } catch (e) {
        console.warn('Failed to queue renamed header update:', e);
      }
    }

    setToastFeedback({
      id: `toast-ren-${Date.now()}`,
      text: `Renamed checklist to "${trimmed}".`,
      type: 'success',
    });
  };

  // Restore default checklists
  const handleRestoreDefaultChecklists = () => {
    setDeletedChecklistHeaders([]);
    try {
      localStorage.removeItem('amarii_deleted_checklist_headers');
    } catch (e) {
      console.warn(e);
    }
    setToastFeedback({
      id: `toast-rest-${Date.now()}`,
      text: 'Default checklists restored successfully.',
      type: 'info',
    });
  };

  // Admin override mandatory requirements to force complete a task
  const handleAdminOverride = async (taskId: string) => {
    if (!canOverrideMandatory) return;
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    setValidationWarning(null);
    setBlockedTaskId(null);

    const newCompleted = true;
    const updatedTask: TaskItem = {
      ...target,
      completed: newCompleted,
      completedAt: new Date().toISOString(),
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? updatedTask : t))
    );

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_COMPLETION',
        taskId,
        completed: newCompleted,
        fullTask: updatedTask,
      });
    } catch (e) {
      console.error('Failed to update task completion via queue:', e);
    }
  };

  // Staff Management Actions
  const handleAddStaff = async (newStaff: StaffMember | Omit<StaffMember, 'id'>) => {
    const memberId = ('id' in newStaff && newStaff.id)
      ? newStaff.id
      : generateStaffId(newStaff.name || 'member', newStaff.roleType, staffList.map((s) => s.id));

    const member: StaffMember = {
      ...newStaff,
      id: memberId,
      outlet: newStaff.outlet || activeOutlet,
      isActive: newStaff.isActive !== false && (newStaff as any).active !== false,
      active: newStaff.isActive !== false && (newStaff as any).active !== false,
      createdAt: (newStaff as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.group(`[App:handleAddStaff] Adding staff member: ${member.name} (${member.id})`);
    console.log('Role:', member.roleType, 'Dept:', member.department, 'Outlet:', member.outlet, 'PIN:', member.pin);

    // 1. Optimistically update local state & cache
    setStaffList((prev) => {
      const filtered = prev.filter((s) => s.id !== member.id);
      const updated = [...filtered, member];
      try {
        localStorage.setItem('amarii_staff_list_cache', JSON.stringify(updated));
      } catch (err) {
        console.warn('Staff cache write error:', err);
      }
      return updated;
    });

    // 2. Persist to Firestore with explicit debug tracking
    try {
      console.log(`[App:handleAddStaff] Invoking saveStaffToFirebase for ${member.id}...`);
      await saveStaffToFirebase(member);
      console.log(`[App:handleAddStaff] Successfully verified Firestore write for ${member.id}`);
      console.groupEnd();

      setSyncedStaffCount((prev) => prev + 1);
      setLastSyncTimestamp(new Date().toISOString());
      setToastFeedback({
        id: `toast-staff-add-${Date.now()}`,
        text: `✓ Staff "${member.name}" permanently saved to Firebase! Real-time login active.`,
        type: 'success',
      });
      return member;
    } catch (e: any) {
      console.error('[App:handleAddStaff] Failed to persist staff in Firebase:', e);
      console.groupEnd();
      setLastFirestoreError(e?.message || 'Failed to save staff to database');
      setToastFeedback({
        id: `toast-staff-add-err-${Date.now()}`,
        text: `Error saving staff to cloud: ${e?.message || 'Check database permissions'}.`,
        type: 'error',
      });
      throw e;
    }
  };

  const handleUpdateStaff = async (updated: StaffMember) => {
    const staffWithOutlet: StaffMember = {
      ...updated,
      outlet: updated.outlet || activeOutlet,
      updatedAt: new Date().toISOString(),
    };

    console.group(`[App:handleUpdateStaff] Updating staff member: ${staffWithOutlet.name} (${staffWithOutlet.id})`);

    setStaffList((prev) => {
      const next = prev.map((s) => (s.id === staffWithOutlet.id ? staffWithOutlet : s));
      try {
        localStorage.setItem('amarii_staff_list_cache', JSON.stringify(next));
      } catch (err) {
        console.warn('Staff cache write error:', err);
      }
      return next;
    });

    try {
      console.log(`[App:handleUpdateStaff] Invoking saveStaffToFirebase for ${staffWithOutlet.id}...`);
      await saveStaffToFirebase(staffWithOutlet);
      console.log(`[App:handleUpdateStaff] Successfully verified Firestore update for ${staffWithOutlet.id}`);
      console.groupEnd();

      setLastSyncTimestamp(new Date().toISOString());
      setToastFeedback({
        id: `toast-staff-upd-${Date.now()}`,
        text: `✓ Updated "${staffWithOutlet.name}" in Firebase Cloud Database!`,
        type: 'success',
      });
      return staffWithOutlet;
    } catch (e: any) {
      console.error('[App:handleUpdateStaff] Failed to update staff in Firebase:', e);
      console.groupEnd();
      setLastFirestoreError(e?.message || 'Failed to update staff in database');
      setToastFeedback({
        id: `toast-staff-upd-err-${Date.now()}`,
        text: `Error updating staff in cloud: ${e?.message || 'network issue'}.`,
        type: 'error',
      });
      throw e;
    }
  };

  const handleDeleteStaff = async (id: string) => {
    console.group(`[App:handleDeleteStaff] Deleting staff member ID: ${id}`);
    setStaffList((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try {
        localStorage.setItem('amarii_staff_list_cache', JSON.stringify(next));
      } catch (err) {}
      return next;
    });

    try {
      await deleteStaffFromFirebase(id);
      console.log(`[App:handleDeleteStaff] Successfully removed staff ID ${id} from Firestore`);
      console.groupEnd();
      setSyncedStaffCount((prev) => Math.max(0, prev - 1));
      setLastSyncTimestamp(new Date().toISOString());
      setToastFeedback({
        id: `toast-staff-del-${Date.now()}`,
        text: `Staff member permanently deleted from Firebase Cloud Database.`,
        type: 'info',
      });
    } catch (e: any) {
      console.error('[App:handleDeleteStaff] Failed to delete staff from Firebase:', e);
      console.groupEnd();
      setLastFirestoreError(e?.message || 'Failed to delete staff');
    }
  };

  // Task Creation & Assignment Handlers
  const handleOpenAssignModal = (dept?: TaskDepartment, header?: ChecklistHeader | string) => {
    setEditingTask(null);
    setIsDuplicateMode(false);
    setDefaultAssignStaff(null);
    const targetDept =
      dept || (currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen');
    setDefaultAssignDept(targetDept);
    if (header) {
      setDefaultAssignHeader(header);
    } else {
      if (targetDept === 'Kitchen') setDefaultAssignHeader('Kitchen Opening Checklist');
      else if (targetDept === 'Bar') setDefaultAssignHeader('Bar Opening Checklist');
      else if (targetDept === 'Housekeeping') setDefaultAssignHeader('Housekeeping Opening/Closing');
      else if (targetDept === 'Service') setDefaultAssignHeader('Service Opening/Closing');
      else if (targetDept === 'Billing') setDefaultAssignHeader('Cashier Opening/Closing');
    }
    setIsAssignModalOpen(true);
  };

  const handleAddTaskToHeader = (headerName: string) => {
    setEditingTask(null);
    setIsDuplicateMode(false);
    setDefaultAssignStaff(null);
    setDefaultAssignHeader(headerName);
    if (headerName.includes('Kitchen')) setDefaultAssignDept('Kitchen');
    else if (headerName.includes('Bar')) setDefaultAssignDept('Bar');
    else if (headerName.includes('Housekeeping')) setDefaultAssignDept('Housekeeping');
    else if (headerName.includes('Service')) setDefaultAssignDept('Service');
    else if (headerName.includes('Cashier')) setDefaultAssignDept('Billing');
    setIsAssignModalOpen(true);
  };

  const handleUpgradeChecklist = (headerName: string) => {
    handleAddTaskToHeader(headerName);
  };

  const handlePullToRefresh = async () => {
    try {
      const [freshTasks, freshStaff] = await Promise.all([
        fetchTasksOnce(),
        fetchStaffOnce(),
      ]);
      if (freshTasks && freshTasks.length > 0) {
        setTasks(normalizeTasksToSeparateCards(freshTasks));
      }
      if (freshStaff && freshStaff.length > 0) {
        setStaffList(freshStaff);
        try {
          localStorage.setItem('amarii_staff_list_cache', JSON.stringify(freshStaff));
        } catch {}
      }
      setToastFeedback({
        id: Date.now().toString(),
        text: 'Checklists & Staff synchronized with cloud database.',
        type: 'success',
      });
    } catch (err) {
      console.error('Refresh error:', err);
      setToastFeedback({
        id: Date.now().toString(),
        text: 'Sync issue while refreshing checklists.',
        type: 'error',
      });
    }
  };

  // Batch cleanup of old completed tasks (Admin only)
  const handleExecuteDataCleanup = async (taskIds: string[], cleanupLabel: string) => {
    if (!isAdmin) {
      alert('Access Denied: Only Administrator accounts can execute batch data cleanup.');
      return;
    }
    if (!taskIds || taskIds.length === 0) return;

    // Immediately remove from local UI state
    setTasks((prev) => prev.filter((t) => !taskIds.includes(t.id)));

    // Batch delete via offline queue
    try {
      await executeTaskOperationWithQueue({
        type: 'BATCH_DELETE_TASKS',
        taskIds,
      });
      console.log(`Successfully queued batch deletion for ${taskIds.length} tasks (${cleanupLabel})`);
    } catch (err) {
      console.error('Failed to batch delete tasks via queue:', err);
      throw err;
    }
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsDuplicateMode(false);
    setDefaultAssignDept((task.department as TaskDepartment) || 'Kitchen');
    if (task.checklistHeader) {
      setDefaultAssignHeader(task.checklistHeader);
    }
    setIsAssignModalOpen(true);
  };

  const handleDuplicateTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsDuplicateMode(true);
    setDefaultAssignDept((task.department as TaskDepartment) || 'Kitchen');
    if (task.checklistHeader) {
      setDefaultAssignHeader(task.checklistHeader);
    }
    setIsAssignModalOpen(true);
  };

  const handleSaveTask = async (taskData: TaskItem) => {
    triggerHaptic('success');
    const nowIso = new Date().toISOString();
    const taskWithOutlet: TaskItem = {
      ...taskData,
      outlet: taskData.outlet || activeOutlet,
      createdAt: taskData.createdAt || nowIso,
      assignedAt: taskData.assignedAt || nowIso,
      assignedBy: taskData.assignedBy || (isAdmin ? 'Hemen Das (Owner & GM)' : currentUser?.name || 'Management'),
      dueDate: taskData.dueDate || nowIso.slice(0, 10),
    };

    if (editingTask) {
      setTasks((prev) => prev.map((t) => (t.id === taskWithOutlet.id ? taskWithOutlet : t)));
    } else {
      setTasks((prev) => [taskWithOutlet, ...prev]);
    }

    // Ensure newly created tasks are not hidden by completed status filter or search
    setFilterStatus('all');
    setActiveMobileTab('tasks');
    setIsAssignModalOpen(false);

    // If checklist was previously marked deleted, unmark it
    if (taskWithOutlet.checklistHeader) {
      setDeletedChecklistHeaders((prev) =>
        prev.filter((h) => h !== taskWithOutlet.checklistHeader)
      );
    }

    setToastFeedback({
      id: `toast-save-${Date.now()}`,
      text: `Task "${taskWithOutlet.title}" saved successfully.`,
      type: 'success',
    });

    try {
      const res = await executeTaskOperationWithQueue({
        type: 'SAVE_TASK',
        task: taskWithOutlet,
      });
      if (res.queued && !res.synced) {
        setToastFeedback({
          id: `toast-save-queue-${Date.now()}`,
          text: `Task "${taskWithOutlet.title}" saved locally & queued for Firestore auto-sync.`,
          type: 'info',
        });
      }
    } catch (e) {
      console.error('Failed to save task via queue:', e);
    }
  };

  // Bulk Task Creation Handler (from Add Task modal staged list)
  const handleSaveTasks = async (newTasks: TaskItem[]) => {
    triggerHaptic('success');
    const nowIso = new Date().toISOString();
    const tasksWithOutlet = newTasks.map((t) => ({
      ...t,
      outlet: t.outlet || activeOutlet,
      createdAt: t.createdAt || nowIso,
      assignedAt: t.assignedAt || nowIso,
      assignedBy: t.assignedBy || (isAdmin ? 'Hemen Das (Owner & GM)' : currentUser?.name || 'Management'),
      dueDate: t.dueDate || nowIso.slice(0, 10),
    }));
    setTasks((prev) => [...tasksWithOutlet, ...prev]);

    setFilterStatus('all');
    setActiveMobileTab('tasks');
    setIsAssignModalOpen(false);

    // Unmark any headers
    const newHeaders = tasksWithOutlet.map((t) => t.checklistHeader).filter(Boolean) as string[];
    if (newHeaders.length > 0) {
      setDeletedChecklistHeaders((prev) =>
        prev.filter((h) => !newHeaders.includes(h))
      );
    }

    setToastFeedback({
      id: `toast-batch-${Date.now()}`,
      text: `${tasksWithOutlet.length} tasks added successfully.`,
      type: 'success',
    });

    try {
      const res = await executeTaskOperationWithQueue({
        type: 'BATCH_SAVE_TASKS',
        tasks: tasksWithOutlet,
      });
      if (res.queued && !res.synced) {
        setToastFeedback({
          id: `toast-batch-save-queue-${Date.now()}`,
          text: `${tasksWithOutlet.length} tasks saved locally & queued for Firestore auto-sync.`,
          type: 'info',
        });
      }
    } catch (e) {
      console.error('Failed to batch save new tasks via queue:', e);
    }
  };

  // 1-Tap Media Attachment to a specific task
  const handleAddMediaToTask = async (taskId: string, newMedia: TaskMedia) => {
    let processedMedia = { ...newMedia };
    if (processedMedia.type === 'photo' && processedMedia.url && processedMedia.url.startsWith('data:image/')) {
      try {
        const compressedUrl = await compressImage(processedMedia.url, 800, 0.65);
        processedMedia.url = compressedUrl;
      } catch (e) {
        console.warn('Media compression error:', e);
      }
    }

    let updatedMediaList: TaskMedia[] = [];
    let updatedTask: TaskItem | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedMediaList = [...(t.media || []), processedMedia];
          updatedTask = { ...t, media: updatedMediaList };
          return updatedTask;
        }
        return t;
      })
    );

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_MEDIA',
        taskId,
        media: updatedMediaList,
        fullTask: updatedTask,
      });
    } catch (e) {
      console.error('Failed to save media via queue:', e);
    }
  };

  // Sub-task Toggle Handler with Strict Proof Validation
  const handleToggleSubTask = async (taskId: string, subTaskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || !target.subTasks) return;

    // Prevent modifying subtasks if task is already submitted & locked
    if (target.completed) {
      setToastFeedback({
        id: `toast-locked-${Date.now()}`,
        text: '🔒 Task is already submitted and locked. It cannot be modified or undone.',
        type: 'info',
      });
      return;
    }

    const sub = target.subTasks.find((st) => st.id === subTaskId);
    if (!sub) return;

    // Strict validation: If attempting to mark subtask done, verify mandatory proof for this specific subtask
    if (!sub.isDone) {
      const isReqPhoto = Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo');
      const hasPhoto = Boolean(sub.media && sub.media.some((m) => m.type === 'photo'));
      if (isReqPhoto && !hasPhoto) {
        setValidationWarning({
          taskId: target.id,
          taskTitle: target.title,
          missingItems: [`Subtask "${sub.title}": Photo Proof is strictly required! Please take a photo.`],
          missingPhoto: true,
          missingVideo: false,
          missingNote: false,
        });
        setBlockedTaskId(target.id);
        return;
      }
    }

    const updatedSubTasks = target.subTasks.map((st) => {
      if (st.id === subTaskId) {
        const nextDone = !st.isDone;
        return {
          ...st,
          isDone: nextDone,
          completedAt: nextDone ? new Date().toISOString() : undefined,
        };
      }
      return st;
    });

    const allSubTasksDone = updatedSubTasks.length > 0 && updatedSubTasks.every((st) => st.isDone);

    // If subtasks are not all done, ensure task is not completed.
    const isTaskNowCompleted = target.completed && !allSubTasksDone ? false : target.completed;

    const updatedTask: TaskItem = {
      ...target,
      completed: isTaskNowCompleted,
      completedAt: isTaskNowCompleted ? target.completedAt || new Date().toISOString() : undefined,
      subTasks: updatedSubTasks,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_SUBTASKS',
        taskId,
        subTasks: updatedSubTasks,
        fullTask: updatedTask,
      });

      if (isTaskNowCompleted !== target.completed) {
        await executeTaskOperationWithQueue({
          type: 'UPDATE_COMPLETION',
          taskId,
          completed: isTaskNowCompleted,
          fullTask: updatedTask,
        });
      }
    } catch (err) {
      console.error('Failed to update subtask via queue:', err);
    }
  };

  // Split nested subtasks into individual standalone TaskItems
  const handleUnpackSubTasks = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target || !target.subTasks || target.subTasks.length === 0) return;

    triggerHaptic('success');
    const nowIso = new Date().toISOString();
    const createdTasks: TaskItem[] = target.subTasks.map((s, idx) => ({
      id: `task-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      title: s.title,
      checklistHeader: target.checklistHeader || 'General Operations',
      startTime: target.startTime || '09:00 AM',
      endTime: target.endTime || target.deadline || '10:30 AM',
      deadline: target.deadline || target.endTime || '10:30 AM',
      department: target.department || 'General',
      priority: target.priority || 'today',
      completed: s.isDone,
      completedAt: s.completedAt,
      isPhotoMandatory: Boolean(s.isPhotoMandatory || s.mandatoryMedia === 'photo'),
      isVideoMandatory: Boolean(s.isVideoMandatory || s.mandatoryMedia === 'video'),
      isNoteMandatory: Boolean(s.isNoteMandatory),
      mandatoryMedia: s.isPhotoMandatory || s.mandatoryMedia === 'photo' ? 'photo' : s.isVideoMandatory || s.mandatoryMedia === 'video' ? 'video' : 'none',
      media: s.media || [],
      notes: s.notes || '',
      outlet: target.outlet || activeOutlet,
      assignee: target.assignee,
      assigneeId: target.assigneeId,
      assigneeDesignation: target.assigneeDesignation,
      assigneeRoleType: target.assigneeRoleType,
      createdAt: target.createdAt || nowIso,
      assignedAt: target.assignedAt || nowIso,
      assignedBy: target.assignedBy,
      subTasks: [],
    }));

    // Replace the parent task with the new individual tasks
    setTasks((prev) => [...createdTasks, ...prev.filter((t) => t.id !== taskId)]);

    setToastFeedback({
      id: `toast-split-${Date.now()}`,
      text: `Split checklist into ${createdTasks.length} separate individual task cards!`,
      type: 'success',
    });

    try {
      await executeTaskOperationWithQueue({
        type: 'DELETE_TASK',
        taskId,
      });
      await executeTaskOperationWithQueue({
        type: 'BATCH_SAVE_TASKS',
        tasks: createdTasks,
      });
    } catch (e) {
      console.error('Failed to unpack subtasks via queue:', e);
    }
  };

  // Sub-task Direct Media Attachment Handler
  const handleAddSubTaskMedia = async (taskId: string, subTaskId: string, newMedia: TaskMedia) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const existingSubTasks = target.subTasks || [];
    const updatedSubTasks = existingSubTasks.map((st) => {
      if (st.id === subTaskId) {
        return {
          ...st,
          media: [...(st.media || []), newMedia],
        };
      }
      return st;
    });

    const updatedTask: TaskItem = {
      ...target,
      media: [...(target.media || []), newMedia],
      subTasks: updatedSubTasks,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_SUBTASKS',
        taskId,
        subTasks: updatedSubTasks,
        fullTask: updatedTask,
      });
      await executeTaskOperationWithQueue({
        type: 'UPDATE_MEDIA',
        taskId,
        media: updatedTask.media || [],
        fullTask: updatedTask,
      });
    } catch (err) {
      console.error('Failed to update subtask media via queue:', err);
    }
  };

  // Sub-task Direct Note Handler
  const handleUpdateSubTaskNote = async (taskId: string, subTaskId: string, newNote: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const existingSubTasks = target.subTasks || [];
    const updatedSubTasks = existingSubTasks.map((st) => {
      if (st.id === subTaskId) {
        return {
          ...st,
          notes: newNote,
        };
      }
      return st;
    });

    const updatedTask: TaskItem = {
      ...target,
      subTasks: updatedSubTasks,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_SUBTASKS',
        taskId,
        subTasks: updatedSubTasks,
        fullTask: updatedTask,
      });
    } catch (err) {
      console.error('Failed to update subtask note via queue:', err);
    }
  };

  // 1-Tap Note update for a specific task
  const handleUpdateTaskNote = async (taskId: string, newNote: string) => {
    let updatedTask: TaskItem | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          updatedTask = { ...t, notes: newNote || '' };
          return { ...t, notes: newNote || undefined };
        }
        return t;
      })
    );

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_NOTE',
        taskId,
        notes: newNote,
        fullTask: updatedTask,
      });
    } catch (e) {
      console.error('Failed to save note via queue:', e);
    }
  };

  // Toggle single task completion with Granular Proof Validation & Nested Sub-tasks Sync
  const handleToggleTask = async (id: string) => {
    const target = tasks.find((t) => t.id === id);
    if (!target) return;

    // Prevent undoing / reopening submitted tasks
    if (target.completed) {
      setToastFeedback({
        id: `toast-locked-${Date.now()}`,
        text: '🔒 Task is already submitted & locked. It cannot be reopened or undone.',
        type: 'info',
      });
      return;
    }

    // If trying to mark as completed, validate ONLY the proofs that were configured for this task/subtasks
    if (!target.completed) {
      const reqPhoto = Boolean(target.isPhotoMandatory || target.mandatoryMedia === 'photo');
      const reqVideo = Boolean(target.isVideoMandatory || target.mandatoryMedia === 'video');
      const reqNote = Boolean(target.isNoteMandatory);

      const hasPhoto = Boolean(target.media && target.media.some((m) => m.type === 'photo'));
      const hasVideo = Boolean(target.media && target.media.some((m) => m.type === 'video'));
      const hasNote = Boolean(target.notes && target.notes.trim());

      const missingItems: string[] = [];
      let missingPhotoFlag = false;
      let missingVideoFlag = false;
      let missingNoteFlag = false;

      // 1. Check parent-level required proofs
      if (reqPhoto && !hasPhoto) {
        missingItems.push('Photo Proof required (capture live photo via Camera)');
        missingPhotoFlag = true;
      }
      if (reqVideo && !hasVideo) {
        missingItems.push('Video Proof required (attach video clip)');
        missingVideoFlag = true;
      }
      if (reqNote && !hasNote) {
        missingItems.push('Shift Note required');
        missingNoteFlag = true;
      }

      // 2. Check nested sub-tasks completion and proofs if any sub-task specifically requires proofs
      if (target.subTasks && target.subTasks.length > 0) {
        const pendingSubTasks = target.subTasks.filter((s) => !s.isDone);
        if (pendingSubTasks.length > 0) {
          missingItems.push(`${pendingSubTasks.length} Sub-task(s) still incomplete`);
        }

        target.subTasks.forEach((s) => {
          const sReqPhoto = Boolean(s.isPhotoMandatory || s.mandatoryMedia === 'photo');
          const sHasPhoto = Boolean(s.media && s.media.some((m) => m.type === 'photo'));
          const sReqVideo = Boolean(s.isVideoMandatory || s.mandatoryMedia === 'video');
          const sHasVideo = Boolean(s.media && s.media.some((m) => m.type === 'video'));
          const sReqNote = Boolean(s.isNoteMandatory);
          const sHasNote = Boolean(s.notes && s.notes.trim());

          const sMissing: string[] = [];
          if (sReqPhoto && !sHasPhoto) {
            sMissing.push('Photo');
            missingPhotoFlag = true;
          }
          if (sReqVideo && !sHasVideo) {
            sMissing.push('Video');
            missingVideoFlag = true;
          }
          if (sReqNote && !sHasNote) {
            sMissing.push('Note');
            missingNoteFlag = true;
          }

          if (sMissing.length > 0) {
            missingItems.push(`Sub-task "${s.title}": ${sMissing.join(' & ')} required`);
          }
        });
      }

      // If any required proof is missing, block completion with specific warning
      if (missingItems.length > 0) {
        setValidationWarning({
          taskId: target.id,
          taskTitle: target.title,
          missingItems,
          missingPhoto: missingPhotoFlag,
          missingVideo: missingVideoFlag,
          missingNote: missingNoteFlag,
        });
        setBlockedTaskId(target.id);
        return; // BLOCK completion until required proofs are uploaded
      }
    }

    // Clear any previous warning for this task if validation passed or unchecking
    if (validationWarning?.taskId === id) {
      setValidationWarning(null);
      setBlockedTaskId(null);
    }

    const newCompleted = !target.completed;

    // When completing parent task, cleanly mark all its nested subtasks as completed as well
    const updatedSubTasks = target.subTasks
      ? target.subTasks.map((st) => ({
          ...st,
          isDone: newCompleted,
          completedAt: newCompleted ? st.completedAt || new Date().toISOString() : undefined,
        }))
      : undefined;

    const updatedTask: TaskItem = {
      ...target,
      completed: newCompleted,
      completedAt: newCompleted ? new Date().toISOString() : undefined,
      subTasks: updatedSubTasks,
      approvalStatus: newCompleted ? 'pending' : 'none',
      submittedBy: newCompleted ? activeStaff?.name || currentUser?.name || 'Staff' : undefined,
      submittedAt: newCompleted ? new Date().toISOString() : undefined,
      rejectionReason: newCompleted ? undefined : target.rejectionReason,
    };

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? updatedTask : t))
    );

    try {
      await executeTaskOperationWithQueue({
        type: 'UPDATE_COMPLETION',
        taskId: id,
        completed: newCompleted,
        fullTask: updatedTask,
      });

      if (newCompleted) {
        setToastFeedback({
          id: `toast-submitted-${Date.now()}`,
          text: `Task completed successfully! Recorded for shift log.`,
          type: 'success',
        });
      }
    } catch (e) {
      console.error('Failed to update task completion via queue:', e);
    }
  };

  // Admin Hemen Das Task Approval Handler
  const handleApproveTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updatedTask: TaskItem = {
      ...target,
      completed: true,
      approvalStatus: 'approved',
      approvedBy: 'Hemen Das',
      approvedAt: new Date().toISOString(),
      rejectionReason: undefined,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await saveTaskToFirebase(updatedTask);
      setToastFeedback({
        id: `toast-approved-${Date.now()}`,
        text: `✓ Task "${target.title}" officially APPROVED by Admin Hemen Das!`,
        type: 'success',
      });
    } catch (e) {
      console.error('Failed to approve task:', e);
    }
  };

  // Admin Hemen Das Task Rejection Handler with Reason
  const handleRejectTask = async (taskId: string, reason: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;

    const updatedTask: TaskItem = {
      ...target,
      completed: false,
      approvalStatus: 'rejected',
      rejectedBy: 'Hemen Das',
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    try {
      await saveTaskToFirebase(updatedTask);
      setToastFeedback({
        id: `toast-rejected-${Date.now()}`,
        text: `❌ Task "${target.title}" rejected. Notification sent to staff to re-capture clear photo.`,
        type: 'error',
      });
    } catch (e) {
      console.error('Failed to reject task:', e);
    }
  };

  // Admin Hemen Das 1-Click Approve All Pending Tasks
  const handleApproveAllPending = async () => {
    const pendingList = tasks.filter(
      (t) =>
        t.approvalStatus === 'pending' ||
        (t.completed && t.approvalStatus !== 'approved') ||
        (t.media && t.media.length > 0 && !t.completed && t.approvalStatus !== 'approved')
    );
    if (pendingList.length === 0) return;

    const pendingIds = new Set(pendingList.map((t) => t.id));
    const nowIso = new Date().toISOString();
    const updatedTasks = tasks.map((t) => {
      if (pendingIds.has(t.id)) {
        return {
          ...t,
          completed: true,
          approvalStatus: 'approved' as const,
          approvedBy: 'Hemen Das',
          approvedAt: nowIso,
          rejectionReason: undefined,
        };
      }
      return t;
    });

    setTasks(updatedTasks);

    try {
      await executeTaskOperationWithQueue({
        type: 'BATCH_SAVE_TASKS',
        tasks: updatedTasks,
      });
      setToastFeedback({
        id: `toast-approved-all-${Date.now()}`,
        text: `✓ All ${pendingList.length} submitted tasks officially APPROVED by Admin Hemen Das!`,
        type: 'success',
      });
    } catch (e) {
      console.error('Failed to batch approve tasks:', e);
    }
  };

  // Helper to check if a task is blocked due to missing photo/video/note proofs or subtasks
  const isTaskBlockedBySubTasks = (t: TaskItem): boolean => {
    if (t.completed) return false;

    // Main task proofs
    const reqPhoto = Boolean(t.isPhotoMandatory);
    const hasPhoto = Boolean(t.media && t.media.some((m) => m.type === 'photo'));
    if (reqPhoto && !hasPhoto) return true;

    const reqVideo = Boolean(t.isVideoMandatory);
    const hasVideo = Boolean(t.media && t.media.some((m) => m.type === 'video'));
    if (reqVideo && !hasVideo) return true;

    const reqNote = Boolean(t.isNoteMandatory);
    const hasNote = Boolean(t.notes && t.notes.trim());
    if (reqNote && !hasNote) return true;

    // Subtasks
    if (t.subTasks && t.subTasks.some((s) => !s.isDone)) return true;

    if (
      t.subTasks &&
      t.subTasks.some((s) => {
        const mPhoto = Boolean((s.isPhotoMandatory || s.mandatoryMedia === 'photo') && (!s.media || !s.media.some((m) => m.type === 'photo')));
        const mVideo = Boolean((s.isVideoMandatory || s.mandatoryMedia === 'video') && (!s.media || !s.media.some((m) => m.type === 'video')));
        const mNote = Boolean(s.isNoteMandatory && (!s.notes || !s.notes.trim()));
        return mPhoto || mVideo || mNote;
      })
    ) {
      return true;
    }

    return false;
  };

  // Reset checklist to default template
  const handleResetToDefaultTemplate = async () => {
    if (true) {
      setTasks(INITIAL_DAILY_TASKS);
      try {
        await executeTaskOperationWithQueue({
          type: 'BATCH_SAVE_TASKS',
          tasks: INITIAL_DAILY_TASKS,
        });
      } catch (e) {
        console.error('Failed to seed template via queue:', e);
      }
    }
  };

  // Analyze Tasks from Raw Text API Call
  const handleAnalyze = async (rawText: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze tasks');
      }

      const result: AnalysisResult = await res.json();
      setAnalysis(result);

      const combined: TaskItem[] = [
        ...result.urgentTasks,
        ...result.todayChecklist,
        ...result.pendingFollowUps,
      ].map((task) => {
        const withOutlet: TaskItem = {
          ...task,
          outlet: activeOutlet,
        };
        if (task.assignee) {
          const match = staffList.find(
            (s) =>
              task.assignee?.toLowerCase().includes(s.name.toLowerCase()) ||
              s.name.toLowerCase().includes(task.assignee?.toLowerCase() || '')
          );
          if (match) {
            return {
              ...withOutlet,
              assigneeId: match.id,
              assignee: `${match.name} (${match.designation})`,
              assigneeDesignation: match.designation,
              assigneeRoleType: match.roleType,
              department: match.department,
              outlet: match.outlet || activeOutlet,
            };
          }
        }
        return withOutlet;
      });

      setTasks(combined);
      await executeTaskOperationWithQueue({
        type: 'BATCH_SAVE_TASKS',
        tasks: combined,
      });

      // Save shift snapshot
      const record: ShiftRecord = {
        id: `shift-${Date.now()}`,
        timestamp: new Date().toISOString(),
        label: `Daily Checklist on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        totalTasks: combined.length,
        completedTasks: combined.filter((t) => t.completed).length,
        result,
      };
      await saveShiftToFirebase(record);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender: 'assistant',
          text: `Processed ${combined.length} tasks into Firestore Checklists (${result.urgentTasks.length} Urgent, ${result.todayChecklist.length} Routine, ${result.pendingFollowUps.length} Pending). ${result.closingQuestion}`,
          timestamp: new Date().toISOString(),
        },
      ]);

      setIsPasteModalOpen(false);
    } catch (error: any) {
      console.error('Analysis error:', error);
      alert('Could not analyze tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send message to Ops Assistant Chat
  const handleSendChatMessage = async (msgText: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: msgText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msgText,
          currentTasks: tasks,
        }),
      });

      if (!res.ok) throw new Error('Chat failed');
      const data = await res.json();

      if (Array.isArray(data.completedTaskIds) && data.completedTaskIds.length > 0) {
        for (const tid of data.completedTaskIds) {
          const t = tasks.find((item) => item.id === tid);
          await executeTaskOperationWithQueue({
            type: 'UPDATE_COMPLETION',
            taskId: tid,
            completed: true,
            fullTask: t ? { ...t, completed: true } : undefined,
          });
        }
      }
      if (Array.isArray(data.uncompletedTaskIds) && data.uncompletedTaskIds.length > 0) {
        for (const tid of data.uncompletedTaskIds) {
          const t = tasks.find((item) => item.id === tid);
          await executeTaskOperationWithQueue({
            type: 'UPDATE_COMPLETION',
            taskId: tid,
            completed: false,
            fullTask: t ? { ...t, completed: false } : undefined,
          });
        }
      }
      if (Array.isArray(data.addedTasks) && data.addedTasks.length > 0) {
        await executeTaskOperationWithQueue({
          type: 'BATCH_SAVE_TASKS',
          tasks: data.addedTasks,
        });
      }

      const assistantMsg: ChatMessage = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'Shift tasks updated.',
        timestamp: new Date().toISOString(),
        completedTaskIds: data.completedTaskIds,
        uncompletedTaskIds: data.uncompletedTaskIds,
        addedTasks: data.addedTasks,
        reportData: data.reportData,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Understood. Tasks can also be marked complete using the checkboxes above.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Copy Brief Generator
  const generateCleanTextBrief = () => {
    const safeTasks = Array.isArray(tasks)
      ? tasks.filter((t) => (t?.outlet || DEFAULT_OUTLET) === activeOutlet)
      : [];
    const visibleDepts =
      currentStation === 'Manager'
        ? DEPARTMENTS
        : [currentStation as TaskDepartment];

    const departmentsWithTasks = visibleDepts.filter((dept) =>
      safeTasks.some((t) => (t?.department || '').toLowerCase() === dept.toLowerCase())
    );

    let text = `📋 *AMARII CAFE DAILY CHECKLIST${currentStation !== 'Manager' ? ` — ${currentStation.toUpperCase()} STATION` : ''}*\n`;
    text += `*Branch:* 📍 ${activeOutlet}\n`;
    text += `*Date:* ${new Date().toLocaleDateString()} | ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n\n`;

    departmentsWithTasks.forEach((dept) => {
      const deptTasks = safeTasks.filter(
        (t) => (t?.department || '').toLowerCase() === dept.toLowerCase()
      );
      const done = deptTasks.filter((t) => t?.completed).length;

      text += `*${dept.toUpperCase()} DAILY CHECKLIST (${done}/${deptTasks.length} DONE):*\n`;
      deptTasks.forEach((t) => {
        const mark = t.completed ? '✅' : t.priority === 'urgent' ? '🚨' : '⬜';
        text += `${mark} ${t.title || 'Task'}`;
        if (t.deadline) text += ` (${t.deadline})`;
        if (t.assignee) text += ` [${t.assignee}]`;
        if (t.notes) text += ` - Note: ${t.notes}`;
        if (t.media && t.media.length > 0) text += ` (📸 ${t.media.length} media)`;
        text += `\n`;
      });
      text += `\n`;
    });

    text += `*Which tasks should I mark as completed today?*\n`;
    return text;
  };

  const handleCopyBrief = () => {
    const brief = generateCleanTextBrief();
    navigator.clipboard.writeText(brief).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleRestoreShift = (record: ShiftRecord) => {
    const result = record.result || { urgentTasks: [], todayChecklist: [], pendingFollowUps: [] };
    const restored: TaskItem[] = [
      ...(result.urgentTasks || []),
      ...(result.todayChecklist || []),
      ...(result.pendingFollowUps || []),
    ];
    setTasks(restored);
    executeTaskOperationWithQueue({
      type: 'BATCH_SAVE_TASKS',
      tasks: restored,
    });
    setIsHistoryModalOpen(false);
  };

  const handleClearCurrent = () => {
    if (true) {
      setTasks([]);
    }
  };

  // Jump to specific task from the 10-Minute Pre-Task Alarm Modal
  const handleJumpToTaskFromAlarm = (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    if (target) {
      if (target.department && currentStation !== 'Manager' && !isStaff) {
        setCurrentStation(target.department as StationMode);
      }
      setFilterStatus('all');
      setActiveMobileTab('tasks');

      setTimeout(() => {
        const el = document.getElementById(`task-item-${taskId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-red-500');
          setTimeout(() => el.classList.remove('ring-4', 'ring-red-500'), 3000);
        }
      }, 300);
    }
  };

  // Manually trigger 10-minute Pre-Task alarm test
  const handleTriggerTestAlarm = async () => {
    const sampleTask = tasks.find((t) => !t.completed) || tasks[0];
    await triggerTestPreTaskAlarm(sampleTask, (task, minutesRemaining) => {
      setActiveAlarm({
        isOpen: true,
        task,
        minutesRemaining,
      });
    });

    setToastFeedback({
      id: `toast-alarm-test-${Date.now()}`,
      text: '🚨 Extreme loud alarm siren & mobile PWA notification triggered!',
      type: 'success',
    });
  };

  // Task Counts by Department for the Station Selector Modal (Filtered by activeOutlet)
  const taskCountsByDept = useMemo(() => {
    const safeTasks = Array.isArray(tasks)
      ? tasks.filter((t) => (t?.outlet || DEFAULT_OUTLET) === activeOutlet)
      : [];
    const counts: Record<string, { total: number; completed: number }> = {};
    DEPARTMENTS.forEach((dept) => {
      const deptTasks = safeTasks.filter((t) => (t?.department || '').toLowerCase() === dept.toLowerCase());
      counts[dept] = {
        total: deptTasks.length,
        completed: deptTasks.filter((t) => t?.completed).length,
      };
    });
    return counts;
  }, [tasks, activeOutlet]);

  // STRICT OUTLET & STATION FILTERING:
  // 1. Outlet: Only show tasks matching activeOutlet (default to DEFAULT_OUTLET for legacy records)
  const outletTasks = useMemo(() => {
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    return safeTasks.filter((t) => (t?.outlet || DEFAULT_OUTLET) === activeOutlet);
  }, [tasks, activeOutlet]);

  // 2. Station: If currentStation is NOT 'Manager', ONLY tasks belonging to currentStation are shown!
  const stationTasks = useMemo(() => {
    if (currentStation === 'Manager') {
      return outletTasks;
    }
    return outletTasks.filter((t) => {
      const dept = (t?.department || '').toLowerCase();
      const station = currentStation.toLowerCase();
      if (dept === station) return true;
      if (station === 'kitchen' && dept.includes('kitchen')) return true;
      if (station === 'bar' && (dept.includes('bar') || dept.includes('beverage'))) return true;
      if (station === 'service' && (dept.includes('service') || dept.includes('foh') || dept.includes('front of house'))) return true;
      if (station === 'billing' && (dept.includes('billing') || dept.includes('cashier') || dept.includes('foh'))) return true;
      if (station === 'housekeeping' && (dept.includes('housekeeping') || dept.includes('clean') || dept.includes('maintenance'))) return true;
      if (station === 'maintenance' && (dept.includes('maintenance') || dept.includes('closing'))) return true;
      return false;
    });
  }, [outletTasks, currentStation]);

  // Tasks awaiting Admin Hemen Das photo proof quality check & approval
  const pendingApprovalTasks = useMemo(() => {
    const safeStationTasks = Array.isArray(stationTasks) ? stationTasks : [];
    return safeStationTasks.filter(
      (t) =>
        t.approvalStatus === 'pending' ||
        (t.completed && t.approvalStatus !== 'approved') ||
        (t.priority === 'pending' && !t.completed) ||
        (t.media && t.media.length > 0 && !t.completed && t.approvalStatus !== 'approved')
    );
  }, [stationTasks]);

  const pendingApprovalCount = pendingApprovalTasks.length;

  // Secondary search and status filtering on the station-filtered tasks
  const filteredTasks = useMemo(() => {
    const safeStationTasks = Array.isArray(stationTasks) ? stationTasks : [];
    return safeStationTasks.filter((task) => {
      if (!task) return false;
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (task.title || '').toLowerCase().includes(q);
        const matchDetails = (task.details || '').toLowerCase().includes(q);
        const matchDept = (task.department || '').toLowerCase().includes(q);
        const matchAssignee = (task.assignee || '').toLowerCase().includes(q);
        const matchNotes = (task.notes || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDetails && !matchDept && !matchAssignee && !matchNotes) return false;
      }

      // Department filter (only applicable when in Manager mode)
      if (currentStation === 'Manager' && selectedDept !== 'all') {
        if ((task.department || '').toLowerCase() !== selectedDept.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (filterStatus === 'remaining' && task.completed) return false;
      if (filterStatus === 'completed' && !task.completed) return false;
      if (filterStatus === 'awaiting_approval') {
        const isAwaiting =
          task.approvalStatus === 'pending' ||
          (task.completed && task.approvalStatus !== 'approved') ||
          (task.priority === 'pending' && !task.completed) ||
          (task.media && task.media.length > 0 && task.approvalStatus !== 'approved');
        if (!isAwaiting) return false;
      }

      return true;
    });
  }, [stationTasks, searchQuery, selectedDept, filterStatus, currentStation]);

  // Active departments to render
  const activeDepartmentsToRender = useMemo(() => {
    if (currentStation !== 'Manager') {
      const deptsInStation = Array.from(
        new Set(filteredTasks.map((t) => t.department).filter(Boolean))
      ) as TaskDepartment[];
      return deptsInStation.length > 0 ? deptsInStation : [currentStation as TaskDepartment];
    }

    if (selectedDept !== 'all') {
      return [selectedDept as TaskDepartment];
    }

    const safeTasks = Array.isArray(tasks)
      ? tasks.filter((t) => (t?.outlet || DEFAULT_OUTLET) === activeOutlet)
      : [];
    const present = DEPARTMENTS.filter((dept) =>
      safeTasks.some((t) => (t?.department || '').toLowerCase() === dept.toLowerCase())
    );
    safeTasks.forEach((t) => {
      if (t?.department && !present.some((d) => d.toLowerCase() === t.department?.toLowerCase())) {
        present.push(t.department as TaskDepartment);
      }
    });

    return present.length > 0
      ? present
      : (['Cashier & Front of House (FOH)', 'Barista & Beverage Station', 'Kitchen & Food Prep', 'Closing & Maintenance'] as TaskDepartment[]);
  }, [currentStation, selectedDept, tasks, filteredTasks]);

  // Active Checklist Headers to render (Grouped Checklists - PeakScale style)
  const checklistGroupsToRender = useMemo(() => {
    const headersList: string[] = [];

    // 1. ALWAYS include headers for every task present in filteredTasks!
    // Active tasks must NEVER be hidden, even if their header was previously recorded in deletedChecklistHeaders when empty.
    filteredTasks.forEach((t) => {
      const hdr = getTaskChecklistGroup(t);
      if (!headersList.includes(hdr)) {
        headersList.push(hdr);
      }
    });

    // 2. Relevant default template headers based on currentStation (only if NOT in deletedChecklistHeaders)
    const relevantDefaults = CHECKLIST_HEADERS.filter((h) => {
      if (deletedChecklistHeaders.includes(h)) return false;
      if (currentStation === 'Manager') return true;
      if (currentStation === 'Kitchen' && h.includes('Kitchen')) return true;
      if (currentStation === 'Bar' && h.includes('Bar')) return true;
      if (currentStation === 'Billing' && h.includes('Cashier')) return true;
      if (currentStation === 'Service' && h.includes('Service')) return true;
      if (currentStation === 'Housekeeping' && h.includes('Housekeeping')) return true;
      return false;
    });

    relevantDefaults.forEach((h) => {
      if (!headersList.includes(h)) headersList.push(h);
    });

    // 3. Robust Fallback: If filteredTasks has tasks, headersList MUST NEVER be empty!
    if (filteredTasks.length > 0 && headersList.length === 0) {
      headersList.push(
        currentStation === 'Manager' ? 'Master Daily Operations Checklist' : `${currentStation} Daily Checklist`
      );
    }

    return headersList;
  }, [currentStation, filteredTasks, deletedChecklistHeaders, getTaskChecklistGroup]);

  // Group filtered tasks by priority (for priority view)
  const safeFilteredTasks = Array.isArray(filteredTasks) ? filteredTasks : [];
  const safeStationTasks = Array.isArray(stationTasks) ? stationTasks : [];
  const urgentFiltered = safeFilteredTasks.filter((t) => t?.priority === 'urgent');
  const todayFiltered = safeFilteredTasks.filter((t) => t?.priority === 'today');
  const pendingFiltered = safeFilteredTasks.filter((t) => t?.priority === 'pending');

  const pendingUrgentCount = safeStationTasks.filter((t) => t?.priority === 'urgent' && !t?.completed).length;
  const remainingCount = safeStationTasks.filter((t) => !t?.completed).length;

  // Gate the entire application with the Login Screen if unauthenticated
  if (!isAuthenticated || !currentUser) {
    return (
      <LoginScreen
        isLightMode={isLightMode}
        staffList={staffList}
        onUpdateStaff={handleUpdateStaff}
      />
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isLightMode
          ? 'bg-[#EEF2ED] text-zinc-950 selection:bg-[#E05A47] selection:text-white'
          : 'bg-[#132219] text-[#F7F4EB] selection:bg-[#E05A47] selection:text-white'
      }`}
    >
      {/* Floating Validation Warning Alert / Toast */}
      {validationWarning && (
        <div
          id="mandatory-validation-toast"
          role="alert"
          aria-live="assertive"
          className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-lg z-50 bg-black border-4 border-red-600 shadow-2xl p-4 sm:p-5 text-white animate-in slide-in-from-top duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 text-white flex-shrink-0">
                <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-red-600 text-white px-1.5 py-0.2">
                    Action Blocked
                  </span>
                  <span className="text-xs font-black uppercase text-red-400">
                    Mandatory Verification Missing
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black uppercase tracking-tight text-white leading-tight">
                  Cannot Mark "{validationWarning.taskTitle}" as Done
                </h4>
                <p className="text-xs text-zinc-300">
                  This task has strict completion rules. You must attach the required proof before completing:
                </p>
              </div>
            </div>

            <button
              type="button"
              id="dismiss-validation-toast-btn"
              onClick={() => {
                setValidationWarning(null);
                setBlockedTaskId(null);
              }}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white transition cursor-pointer"
              aria-label="Dismiss warning"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Missing Badges & Jump Action */}
          <div className="mt-3 pt-3 border-t border-zinc-800 space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {validationWarning.missingPhoto && (
                <span className="px-2 py-1 bg-emerald-950 text-emerald-300 border border-emerald-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5" />
                  Photo Proof Required
                </span>
              )}
              {validationWarning.missingVideo && (
                <span className="px-2 py-1 bg-rose-950 text-rose-300 border border-rose-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <Video className="w-3.5 h-3.5" />
                  Video Proof Required
                </span>
              )}
              {validationWarning.missingNote && (
                <span className="px-2 py-1 bg-amber-950 text-amber-300 border border-amber-600 text-[11px] font-black uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" />
                  Shift Note Required
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <p className="text-[10px] text-zinc-400 uppercase font-mono">
                Tap "+ Photo", "+ Video", or "+ Note" directly on the task card.
              </p>
              <div className="flex items-center gap-2">
                {canOverrideMandatory && (
                  <button
                    type="button"
                    id="admin-override-mandatory-btn"
                    onClick={() => handleAdminOverride(validationWarning.taskId)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer flex-shrink-0 shadow"
                    title="Admin Override: Complete without mandatory attachments"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Admin Override</span>
                  </button>
                )}
                <button
                  type="button"
                  id="jump-to-blocked-task-btn"
                  onClick={() => {
                    const el = document.getElementById(`task-item-${validationWarning.taskId}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-4', 'ring-red-500');
                      setTimeout(() => el.classList.remove('ring-4', 'ring-red-500'), 2500);
                    }
                    setValidationWarning(null);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer flex-shrink-0"
                >
                  <span>Jump to Task</span>
                  <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Operation Feedback Toast (Checklist Deletion, etc.) */}
      {toastFeedback && (
        <div
          id="operation-feedback-toast"
          role="status"
          aria-live="polite"
          className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-top duration-200"
        >
          <div
            className={`p-3.5 sm:p-4 border-2 sm:border-4 shadow-2xl flex items-center justify-between gap-3 text-white ${
              toastFeedback.type === 'success'
                ? 'bg-black border-emerald-500'
                : toastFeedback.type === 'error'
                ? 'bg-black border-red-600'
                : 'bg-black border-zinc-500'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toastFeedback.type === 'success' ? (
                <div className="p-1.5 bg-emerald-600 text-white flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
              ) : (
                <div className="p-1.5 bg-red-600 text-white flex-shrink-0">
                  <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
              )}
              <p className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate">
                {toastFeedback.text}
              </p>
            </div>
            <button
              type="button"
              id="dismiss-feedback-toast-btn"
              onClick={() => setToastFeedback(null)}
              className="p-1 text-zinc-400 hover:text-white transition cursor-pointer flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        tasks={stationTasks}
        staffList={staffList}
        activeStaff={activeStaff}
        currentStation={currentStation}
        onOpenStationModal={() => setIsStationModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstallable={isInstallable}
        isFirebaseConnected={isFirebaseConnected}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenAssignModal={() => handleOpenAssignModal()}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        onToggleViewMode={() => setIsScannableMode(!isScannableMode)}
        isScannableMode={isScannableMode}
        onCopyBrief={handleCopyBrief}
        copied={copied}
        onToggleAnalytics={() => setIsAnalyticsOpen(!isAnalyticsOpen)}
        isAnalyticsActive={isAnalyticsOpen}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenDataCleanup={() => setIsDataCleanupModalOpen(true)}
        onOpenTaskDirectory={() => setIsTaskDirectoryOpen(true)}
        pendingQueueCount={pendingQueueCount}
        isOnline={isOnline}
        isQueueSyncing={isQueueSyncing}
        onTriggerQueueSync={handleTriggerManualQueueSync}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        firestoreConnectionState={firestoreConnectionState}
        onOpenAdminApprovals={() => setIsAdminApprovalOpen(true)}
        pendingApprovalCount={pendingApprovalCount}
        onOpenTaskRegister={() => setIsTaskRegisterOpen(true)}
      />

      <TaskRegisterModal
        isOpen={isTaskRegisterOpen}
        onClose={() => setIsTaskRegisterOpen(false)}
        tasks={tasks}
        staffList={staffList}
        onEditTask={handleEditTask}
        onApproveTask={handleApproveTask}
        onRejectTask={handleRejectTask}
        onViewMedia={setSelectedMedia}
      />

      <TaskManagementModal
        isOpen={isTaskDirectoryOpen}
        onClose={() => setIsTaskDirectoryOpen(false)}
        tasks={tasks}
        onEditTask={(task) => {
          setIsTaskDirectoryOpen(false);
          handleEditTask(task);
        }}
        onDuplicateTask={(task) => {
          setIsTaskDirectoryOpen(false);
          handleDuplicateTask(task);
        }}
        onDeleteTask={handleDeleteTask}
        onDeleteChecklist={handleDeleteChecklist}
        onBatchDeleteTasks={handleBatchDeleteTasks}
        onAddTaskToHeader={(headerName) => {
          setIsTaskDirectoryOpen(false);
          handleAddTaskToHeader(headerName);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-28 sm:pb-12">
        <PullToRefresh onRefresh={handlePullToRefresh}>
          {isAnalyticsOpen ? (
            <TaskAnalyticsDashboard
              tasks={stationTasks}
              allTasks={outletTasks}
              activeOutlet={activeOutlet}
              staffList={staffList}
              history={history}
              onOpenPdfModal={() => setIsPdfModalOpen(true)}
              onBackToTasks={() => setIsAnalyticsOpen(false)}
              onOpenDataCleanup={() => setIsDataCleanupModalOpen(true)}
            />
        ) : taskViewMode === 'register' ? (
          <div className="space-y-4">
            {/* View Switcher Bar */}
            {(isAdmin || isManager) && (
              <div
                className={`p-1.5 flex items-center justify-between gap-2 border-2 shadow-xs ${
                  isLightMode ? 'bg-white border-zinc-950' : 'bg-zinc-950 border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('live')}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer ${
                      isLightMode
                        ? 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>⚡ Live Shift Checklists</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskViewMode('register')}
                    className="px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer bg-red-600 text-white shadow"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>📋 Master Task Register (टास्क रजिस्टर)</span>
                  </button>
                </div>

                <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 uppercase pr-2">
                  👑 Hemen Das Master Audit Hub
                </span>
              </div>
            )}

            <TaskRegisterView
              tasks={tasks}
              staffList={staffList}
              onEditTask={handleEditTask}
              onApproveTask={handleApproveTask}
              onRejectTask={handleRejectTask}
              onViewMedia={setSelectedMedia}
            />
          </div>
        ) : (
          <>
            {/* Master Task Tab View Switcher for Hemen Das & Managers */}
            {(isAdmin || isManager) && (
              <div
                className={`mb-4 p-1.5 flex items-center justify-between gap-2 border-2 shadow-xs ${
                  isLightMode ? 'bg-white border-zinc-950' : 'bg-zinc-950 border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTaskViewMode('live')}
                    className="px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer bg-zinc-950 text-white dark:bg-white dark:text-black shadow"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>⚡ Live Shift Checklists</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskViewMode('register')}
                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer ${
                      isLightMode
                        ? 'text-red-700 hover:text-red-900 hover:bg-red-50'
                        : 'text-red-400 hover:text-red-300 hover:bg-red-950/40'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>📋 Master Task Register (टास्क रजिस्टर)</span>
                  </button>
                </div>

                <span className="hidden sm:inline-block text-[10px] font-mono text-zinc-400 uppercase pr-2">
                  👑 Hemen Das Master Audit Hub
                </span>
              </div>
            )}

            {/* Department / Station Fast Switcher & Station Status Banner */}
            {/* Station Status & Sub-Filter Bar */}
            <div
              className={`mb-4 p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 border transition-colors rounded-xs ${
                isLightMode
                  ? 'bg-white border-zinc-300 text-zinc-950 shadow-xs'
                  : 'bg-[#16281E] border-[#244332] text-[#F7F4EB]'
              }`}
            >
              {/* Station Context & Active Lead */}
              <div className="flex flex-wrap items-center gap-2">
                {currentStation !== 'Manager' ? (
                  <div
                    className={`text-xs font-semibold flex items-center gap-1.5 ${
                      isLightMode ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>
                      <strong className={isLightMode ? 'text-zinc-950' : 'text-white'}>
                        {currentStation} Tasks
                      </strong>
                      {activeStaff && (
                        <span className="text-zinc-500 ml-1">
                          ({activeStaff.name} • {activeStaff.designation})
                        </span>
                      )}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`text-xs font-semibold flex items-center gap-1.5 ${
                      isLightMode ? 'text-zinc-700' : 'text-zinc-300'
                    }`}
                  >
                    <Layers className={`w-4 h-4 ${isLightMode ? 'text-zinc-900' : 'text-white'} flex-shrink-0`} />
                    <span className="font-bold">All Departments Live Operations</span>
                  </div>
                )}
              </div>

              {/* Quick Filter Buttons (in Manager mode) */}
              {currentStation === 'Manager' && (
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase mr-1 shrink-0 ${
                      isLightMode ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    Filter:
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedDept('all')}
                    className={`px-2 py-0.5 text-xs font-bold uppercase transition cursor-pointer border rounded-xs ${
                      selectedDept === 'all'
                        ? isLightMode
                          ? 'bg-zinc-950 text-white border-zinc-950'
                          : 'bg-white text-black border-white'
                        : isLightMode
                        ? 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:text-black'
                        : 'bg-[#111F17] text-zinc-400 border-zinc-800 hover:text-white'
                    }`}
                  >
                    All ({Array.isArray(tasks) ? tasks.length : 0})
                  </button>
                  {DEPARTMENTS.map((dept) => {
                    const count = (Array.isArray(tasks) ? tasks : []).filter((t) => t?.department === dept).length;
                    return (
                      <button
                        key={dept}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        className={`px-2 py-0.5 text-xs font-bold uppercase transition cursor-pointer border rounded-xs whitespace-nowrap ${
                          selectedDept === dept
                            ? isLightMode
                              ? 'bg-zinc-950 text-white border-zinc-950'
                              : 'bg-white text-black border-white'
                            : isLightMode
                            ? 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:text-black'
                            : 'bg-[#111F17] text-zinc-400 border-zinc-800 hover:text-white'
                        }`}
                      >
                        {dept} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                <span
                  className={`text-[10px] font-bold uppercase mr-1 ${
                    isLightMode ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  View:
                </span>
                <button
                  type="button"
                  onClick={() => setGroupBy('department')}
                  className={`px-2 py-0.5 text-xs font-bold uppercase border rounded-xs transition cursor-pointer ${
                    groupBy === 'department'
                      ? isLightMode
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-black border-white'
                      : isLightMode
                      ? 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:text-black'
                      : 'bg-[#111F17] text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Station
                </button>
                <button
                  type="button"
                  onClick={() => setGroupBy('priority')}
                  className={`px-2 py-0.5 text-xs font-bold uppercase border rounded-xs transition cursor-pointer ${
                    groupBy === 'priority'
                      ? isLightMode
                        ? 'bg-zinc-950 text-white border-zinc-950'
                        : 'bg-white text-black border-white'
                      : isLightMode
                      ? 'bg-zinc-50 text-zinc-700 border-zinc-300 hover:text-black'
                      : 'bg-[#111F17] text-zinc-400 border-zinc-800 hover:text-white'
                  }`}
                >
                  Urgency
                </button>
              </div>
            </div>

        {/* Visual Progress Bar for Current Station */}
        <StationProgressBar
          currentStation={currentStation}
          totalTasks={safeStationTasks.length}
          completedTasks={safeStationTasks.filter((t) => t?.completed).length}
          urgentRemainingCount={pendingUrgentCount}
          isLightMode={isLightMode}
          activeStaffName={activeStaff?.name}
        />

        {/* Empty Tasks State */}
        {stationTasks.length === 0 ? (
          <div
            className={`border-4 border-dashed p-8 sm:p-16 text-center max-w-3xl mx-auto space-y-6 ${
              isLightMode
                ? 'bg-white border-zinc-400 text-zinc-950 shadow-md'
                : 'bg-zinc-950 border-zinc-800 text-white'
            }`}
          >
            <div
              className={`w-16 h-16 mx-auto flex items-center justify-center font-black ${
                isLightMode ? 'bg-zinc-950 text-white' : 'bg-white text-black'
              }`}
            >
              <ClipboardList className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h2
                className={`text-2xl sm:text-4xl font-black uppercase tracking-tight ${
                  isLightMode ? 'text-zinc-950' : 'text-white'
                }`}
              >
                No Tasks for {currentStation === 'Manager' ? 'Any Department' : `${currentStation} Station`}
              </h2>
              <p
                className={`font-bold uppercase tracking-wider text-xs sm:text-sm mt-2 max-w-lg mx-auto ${
                  isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                }`}
              >
                {currentStation === 'Manager'
                  ? 'Create daily tasks or load the master checklist template.'
                  : `There are currently no daily tasks assigned to ${currentStation}. Click below to add one.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {canAddTask && (
                <button
                  type="button"
                  onClick={() => handleOpenAssignModal(currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen')}
                  className={`px-5 py-3 font-black uppercase text-xs tracking-tight transition cursor-pointer flex items-center gap-2 shadow-lg ${
                    isLightMode
                      ? 'bg-zinc-950 text-white hover:bg-zinc-800 border-2 border-zinc-950'
                      : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Add {currentStation !== 'Manager' ? currentStation : ''} Task</span>
                </button>
              )}

              {canAddTask && (
                <button
                  type="button"
                  onClick={handleResetToDefaultTemplate}
                  className={`px-5 py-3 font-black uppercase text-xs tracking-tight transition border-2 flex items-center gap-2 cursor-pointer ${
                    isLightMode
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-400'
                      : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Load Default Template</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Station Live Dashboard Bar */}
            <div
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border-2 ${
                isLightMode
                  ? 'bg-white border-zinc-400 text-zinc-950'
                  : 'bg-zinc-950 border-zinc-800 text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500 text-black font-black flex-shrink-0">
                  <ClipboardList className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span
                      className={`text-[10px] sm:text-xs font-black uppercase tracking-widest ${
                        isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                      }`}
                    >
                      Live Shift Dashboard • Firebase Synced
                    </span>
                  </div>
                  <h2
                    className={`text-xl sm:text-3xl font-black uppercase tracking-tight leading-tight ${
                      isLightMode ? 'text-zinc-950' : 'text-white'
                    }`}
                  >
                    {currentStation === 'Manager'
                      ? 'Master Daily Operations Checklist'
                      : `${currentStation} Daily Checklist`}
                  </h2>
                  <p
                    className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider mt-0.5 font-mono ${
                      isLightMode ? 'text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    {filteredTasks.length} Tasks Visible • {stationTasks.filter((t) => t.completed).length}/{stationTasks.length} Completed
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                {canAddTask && (
                  <button
                    type="button"
                    id="add-daily-task-action-btn"
                    onClick={() => handleOpenAssignModal(currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen')}
                    className={`hidden sm:flex sm:flex-initial px-3.5 py-2 text-xs font-black uppercase tracking-tight transition items-center justify-center gap-1.5 cursor-pointer min-h-[40px] border-2 ${
                      isLightMode
                        ? 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950'
                        : 'bg-white hover:bg-zinc-200 text-black border-transparent'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Add Task</span>
                  </button>
                )}

                {canAddTask && (
                  <button
                    type="button"
                    onClick={handleResetToDefaultTemplate}
                    className={`hidden sm:flex px-3 py-2 text-xs font-black uppercase tracking-tight border transition items-center gap-1.5 cursor-pointer min-h-[40px] ${
                      isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border-zinc-700'
                    }`}
                    title="Reload template"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Reset</span>
                  </button>
                )}

                {canDeleteTask && (
                  <button
                    type="button"
                    onClick={handleClearCurrent}
                    className={`p-2 transition cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center border ${
                      isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-red-600 border-zinc-400'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 border-zinc-700'
                    }`}
                    title="Clear Current Tasks"
                    aria-label="Clear Current Tasks"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

            </div>

            {/* Filter & Search Toolbar */}
            {!isScannableMode && (
              <div
                className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-3 sm:p-4 border ${
                  isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {/* Search Box */}
                <div className="relative flex-1 max-w-full sm:max-w-md">
                  <Search
                    className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                      isLightMode ? 'text-zinc-400' : 'text-zinc-500'
                    }`}
                  />
                  <input
                    type="text"
                    id="search-tasks-input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${currentStation !== 'Manager' ? `${currentStation} ` : ''}tasks, notes, staff...`}
                    className={`w-full pl-9 pr-8 py-2 text-xs border outline-none font-medium min-h-[40px] ${
                      isLightMode
                        ? 'bg-zinc-50 text-zinc-950 border-zinc-300 focus:border-zinc-950'
                        : 'bg-black text-white border-zinc-700 focus:border-white'
                    }`}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-xs p-1 ${
                        isLightMode ? 'text-zinc-500 hover:text-zinc-950' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Group By & Status Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Group By Selector */}
                  <div
                    className={`flex items-center p-0.5 sm:p-1 border text-xs font-black uppercase ${
                      isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-black border-zinc-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold px-1.5 text-zinc-500 hidden md:inline">Group:</span>
                    <button
                      type="button"
                      onClick={() => setGroupBy('checklistHeader')}
                      className={`px-2.5 py-1.5 transition text-center min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                        groupBy === 'checklistHeader'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Group by Checklist Header (PeakScale style)"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Checklists</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupBy('department')}
                      className={`px-2.5 py-1.5 transition text-center min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                        groupBy === 'department'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Group by Station / Department"
                    >
                      <span>Stations</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setGroupBy('priority')}
                      className={`px-2.5 py-1.5 transition text-center min-h-[36px] flex items-center gap-1.5 cursor-pointer ${
                        groupBy === 'priority'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Group by Urgency / Priority"
                    >
                      <span>Urgency</span>
                    </button>
                  </div>

                  {/* Status Filters */}
                  <div
                    className={`flex items-center p-0.5 sm:p-1 border text-xs font-black uppercase ${
                      isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-black border-zinc-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setFilterStatus('all')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 transition text-center min-h-[36px] cursor-pointer ${
                        filterStatus === 'all'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      All ({filteredTasks.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('remaining')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 transition text-center min-h-[36px] cursor-pointer ${
                        filterStatus === 'remaining'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Remaining ({filteredTasks.filter((t) => !t.completed).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('completed')}
                      className={`flex-1 sm:flex-initial px-3 py-1.5 transition text-center min-h-[36px] cursor-pointer ${
                        filterStatus === 'completed'
                          ? isLightMode
                            ? 'bg-zinc-950 text-white'
                            : 'bg-white text-black'
                          : isLightMode
                          ? 'text-zinc-600 hover:text-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      Done ({filteredTasks.filter((t) => t.completed).length})
                    </button>
                    {pendingApprovalCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterStatus(filterStatus === 'awaiting_approval' ? 'all' : 'awaiting_approval')}
                        className={`flex-1 sm:flex-initial px-2.5 py-1.5 transition text-center min-h-[36px] cursor-pointer flex items-center gap-1 ${
                          filterStatus === 'awaiting_approval'
                            ? 'bg-amber-500 text-black font-black'
                            : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                        }`}
                        title="Filter tasks awaiting Hemen Das approval"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Awaiting Approval ({pendingApprovalCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Checklist Header Action Buttons */}
                  {groupBy === 'checklistHeader' && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal()}
                        className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight flex items-center gap-1.5 transition cursor-pointer min-h-[36px] ${
                          isLightMode
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold'
                        }`}
                        title="Create a new checklist or add tasks"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>+ New Checklist</span>
                      </button>

                      {deletedChecklistHeaders.length > 0 && (
                        <button
                          type="button"
                          onClick={handleRestoreDefaultChecklists}
                          className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-tight border transition cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
                            isLightMode
                              ? 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300'
                              : 'bg-black hover:bg-zinc-900 text-zinc-300 border-zinc-700'
                          }`}
                          title="Restore deleted standard checklist templates"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">
                            Restore Defaults ({deletedChecklistHeaders.length})
                          </span>
                          <span className="sm:hidden">Restore</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 👑 Hemen Das Quality Approvals & Inspection Hub Banner */}
            {canAccessTools && pendingApprovalTasks.length > 0 && (
              <div
                id="hemen-das-approval-hub-banner"
                className={`p-3.5 sm:p-5 border-2 sm:border-4 rounded-xs shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 sm:gap-4 transition-all animate-in slide-in-from-top-2 ${
                  isLightMode
                    ? 'bg-amber-50 border-amber-500 text-amber-950'
                    : 'bg-amber-950/60 border-amber-500 text-amber-100'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-black rounded-xs flex-shrink-0 shadow-md">
                    <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-tight text-amber-600 dark:text-amber-400">
                        👑 HEMEN DAS QUALITY APPROVALS HUB
                      </span>
                      <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-full">
                        {pendingApprovalTasks.length} Awaiting Inspection
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-0.5 opacity-90">
                      Staff have submitted task proofs. Inspect photo clarity, equipment gauges, and approve shift tasks.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto self-end md:self-auto">
                  <button
                    type="button"
                    id="banner-open-approvals-btn"
                    onClick={() => setIsAdminApprovalOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs tracking-tight transition shadow-sm rounded-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Inspect Photo Proofs ({pendingApprovalTasks.length})</span>
                  </button>

                  <button
                    type="button"
                    id="banner-approve-all-btn"
                    onClick={handleApproveAllPending}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-tight transition shadow-md rounded-xs cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>✓ 1-Click Approve All</span>
                  </button>
                </div>
              </div>
            )}

            {/* View Mode: Scannable Plain Text Brief vs Interactive Checklist Sections */}
            {isScannableMode ? (
              <ScannableBriefView
                analysis={{
                  summary: `Amarii Cafe ${currentStation} Daily Checklist`,
                  urgentTasks: filteredTasks.filter((t) => t.priority === 'urgent'),
                  todayChecklist: filteredTasks.filter((t) => t.priority === 'today'),
                  pendingFollowUps: filteredTasks.filter((t) => t.priority === 'pending'),
                  closingQuestion: 'Which tasks should I mark as completed today?',
                  rawText: '',
                  analyzedAt: new Date().toISOString(),
                }}
                allTasks={filteredTasks}
                onToggleTask={handleToggleTask}
                onCopyText={handleCopyBrief}
                copied={copied}
              />
            ) : groupBy === 'checklistHeader' ? (
              /* ================= PEAKSCALE-STYLE GROUPED CHECKLISTS VIEW ================= */
              <div className="space-y-4 sm:space-y-6">
                {filteredTasks.length === 0 && checklistGroupsToRender.length === 0 ? (
                  <div
                    className={`p-8 text-center border-2 border-dashed space-y-3 ${
                      isLightMode
                        ? 'bg-white border-zinc-300 text-zinc-600'
                        : 'bg-zinc-900/40 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <p className="text-base font-black uppercase tracking-tight">
                      No active checklists found
                    </p>
                    <p className="text-xs font-bold text-zinc-500 max-w-md mx-auto">
                      All standard templates have been deleted or no tasks exist. You can create a new custom checklist or restore the original templates at any time.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => handleOpenAssignModal()}
                        className="px-4 py-2 text-xs font-black uppercase tracking-tight bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                      >
                        + Create New Checklist
                      </button>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultChecklists}
                        className={`px-4 py-2 text-xs font-black uppercase tracking-tight border cursor-pointer ${
                          isLightMode
                            ? 'bg-zinc-100 hover:bg-zinc-200 text-black border-zinc-300'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                        }`}
                      >
                        Restore Default Templates
                      </button>
                    </div>
                  </div>
                ) : (
                  checklistGroupsToRender.map((header, groupIdx) => {
                    const headerTasks = filteredTasks.filter((t) => {
                      const taskGroup = getTaskChecklistGroup(t);
                      if (taskGroup === header) return true;
                      if (t.checklistHeader === header) return true;
                      // Fallback for orphan tasks whose header is not rendered in any group
                      if (
                        groupIdx === 0 &&
                        !checklistGroupsToRender.includes(taskGroup) &&
                        !checklistGroupsToRender.includes(t.checklistHeader || '')
                      ) {
                        return true;
                      }
                      return false;
                    });

                    return (
                      <ChecklistGroupSection
                        key={header}
                        checklistHeader={header}
                        tasks={headerTasks}
                        onToggleTask={handleToggleTask}
                        onEditTask={canEditTask ? handleEditTask : undefined}
                        onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
                        onUnpackSubTasks={handleUnpackSubTasks}
                        onDeleteChecklist={canDeleteTask ? handleDeleteChecklist : undefined}
                        onRenameChecklist={canEditTask ? handleRenameChecklist : undefined}
                        onViewMedia={setSelectedMedia}
                        onAddMediaToTask={handleAddMediaToTask}
                        onUpdateTaskNote={handleUpdateTaskNote}
                        onToggleSubTask={handleToggleSubTask}
                        onAddSubTaskMedia={handleAddSubTaskMedia}
                        onUpdateSubTaskNote={handleUpdateSubTaskNote}
                        onApproveTask={handleApproveTask}
                        onRejectTask={handleRejectTask}
                        staffList={staffList}
                        onAddTaskToHeader={canAddTask ? handleAddTaskToHeader : undefined}
                        onUpgradeChecklist={canAddTask ? handleUpgradeChecklist : undefined}
                        blockedTaskId={blockedTaskId}
                      />
                    );
                  })
                )}

                {/* Closing Prompt Bar */}
                <footer className="bg-white text-black p-5 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-2 sm:border-4 border-black">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      <span className="text-xs font-black uppercase tracking-widest text-red-600">
                        {currentStation === 'Manager' ? 'Shift Sign-Off' : `${currentStation} Station Sign-Off`}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-black italic">
                      Which tasks should I mark as completed today?
                    </h3>
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600 mt-1">
                      Tap sub-task checkboxes, attach mandatory photo proof, add shift notes, or chat with the assistant.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      id="copy-scannable-btn"
                      onClick={handleCopyBrief}
                      className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-zinc-200 hover:bg-zinc-300 text-black text-xs font-black uppercase tracking-tight transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                    </button>
                  </div>
                </footer>
              </div>
            ) : groupBy === 'department' ? (
              /* ================= MASTER DEPARTMENT-WISE DAILY CHECKLISTS ================= */
              <div className="space-y-4 sm:space-y-6">
                {activeDepartmentsToRender.map((dept) => {
                  const deptTasks = filteredTasks.filter(
                    (t) => t.department?.toLowerCase() === dept.toLowerCase()
                  );

                  return (
                    <DepartmentChecklistSection
                      key={dept}
                      department={dept}
                      tasks={deptTasks}
                      onToggleTask={handleToggleTask}
                      onEditTask={canEditTask ? handleEditTask : undefined}
                      onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
                      onUnpackSubTasks={handleUnpackSubTasks}
                      onViewMedia={setSelectedMedia}
                      onAddMediaToTask={handleAddMediaToTask}
                      onUpdateTaskNote={handleUpdateTaskNote}
                      onToggleSubTask={handleToggleSubTask}
                      onAddSubTaskMedia={handleAddSubTaskMedia}
                      onUpdateSubTaskNote={handleUpdateSubTaskNote}
                      onApproveTask={handleApproveTask}
                      onRejectTask={handleRejectTask}
                      staffList={staffList}
                      onAddTaskToDepartment={canAddTask ? (d) => handleOpenAssignModal(d) : undefined}
                      blockedTaskId={blockedTaskId}
                    />
                  );
                })}

                {/* Closing Prompt Bar */}
                <footer className="bg-white text-black p-5 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 border-2 sm:border-4 border-black">
                  <div className="text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      <span className="text-xs font-black uppercase tracking-widest text-red-600">
                        {currentStation === 'Manager' ? 'Shift Sign-Off' : `${currentStation} Station Sign-Off`}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-black italic">
                      Which tasks should I mark as completed today?
                    </h3>
                    <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-600 mt-1">
                      Tap task checkboxes, attach photos/videos, add shift notes, or chat with the assistant.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      id="copy-scannable-btn"
                      onClick={handleCopyBrief}
                      className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-zinc-200 hover:bg-zinc-300 text-black text-xs font-black uppercase tracking-tight transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
                    >
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
                    </button>
                  </div>
                </footer>
              </div>
            ) : (
              /* ================= SECONDARY PRIORITY GROUPED VIEW ================= */
              <div className="space-y-4 sm:space-y-6">
                <SectionBlock
                  title="Urgent / High Priority"
                  subtitle="Critical shortages, equipment breakdowns & immediate actions"
                  priority="urgent"
                  tasks={urgentFiltered}
                  startIndex={0}
                  onToggleTask={handleToggleTask}
                  onEditTask={canEditTask ? handleEditTask : undefined}
                  onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
                  onUnpackSubTasks={handleUnpackSubTasks}
                  onViewMedia={setSelectedMedia}
                  onAddMediaToTask={handleAddMediaToTask}
                  onUpdateTaskNote={handleUpdateTaskNote}
                  onToggleSubTask={handleToggleSubTask}
                  onAddSubTaskMedia={handleAddSubTaskMedia}
                  onUpdateSubTaskNote={handleUpdateSubTaskNote}
                  onApproveTask={handleApproveTask}
                  onRejectTask={handleRejectTask}
                  staffList={staffList}
                  onAddTaskToSection={canAddTask ? () => handleOpenAssignModal(currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen') : undefined}
                  blockedTaskId={blockedTaskId}
                />

                <SectionBlock
                  title="Daily Routine Checklist"
                  subtitle="Routine operations, station prep, cleanliness sign-offs"
                  priority="today"
                  tasks={todayFiltered}
                  startIndex={urgentFiltered.length}
                  onToggleTask={handleToggleTask}
                  onEditTask={canEditTask ? handleEditTask : undefined}
                  onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
                  onUnpackSubTasks={handleUnpackSubTasks}
                  onViewMedia={setSelectedMedia}
                  onAddMediaToTask={handleAddMediaToTask}
                  onUpdateTaskNote={handleUpdateTaskNote}
                  onToggleSubTask={handleToggleSubTask}
                  onAddSubTaskMedia={handleAddSubTaskMedia}
                  onUpdateSubTaskNote={handleUpdateSubTaskNote}
                  onApproveTask={handleApproveTask}
                  onRejectTask={handleRejectTask}
                  staffList={staffList}
                  onAddTaskToSection={canAddTask ? () => handleOpenAssignModal(currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen') : undefined}
                  blockedTaskId={blockedTaskId}
                />

                <SectionBlock
                  title="Pending / Follow-ups"
                  subtitle="Vendor quotes, manager overrides & pending approvals"
                  priority="pending"
                  tasks={pendingFiltered}
                  startIndex={urgentFiltered.length + todayFiltered.length}
                  onToggleTask={handleToggleTask}
                  onEditTask={canEditTask ? handleEditTask : undefined}
                  onDeleteTask={canDeleteTask ? handleDeleteTask : undefined}
                  onUnpackSubTasks={handleUnpackSubTasks}
                  onViewMedia={setSelectedMedia}
                  onAddMediaToTask={handleAddMediaToTask}
                  onUpdateTaskNote={handleUpdateTaskNote}
                  onToggleSubTask={handleToggleSubTask}
                  onAddSubTaskMedia={handleAddSubTaskMedia}
                  onUpdateSubTaskNote={handleUpdateSubTaskNote}
                  onApproveTask={handleApproveTask}
                  onRejectTask={handleRejectTask}
                  staffList={staffList}
                  onAddTaskToSection={canAddTask ? () => handleOpenAssignModal(currentStation !== 'Manager' ? (currentStation as TaskDepartment) : 'Kitchen') : undefined}
                  blockedTaskId={blockedTaskId}
                />
              </div>
            )}
          </div>
        )}
          </>
        )}
        </PullToRefresh>
      </main>

      {/* Android Mobile Navigation Bar */}
      <AndroidBottomNav
        activeTab={activeMobileTab}
        setActiveTab={setActiveMobileTab}
        currentStation={currentStation}
        onOpenStationModal={() => canSwitchStations && setIsStationModalOpen(true)}
        onOpenAssignModal={() => canAddTask && handleOpenAssignModal()}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onOpenTools={() => setIsToolsModalOpen(true)}
        isToolsOpen={isToolsModalOpen}
        tasksCount={stationTasks.length}
        remainingTasksCount={remainingCount}
        urgentCount={pendingUrgentCount}
      />

      {/* Operations Tools & Management Modal */}
      <ToolsMenuModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
        onOpenTaskDirectory={() => setIsTaskDirectoryOpen(true)}
        onToggleAnalytics={() => setIsAnalyticsOpen(true)}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onOpenOutletModal={() => openOutletModal()}
        onOpenDataCleanup={() => setIsDataCleanupModalOpen(true)}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onToggleViewMode={() => setIsScannableMode(!isScannableMode)}
        isScannableMode={isScannableMode}
        totalCount={stationTasks.length}
        onCopyBrief={handleCopyBrief}
        copied={copied}
        onOpenHistoryModal={() => setIsHistoryModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isInstallable={isInstallable}
        outletsCount={availableOutlets.length}
        onOpenStaffModal={() => setIsStaffModalOpen(true)}
        staffCount={staffList.filter((s) => s && s.isActive !== false && s.active !== false).length}
        onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
        isFirebaseConnected={isFirebaseConnected}
        onOpenAdminApprovals={() => setIsAdminApprovalOpen(true)}
        pendingApprovalCount={pendingApprovalCount}
        onOpenTaskRegister={() => setIsTaskRegisterOpen(true)}
        onTriggerTestAlarm={handleTriggerTestAlarm}
      />

      {/* 10-Minute Pre-Task Extreme Loud Siren & PWA Push Reminder Modal */}
      <PreTaskAlarmModal
        isOpen={activeAlarm.isOpen}
        task={activeAlarm.task}
        minutesRemaining={activeAlarm.minutesRemaining}
        onClose={() => {
          stopExtremeLoudAlarm();
          setActiveAlarm((prev) => ({ ...prev, isOpen: false }));
        }}
        onJumpToTask={handleJumpToTaskFromAlarm}
      />

      {/* Admin Photo Verification & Task Approval Modal */}
      <AdminApprovalModal
        isOpen={isAdminApprovalOpen}
        onClose={() => setIsAdminApprovalOpen(false)}
        tasks={stationTasks}
        onApproveTask={handleApproveTask}
        onRejectTask={handleRejectTask}
        onViewMedia={setSelectedMedia}
      />

      {/* Station Selector Modal (Station Isolation & Lock) */}
      <StationSelectorModal
        isOpen={isStationModalOpen}
        onClose={() => setIsStationModalOpen(false)}
        currentStation={currentStation}
        onSelectStation={handleSelectStation}
        taskCountsByDept={taskCountsByDept}
        activeStaff={activeStaff}
        staffList={staffList}
        onSelectActiveStaff={handleSelectActiveStaff}
        isManagerUnlocked={isManagerUnlocked}
        onManagerUnlock={handleManagerUnlock}
        isLightMode={isLightMode}
      />

      {/* Android PWA Install Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onInstall={install}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />

      {/* Shift History Modal */}
      <ShiftHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        history={history}
        onRestoreShift={handleRestoreShift}
      />

      {/* Staff Management Modal */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        staffList={staffList}
        tasks={tasks}
        onAddStaff={handleAddStaff}
        onUpdateStaff={handleUpdateStaff}
        onDeleteStaff={handleDeleteStaff}
        onAssignTask={(staff) => {
          setIsStaffModalOpen(false);
          setDefaultAssignStaff(staff);
          setDefaultAssignDept(staff.department);
          setEditingTask(null);
    setIsDuplicateMode(false);
          setIsAssignModalOpen(true);
        }}
      />

      {/* Task Creation / Edit / Assignment Modal */}
      <TaskAssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        onSaveTask={handleSaveTask}
        onSaveTasks={handleSaveTasks}
        editingTask={editingTask}
        isDuplicate={isDuplicateMode}
        staffList={staffList}
        defaultDepartment={defaultAssignDept}
        defaultStaff={defaultAssignStaff}
        defaultHeader={defaultAssignHeader}
      />

      {/* Raw Notes / Task Import Modal */}
      <PasteInputModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onSubmit={handleAnalyze}
        isLoading={isLoading}
      />

      {/* Media Lightbox Viewer Modal */}
      <MediaPreviewModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />

      {/* AI Ops Assistant Drawer */}
      <ChatAssistantDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpen={() => setIsChatOpen(true)}
        messages={messages}
        onSendMessage={handleSendChatMessage}
        isLoading={isChatLoading}
        tasks={stationTasks}
      />

      {/* Daily Completed Tasks PDF Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        tasks={stationTasks}
        staffList={staffList}
        currentStation={currentStation}
        currentUser={currentUser}
      />

      {/* Data Cleanup (Admin Only) */}
      <DataCleanupModal
        isOpen={isDataCleanupModalOpen}
        onClose={() => setIsDataCleanupModalOpen(false)}
        tasks={tasks}
        activeOutlet={activeOutlet}
        onExecuteCleanup={handleExecuteDataCleanup}
      />

      {/* Outlet & Branch Management Modal (Admin Only) */}
      <OutletManagementModal
        isOpen={isOutletModalOpen}
        onClose={closeOutletModal}
        isLightMode={isLightMode}
      />

      {/* Firestore Real-Time Connection & Document Sync Diagnostic Modal */}
      <FirestoreDiagnosticModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
        connectionState={firestoreConnectionState}
        tasksCount={syncedTasksCount || tasks.length}
        staffCount={syncedStaffCount || staffList.length}
        shiftsCount={syncedShiftsCount || history.length}
        outletsCount={availableOutlets.length}
        lastSyncTimestamp={lastSyncTimestamp}
        isLiveRealtime={isLiveRealtime}
        lastError={lastFirestoreError}
        onForceResync={async () => {
          await handlePullToRefresh();
        }}
      />
    </div>
  );
}
