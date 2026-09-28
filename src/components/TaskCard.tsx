import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  AlertCircle,
  Clock,
  User,
  Tag,
  Film,
  Image as ImageIcon,
  Edit2,
  FileText,
  Play,
  Camera,
  Video,
  Save,
  X,
  Trash2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TaskItem, TaskMedia, StaffMember, SubTaskItem } from '../types';
import { DEPARTMENT_COLORS } from '../data/staffData';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { LiveCameraModal } from './LiveCameraModal';
import { evaluateTaskTimeStatus } from '../utils/timeEvaluation';
import { compressImage } from '../utils/imageCompressor';
import { triggerHaptic } from '../utils/haptics';

interface TaskCardProps {
  task: TaskItem;
  onToggle: (id: string) => void;
  index: number;
  onEditTask?: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
  onUnpackSubTasks?: (taskId: string) => void;
  onViewMedia?: (media: TaskMedia) => void;
  onAddMediaToTask?: (taskId: string, media: TaskMedia) => void;
  onUpdateTaskNote?: (taskId: string, note: string) => void;
  onToggleSubTask?: (taskId: string, subTaskId: string) => void;
  onAddSubTaskMedia?: (taskId: string, subTaskId: string, media: TaskMedia) => void;
  onUpdateSubTaskNote?: (taskId: string, subTaskId: string, note: string) => void;
  onApproveTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string, reason: string) => void;
  staffList?: StaffMember[];
  isBlocked?: boolean;
  isLocked?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  index,
  onEditTask,
  onDeleteTask,
  onUnpackSubTasks,
  onViewMedia,
  onAddMediaToTask,
  onUpdateTaskNote,
  onToggleSubTask,
  onAddSubTaskMedia,
  onUpdateSubTaskNote,
  onApproveTask,
  onRejectTask,
  staffList = [],
  isBlocked = false,
  isLocked: isExplicitLocked = false,
}) => {
  const { isLightMode } = useTheme();
  const { canDeleteTask, canEditTask, isAdmin, isStaff } = useAuth();
  const isDeleteAllowed = Boolean(canDeleteTask);
  const isUrgent = task.priority === 'urgent';
  const isPending = task.priority === 'pending';

  // Lock status: only finalized permanent archive records or explicitly locked tasks cannot be edited
  const isLocked = Boolean(
    isExplicitLocked ||
    Boolean(task.id?.startsWith('finalized-')) ||
    Boolean(task.id?.startsWith('submitted-'))
  );

  // Compute live real-time schedule & breach status
  const timeStatus = evaluateTaskTimeStatus(task);
  const isTimeBreached = timeStatus.isOverdue;

  // Inline rejection state on the card for Hemen Das
  const [isCardRejecting, setIsCardRejecting] = useState<boolean>(false);
  const [cardRejectReason, setCardRejectReason] = useState<string>('');

  // Dedicated Parent Task / Checklist Delete Handler
  const handleDeleteTaskCard = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!task || !task.id) {
      console.error('TaskCard: Missing task.id for delete', task);
      return;
    }

    if (!isDeleteAllowed) {
      return;
    }

    if (confirmDelete) {
      if (onDeleteTask) {
        onDeleteTask(task.id);
        setConfirmDelete(false);
      }
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  };

  // Inline notes editing state for parent
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [noteDraft, setNoteDraft] = useState<string>(task.notes || '');

  // Confirm delete state
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  // Subtasks collapsed/expanded state
  const [isSubTasksExpanded, setIsSubTasksExpanded] = useState<boolean>(true);

  // Sub-task inline note drafting state
  const [editingSubTaskIdForNote, setEditingSubTaskIdForNote] = useState<string | null>(null);
  const [subTaskNoteDraft, setSubTaskNoteDraft] = useState<string>('');

  // Local warning message when user clicks checkbox with pending subtasks
  const [localBlockMsg, setLocalBlockMsg] = useState<string | null>(null);

  // Live camera modal state
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState<boolean>(false);
  const [liveCameraSubTaskId, setLiveCameraSubTaskId] = useState<string | null>(null);
  const [isCardAdminPinPromptOpen, setIsCardAdminPinPromptOpen] = useState<boolean>(false);
  const [cardAdminPin, setCardAdminPin] = useState<string>('');
  const [cardPinError, setCardPinError] = useState<string>('');

  const handleLiveCameraCapture = (capturedMedia: TaskMedia) => {
    if (liveCameraSubTaskId) {
      if (onAddSubTaskMedia) {
        onAddSubTaskMedia(task.id, liveCameraSubTaskId, capturedMedia);
      } else if (onAddMediaToTask) {
        onAddMediaToTask(task.id, capturedMedia);
      }
    } else {
      if (onAddMediaToTask) {
        onAddMediaToTask(task.id, capturedMedia);
      }
    }
    setIsLiveCameraOpen(false);
    setLiveCameraSubTaskId(null);
  };

  // Find assigned staff details if any
  const assignedStaff = staffList.find(
    (s) => s.id === task.assigneeId || (task.assignee && task.assignee.includes(s.name))
  );

  const deptKey = (task.department as keyof typeof DEPARTMENT_COLORS) || 'General';
  const deptStyle = DEPARTMENT_COLORS[deptKey] || DEPARTMENT_COLORS.General;

  const hasMedia = task.media && task.media.length > 0;
  const hasNotes = Boolean(task.notes);

  // Sub-tasks calculations
  const subTasks = task.subTasks || [];
  const hasSubTasks = subTasks.length > 0;
  const doneSubTasksCount = subTasks.filter((s) => s.isDone).length;
  const allSubTasksDone = !hasSubTasks || doneSubTasksCount === subTasks.length;
  const subTasksProgress = hasSubTasks ? Math.round((doneSubTasksCount / subTasks.length) * 100) : 100;

  // Check parent task missing proofs
  const isTaskPhotoRequired = Boolean(task.isPhotoMandatory || task.mandatoryMedia === 'photo');
  const hasTaskPhoto = Boolean(
    (task.media && task.media.some((m) => m.type === 'photo')) ||
    (task.subTasks && task.subTasks.some((st) => st.media && st.media.some((m) => m.type === 'photo')))
  );
  const isTaskPhotoMissing = isTaskPhotoRequired && !hasTaskPhoto;

  const isTaskVideoRequired = Boolean(task.isVideoMandatory || task.mandatoryMedia === 'video');
  const hasTaskVideo = Boolean(
    (task.media && task.media.some((m) => m.type === 'video')) ||
    (task.subTasks && task.subTasks.some((st) => st.media && st.media.some((m) => m.type === 'video')))
  );
  const isTaskVideoMissing = isTaskVideoRequired && !hasTaskVideo;

  const isTaskNoteRequired = Boolean(task.isNoteMandatory);
  const hasTaskNote = Boolean(task.notes && task.notes.trim());
  const isTaskNoteMissing = isTaskNoteRequired && !hasTaskNote;

  // Check missing subtasks proofs (photo, video, note)
  const subTasksMissingProofs = subTasks.filter((s) => {
    const reqPhoto = Boolean(s.isPhotoMandatory || s.mandatoryMedia === 'photo');
    const hasPhoto = Boolean(s.media && s.media.some((m) => m.type === 'photo'));
    if (reqPhoto && !hasPhoto) return true;

    const reqVideo = Boolean(s.isVideoMandatory || s.mandatoryMedia === 'video');
    const hasVideo = Boolean(s.media && s.media.some((m) => m.type === 'video'));
    if (reqVideo && !hasVideo) return true;

    const reqNote = Boolean(s.isNoteMandatory);
    const hasNote = Boolean(s.notes && s.notes.trim());
    if (reqNote && !hasNote) return true;

    return false;
  });

  const hasMissingParentProof = isTaskPhotoMissing || isTaskVideoMissing || isTaskNoteMissing;
  const hasMissingSubTaskProofs = subTasksMissingProofs.length > 0;
  const hasMissingMandatory = !task.completed && (hasMissingParentProof || (!allSubTasksDone || hasMissingSubTaskProofs));

  // Handle individual sub-task checkbox click with strict proof validation
  const handleSubTaskClick = (e: React.MouseEvent, sub: SubTaskItem) => {
    e.stopPropagation();

    // If record is finalized, prevent changing subtasks (locked)
    if (isLocked) {
      setLocalBlockMsg('🔒 This record is finalized. It cannot be modified.');
      setTimeout(() => setLocalBlockMsg(null), 4000);
      return;
    }

    // If attempting to mark subtask as done, check required proofs
    if (!sub.isDone) {
      const isReqPhoto = Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo');
      const hasSubPhoto = Boolean(sub.media && sub.media.some((m) => m.type === 'photo'));
      if (isReqPhoto && !hasSubPhoto) {
        setLocalBlockMsg(`📷 Photo Proof Required! Please snap a photo before marking "${sub.title}" done.`);
        setLiveCameraSubTaskId(sub.id);
        setIsLiveCameraOpen(true);
        setTimeout(() => setLocalBlockMsg(null), 6000);
        return;
      }

      const isReqNote = Boolean(sub.isNoteMandatory);
      const hasSubNote = Boolean(sub.notes && sub.notes.trim());
      if (isReqNote && !hasSubNote) {
        setLocalBlockMsg(`📝 Shift Note Required for "${sub.title}"! Please enter observation.`);
        setEditingSubTaskIdForNote(sub.id);
        setSubTaskNoteDraft(sub.notes || '');
        setTimeout(() => setLocalBlockMsg(null), 6000);
        return;
      }
    }

    setLocalBlockMsg(null);
    if (onToggleSubTask) {
      onToggleSubTask(task.id, sub.id);
    }
  };

  const handleToggleSubTaskNoteEditor = (sub: SubTaskItem) => {
    if (editingSubTaskIdForNote === sub.id) {
      setEditingSubTaskIdForNote(null);
      setSubTaskNoteDraft('');
    } else {
      setEditingSubTaskIdForNote(sub.id);
      setSubTaskNoteDraft(sub.notes || '');
    }
  };

  const handleSaveSubTaskNoteInline = (subId: string) => {
    if (onUpdateSubTaskNote) {
      onUpdateSubTaskNote(task.id, subId, subTaskNoteDraft.trim());
    }
    setEditingSubTaskIdForNote(null);
    setSubTaskNoteDraft('');
  };

  const handleSaveNoteInline = () => {
    if (onUpdateTaskNote) {
      onUpdateTaskNote(task.id, noteDraft.trim());
    }
    setIsEditingNote(false);
  };

  // Handle clicking parent checkbox/radio with pre-flight check
  const handleParentToggleClick = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }

    // Prevent undoing / reopening submitted tasks
    if (task.completed) {
      if (isLocked) {
        setLocalBlockMsg('🔒 Task is submitted and locked. It cannot be reopened or undone.');
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      onToggle(task.id);
      return;
    }

    if (!task.completed) {
      if (isTaskPhotoMissing && isTaskVideoMissing) {
        setLocalBlockMsg(`Both Photo & Video proofs are required for "${task.title}"!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskPhotoMissing) {
        setLocalBlockMsg(`Photo proof is required for "${task.title}"! Tap 📷 Camera below.`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskVideoMissing) {
        setLocalBlockMsg(`Video proof is required for "${task.title}"! Attach video below.`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
      if (isTaskNoteMissing) {
        setLocalBlockMsg(`Shift Note is required for "${task.title}"!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }

      // Check subtasks completion
      if (hasSubTasks && !allSubTasksDone) {
        const pending = subTasks.filter((s) => !s.isDone);
        setLocalBlockMsg(`Cannot complete: ${pending.length} sub-task(s) still incomplete!`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }

      // Check subtask proofs (photo, video, note)
      if (hasMissingSubTaskProofs) {
        const first = subTasksMissingProofs[0];
        const reqs: string[] = [];
        if (first.isPhotoMandatory || first.mandatoryMedia === 'photo') reqs.push('Photo');
        if (first.isVideoMandatory || first.mandatoryMedia === 'video') reqs.push('Video');
        if (first.isNoteMandatory) reqs.push('Note');
        setLocalBlockMsg(`Proof required for sub-task "${first.title}": ${reqs.join(' & ')}`);
        setTimeout(() => setLocalBlockMsg(null), 5000);
        return;
      }
    }

    setLocalBlockMsg(null);
    onToggle(task.id);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{
        opacity: task.completed ? 0.55 : 1,
        y: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        x: -24,
        scale: 0.95,
        transition: { duration: 0.18, ease: 'easeOut' },
      }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.2, ease: 'easeOut' },
      }}
      id={`task-item-${task.id}`}
      className={`group relative p-2 sm:p-2.5 transition-all duration-150 rounded-md border shadow-xs hover:shadow-sm focus-within:border-l-3 focus-within:border-l-[#673ab7] ${
        task.completed
          ? isLightMode
            ? 'bg-zinc-50/90 border-zinc-200'
            : 'bg-zinc-900/60 border-zinc-800'
          : isLightMode
          ? 'bg-white hover:border-zinc-300 border-zinc-200'
          : 'bg-[#1a231e] hover:border-zinc-700 border-zinc-800'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Task Info & Actions */}
        <div className="flex-1 min-w-0">
          {/* Question / Task Title (Google Form Minimalist Style) */}
          <div className="flex items-start justify-between gap-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-mono text-[10px] sm:text-[11px] font-black text-[#673ab7] dark:text-purple-400 select-none">
                  #{index + 1}
                </span>
                <p
                  onClick={handleParentToggleClick}
                  className={`font-bold text-xs sm:text-[13px] leading-snug uppercase tracking-tight cursor-pointer ${
                    task.completed
                      ? isLightMode
                        ? 'line-through text-zinc-400'
                        : 'line-through opacity-70 text-zinc-400'
                      : isLightMode
                      ? 'text-zinc-950 hover:text-black'
                      : 'text-white hover:text-zinc-200'
                  }`}
                >
                  {task.title}
                </p>
                {isTaskPhotoRequired && (
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded border inline-flex items-center gap-0.5 ${
                      hasTaskPhoto
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}
                    title={hasTaskPhoto ? 'Photo proof attached' : 'Mandatory photo proof required'}
                  >
                    <Camera className="w-2.5 h-2.5" />
                    <span>{hasTaskPhoto ? 'Photo ✓' : 'Photo Required'}</span>
                  </span>
                )}
              </div>

              {/* Details if present */}
              {task.details && task.details !== task.title && (
                <p
                  className={`text-[10px] sm:text-[11px] mt-0.5 leading-tight ${
                    task.completed
                      ? 'line-through text-zinc-400'
                      : isLightMode
                      ? 'text-zinc-500'
                      : 'text-zinc-400'
                  }`}
                >
                  {task.details}
                </p>
              )}
            </div>

            {hasSubTasks && (
              <button
                type="button"
                onClick={() => setIsSubTasksExpanded(!isSubTasksExpanded)}
                className="p-0.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-white transition cursor-pointer shrink-0"
                title={isSubTasksExpanded ? 'Collapse sub-tasks' : 'Expand sub-tasks'}
              >
                {isSubTasksExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Google Form Yes / No Radio Options */}
          <div className="mt-1 pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
            <div className="flex flex-row items-center gap-1.5 sm:gap-3">
              {/* Yes Radio Option */}
              <label
                htmlFor={`task-radio-yes-${task.id}`}
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded border text-[11px] sm:text-xs transition select-none ${
                  isLocked
                    ? 'cursor-not-allowed opacity-80'
                    : 'cursor-pointer hover:border-[#673ab7]'
                } ${
                  task.completed
                    ? 'bg-purple-50/80 dark:bg-purple-950/30 border-[#673ab7] shadow-xs'
                    : isLightMode
                    ? 'bg-white border-zinc-200'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <input
                  type="radio"
                  id={`task-radio-yes-${task.id}`}
                  name={`task-radio-group-${task.id}`}
                  checked={Boolean(task.completed)}
                  disabled={isLocked}
                  onChange={() => {
                    if (!isLocked && !task.completed) {
                      handleParentToggleClick();
                    }
                  }}
                  className="w-3 h-3 accent-[#673ab7] text-[#673ab7] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className={`font-semibold ${task.completed ? 'text-[#673ab7] dark:text-purple-300 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  Yes (Completed)
                </span>
                {task.completed && (
                  <span className="text-[8px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 px-1 rounded-full">
                    ✓
                  </span>
                )}
              </label>

              {/* No Radio Option */}
              <label
                htmlFor={`task-radio-no-${task.id}`}
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:py-1 rounded border text-[11px] sm:text-xs transition select-none ${
                  isLocked
                    ? 'cursor-not-allowed opacity-80'
                    : 'cursor-pointer hover:border-zinc-400'
                } ${
                  !task.completed
                    ? 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600 shadow-xs'
                    : isLightMode
                    ? 'bg-white border-zinc-200'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                <input
                  type="radio"
                  id={`task-radio-no-${task.id}`}
                  name={`task-radio-group-${task.id}`}
                  checked={!task.completed}
                  disabled={isLocked}
                  onChange={() => {
                    if (!isLocked && task.completed) {
                      handleParentToggleClick();
                    }
                  }}
                  className="w-3 h-3 accent-[#673ab7] text-[#673ab7] cursor-pointer disabled:cursor-not-allowed"
                />
                <span className={`font-semibold ${!task.completed ? 'text-zinc-950 dark:text-white font-bold' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  No (Incomplete)
                </span>
              </label>
            </div>
          </div>

          {/* Rejection Notice Banner from Admin Hemen Das */}
          {task.rejectionReason && (
            <div className="mt-2.5 p-2.5 bg-red-950/90 text-red-200 text-xs font-bold border-2 border-red-600 shadow-md flex items-start justify-between gap-2 animate-in slide-in-from-top-1">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 stroke-[2.5]" />
                <div>
                  <span className="font-black uppercase text-red-400 block">❌ Rejected by Admin Hemen Das:</span>
                  <span className="text-red-200 mt-0.5 block">"{task.rejectionReason}"</span>
                  <span className="text-[10px] text-amber-400 uppercase font-black tracking-wider block mt-1">
                    👉 Please capture a new clear photo/video proof and re-submit.
                  </span>
                </div>
              </div>
              {isAdmin && onApproveTask && (
                <button
                  type="button"
                  id={`card-reapprove-btn-${task.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onApproveTask(task.id);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-tight flex items-center gap-1 transition cursor-pointer shadow-xs active:scale-95 rounded-xs shrink-0"
                  title="Override rejection and approve task"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>✓ Re-Approve</span>
                </button>
              )}
            </div>
          )}

          {/* Local Block Warning Notice when user attempts premature check */}
          {(localBlockMsg || (isBlocked && hasMissingMandatory)) && (
            <div className="mt-2.5 p-2.5 bg-red-600 text-white text-xs font-black uppercase tracking-tight flex items-center justify-between gap-2 border-2 border-red-400 shadow-md animate-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-4 h-4 flex-shrink-0 stroke-[3]" />
                <span className="truncate">
                  {localBlockMsg || (
                    <>
                      Completion Blocked! Missing:{' '}
                      {[
                        !allSubTasksDone && `${subTasks.length - doneSubTasksCount} Incomplete Sub-tasks`,
                        hasMissingSubTaskProofs && 'Sub-task Proof Verification',
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </>
                  )}
                </span>
              </div>
              <span className="text-[10px] bg-black text-white px-2 py-0.5 font-black uppercase flex-shrink-0">
                Required
              </span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* NESTED SUB-TASKS CHECKLIST SECTION */}
          {/* ========================================================================= */}
          {hasSubTasks && (
            <div
              className={`mt-1.5 p-1.5 sm:p-2 border rounded space-y-1 ${
                isLightMode
                  ? 'bg-zinc-50 border-zinc-200'
                  : 'bg-black/60 border-zinc-800'
              }`}
            >
              {/* Sub-tasks Progress Header */}
              <div className="flex items-center justify-between text-[10px] flex-wrap gap-1">
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-2.5 h-2.5 text-blue-500 stroke-[2.5]" />
                  <span
                    className={`font-black uppercase tracking-tight text-[9px] ${
                      isLightMode ? 'text-zinc-900' : 'text-zinc-200'
                    }`}
                  >
                    Sub-Tasks
                  </span>
                </div>

                <div className="flex items-center gap-1 ml-auto">
                  {/* Option to split subtasks into standalone individual task cards */}
                  {onUnpackSubTasks && subTasks.length > 0 && !task.completed && (
                    <button
                      type="button"
                      id={`unpack-subtasks-btn-${task.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpackSubTasks(task.id);
                      }}
                      className={`px-1 py-0.2 text-[8px] font-black uppercase tracking-tight border flex items-center gap-0.5 transition cursor-pointer active:scale-95 rounded-xs ${
                        isLightMode
                          ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'
                          : 'bg-purple-950/80 hover:bg-purple-900 text-purple-300 border-purple-700'
                      }`}
                      title="Convert these checklist sub-tasks into separate individual task cards"
                    >
                      <span>⚡ Split</span>
                    </button>
                  )}

                  <span
                    className={`font-mono text-[9px] font-black ${
                      allSubTasksDone
                        ? 'text-emerald-500'
                        : isLightMode
                        ? 'text-zinc-700'
                        : 'text-zinc-400'
                    }`}
                  >
                    {doneSubTasksCount}/{subTasks.length} ({subTasksProgress}%)
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsSubTasksExpanded(!isSubTasksExpanded)}
                    className="text-[9px] text-zinc-400 hover:text-white uppercase font-bold cursor-pointer"
                  >
                    {isSubTasksExpanded ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-zinc-700/40 h-1 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    allSubTasksDone ? 'bg-emerald-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${subTasksProgress}%` }}
                />
              </div>

              {/* Sub-tasks interactive list */}
              {isSubTasksExpanded && (
                <div className="space-y-0.5 pt-0.5">
                  {subTasks.map((sub: SubTaskItem, sIdx: number) => {
                    const hasSubPhoto = Boolean(sub.media && sub.media.some((m) => m.type === 'photo'));
                    const hasSubVideo = Boolean(sub.media && sub.media.some((m) => m.type === 'video'));
                    const hasSubNote = Boolean(sub.notes && sub.notes.trim());

                    const isReqPhoto = Boolean(sub.isPhotoMandatory || sub.mandatoryMedia === 'photo');
                    const isReqVideo = Boolean(sub.isVideoMandatory || sub.mandatoryMedia === 'video');
                    const isReqNote = Boolean(sub.isNoteMandatory);

                    const subPhotoMissing = isReqPhoto && !hasSubPhoto;
                    const subVideoMissing = isReqVideo && !hasSubVideo;
                    const subNoteMissing = isReqNote && !hasSubNote;

                    return (
                      <div
                        key={sub.id ? `sub-${task.id}-${sub.id}-${sIdx}` : `sub-${task.id}-${sIdx}`}
                        className={`p-1 sm:p-1.5 border transition text-xs rounded space-y-0.5 shadow-xs ${
                          sub.isDone
                            ? isLightMode
                              ? 'bg-zinc-100/90 border-zinc-200 text-zinc-500'
                              : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-500'
                            : isLightMode
                            ? 'bg-white border-zinc-300 text-zinc-900 hover:border-zinc-400'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                        }`}
                      >
                        {/* Subtask Top Header Row: Step #, Checkbox, Title, and Mandatory Proof Chips */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {/* Subtask Checkbox with strict validation */}
                            <button
                              type="button"
                              id={`subtask-chk-${sub.id}`}
                              onClick={(e) => handleSubTaskClick(e, sub)}
                              className={`w-3.5 h-3.5 border flex items-center justify-center transition cursor-pointer flex-shrink-0 rounded-xs ${
                                sub.isDone
                                  ? 'bg-emerald-500 border-emerald-500 text-black'
                                  : isLightMode
                                  ? 'border-zinc-400 hover:border-zinc-800'
                                  : 'border-zinc-500 hover:border-white'
                              }`}
                              title={
                                sub.isDone
                                  ? 'Click to uncheck sub-task'
                                  : isReqPhoto && !hasSubPhoto
                                  ? 'Mandatory photo required! Click to open camera'
                                  : 'Click to complete sub-task'
                              }
                            >
                              {sub.isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </button>

                            {/* Subtask Title */}
                            <span
                              onClick={(e) => handleSubTaskClick(e, sub)}
                              className={`font-semibold text-xs cursor-pointer select-none truncate ${
                                sub.isDone ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {sub.title}
                            </span>
                          </div>

                          {/* Subtask Mandatory Proof Status Badges */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isReqPhoto && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 rounded-xs ${
                                  hasSubPhoto
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-500 animate-pulse'
                                }`}
                                title={hasSubPhoto ? 'Photo proof attached' : 'Mandatory photo required'}
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>{hasSubPhoto ? 'Photo ✓' : '📸 Photo Req'}</span>
                              </span>
                            )}

                            {isReqVideo && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 rounded-xs ${
                                  hasSubVideo
                                    ? 'bg-rose-950 text-rose-300 border-rose-700'
                                    : 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                                }`}
                                title={hasSubVideo ? 'Video proof attached' : 'Mandatory video required'}
                              >
                                <Video className="w-2.5 h-2.5" />
                                <span>{hasSubVideo ? 'Video ✓' : '🎥 Video Req'}</span>
                              </span>
                            )}

                            {isReqNote && (
                              <span
                                className={`px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-0.5 rounded-xs ${
                                  hasSubNote
                                    ? 'bg-amber-950 text-amber-300 border-amber-700'
                                    : 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse'
                                }`}
                                title={hasSubNote ? 'Shift note entered' : 'Mandatory note required'}
                              >
                                <FileText className="w-2.5 h-2.5" />
                                <span>{hasSubNote ? 'Note ✓' : '📝 Note Req'}</span>
                              </span>
                            )}

                            {sub.isDone && (
                              <span className="text-[10px] font-mono text-emerald-500 font-black ml-0.5">
                                ✓ Done
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Subtask Action Buttons: Directly under individual sub-tasks */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 pl-6">
                          {/* Live Camera Proof Button */}
                          <button
                            type="button"
                            id={`subtask-camera-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setLiveCameraSubTaskId(sub.id);
                              setIsLiveCameraOpen(true);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                              subPhotoMissing
                                ? 'bg-emerald-950 text-emerald-200 border-emerald-500 animate-pulse ring-1 ring-emerald-500/50'
                                : hasSubPhoto
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900'
                                : isLightMode
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title={subPhotoMissing ? 'Mandatory photo proof required! Snap live camera photo' : 'Open live camera for this sub-task'}
                          >
                            <Camera className={`w-2.5 h-2.5 ${subPhotoMissing ? 'text-emerald-300' : 'text-emerald-500'}`} />
                            <span>{hasSubPhoto ? 'Photo ✓' : '📷 Camera'} {subPhotoMissing && '*'}</span>
                          </button>

                          {/* + Note Button */}
                          <button
                            type="button"
                            id={`subtask-note-${sub.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSubTaskNoteEditor(sub);
                            }}
                            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-tight border flex items-center gap-1 cursor-pointer transition active:scale-95 ${
                              subNoteMissing
                                ? 'bg-amber-950 text-amber-200 border-amber-500 animate-pulse ring-1 ring-amber-500/50'
                                : hasSubNote
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900'
                                : isLightMode
                                ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border-zinc-300'
                                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                            }`}
                            title={subNoteMissing ? 'Mandatory shift note required!' : 'Add or edit shift note for this sub-task'}
                          >
                            <FileText className={`w-2.5 h-2.5 ${subNoteMissing ? 'text-amber-300' : 'text-amber-500'}`} />
                            <span>{hasSubNote ? 'Note ✓' : '+ Note'} {subNoteMissing && '*'}</span>
                          </button>
                        </div>

                        {/* Attached Media for Subtask (Thumbnails) */}
                        {sub.media && sub.media.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pl-6 pt-1">
                            {sub.media.map((m, mIdx) => (
                              <div
                                key={m.id ? `sub-media-${sub.id}-${m.id}-${mIdx}` : `sub-media-${sub.id}-${mIdx}`}
                                onClick={() => onViewMedia && onViewMedia(m)}
                                className={`group/thumb relative cursor-pointer border rounded-xs overflow-hidden flex items-center gap-1.5 p-1 ${
                                  isLightMode ? 'bg-zinc-100 border-zinc-300 hover:border-zinc-600' : 'bg-zinc-950 border-zinc-700 hover:border-white'
                                }`}
                                title={`Click to view ${m.name || m.type}`}
                              >
                                {m.type === 'photo' ? (
                                  <img src={m.url} alt={m.name || 'Proof'} className="w-8 h-8 object-cover rounded-xs" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center rounded-xs">
                                    <Video className="w-4 h-4 text-rose-400" />
                                  </div>
                                )}
                                <span className="text-[10px] font-mono font-bold max-w-[100px] truncate">{m.name || m.type}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Subtask Inline Note Editor */}
                        {editingSubTaskIdForNote === sub.id ? (
                          <div className={`mt-2 p-2 border rounded-xs ${isLightMode ? 'bg-amber-50 border-amber-400' : 'bg-zinc-950 border-amber-600/60'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[9px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                <span>Sub-Task Observation / Note</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => setEditingSubTaskIdForNote(null)}
                                className="text-zinc-400 hover:text-white"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <textarea
                              value={subTaskNoteDraft}
                              onChange={(e) => setSubTaskNoteDraft(e.target.value)}
                              placeholder="Type observation, temperature reading, or comment..."
                              rows={2}
                              className="w-full bg-black/80 border border-zinc-700 focus:border-white p-1.5 text-xs text-white outline-none placeholder:text-zinc-600"
                              autoFocus
                            />
                            <div className="flex justify-end gap-1.5 mt-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingSubTaskIdForNote(null)}
                                className="px-2 py-0.5 text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveSubTaskNoteInline(sub.id)}
                                className="px-2.5 py-0.5 text-[9px] font-black uppercase bg-white text-black hover:bg-zinc-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Save className="w-2.5 h-2.5" />
                                <span>Save Note</span>
                              </button>
                            </div>
                          </div>
                        ) : sub.notes && sub.notes.trim() ? (
                          <div className={`mt-1 pl-6 flex items-start justify-between gap-2 p-1.5 border text-[11px] rounded-xs ${
                            isLightMode ? 'bg-amber-50/70 border-amber-200 text-amber-950' : 'bg-zinc-950/80 border-amber-900/40 text-amber-200'
                          }`}>
                            <div className="flex items-start gap-1 min-w-0">
                              <FileText className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                              <span className="italic truncate">{sub.notes}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleSubTaskNoteEditor(sub)}
                              className="text-[9px] font-bold uppercase text-amber-500 hover:underline cursor-pointer flex-shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Inline Notes Display & Editor */}
          {isEditingNote ? (
            <div
              className={`mt-2.5 p-2.5 border-2 rounded-xs ${
                isLightMode ? 'bg-amber-50 border-amber-400' : 'bg-zinc-900 border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <span>Shift Notes & Observations</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Type shift notes, fridge readings, or remarks..."
                rows={2}
                className="w-full bg-black/80 border border-zinc-700 focus:border-white p-2 text-xs text-white outline-none placeholder:text-zinc-600"
                autoFocus
              />
              <div className="flex justify-end gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="px-2.5 py-1 text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNoteInline}
                  className="px-3 py-1 text-[10px] font-black uppercase bg-white text-black hover:bg-zinc-200 flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>Save Note</span>
                </button>
              </div>
            </div>
          ) : (
            hasNotes && (
              <div
                onClick={() => {
                  setNoteDraft(task.notes || '');
                  setIsEditingNote(true);
                }}
                className={`mt-2.5 p-2 text-xs border rounded-xs cursor-pointer flex items-start gap-1.5 group/note ${
                  isLightMode
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100/80'
                    : 'bg-zinc-900/90 border-zinc-700 text-zinc-300 hover:border-zinc-500'
                }`}
                title="Click to edit shift note"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="flex-1 italic leading-relaxed text-[11px] sm:text-xs">
                  {task.notes}
                </p>
                <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/note:opacity-100 transition flex-shrink-0" />
              </div>
            )
          )}

          {/* Attached Media Thumbnails (Photos & Videos) */}
          {hasMedia && (
            <div className="mt-2.5">
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>Verification Media ({task.media!.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {task.media!.map((m, mIdx) => (
                  <button
                    key={m.id ? `task-media-${task.id}-${m.id}-${mIdx}` : `task-media-${task.id}-${mIdx}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewMedia && onViewMedia(m);
                    }}
                    className="relative w-12 h-12 sm:w-14 sm:h-14 border-2 border-zinc-700 hover:border-white transition overflow-hidden bg-black flex-shrink-0 cursor-pointer group/media rounded-xs"
                    title={`View ${m.name || m.type}`}
                  >
                    {m.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                        <Film className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play className="w-3.5 h-3.5 text-white fill-white" />
                        </div>
                      </div>
                    ) : (
                      <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Footer: Minimal Proof Actions & Admin Controls */}
          <div
            className={`mt-1.5 pt-1.5 border-t flex flex-wrap items-center justify-between gap-1.5 ${
              isLightMode ? 'border-zinc-100' : 'border-zinc-800/60'
            }`}
          >
            {/* Assignee Information (only if assigned) */}
            <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
              {assignedStaff ? (
                <>
                  <User className="w-2.5 h-2.5 text-zinc-400" />
                  <span>
                    <strong>{assignedStaff.name}</strong>
                    <span className="opacity-75 text-[9px] ml-0.5">({assignedStaff.designation})</span>
                  </span>
                </>
              ) : task.assignee ? (
                <>
                  <User className="w-2.5 h-2.5 text-zinc-400" />
                  <span>{task.assignee}</span>
                </>
              ) : null}
            </div>

            {/* Quick Actions Bar on every task */}
            <div className="flex flex-wrap items-center gap-1 ml-auto">
              {/* Only show parent attachment buttons for standalone tasks without subtasks */}
              {!hasSubTasks && (
                <>
                  {/* 📷 Live Camera Quick Action */}
                  <button
                    type="button"
                    id={`live-camera-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLiveCameraSubTaskId(null);
                      setIsLiveCameraOpen(true);
                    }}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border flex items-center gap-0.5 cursor-pointer transition ${
                      hasTaskPhoto
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                    title="Open live camera to snap proof photo"
                  >
                    <Camera className="w-2.5 h-2.5" />
                    <span>{hasTaskPhoto ? 'Photo ✓' : 'Add Photo'}</span>
                  </button>

                  {/* 📝 Note Quick Action */}
                  <button
                    type="button"
                    id={`add-note-task-${task.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteDraft(task.notes || '');
                      setIsEditingNote(!isEditingNote);
                    }}
                    className={`px-1.5 py-0.5 text-[9px] font-bold rounded border flex items-center gap-0.5 cursor-pointer transition ${
                      hasNotes
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                        : isLightMode
                        ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    }`}
                    title={hasNotes ? 'Edit Notes' : 'Add Note to this task'}
                  >
                    <FileText className="w-2.5 h-2.5" />
                    <span>{hasNotes ? 'Notes' : '+ Note'}</span>
                  </button>
                </>
              )}

              {/* Edit Icon Button: Clear, prominent for Admin and Manager */}
              {onEditTask && (
                <button
                  type="button"
                  id={`edit-task-${task.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTask(task);
                  }}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded cursor-pointer"
                  title="Edit question"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}

              {/* Delete Icon Button: Clear, prominent for Admin and Manager */}
              {isDeleteAllowed && (
                <button
                  type="button"
                  id={`delete-task-${task.id}`}
                  onClick={handleDeleteTaskCard}
                  className="p-1 text-zinc-400 hover:text-red-600 rounded cursor-pointer"
                  title={confirmDelete ? 'Click again to confirm delete' : `Delete question`}
                >
                  {confirmDelete ? (
                    <span className="text-[9px] font-black uppercase text-red-600">Delete?</span>
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Direct Live Camera Modal */}
      <LiveCameraModal
        isOpen={isLiveCameraOpen}
        onClose={() => {
          setIsLiveCameraOpen(false);
          setLiveCameraSubTaskId(null);
        }}
        onCapture={handleLiveCameraCapture}
        title={liveCameraSubTaskId ? `Live Camera • Sub-task Proof` : `Live Camera • ${task.title}`}
      />
    </motion.div>
  );
};
