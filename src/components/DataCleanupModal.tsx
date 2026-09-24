import React, { useState, useMemo } from 'react';
import {
  Trash2,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  X,
  ShieldAlert,
  Building2,
  Sparkles,
  Info,
  Layers,
} from 'lucide-react';
import { TaskItem, DEFAULT_OUTLET } from '../types';
import { useTheme } from '../context/ThemeContext';

export type CleanupOptionType = 'older_than_7_days' | 'older_than_30_days' | 'all_completed';

interface DataCleanupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  activeOutlet: string;
  onExecuteCleanup: (taskIds: string[], cleanupLabel: string) => Promise<void>;
}

export const DataCleanupModal: React.FC<DataCleanupModalProps> = ({
  isOpen,
  onClose,
  tasks = [],
  activeOutlet,
  onExecuteCleanup,
}) => {
  const { isLightMode } = useTheme();
  const [selectedOption, setSelectedOption] = useState<CleanupOptionType>('older_than_7_days');
  const [scope, setScope] = useState<'current_outlet' | 'all_outlets'>('current_outlet');
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Calculate cutoff timestamps
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  // Filter tasks based on scope
  const scopedCompletedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.completed) return false;
      if (scope === 'current_outlet') {
        return (t.outlet || DEFAULT_OUTLET) === activeOutlet;
      }
      return true;
    });
  }, [tasks, scope, activeOutlet]);

  // Tasks matching Option 1: Older than 7 days
  const tasksOlderThan7Days = useMemo(() => {
    return scopedCompletedTasks.filter((t) => {
      const timeStr = t.completedAt || t.updatedAt || t.createdAt;
      if (!timeStr) return true; // If completed with no timestamp, treat as older
      const tTime = new Date(timeStr).getTime();
      return isNaN(tTime) || tTime <= sevenDaysAgo;
    });
  }, [scopedCompletedTasks, sevenDaysAgo]);

  // Tasks matching Option 2: Older than 30 days
  const tasksOlderThan30Days = useMemo(() => {
    return scopedCompletedTasks.filter((t) => {
      const timeStr = t.completedAt || t.updatedAt || t.createdAt;
      if (!timeStr) return false;
      const tTime = new Date(timeStr).getTime();
      return isNaN(tTime) || tTime <= thirtyDaysAgo;
    });
  }, [scopedCompletedTasks, thirtyDaysAgo]);

  // Tasks matching Option 3: All Completed Tasks
  const allCompletedTasks = scopedCompletedTasks;

  // Resolve tasks targeted by current selection
  const targetedTasks = useMemo(() => {
    switch (selectedOption) {
      case 'older_than_7_days':
        return tasksOlderThan7Days;
      case 'older_than_30_days':
        return tasksOlderThan30Days;
      case 'all_completed':
        return allCompletedTasks;
      default:
        return [];
    }
  }, [selectedOption, tasksOlderThan7Days, tasksOlderThan30Days, allCompletedTasks]);

  const targetedCount = targetedTasks.length;

  const getOptionLabel = (opt: CleanupOptionType) => {
    switch (opt) {
      case 'older_than_7_days':
        return 'Completed tasks older than 7 days';
      case 'older_than_30_days':
        return 'Completed tasks older than 30 days';
      case 'all_completed':
        return 'All Completed Tasks';
    }
  };

  const handleExecute = async () => {
    if (targetedCount === 0 || !isConfirmed) return;
    setIsProcessing(true);
    setFeedbackMsg(null);
    try {
      const label = `${getOptionLabel(selectedOption)} (${scope === 'current_outlet' ? activeOutlet : 'All Outlets'})`;
      const taskIds = targetedTasks.map((t) => t.id);
      await onExecuteCleanup(taskIds, label);
      setFeedbackMsg(`Successfully deleted ${taskIds.length} old tasks!`);
      setTimeout(() => {
        setIsConfirmed(false);
        setIsProcessing(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Cleanup execution error:', err);
      setFeedbackMsg('Failed to delete tasks. Please try again.');
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="data-cleanup-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="data-cleanup-modal-content"
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl border-2 sm:border-4 shadow-2xl transition-all my-8 animate-in zoom-in-95 duration-150 ${
          isLightMode
            ? 'bg-white border-zinc-950 text-zinc-950'
            : 'bg-zinc-950 border-red-600 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between border-b-2 ${
            isLightMode ? 'bg-red-50 border-zinc-300' : 'bg-red-950/40 border-zinc-800'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-2.5 bg-red-600 text-white font-black flex-shrink-0">
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-red-600 text-white">
                  Admin Only
                </span>
                <span className="text-xs font-mono font-bold text-red-500 uppercase">
                  Data Maintenance
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black uppercase tracking-tight leading-tight mt-0.5">
                Delete Old Tasks (Data Cleanup)
              </h2>
            </div>
          </div>

          <button
            type="button"
            id="close-data-cleanup-modal-btn"
            onClick={onClose}
            className={`p-1.5 transition cursor-pointer border ${
              isLightMode
                ? 'hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                : 'hover:bg-zinc-800 text-zinc-400 border-zinc-700'
            }`}
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Scope Selector: Active Outlet vs All Outlets */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-1.5">
              1. Select Cleanup Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="cleanup-scope-current-btn"
                onClick={() => {
                  setScope('current_outlet');
                  setIsConfirmed(false);
                }}
                className={`p-2.5 text-left border-2 text-xs font-black uppercase tracking-tight flex items-center gap-2 transition cursor-pointer ${
                  scope === 'current_outlet'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-white text-black border-white shadow-xs'
                    : isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0 text-red-500" />
                <div className="min-w-0">
                  <div className="truncate">Current Branch</div>
                  <div className="text-[10px] opacity-75 font-mono truncate">{activeOutlet}</div>
                </div>
              </button>

              <button
                type="button"
                id="cleanup-scope-all-btn"
                onClick={() => {
                  setScope('all_outlets');
                  setIsConfirmed(false);
                }}
                className={`p-2.5 text-left border-2 text-xs font-black uppercase tracking-tight flex items-center gap-2 transition cursor-pointer ${
                  scope === 'all_outlets'
                    ? isLightMode
                      ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                      : 'bg-white text-black border-white shadow-xs'
                    : isLightMode
                    ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                }`}
              >
                <Layers className="w-4 h-4 flex-shrink-0 text-red-500" />
                <div className="min-w-0">
                  <div className="truncate">All Outlets</div>
                  <div className="text-[10px] opacity-75 font-mono">Global Cleanup</div>
                </div>
              </button>
            </div>
          </div>

          {/* Option Selector: 7 Days, 30 Days, All Completed */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider mb-2">
              2. Select Retention Filter
            </label>
            <div className="space-y-2">
              {/* Option 1: Older than 7 days */}
              <button
                type="button"
                id="cleanup-opt-7-days-btn"
                onClick={() => {
                  setSelectedOption('older_than_7_days');
                  setIsConfirmed(false);
                }}
                className={`w-full p-3 text-left border-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                  selectedOption === 'older_than_7_days'
                    ? isLightMode
                      ? 'bg-red-50 border-red-600 text-zinc-950 ring-2 ring-red-600/20'
                      : 'bg-red-950/40 border-red-500 text-white ring-2 ring-red-500/20'
                    : isLightMode
                    ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    : 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 ${selectedOption === 'older_than_7_days' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}>
                    <Clock className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black uppercase tracking-tight">
                      Completed tasks older than 7 days
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium">
                      Purges completed checklists from past weeks while retaining the last 7 days.
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-mono font-black flex-shrink-0 ${
                    tasksOlderThan7Days.length > 0
                      ? 'bg-red-600 text-white'
                      : isLightMode
                      ? 'bg-zinc-200 text-zinc-600'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tasksOlderThan7Days.length} Tasks
                </span>
              </button>

              {/* Option 2: Older than 30 days */}
              <button
                type="button"
                id="cleanup-opt-30-days-btn"
                onClick={() => {
                  setSelectedOption('older_than_30_days');
                  setIsConfirmed(false);
                }}
                className={`w-full p-3 text-left border-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                  selectedOption === 'older_than_30_days'
                    ? isLightMode
                      ? 'bg-red-50 border-red-600 text-zinc-950 ring-2 ring-red-600/20'
                      : 'bg-red-950/40 border-red-500 text-white ring-2 ring-red-500/20'
                    : isLightMode
                    ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    : 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 ${selectedOption === 'older_than_30_days' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}>
                    <Calendar className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black uppercase tracking-tight">
                      Completed tasks older than 30 days
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium">
                      Retains 1 full month of completion records and removes archived items.
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-mono font-black flex-shrink-0 ${
                    tasksOlderThan30Days.length > 0
                      ? 'bg-red-600 text-white'
                      : isLightMode
                      ? 'bg-zinc-200 text-zinc-600'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {tasksOlderThan30Days.length} Tasks
                </span>
              </button>

              {/* Option 3: All Completed Tasks */}
              <button
                type="button"
                id="cleanup-opt-all-completed-btn"
                onClick={() => {
                  setSelectedOption('all_completed');
                  setIsConfirmed(false);
                }}
                className={`w-full p-3 text-left border-2 flex items-center justify-between gap-3 transition cursor-pointer ${
                  selectedOption === 'all_completed'
                    ? isLightMode
                      ? 'bg-red-50 border-red-600 text-zinc-950 ring-2 ring-red-600/20'
                      : 'bg-red-950/40 border-red-500 text-white ring-2 ring-red-500/20'
                    : isLightMode
                    ? 'bg-zinc-50 hover:bg-zinc-100 border-zinc-300 text-zinc-800'
                    : 'bg-zinc-900 hover:bg-zinc-800/80 border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 ${selectedOption === 'all_completed' ? 'bg-red-600 text-white' : 'bg-zinc-700 text-zinc-200'}`}>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-black uppercase tracking-tight">
                      All Completed Tasks
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium">
                      Purges all checked-off tasks immediately to reset shifts clean.
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 text-xs font-mono font-black flex-shrink-0 ${
                    allCompletedTasks.length > 0
                      ? 'bg-red-600 text-white'
                      : isLightMode
                      ? 'bg-zinc-200 text-zinc-600'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {allCompletedTasks.length} Tasks
                </span>
              </button>
            </div>
          </div>

          {/* Targeted Tasks Preview */}
          {targetedCount > 0 && (
            <div
              className={`p-3 border text-xs font-mono ${
                isLightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between font-sans font-bold uppercase tracking-wider text-[11px] mb-2 text-zinc-500">
                <span>Items Selected for Deletion ({targetedCount})</span>
                <span>{scope === 'current_outlet' ? activeOutlet : 'All Branches'}</span>
              </div>
              <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                {targetedTasks.slice(0, 6).map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-[11px] truncate">
                    <span className="truncate">• {t.title}</span>
                    <span className="opacity-60 text-[10px] ml-2 flex-shrink-0">
                      [{t.department}]
                    </span>
                  </li>
                ))}
                {targetedCount > 6 && (
                  <li className="text-[10px] text-zinc-400 italic pt-1">
                    ...and {targetedCount - 6} more completed task(s)
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Strict Confirmation Warning Box */}
          <div className="p-3.5 sm:p-4 bg-red-600 text-white border-2 border-red-500 shadow-md space-y-2">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 stroke-[3] mt-0.5" />
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight">
                  Strict Confirmation Warning
                </h4>
                <p className="text-xs text-red-100 font-medium leading-snug mt-0.5">
                  Are you sure? This action cannot be undone. All matching completed tasks, sub-tasks, shift notes, and media attachments will be permanently removed from Firestore database and devices.
                </p>
              </div>
            </div>

            <label className="flex items-center gap-2 pt-2 border-t border-red-500/80 cursor-pointer select-none">
              <input
                type="checkbox"
                id="confirm-cleanup-checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 accent-black cursor-pointer"
              />
              <span className="text-xs font-black uppercase tracking-tight text-white">
                I understand this deletion is permanent and irreversible
              </span>
            </label>
          </div>

          {/* Status Feedback Message */}
          {feedbackMsg && (
            <div className="p-2.5 bg-black text-white text-xs font-mono font-bold text-center border-2 border-white">
              {feedbackMsg}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="cancel-cleanup-btn"
              onClick={onClose}
              disabled={isProcessing}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-tight border-2 transition cursor-pointer ${
                isLightMode
                  ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              id="execute-cleanup-btn"
              onClick={handleExecute}
              disabled={targetedCount === 0 || !isConfirmed || isProcessing}
              className={`px-5 py-2.5 text-xs font-black uppercase tracking-tight transition flex items-center gap-2 shadow-lg ${
                targetedCount > 0 && isConfirmed && !isProcessing
                  ? 'bg-red-600 hover:bg-red-500 active:bg-red-700 text-white cursor-pointer border-2 border-red-700'
                  : 'bg-zinc-300 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 border-2 border-transparent cursor-not-allowed opacity-60'
              }`}
            >
              <Trash2 className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isProcessing
                  ? 'Deleting Tasks...'
                  : targetedCount === 0
                  ? 'No Tasks to Delete'
                  : `Permanently Delete ${targetedCount} Task${targetedCount > 1 ? 's' : ''}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
