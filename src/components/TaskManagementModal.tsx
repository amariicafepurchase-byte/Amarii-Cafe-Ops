import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  ListTodo,
  Plus,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderTree,
  WifiOff,
  RefreshCw,
  Cloud,
  Check,
  Edit3,
  Sliders,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { TaskItem, TaskEditRequest } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useTaskQueue } from '../hooks/useTaskQueue';
import { useAuth } from '../context/AuthContext';
import {
  DEPARTMENT_BUNDLES,
  DepartmentBundleDef,
  DepartmentChecklistBatchEditorModal,
} from './DepartmentChecklistBatchEditorModal';

interface TaskManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onEditTask: (task: TaskItem) => void;
  onDuplicateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteChecklist?: (headerName: string) => void;
  onBatchDeleteTasks?: (taskIds: string[]) => void;
  onAddTaskToHeader?: (headerName: string) => void;
  editRequests?: TaskEditRequest[];
  onApproveEditRequest?: (reqId: string) => void;
  onRejectEditRequest?: (reqId: string) => void;
  onSaveBatchTasks?: (updatedTasks: TaskItem[], deletedIds: string[]) => Promise<void>;
  onRestoreDefaultTemplates?: () => Promise<void>;
  onResetToDefaultBundle?: (bundleKey: string) => Promise<void>;
}

export const TaskManagementModal: React.FC<TaskManagementModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onEditTask,
  onDuplicateTask,
  onDeleteTask,
  onDeleteChecklist,
  onBatchDeleteTasks,
  onAddTaskToHeader,
  editRequests = [],
  onApproveEditRequest,
  onRejectEditRequest,
  onSaveBatchTasks,
  onRestoreDefaultTemplates,
  onResetToDefaultBundle,
}) => {
  const { isLightMode } = useTheme();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'checklists' | 'tasks' | 'requests'>('checklists');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteHeader, setConfirmDeleteHeader] = useState<string | null>(null);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState<boolean>(false);
  const { queue, pendingCount, isOnline, isSyncing, triggerSync } = useTaskQueue();
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Batch Editor Sub-Modal State
  const [activeBatchBundle, setActiveBatchBundle] = useState<DepartmentBundleDef | null>(null);
  const [expandedBundleMap, setExpandedBundleMap] = useState<Record<string, boolean>>({});
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  const handleTriggerSyncNow = async () => {
    try {
      const res = await triggerSync();
      if (res.processed > 0) {
        setSyncFeedback(`Synced ${res.processed} update${res.processed > 1 ? 's' : ''} to Firestore!`);
        setTimeout(() => setSyncFeedback(null), 3500);
      } else if (res.failed > 0) {
        setSyncFeedback(`Sync paused: network connection unstable.`);
        setTimeout(() => setSyncFeedback(null), 3500);
      }
    } catch (e) {
      console.error('Task management sync error:', e);
    }
  };

  // Group tasks into the 5 Department Checklist Bundles
  const departmentBundledGroups = useMemo(() => {
    return DEPARTMENT_BUNDLES.map((bundle) => {
      const matching = tasks.filter((t) => {
        if (!t) return false;
        const h = (t.checklistHeader || '').toLowerCase();
        const d = (t.department || '').toLowerCase();
        const isHeaderMatch = bundle.matchingHeaders.some((mh) => h.includes(mh.toLowerCase()));
        const isDeptMatch = d.includes(bundle.department.toLowerCase());
        return isHeaderMatch || isDeptMatch;
      });

      const total = matching.length;
      const completed = matching.filter((t) => t.completed).length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        bundle,
        tasks: matching,
        total,
        completed,
        percentage,
      };
    });
  }, [tasks]);

  // Other custom / unbundled checklist groups
  const otherChecklistGroups = useMemo(() => {
    const bundledTaskIds = new Set(
      departmentBundledGroups.flatMap((g) => g.tasks.map((t) => t.id))
    );

    const remainingTasks = tasks.filter((t) => !bundledTaskIds.has(t.id));
    const map = new Map<string, TaskItem[]>();
    remainingTasks.forEach((t) => {
      const header = t.checklistHeader || 'General Operations';
      const existing = map.get(header) || [];
      existing.push(t);
      map.set(header, existing);
    });

    return Array.from(map.entries()).map(([header, groupTasks]) => {
      const completed = groupTasks.filter((t) => t.completed).length;
      const total = groupTasks.length;
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        header,
        tasks: groupTasks,
        total,
        completed,
        percentage,
        department: groupTasks[0]?.department || 'General',
      };
    });
  }, [tasks, departmentBundledGroups]);

  // Filter department bundles based on search
  const filteredDepartmentBundles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return departmentBundledGroups;
    return departmentBundledGroups.filter((g) => {
      return (
        g.bundle.title.toLowerCase().includes(q) ||
        g.bundle.department.toLowerCase().includes(q) ||
        g.tasks.some((t) => t.title.toLowerCase().includes(q))
      );
    });
  }, [departmentBundledGroups, searchQuery]);

  // Filter tasks based on search
  const filteredTasks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return tasks;
    return tasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.checklistHeader && t.checklistHeader.toLowerCase().includes(q)) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    });
  }, [tasks, searchQuery]);

  if (!isOpen) return null;

  // Toggle single task selection
  const handleToggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  // Toggle select all filtered tasks
  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map((t) => t.id));
    }
  };

  // Execute bulk delete
  const handleExecuteBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      if (onBatchDeleteTasks) {
        await onBatchDeleteTasks(selectedTaskIds);
      } else {
        for (const id of selectedTaskIds) {
          await onDeleteTask(id);
        }
      }
      setSelectedTaskIds([]);
    } catch (e) {
      console.error('Bulk delete tasks error in modal:', e);
    } finally {
      setConfirmBulkDelete(false);
    }
  };

  // Restore All Default Templates
  const handleRestoreAllTemplates = async () => {
    if (!onRestoreDefaultTemplates) return;
    setIsRestoringAll(true);
    try {
      await onRestoreDefaultTemplates();
      setSyncFeedback('✓ All 5 department default templates re-seeded!');
      setTimeout(() => setSyncFeedback(null), 3500);
    } catch (e: any) {
      console.error('Restore all templates error:', e);
      alert(`Failed to restore templates: ${e?.message || 'Database error'}`);
    } finally {
      setIsRestoringAll(false);
    }
  };

  // Save batch tasks wrapper
  const handleSaveBatchWrapper = async (updatedTasks: TaskItem[], deletedIds: string[]) => {
    if (onSaveBatchTasks) {
      await onSaveBatchTasks(updatedTasks, deletedIds);
    }
  };

  // Reset bundle template wrapper
  const handleResetBundleWrapper = async (bundleKey: string) => {
    if (onResetToDefaultBundle) {
      await onResetToDefaultBundle(bundleKey);
    } else if (onRestoreDefaultTemplates) {
      await onRestoreDefaultTemplates();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className={`relative w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl border-2 sm:border-4 rounded-xl overflow-hidden ${
            isLightMode
              ? 'bg-zinc-50 border-zinc-300'
              : 'bg-[#0B140F] border-[#1D3528]'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`p-3.5 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              isLightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900/90'
            }`}
          >
            <div className="flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">
                  Checklist & Task Directory
                </h2>
                <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 font-semibold">
                  5 Department Checklists • Active Master Tasks ({tasks.length})
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Search Bar */}
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search checklists or tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-8 pr-3 py-1 text-xs font-semibold border rounded-lg transition ${
                    isLightMode
                      ? 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400'
                      : 'bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-zinc-500'
                  }`}
                />
              </div>

              {/* Load Default Template Button */}
              {onRestoreDefaultTemplates && (
                <button
                  type="button"
                  onClick={handleRestoreAllTemplates}
                  disabled={isRestoringAll}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-tight rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs shrink-0"
                  title="Instantly reload all 5 default department checklists"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoringAll ? 'animate-spin' : ''}`} />
                  <span>{isRestoringAll ? 'Loading...' : 'Load Default Templates'}</span>
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Offline & Local Queue Status Banner */}
          {(!isOnline || pendingCount > 0) && (
            <div
              className={`px-4 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold border-b transition ${
                !isOnline
                  ? isLightMode
                    ? 'bg-amber-50 text-amber-950 border-amber-300'
                    : 'bg-amber-950/50 text-amber-200 border-amber-800'
                  : isLightMode
                  ? 'bg-blue-50 text-blue-950 border-blue-200'
                  : 'bg-blue-950/40 text-blue-200 border-blue-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {!isOnline ? (
                  <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                ) : (
                  <Cloud className="w-4 h-4 text-blue-500 flex-shrink-0" />
                )}
                <span>
                  {!isOnline ? (
                    <>
                      <strong>Offline Mode Active:</strong> Checklist updates are stored locally ({pendingCount} pending) and will sync once connected.
                    </>
                  ) : (
                    <>
                      <strong>Local Queue:</strong> {pendingCount} update{pendingCount === 1 ? '' : 's'} ready for Firestore sync.
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-auto flex-shrink-0">
                {syncFeedback && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <Check className="w-3.5 h-3.5" />
                    {syncFeedback}
                  </span>
                )}
                {isOnline && pendingCount > 0 && (
                  <button
                    type="button"
                    onClick={handleTriggerSyncNow}
                    disabled={isSyncing}
                    className="px-3 py-1 text-[11px] font-black uppercase tracking-tight bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition border border-blue-700 rounded"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div
            className={`px-3 sm:px-4 py-1.5 flex items-center justify-between border-b gap-2 ${
              isLightMode ? 'bg-zinc-100/80 border-zinc-200' : 'bg-zinc-950 border-zinc-800'
            }`}
          >
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('checklists')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'checklists'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isLightMode
                    ? 'text-zinc-600 hover:bg-zinc-200/70'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>CHECKLISTS ({filteredDepartmentBundles.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'tasks'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isLightMode
                    ? 'text-zinc-600 hover:bg-zinc-200/70'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>ALL INDIVIDUAL TASKS ({tasks.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('requests')}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight rounded-lg transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'requests'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : isLightMode
                    ? 'text-zinc-600 hover:bg-zinc-200/70'
                    : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>EDIT PROPOSALS ({editRequests.filter((r) => r.status === 'pending').length})</span>
              </button>
            </div>

            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden lg:block">
              Batch department checklist editor & master task directory
            </div>
          </div>

          {/* TAB 1: 5 DEPARTMENT CHECKLIST BUNDLES */}
          {activeTab === 'checklists' && (
            <div className="flex-1 overflow-auto p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredDepartmentBundles.map(({ bundle, tasks: bundleTasks, total, completed, percentage }) => {
                  const isExpanded = Boolean(expandedBundleMap[bundle.key]);

                  return (
                    <div
                      key={bundle.key}
                      className={`p-3 rounded-lg border transition flex flex-col justify-between ${
                        isLightMode
                          ? 'bg-white border-zinc-200 hover:border-zinc-300 shadow-xs'
                          : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        {/* Header Row: Icon, Title, Department Badge, Inline Progress Pill */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg p-1 bg-zinc-100 dark:bg-zinc-800 rounded-md shrink-0">
                              {bundle.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                  {bundle.department}
                                </span>
                                <span className="text-[10px] text-zinc-400">•</span>
                                <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 truncate">
                                  {bundle.defaultShiftOverview}
                                </span>
                              </div>
                              <h3 className="text-xs sm:text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 truncate">
                                {bundle.title}
                              </h3>
                            </div>
                          </div>

                          {/* Inline Progress Pill */}
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-black rounded-full border shrink-0 ${
                              percentage === 100
                                ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                : isLightMode
                                ? 'bg-zinc-100 text-zinc-800 border-zinc-200'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                            }`}
                          >
                            {completed}/{total} ({percentage}%)
                          </span>
                        </div>

                        {/* Mini Progress Bar */}
                        <div className="w-full h-1 my-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 rounded-full ${
                              percentage === 100 ? 'bg-emerald-500' : 'bg-[#673ab7]'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        {/* Compact Tasks Preview */}
                        <div className="my-1.5">
                          <div className="flex items-center justify-between text-[10px] font-bold text-zinc-400">
                            <span>{total} Questions in bundle</span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedBundleMap((prev) => ({
                                  ...prev,
                                  [bundle.key]: !prev[bundle.key],
                                }))
                              }
                              className="hover:underline flex items-center gap-0.5 cursor-pointer text-zinc-500 dark:text-zinc-400"
                            >
                              <span>{isExpanded ? 'Hide' : 'Preview'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-1 space-y-1 max-h-28 overflow-y-auto pr-1">
                              {bundleTasks.length === 0 ? (
                                <p className="text-[11px] italic text-zinc-500 p-1.5 border border-dashed rounded text-center">
                                  No tasks loaded. Click <strong>"Open Full Checklist Editor"</strong> or <strong>"Reset"</strong>.
                                </p>
                              ) : (
                                bundleTasks.map((t, idx) => (
                                  <div
                                    key={`bundle-preview-${bundle.key}-${t.id || 'no-id'}-${idx}`}
                                    className={`text-[10px] sm:text-[11px] flex items-center justify-between gap-2 px-2 py-1 rounded border ${
                                      isLightMode
                                        ? 'bg-zinc-50 border-zinc-200 text-zinc-800'
                                        : 'bg-zinc-950 border-zinc-800/80 text-zinc-200'
                                    }`}
                                  >
                                    <span
                                      className={`truncate font-semibold ${
                                        t.completed ? 'line-through opacity-60' : ''
                                      }`}
                                      title={t.title}
                                    >
                                      {idx + 1}. {t.title}
                                    </span>
                                    <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                                      {t.startTime || t.deadline || 'Anytime'}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sleek Horizontal Action Row */}
                      <div className="flex items-center justify-between gap-2 pt-2.5 mt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                        <button
                          type="button"
                          onClick={() => setActiveBatchBundle(bundle)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-tight rounded-md shadow-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
                          title="Open full-screen batch editor"
                        >
                          <Edit3 className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Open Full Checklist Editor</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleResetBundleWrapper(bundle.key)}
                          className={`py-1.5 px-2.5 text-[11px] font-bold uppercase tracking-tight rounded-md border transition flex items-center justify-center gap-1 cursor-pointer shrink-0 ${
                            isLightMode
                              ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                          }`}
                          title="Reset to default template"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Other Custom Checklist Groups (if any) */}
              {otherChecklistGroups.length > 0 && (
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    Additional Custom Checklists ({otherChecklistGroups.length})
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {otherChecklistGroups.map((group) => (
                      <div
                        key={group.header}
                        className={`p-3 border rounded-lg transition flex flex-col justify-between ${
                          isLightMode
                            ? 'bg-white border-zinc-200'
                            : 'bg-zinc-900/90 border-zinc-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                {group.department}
                              </span>
                              <h3 className="text-xs sm:text-sm font-black uppercase text-zinc-900 dark:text-zinc-100">
                                {group.header}
                              </h3>
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 border rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {group.completed}/{group.total} Done
                            </span>
                          </div>

                          <div className="space-y-1 my-1.5 max-h-20 overflow-y-auto">
                            {group.tasks.map((t, tIdx) => (
                              <div key={`other-grp-${group.header}-${t.id || 'no-id'}-${tIdx}`} className="text-[10px] sm:text-[11px] px-2 py-0.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 rounded truncate">
                                {t.title}
                              </div>
                            ))}
                          </div>
                        </div>

                        {onDeleteChecklist && (
                          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                            <button
                              type="button"
                              onClick={() => onDeleteChecklist(group.header)}
                              className="px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete Group
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL INDIVIDUAL TASKS & BULK DELETE */}
          {activeTab === 'tasks' && (
            <div className="flex-1 overflow-hidden flex flex-col p-4 sm:p-6">
              {/* Bulk Selection Bar */}
              {selectedTaskIds.length > 0 && (
                <div
                  className={`p-3 mb-3 border-2 rounded-lg flex items-center justify-between gap-3 ${
                    isLightMode
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-amber-950/40 border-amber-800 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-tight">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>
                      {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTaskIds([])}
                      className="px-2.5 py-1 text-xs font-bold uppercase underline cursor-pointer"
                    >
                      Clear Selection
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirmBulkDelete) {
                          handleExecuteBulkDelete();
                        } else {
                          setConfirmBulkDelete(true);
                          setTimeout(() => setConfirmBulkDelete(false), 4000);
                        }
                      }}
                      className={`px-3 py-1.5 text-xs font-black uppercase tracking-tight border rounded transition flex items-center gap-1.5 cursor-pointer ${
                        confirmBulkDelete
                          ? 'bg-red-600 text-white border-red-600 animate-pulse'
                          : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>
                        {confirmBulkDelete
                          ? `Confirm Delete (${selectedTaskIds.length})?`
                          : `Delete Selected (${selectedTaskIds.length})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Table Container */}
              <div
                className={`flex-1 overflow-auto border-2 rounded-lg ${
                  isLightMode ? 'border-zinc-300' : 'border-[#1D3528]'
                }`}
              >
                <div className="min-w-[850px]">
                  <div
                    className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1.5fr_120px] gap-3 p-3 border-b-2 text-xs font-black uppercase tracking-widest items-center ${
                      isLightMode
                        ? 'bg-zinc-200 border-zinc-300 text-zinc-700'
                        : 'bg-[#111F17] border-[#1D3528] text-[#7D8F85]'
                    }`}
                  >
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleToggleSelectAll}
                        className="cursor-pointer"
                        title={
                          selectedTaskIds.length === filteredTasks.length
                            ? 'Deselect All'
                            : 'Select All'
                        }
                      >
                        {selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Square className="w-4 h-4 text-zinc-500" />
                        )}
                      </button>
                    </div>
                    <div>Checklist / Header</div>
                    <div>Task Title</div>
                    <div>Department</div>
                    <div>Time Window</div>
                    <div className="text-right">Actions</div>
                  </div>

                  <div className="flex flex-col">
                    {filteredTasks.length === 0 ? (
                      <div
                        className={`p-8 text-center text-sm font-bold uppercase tracking-wider ${
                          isLightMode ? 'text-zinc-500' : 'text-zinc-600'
                        }`}
                      >
                        No tasks found matching your search.
                      </div>
                    ) : (
                      filteredTasks.map((task, taskIdx) => {
                        const isSelected = selectedTaskIds.includes(task.id);
                        return (
                          <div
                            key={`task-mgmt-${task.id || 'no-id'}-${taskIdx}`}
                            className={`grid grid-cols-[40px_1.5fr_2fr_1fr_1.5fr_120px] gap-3 p-3 items-center border-b last:border-b-0 transition ${
                              isSelected
                                ? isLightMode
                                  ? 'bg-amber-50/80 border-amber-200'
                                  : 'bg-amber-950/20 border-amber-900/40'
                                : isLightMode
                                ? 'border-zinc-200 hover:bg-zinc-100'
                                : 'border-[#1D3528]/50 hover:bg-[#111F17]'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectTask(task.id)}
                                className="cursor-pointer"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-500" />
                                )}
                              </button>
                            </div>

                            <div className="truncate">
                              <span
                                className={`text-xs font-bold px-2 py-1 border rounded truncate inline-block max-w-full ${
                                  isLightMode
                                    ? 'bg-white border-zinc-300 text-zinc-700'
                                    : 'bg-black/50 border-[#1D3528] text-zinc-300'
                                }`}
                              >
                                {task.checklistHeader || 'General'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              {task.completed ? (
                                <CheckCircle2
                                  className={`w-4 h-4 flex-shrink-0 ${
                                    isLightMode ? 'text-emerald-600' : 'text-emerald-400'
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                                    isLightMode ? 'border-zinc-300' : 'border-zinc-700'
                                  }`}
                                />
                              )}
                              <span
                                className={`text-sm font-bold truncate ${
                                  task.completed
                                    ? isLightMode
                                      ? 'text-zinc-400 line-through'
                                      : 'text-zinc-600 line-through'
                                    : ''
                                }`}
                                title={task.title}
                              >
                                {task.title}
                              </span>
                            </div>

                            <div className="truncate text-xs font-bold">
                              {task.department || '-'}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs font-bold font-mono">
                              <Clock
                                className={`w-3.5 h-3.5 ${
                                  isLightMode ? 'text-zinc-400' : 'text-zinc-500'
                                }`}
                              />
                              <span className="truncate">
                                {task.startTime
                                  ? `${task.startTime} - ${task.endTime || task.deadline || 'End'}`
                                  : task.deadline || 'Anytime'}
                              </span>
                            </div>

                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onDuplicateTask(task);
                                }}
                                className="p-1.5 border rounded transition cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                title="Duplicate Task"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onEditTask(task);
                                }}
                                className="p-1.5 border rounded transition cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                title="Edit Task"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (confirmDeleteId === task.id) {
                                    onDeleteTask(task.id);
                                    setConfirmDeleteId(null);
                                  } else {
                                    setConfirmDeleteId(task.id);
                                    setTimeout(() => setConfirmDeleteId(null), 3000);
                                  }
                                }}
                                className={`p-1.5 border rounded transition cursor-pointer ${
                                  isLightMode
                                    ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'
                                    : 'bg-red-950/30 hover:bg-red-900/60 border-red-900/50 text-red-400'
                                }`}
                                title={confirmDeleteId === task.id ? 'Click again to confirm' : 'Delete Task'}
                              >
                                {confirmDeleteId === task.id ? (
                                  <span className="text-[10px] font-black uppercase">Confirm?</span>
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MANAGER EDIT REQUESTS */}
          {activeTab === 'requests' && (
            <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>Manager Task Edit Proposals</span>
                  </h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    Strict Policy: Direct template editing is restricted to Admin. Managers submit proposals below for approval.
                  </p>
                </div>
              </div>

              {editRequests.length === 0 ? (
                <div
                  className={`p-8 text-center text-xs font-bold uppercase border-2 border-dashed rounded-lg ${
                    isLightMode ? 'bg-white border-zinc-300 text-zinc-500' : 'bg-zinc-900/40 border-[#1D3528] text-zinc-400'
                  }`}
                >
                  No pending task edit requests.
                </div>
              ) : (
                <div className="space-y-3">
                  {editRequests.map((req, reqIdx) => (
                    <div
                      key={`req-${req.id || 'no-id'}-${reqIdx}`}
                      className={`p-3.5 border-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        req.status === 'pending'
                          ? isLightMode
                            ? 'bg-amber-50 border-amber-300 text-zinc-950'
                            : 'bg-amber-950/30 border-amber-800 text-amber-200'
                          : req.status === 'approved'
                          ? isLightMode
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            : 'bg-emerald-950/30 border-emerald-800 text-emerald-200'
                          : isLightMode
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-red-950/30 border-red-900 text-red-200'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                              req.status === 'pending'
                                ? 'bg-amber-500 text-black'
                                : req.status === 'approved'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                          <h4 className="text-xs font-black uppercase">{req.taskTitle}</h4>
                        </div>
                        <p className="text-[11px] font-medium opacity-80">
                          Requested by <span className="font-bold">{req.requestedBy}</span> on {new Date(req.requestedAt).toLocaleString()}
                        </p>
                      </div>

                      {req.status === 'pending' && isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onApproveEditRequest && onApproveEditRequest(req.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1 cursor-pointer rounded"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectEditRequest && onRejectEditRequest(req.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-tight flex items-center gap-1 cursor-pointer rounded"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Batch Department Checklist Editor Modal */}
      {activeBatchBundle && (
        <DepartmentChecklistBatchEditorModal
          isOpen={Boolean(activeBatchBundle)}
          onClose={() => setActiveBatchBundle(null)}
          bundle={activeBatchBundle}
          initialTasks={
            departmentBundledGroups.find((g) => g.bundle.key === activeBatchBundle.key)?.tasks || []
          }
          onSaveBatch={handleSaveBatchWrapper}
          onResetToDefaultBundle={handleResetBundleWrapper}
        />
      )}
    </AnimatePresence>
  );
};
