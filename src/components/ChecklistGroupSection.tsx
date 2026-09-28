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
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [renameDraft, setRenameDraft] = useState<string>(resolvedHeaderName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<boolean>(false);
  const [lastSubmittedTime, setLastSubmittedTime] = useState<string>('');
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [submittedTasksSnapshot, setSubmittedTasksSnapshot] = useState<TaskItem[]>([]);

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
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && !isStaff && onAddTaskToHeader && (
                <button
                  type="button"
                  onClick={() => onAddTaskToHeader(resolvedHeaderName)}
                  className="px-2.5 py-1 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded cursor-pointer transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Question</span>
                </button>
              )}

              {isAdmin && !isStaff && onDeleteChecklist && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirmDeleteChecklist) {
                      onDeleteChecklist(resolvedHeaderName);
                      setConfirmDeleteChecklist(false);
                    } else {
                      setConfirmDeleteChecklist(true);
                      setTimeout(() => setConfirmDeleteChecklist(false), 4000);
                    }
                  }}
                  className={`p-1.5 rounded cursor-pointer text-xs font-bold transition ${
                    confirmDeleteChecklist
                      ? 'bg-red-600 text-white'
                      : 'text-zinc-400 hover:text-red-500'
                  }`}
                  title={confirmDeleteChecklist ? 'Click again to confirm delete' : 'Delete checklist'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded cursor-pointer"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            </div>
          </div>

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

          {/* Bottom Spacer so content is never hidden behind the fixed bar */}
          {safeTasks.length > 0 && isSingleChecklist && (
            <div className="h-16 sm:h-20" aria-hidden="true" />
          )}

          {/* 3. Bottom Google Form Action Bar (Sticky / Fixed Submit Checklist Button) */}
          {safeTasks.length > 0 && (
            <div
              id={`submit-action-bar-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              className={
                isSingleChecklist
                  ? "fixed bottom-[52px] sm:bottom-0 left-0 right-0 w-full z-45 sm:z-50 bg-white/95 dark:bg-[#1a231e]/95 backdrop-blur-md border-t-2 border-[#673ab7]/40 dark:border-purple-500/30 shadow-[0_-6px_25px_rgba(0,0,0,0.15)] dark:shadow-[0_-6px_25px_rgba(0,0,0,0.6)] py-2 sm:py-2.5 px-3 sm:px-6"
                  : "sticky bottom-[52px] sm:bottom-0 z-40 bg-white/95 dark:bg-[#1a231e]/95 backdrop-blur-md rounded-lg border-2 border-[#673ab7]/30 dark:border-purple-500/30 shadow-[0_-4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.5)] p-3 sm:p-4 flex flex-row items-center justify-between gap-3 mt-4"
              }
            >
              <div className={isSingleChecklist ? "max-w-7xl mx-auto flex items-center justify-between gap-3 w-full" : "w-full flex items-center justify-between gap-3"}>
                {/* Progress Summary */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-100 dark:bg-purple-950/90 flex items-center justify-center text-[#673ab7] dark:text-purple-300 font-black text-xs shrink-0 border border-purple-200 dark:border-purple-800">
                    {percentage}%
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 leading-tight">
                      {completedCount} of {safeTasks.length} answered
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate hidden sm:block">
                      {resolvedHeaderName} • Responding as {responderName}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Google Forms Clear Form Button */}
                  {safeTasks.some((t) => t.completed) && onToggleTask && (
                    <button
                      type="button"
                      onClick={() => {
                        safeTasks.forEach((t) => {
                          if (t.completed) {
                            onToggleTask(t.id);
                          }
                        });
                      }}
                      className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer px-2.5 py-1.5 transition hidden sm:inline-block"
                    >
                      Clear form
                    </button>
                  )}

                  {/* Google Forms Prominent Submit Checklist Button */}
                  {onSubmitChecklist && (
                    <button
                      type="button"
                      id={`submit-checklist-btn-${resolvedHeaderName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={handleSubmitForm}
                      className="px-5 sm:px-8 py-2 sm:py-2.5 bg-[#673ab7] hover:bg-[#58309e] text-white text-xs sm:text-sm font-bold uppercase tracking-wide rounded-md shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Submit Checklist</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
