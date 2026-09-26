import React, { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import {
  Utensils,
  Coffee,
  Sparkles,
  ConciergeBell,
  CreditCard,
  Layers,
  Clock,
  Plus,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Tag,
  CheckSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { TaskItem, ChecklistHeader, TaskMedia, StaffMember } from '../types';
import { TaskCard } from './TaskCard';
import { useTheme } from '../context/ThemeContext';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';

interface ChecklistGroupSectionProps {
  headerName?: ChecklistHeader | string;
  checklistHeader?: ChecklistHeader | string;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onUnpackSubTasks?: (taskId: string) => void;
  onDeleteChecklist?: (headerName: string) => void;
  onUpgradeChecklist?: (headerName: string) => void;
  onRenameChecklist?: (oldHeader: string, newHeader: string) => void;
  onViewMedia?: (media: TaskMedia) => void;
  onAddMediaToTask?: (taskId: string, media: TaskMedia) => void;
  onUpdateTaskNote?: (taskId: string, note: string) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
  onAddSubTaskMedia?: (taskId: string, subTaskId: string, media: TaskMedia) => void;
  onUpdateSubTaskNote?: (taskId: string, subTaskId: string, note: string) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
  staffList?: StaffMember[];
  onAddTaskToHeader?: (headerName: string) => void;
  blockedTaskId?: string | null;
}

export const ChecklistGroupSection: React.FC<ChecklistGroupSectionProps> = ({
  headerName,
  checklistHeader,
  tasks = [],
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onUnpackSubTasks,
  onDeleteChecklist,
  onUpgradeChecklist,
  onRenameChecklist,
  onViewMedia,
  onAddMediaToTask,
  onUpdateTaskNote,
  onToggleSubTask,
  onAddSubTaskMedia,
  onUpdateSubTaskNote,
  onApproveTask,
  onRejectTask,
  staffList = [],
  onAddTaskToHeader,
  blockedTaskId = null,
}) => {
  const resolvedHeaderName = (checklistHeader || headerName || 'General Operations') as string;
  const { isLightMode } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [confirmDeleteChecklist, setConfirmDeleteChecklist] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(resolvedHeaderName);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const completedCount = safeTasks.filter((t) => t?.completed).length;
  const isAllCompleted = safeTasks.length > 0 && completedCount === safeTasks.length;
  const urgentCount = safeTasks.filter((t) => t?.priority === 'urgent' && !t?.completed).length;
  const breachedTasks = safeTasks.filter((t) => !t?.completed && evaluateTaskTimeStatus(t).isOverdue);
  const breachedCount = breachedTasks.length;
  const percentage = safeTasks.length > 0 ? Math.round((completedCount / safeTasks.length) * 100) : 0;

  // Subtasks total count across tasks in this group
  const totalSubTasks = safeTasks.reduce((acc, t) => acc + (t.subTasks ? t.subTasks.length : 0), 0);
  const doneSubTasks = safeTasks.reduce(
    (acc, t) => acc + (t.subTasks ? t.subTasks.filter((s) => s.isDone).length : 0),
    0
  );

  // Time window detection
  const timeWindows = safeTasks
    .map((t) => (t.startTime && t.endTime ? `${t.startTime} – ${t.endTime}` : t.deadline || null))
    .filter(Boolean);
  const primaryTimeWindow = timeWindows.length > 0 ? timeWindows[0] : 'Scheduled Daily';

  const getHeaderIcon = (name: string) => {
    if (name.includes('Kitchen')) return <Utensils className="w-5 h-5" />;
    if (name.includes('Bar')) return <Coffee className="w-5 h-5" />;
    if (name.includes('Housekeeping')) return <Sparkles className="w-5 h-5" />;
    if (name.includes('Service')) return <ConciergeBell className="w-5 h-5" />;
    if (name.includes('Cashier')) return <CreditCard className="w-5 h-5" />;
    return <Layers className="w-5 h-5" />;
  };

  const getHeaderTheme = (name: string) => {
    if (name.includes('Kitchen')) {
      return {
        badge: isLightMode ? 'bg-orange-100 text-orange-950 border-orange-300' : 'bg-orange-950/70 text-orange-300 border-orange-700',
        accent: 'text-orange-500',
        border: 'border-orange-500/40',
      };
    }
    if (name.includes('Bar')) {
      return {
        badge: isLightMode ? 'bg-amber-100 text-amber-950 border-amber-300' : 'bg-amber-950/70 text-amber-300 border-amber-700',
        accent: 'text-amber-500',
        border: 'border-amber-500/40',
      };
    }
    if (name.includes('Cashier')) {
      return {
        badge: isLightMode ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-emerald-950/70 text-emerald-300 border-emerald-700',
        accent: 'text-emerald-500',
        border: 'border-emerald-500/40',
      };
    }
    if (name.includes('Housekeeping')) {
      return {
        badge: isLightMode ? 'bg-cyan-100 text-cyan-950 border-cyan-300' : 'bg-cyan-950/70 text-cyan-300 border-cyan-700',
        accent: 'text-cyan-500',
        border: 'border-cyan-500/40',
      };
    }
    if (name.includes('Service')) {
      return {
        badge: isLightMode ? 'bg-purple-100 text-purple-950 border-purple-300' : 'bg-purple-950/70 text-purple-300 border-purple-700',
        accent: 'text-purple-500',
        border: 'border-purple-500/40',
      };
    }
    return {
      badge: isLightMode ? 'bg-zinc-200 text-zinc-900 border-zinc-300' : 'bg-zinc-800 text-zinc-200 border-zinc-700',
      accent: 'text-zinc-400',
      border: 'border-zinc-700',
    };
  };

  const theme = getHeaderTheme(resolvedHeaderName);

  return (
    <section
      id={`checklist-group-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className={`flex flex-col p-3.5 sm:p-5 transition-all rounded-sm border-2 shadow-md ${
        isLightMode ? 'bg-white border-zinc-300' : 'bg-zinc-950 border-zinc-800'
      }`}
    >
      {/* Section Header */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b ${
          isLightMode ? 'border-zinc-200' : 'border-zinc-800'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          <div className={`p-2 sm:p-2.5 ${theme.badge} border flex-shrink-0 font-black shadow-sm`}>
            {getHeaderIcon(resolvedHeaderName)}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isRenaming ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className={`px-2 py-1 text-sm font-black uppercase tracking-tight border-2 outline-none ${
                      isLightMode ? 'bg-white border-zinc-950 text-black' : 'bg-black border-white text-white'
                    }`}
                    placeholder="Checklist title..."
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (onRenameChecklist && renameDraft.trim() && renameDraft.trim() !== resolvedHeaderName) {
                        onRenameChecklist(resolvedHeaderName, renameDraft.trim());
                      }
                      setIsRenaming(false);
                    }}
                    className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer"
                    title="Save name"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameDraft(resolvedHeaderName);
                      setIsRenaming(false);
                    }}
                    className="p-1.5 bg-zinc-700 hover:bg-zinc-600 text-white transition cursor-pointer"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <h2
                    className={`text-lg sm:text-2xl font-black uppercase tracking-tight ${
                      isLightMode ? 'text-zinc-950' : 'text-white'
                    }`}
                  >
                    {resolvedHeaderName}
                  </h2>
                  {onRenameChecklist && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(resolvedHeaderName);
                        setIsRenaming(true);
                      }}
                      className={`p-1 transition cursor-pointer opacity-60 hover:opacity-100 ${
                        isLightMode ? 'text-zinc-600 hover:text-black' : 'text-zinc-400 hover:text-white'
                      }`}
                      title="Rename this checklist"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <span className={`px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border ${theme.badge}`}>
                {completedCount}/{safeTasks.length} Tasks Done ({percentage}%)
              </span>
              {breachedCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1 shadow">
                  <AlertCircle className="w-3 h-3 stroke-[3]" />
                  🚨 {breachedCount} Time Breach!
                </span>
              )}
              {totalSubTasks > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-blue-950 text-blue-300 border border-blue-800 flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" />
                  {doneSubTasks}/{totalSubTasks} Sub-tasks
                </span>
              )}
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-red-600 text-white animate-pulse flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 stroke-[3]" />
                  {urgentCount} Urgent
                </span>
              )}
            </div>

            {/* Time Window & Station Subtitle */}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-amber-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline Window: {primaryTimeWindow}</span>
              </span>
              <span className="text-[10px] text-zinc-500 font-bold">•</span>
              <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                PeakScale Verified SOP Checklist
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-start sm:self-auto">
          {onAddTaskToHeader && (
            <button
              type="button"
              onClick={() => onAddTaskToHeader(resolvedHeaderName)}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-tight px-3 py-1.5 transition flex items-center gap-1 cursor-pointer active:scale-95 min-h-[36px] ${
                isLightMode
                  ? 'bg-zinc-950 text-white hover:bg-zinc-800'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>+ Add Task</span>
            </button>
          )}

          {onUpgradeChecklist && (
            <button
              type="button"
              id={`upgrade-checklist-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => onUpgradeChecklist(resolvedHeaderName)}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-tight px-2.5 sm:px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[36px] border ${
                isLightMode
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300'
                  : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-800'
              }`}
              title={`Upgrade checklist "${resolvedHeaderName}" with more SOP checkpoints, media rules, or shift timings`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Upgrade</span>
            </button>
          )}

          {onDeleteChecklist && (
            <button
              type="button"
              id={`delete-checklist-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              onClick={() => {
                if (confirmDeleteChecklist) {
                  onDeleteChecklist(resolvedHeaderName);
                  setConfirmDeleteChecklist(false);
                } else {
                  setConfirmDeleteChecklist(true);
                  setTimeout(() => setConfirmDeleteChecklist(false), 4000);
                }
              }}
              className={`text-[11px] sm:text-xs font-black uppercase tracking-tight px-2.5 sm:px-3 py-1.5 transition flex items-center gap-1.5 cursor-pointer active:scale-95 min-h-[36px] border ${
                confirmDeleteChecklist
                  ? 'bg-red-600 text-white border-red-600 shadow-md animate-pulse'
                  : isLightMode
                  ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-400'
                  : 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/60 hover:border-red-500'
              }`}
              title={
                confirmDeleteChecklist
                  ? 'Click again to permanently delete this entire checklist'
                  : `Delete checklist "${resolvedHeaderName}"`
              }
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>
                {confirmDeleteChecklist
                  ? safeTasks.length > 0
                    ? `Confirm Delete (${safeTasks.length})?`
                    : 'Confirm Delete Checklist?'
                  : 'Delete Checklist'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center border ${
              isLightMode
                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600 hover:text-zinc-950 border-zinc-300'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800'
            }`}
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Group Progress Bar */}
      <div className={`w-full h-1.5 my-2.5 overflow-hidden ${isLightMode ? 'bg-zinc-200' : 'bg-zinc-900'}`}>
        <div
          className={`h-full transition-all duration-300 ${
            percentage === 100
              ? 'bg-emerald-600'
              : isLightMode
              ? 'bg-zinc-950'
              : 'bg-white'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Task Cards List */}
      {isExpanded && (
        <div className="pt-2 space-y-2.5 sm:space-y-3">
          {/* Time Breach Alert Banner */}
          {breachedCount > 0 && (
            <div className="p-3 bg-red-950 text-red-100 border-2 border-red-600 shadow-md flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 stroke-[2.5]" />
                <div>
                  <span className="text-xs font-black uppercase text-red-300 block">
                    🚨 {resolvedHeaderName} SLA Breach: {breachedCount} Task(s) Overdue!
                  </span>
                  <span className="text-[11px] text-zinc-300">
                    Mention time has passed without completion. Escalated to Department & Master Register (Hemen Das).
                  </span>
                </div>
              </div>
            </div>
          )}

          {safeTasks.length === 0 ? (
            <div
              className={`py-6 text-center text-xs font-bold uppercase tracking-wider border border-dashed ${
                isLightMode
                  ? 'text-zinc-600 bg-zinc-50 border-zinc-300'
                  : 'text-zinc-500 bg-zinc-900/40 border-zinc-800'
              }`}
            >
              No tasks in {resolvedHeaderName} yet. Click "+ Add Task" to add tasks, or "Delete Checklist" above to remove this section.
            </div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {safeTasks.map((task, idx) => (
                <TaskCard
                  key={task.id ? `task-card-${resolvedHeaderName}-${task.id}-${idx}` : `task-card-${resolvedHeaderName}-${idx}`}
                  task={task}
                  index={idx}
                  onToggle={onToggleTask}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onUnpackSubTasks={onUnpackSubTasks}
                  onViewMedia={onViewMedia}
                  onAddMediaToTask={onAddMediaToTask}
                  onUpdateTaskNote={onUpdateTaskNote}
                  onToggleSubTask={onToggleSubTask}
                  onAddSubTaskMedia={onAddSubTaskMedia}
                  onUpdateSubTaskNote={onUpdateSubTaskNote}
                  onApproveTask={onApproveTask}
                  onRejectTask={onRejectTask}
                  staffList={staffList}
                  isBlocked={blockedTaskId === task.id}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      )}
    </section>
  );
};
