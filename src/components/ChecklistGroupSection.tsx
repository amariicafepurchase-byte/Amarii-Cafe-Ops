import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Trash2,
  Edit2,
  Check,
  X,
  Zap,
  Lock,
  Send,
  FileCheck2,
  CheckCircle2,
  Share2,
  Loader2,
  GripVertical,
  Move,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { TaskItem, ChecklistHeader, TaskMedia, StaffMember, HEADER_TIME_SUGGESTIONS } from '../types';
import { TaskCard } from './TaskCard';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';
import { shareChecklistUpdate } from '../utils/shareUtils';

interface ChecklistGroupSectionProps {
  headerName?: ChecklistHeader | string;
  checklistHeader?: ChecklistHeader | string;
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onUnpackSubTasks?: (taskId: string) => void;
  onDeleteChecklist?: (headerName: string) => Promise<void> | void;
  onEditChecklist?: (headerName: string) => void;
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
  onSubmitChecklist?: (headerName: string) => void;
  blockedTaskId?: string | null;
  allGroupTasks?: TaskItem[];
  isSingleChecklist?: boolean;
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
  onEditChecklist,
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
  onSubmitChecklist,
  blockedTaskId = null,
  allGroupTasks,
  isSingleChecklist = true,
}) => {
  const resolvedHeaderName = (checklistHeader || headerName || 'General Operations') as string;
  const { isLightMode } = useTheme();
  const { isAdmin, isStaff, currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [confirmDeleteChecklist, setConfirmDeleteChecklist] = useState<boolean>(false);
  const [isDeletingChecklist, setIsDeletingChecklist] = useState<boolean>(false);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(resolvedHeaderName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string>('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [submittedTasksSnapshot, setSubmittedTasksSnapshot] = useState<TaskItem[]>([]);
  const [isFloatingMinimized, setIsFloatingMinimized] = useState<boolean>(false);

  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const baseTasksForStats = allGroupTasks && allGroupTasks.length > 0 ? allGroupTasks : safeTasks;
  const completedCount = baseTasksForStats.filter((t) => t?.completed || t?.approvalStatus === 'approved').length;
  const totalCount = baseTasksForStats.length;
  const isAllApproved = totalCount > 0 && baseTasksForStats.every((t) => t.approvalStatus === 'approved');
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const breachedTasks = baseTasksForStats.filter((t) => !t?.completed && evaluateTaskTimeStatus(t).isOverdue);
  const breachedCount = breachedTasks.length;

  const currentDept = safeTasks[0]?.department || 'General Operations';
  const responderName = currentUser?.name || 'Staff Responder';

  const shiftSuggestion = HEADER_TIME_SUGGESTIONS[resolvedHeaderName];
  const shiftTiming = shiftSuggestion
    ? `${shiftSuggestion.start} – ${shiftSuggestion.end}`
    : safeTasks[0]?.startTime
    ? `${safeTasks[0].startTime} – ${safeTasks[0].endTime || safeTasks[0].deadline || ''}`
    : null;

  // Handle staff form submission with Google Forms validation & instant Auto-Reset
  const handleSubmitForm = () => {
    setValidationError(null);

    // 1. Check if any tasks have missing mandatory photos
    const missingPhotoTasks = safeTasks.filter((t) => {
      const isReq = Boolean(t.isPhotoMandatory);
      const hasPhoto = Boolean(t.media && t.media.some((m) => m.type === 'photo'));
      return t.completed && isReq && !hasPhoto;
    });

    if (missingPhotoTasks.length > 0) {
      setValidationError(
        `* Required photo proof missing for "${missingPhotoTasks[0].title}". Please attach photo proof before submitting.`
      );
      const el = document.getElementById(`task-item-${missingPhotoTasks[0].id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-red-500');
        setTimeout(() => el.classList.remove('ring-4', 'ring-red-500'), 3000);
      }
      return;
    }

    if (onSubmitChecklist) {
      const timeNow = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      setLastSubmittedTime(timeNow);
      setSubmittedTasksSnapshot([...safeTasks]);
      onSubmitChecklist(resolvedHeaderName);
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 14000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleShareUpdate = async () => {
    setIsGeneratingPdf(true);
    setShareNotice('Generating PDF and preparing WhatsApp share update...');
    try {
      const res = await shareChecklistUpdate({
        checklistName: resolvedHeaderName,
        staffName: responderName,
        timeStr:
          lastSubmittedTime ||
          new Date().toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          }),
        department: currentDept,
        tasks: submittedTasksSnapshot.length > 0 ? submittedTasksSnapshot : safeTasks,
      });
      if (res.success) {
        setShareNotice(res.notice || '✓ Update shared successfully!');
        setTimeout(() => setShareNotice(null), 6000);
      } else if (res.notice) {
        setShareNotice(res.notice);
        setTimeout(() => setShareNotice(null), 4000);
      }
    } catch (err) {
      console.error('Share update error:', err);
      setShareNotice('Failed to share checklist update.');
      setTimeout(() => setShareNotice(null), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleExecuteDeleteChecklist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDeleteChecklist || isDeletingChecklist) return;

    setIsDeletingChecklist(true);
    let timeoutId: any;
    const timeoutPromise = new Promise((resolve) => {
      timeoutId = setTimeout(() => resolve('TIMED_OUT'), 3000);
    });

    try {
      await Promise.race([
        Promise.resolve(onDeleteChecklist(resolvedHeaderName)),
        timeoutPromise,
      ]);
    } catch (err) {
      console.error('Error deleting checklist:', err);
    } finally {
      clearTimeout(timeoutId);
      setIsDeletingChecklist(false);
      setConfirmDeleteChecklist(false);
    }
  };

  return (
    <div
      id={`checklist-group-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
      className="max-w-3xl mx-auto w-full mb-6 space-y-4"
    >
      {/* 1. Google Form Signature Single Global Header Card */}
      <div
        className={`relative overflow-hidden rounded-lg border shadow-xs transition-all ${
          isLightMode ? 'bg-white border-zinc-200' : 'bg-[#1a231e] border-zinc-800'
        }`}
      >
        {/* Signature Google Form Top Purple Bar */}
        <div className="h-2.5 sm:h-3 w-full bg-[#673ab7] rounded-t-lg" />

        {/* Single Global Overdue Warning Banner at the very top of the screen */}
        {breachedCount > 0 && (
          <div className="mx-5 sm:mx-7 mt-4 p-3.5 bg-red-600 text-white rounded-lg border-2 border-red-400 shadow-md flex items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 stroke-[2.5]" />
              <div>
                <div className="text-xs sm:text-sm font-black uppercase tracking-tight">
                  🚨 TIME BREACH WARNING: SCHEDULED TIME CROSSED ({breachedCount} Overdue {breachedCount > 1 ? 'Tasks' : 'Task'})
                </div>
                <p className="text-[11px] text-red-100 font-medium mt-0.5">
                  This checklist was scheduled for {shiftTiming || 'this shift window'} and has exceeded its allotted time. Please complete and submit now.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-black/40 text-white rounded-xs shrink-0">
              Overdue
            </span>
          </div>
        )}

        {/* Post-Submission Success Banner with WhatsApp / Web Share Update Button */}
        {justSubmitted && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-500 rounded-lg text-emerald-950 dark:text-emerald-100 text-xs shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[2.5]" />
                  <span>Checklist Finalized & Saved to Master Register!</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-300 text-xs">
                  All answers recorded to Master Task Register. Form has auto-reset for the next shift entry.
                </p>
                {/* Formatted Message Preview */}
                <div className="mt-1 font-mono text-[11px] bg-white dark:bg-black/50 border border-emerald-200 dark:border-emerald-800/60 p-2 rounded text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <span className="select-all">
                    {`✅ ${resolvedHeaderName} completed by ${responderName} at ${lastSubmittedTime || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}. Status: Submitted.`}
                  </span>
                </div>
                {shareNotice && (
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                    {shareNotice}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  id="post-submit-share-update-btn"
                  onClick={handleShareUpdate}
                  disabled={isGeneratingPdf}
                  className={`px-4 py-2 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-md shadow flex items-center gap-2 transition active:scale-95 cursor-pointer ${
                    isGeneratingPdf ? 'opacity-80 cursor-wait' : ''
                  }`}
                  title="Share update with exact submitted PDF to WhatsApp"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Share Update</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setJustSubmitted(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white rounded cursor-pointer"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-3.5 sm:p-5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 flex-1 min-w-0">
              {isRenaming ? (
                <div className="flex items-center gap-1.5 py-0.5">
                  <input
                    type="text"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="px-3 py-1.5 text-lg font-bold border-2 border-[#673ab7] rounded-md outline-none bg-white text-zinc-950"
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
                    className="p-2 bg-[#673ab7] text-white rounded-md cursor-pointer hover:bg-[#58309e]"
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
                    className="p-2 bg-zinc-200 text-zinc-800 rounded-md cursor-pointer hover:bg-zinc-300"
                    title="Cancel"
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {resolvedHeaderName}
                  </h2>
                  {isAdmin && onRenameChecklist && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenameDraft(resolvedHeaderName);
                        setIsRenaming(true);
                      }}
                      className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                      title="Rename checklist"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Subtitle / Department description & Shift Timings */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="font-semibold">Live Shift Checklist • {currentDept} Station</span>
                {shiftTiming && (
                  <span className="inline-flex items-center gap-1 font-mono font-bold text-[#673ab7] dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Shift Timings: {shiftTiming}</span>
                  </span>
                )}
              </div>

              {/* Single Global Instructions Card */}
              <div
                className={`mt-1.5 p-2 sm:p-2.5 rounded-md border text-xs leading-relaxed ${
                  isLightMode
                    ? 'bg-purple-50/70 border-purple-200 text-zinc-800'
                    : 'bg-purple-950/30 border-purple-900/60 text-zinc-200'
                }`}
              >
                <div className="font-black uppercase tracking-wider text-[10px] text-[#673ab7] dark:text-purple-300 mb-0.5 flex items-center gap-1.5">
                  <span>📋 MARK RESPONSE INSTRUCTIONS</span>
                </div>
                <p className="text-zinc-600 dark:text-zinc-400 text-xs">
                  Please answer each question below by selecting <strong>Yes</strong> (completed) or <strong>No</strong> (incomplete). Attach any required photo or video proofs to sub-tasks before submitting.
                </p>
              </div>
            </div>

            {/* Admin Controls & Section Toggle */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isAdmin && !isStaff && onAddTaskToHeader && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddTaskToHeader(resolvedHeaderName);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded cursor-pointer transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Question</span>
                </button>
              )}

              {isAdmin && !isStaff && onEditChecklist && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditChecklist(resolvedHeaderName);
                  }}
                  className="px-2.5 py-1 text-xs font-bold bg-[#673ab7] hover:bg-[#58309e] text-white rounded cursor-pointer transition flex items-center gap-1.5 shadow-xs"
                  title="Edit full checklist and all questions"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Checklist</span>
                </button>
              )}

              {onDeleteChecklist && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDeleteChecklist((prev) => !prev);
                  }}
                  disabled={isDeletingChecklist}
                  className={`px-2.5 py-1 rounded cursor-pointer text-xs font-black uppercase tracking-tight transition flex items-center gap-1.5 border ${
                    confirmDeleteChecklist
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:text-red-400 dark:border-red-900/60'
                  }`}
                  title="Delete entire checklist and all its associated tasks"
                >
                  {isDeletingChecklist ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>[DELETE CHECKLIST]</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded cursor-pointer"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Strict Delete Checklist Confirmation Modal */}
          {confirmDeleteChecklist && onDeleteChecklist && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Confirm Checklist Deletion"
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-70 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-150 backdrop-blur-sm"
            >
              <div className="max-w-md w-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-4 border-red-600 shadow-2xl p-5 space-y-4 rounded-xs">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-500">
                    <AlertCircle className="w-5 h-5 stroke-[2.5]" />
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Confirm Permanent Deletion
                    </h3>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs sm:text-sm font-bold leading-relaxed">
                    Are you sure you want to delete <span className="text-red-600 dark:text-red-400 font-black">"{resolvedHeaderName}"</span>? This action cannot be undone.
                  </p>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-medium">
                    All {totalCount} associated {totalCount === 1 ? 'task' : 'tasks'} in this checklist will be permanently removed.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmDeleteChecklist(false);
                    }}
                    disabled={isDeletingChecklist}
                    className="px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 cursor-pointer transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDeleteChecklist}
                    disabled={isDeletingChecklist}
                    className="px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xs bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition disabled:opacity-60"
                  >
                    {isDeletingChecklist ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Yes, Permanently Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Responder & Required Question Legend Bar */}
          <div className="pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="text-zinc-500 dark:text-zinc-400">
              Responding as: <strong className="text-zinc-900 dark:text-zinc-200">{responderName}</strong>
            </div>

            <div className="text-red-600 dark:text-red-400 font-medium">
              * Indicates required question
            </div>
          </div>

          {/* Overdue alert banner if breached */}
          {breachedCount > 0 && (
            <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-md text-red-800 dark:text-red-200 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>⚠️ {breachedCount} task(s) in this checklist have crossed their scheduled deadline.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Questions List (Tasks in Google Form Cards) */}
      {isExpanded && (
        <div className="space-y-2 sm:space-y-2.5">
          {safeTasks.length === 0 ? (
            <div className="p-6 text-center bg-white dark:bg-[#1a231e] rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 text-sm">
              No questions in this checklist.
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
                  isLocked={false}
                />
              ))}
            </AnimatePresence>
          )}

          {/* Validation Error Banner */}
          {validationError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/60 border-2 border-red-500 rounded-lg text-red-700 dark:text-red-300 text-xs font-bold animate-in fade-in">
              {validationError}
            </div>
          )}

          {/* Bottom Spacer so content is never hidden behind the floating bar */}
          {safeTasks.length > 0 && (
            <div className="h-24 sm:h-28" aria-hidden="true" />
          )}

          {/* 3. Floating Draggable Pop-up Submit Checklist Action Widget */}
          {safeTasks.length > 0 && (
            <motion.div
              id={`submit-action-bar-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              drag
              dragMomentum={false}
              dragElastic={0.08}
              whileDrag={{ scale: 1.03, boxShadow: "0 25px 50px -12px rgba(103, 58, 183, 0.45)" }}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed bottom-[64px] sm:bottom-6 right-3 sm:right-6 z-50 select-none touch-none"
            >
              <div
                style={{
                  width: '177.714px',
                  height: '36.3151px',
                  paddingLeft: '0px',
                  paddingTop: '8px',
                  paddingRight: '8px',
                  paddingBottom: '8px',
                  marginLeft: '0px',
                  marginTop: '0px',
                  marginBottom: '0px',
                }}
                className={`flex items-center gap-2 sm:gap-3 rounded-2xl sm:rounded-full border-2 border-[#673ab7] shadow-[0_12px_35px_rgba(103,58,183,0.35)] backdrop-blur-xl transition-colors ${
                  isLightMode
                    ? 'bg-white/95 text-zinc-900 border-[#673ab7]'
                    : 'bg-[#151f18]/95 text-white border-[#7c4dff]'
                }`}
              >
                {/* Drag Handle & Grip Indicator */}
                <div
                  className="flex items-center gap-1 pl-1 pr-1.5 py-1 text-zinc-400 hover:text-[#673ab7] dark:hover:text-purple-300 cursor-grab active:cursor-grabbing shrink-0"
                  title="Drag anywhere on screen (स्क्रीन पर कहीं भी ड्रैग करें)"
                >
                  <GripVertical className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  <span className="hidden xl:inline text-[9px] font-black uppercase tracking-wider text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.5 rounded-full">
                    Drag
                  </span>
                </div>

                {/* Progress Circle / Badge */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-purple-100 dark:bg-purple-950/90 flex items-center justify-center text-[#673ab7] dark:text-purple-300 font-black text-xs shrink-0 border-2 border-purple-300 dark:border-purple-700 shadow-inner">
                  {percentage}%
                </div>

                {/* Progress Details (Collapsible) */}
                {!isFloatingMinimized && (
                  <div className="min-w-0 pr-1 hidden xs:block">
                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-tight flex items-center gap-1.5">
                      <span>{completedCount}/{safeTasks.length} Done</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px] sm:max-w-[180px]">
                      {resolvedHeaderName}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  {/* Clear Form Button */}
                  {!isFloatingMinimized && safeTasks.some((t) => t.completed) && onToggleTask && (
                    <button
                      type="button"
                      onClick={() => {
                        safeTasks.forEach((t) => {
                          if (t.completed) {
                            onToggleTask(t.id);
                          }
                        });
                      }}
                      className="text-[11px] font-semibold text-zinc-500 hover:text-red-500 dark:hover:text-red-400 cursor-pointer px-2 py-1 transition hidden md:inline-block"
                      title="Clear answered questions"
                    >
                      Clear
                    </button>
                  )}

                  {/* Primary Submit Checklist Action Button */}
                  {onSubmitChecklist && (
                    <button
                      type="button"
                      id={`submit-checklist-btn-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={handleSubmitForm}
                      className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-[#673ab7] to-[#7c4dff] hover:from-[#58309e] hover:to-[#651fff] text-white text-xs sm:text-sm font-black uppercase tracking-wide rounded-xl sm:rounded-full shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 active:scale-95 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                      <span>Submit</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};
